"""Bicep curl exercise analyzer."""
from __future__ import annotations

from typing import Optional

from app.analysis.base import BaseExerciseAnalyzer, AnalysisResult
from app.analysis.common.angles import (
    Point2D,
    angle_2d,
    range_of_motion_score,
    symmetry_score,
    tempo_from_duration,
)
from app.analysis.common.quality import (
    PoseLandmark,
    frame_quality_score,
    is_frame_usable,
    rep_confidence,
)
from app.analysis.common.smoothing import AngleSmoother
from app.analysis.common.state_machine import RepStateMachine
from app.models.schemas import (
    AggregateMetrics,
    CameraAngle,
    ExerciseType,
    RepMetrics,
    RepQuality,
    RepResult,
)
from app.services.pose_service import FrameLandmarks, PoseSequence

# State machine phases
_EXTENDED = "extended"
_CURLING = "curling"
_CONTRACTED = "contracted"
_LOWERING = "lowering"

# Angle thresholds (degrees)
_EXTENDED_ANGLE = 150.0  # Elbow nearly straight
_CONTRACTED_ANGLE = 50.0  # Elbow fully flexed
_MID_ANGLE = 100.0  # Midpoint for transitions

# Form thresholds
_UPPER_ARM_SWING_TOLERANCE = 15.0  # Degrees of shoulder-elbow deviation from vertical
_PARTIAL_REP_ROM = 80.0  # Minimum ROM degrees for a valid rep


class BicepCurlAnalyzer(BaseExerciseAnalyzer):
    """Analyzes bicep curls from side-facing video.

    Tracks left and right arms separately, averaging scores.
    """

    @property
    def exercise_type(self) -> ExerciseType:
        return ExerciseType.BICEP_CURL

    @property
    def recommended_camera_angle(self) -> CameraAngle:
        return CameraAngle.SIDE

    @property
    def required_landmarks(self) -> list[int]:
        return [
            PoseLandmark.LEFT_SHOULDER,
            PoseLandmark.RIGHT_SHOULDER,
            PoseLandmark.LEFT_ELBOW,
            PoseLandmark.RIGHT_ELBOW,
            PoseLandmark.LEFT_WRIST,
            PoseLandmark.RIGHT_WRIST,
        ]

    def analyze(self, sequence: PoseSequence) -> AnalysisResult:
        result = AnalysisResult(exercise_type=self.exercise_type)
        result.camera_angle = self.recommended_camera_angle

        # Separate smoothers and FSMs for each arm
        left_smoother = AngleSmoother("left_elbow", window=5)
        right_smoother = AngleSmoother("right_elbow", window=5)

        left_fsm = RepStateMachine(
            phases=[_EXTENDED, _CURLING, _CONTRACTED, _LOWERING],
            min_amplitude=20.0,
        )
        right_fsm = RepStateMachine(
            phases=[_EXTENDED, _CURLING, _CONTRACTED, _LOWERING],
            min_amplitude=20.0,
        )

        frame_qualities: list[float] = []
        left_rep_data: list[dict] = []
        right_rep_data: list[dict] = []
        left_rep_fq: list[float] = []
        right_rep_fq: list[float] = []
        left_swing_angles: list[float] = []
        right_swing_angles: list[float] = []

        for i, frame in enumerate(sequence.frames):
            quality = frame_quality_score(frame, self.required_landmarks)
            frame_qualities.append(quality)

            if not is_frame_usable(frame, self.required_landmarks):
                continue

            left_elbow, right_elbow = self._extract_elbow_angles(frame)
            left_swing, right_swing = self._extract_upper_arm_swing(frame)

            smoothed_left = left_smoother.update(left_elbow)
            smoothed_right = right_smoother.update(right_elbow)

            left_rep_fq.append(quality)
            right_rep_fq.append(quality)
            left_swing_angles.append(left_swing)
            right_swing_angles.append(right_swing)

            l_completed = left_fsm.update(
                value=smoothed_left,
                timestamp_ms=frame.timestamp_ms,
                frame_index=i,
                should_advance=self._should_advance,
            )
            r_completed = right_fsm.update(
                value=smoothed_right,
                timestamp_ms=frame.timestamp_ms,
                frame_index=i,
                should_advance=self._should_advance,
            )

            if l_completed is not None:
                left_rep_data.append({
                    "rep": l_completed,
                    "frame_qualities": list(left_rep_fq),
                    "swing_angles": list(left_swing_angles),
                })
                left_rep_fq = []
                left_swing_angles = []

            if r_completed is not None:
                right_rep_data.append({
                    "rep": r_completed,
                    "frame_qualities": list(right_rep_fq),
                    "swing_angles": list(right_swing_angles),
                })
                right_rep_fq = []
                right_swing_angles = []

        result.frame_qualities = frame_qualities

        # Merge reps: use whichever arm had more reps, but compute symmetry
        left_reps = self._build_rep_results(left_rep_data, "left")
        right_reps = self._build_rep_results(right_rep_data, "right")

        # Pair up reps and average scores
        max_reps = max(len(left_reps), len(right_reps))
        merged_reps: list[RepResult] = []

        for idx in range(max_reps):
            l_rep = left_reps[idx] if idx < len(left_reps) else None
            r_rep = right_reps[idx] if idx < len(right_reps) else None

            merged = self._merge_arm_reps(idx + 1, l_rep, r_rep)
            merged_reps.append(merged)

        result.reps = merged_reps
        result.rep_count = len(merged_reps)
        result.valid_rep_count = sum(
            1 for r in merged_reps if r.quality != RepQuality.INVALID
        )

        # Aggregates
        if result.reps:
            rom_scores = [r.range_of_motion_score for r in result.reps]
            sym_scores = [r.symmetry_score for r in result.reps]
            durations = [r.duration_ms for r in result.reps if r.duration_ms > 0]

            result.form_score = round(sum(rom_scores) / len(rom_scores), 1)
            result.aggregate_metrics = AggregateMetrics(
                avg_range_of_motion=round(sum(rom_scores) / len(rom_scores), 1),
                avg_symmetry=round(sum(sym_scores) / len(sym_scores), 1),
                avg_tempo_seconds=round(
                    sum(durations) / len(durations) / 1000, 2
                ) if durations else None,
                best_rep_index=max(
                    range(len(rom_scores)), key=lambda j: rom_scores[j]
                ) + 1,
                worst_rep_index=min(
                    range(len(rom_scores)), key=lambda j: rom_scores[j]
                ) + 1,
            )

        # Anti-cheat
        cheat_flags = self._check_cheat_flags(result)
        result.cheat_flags = cheat_flags

        avg_conf = (
            sum(r.confidence for r in result.reps) / len(result.reps)
            if result.reps
            else 0.0
        )
        result.analysis_confidence = round(avg_conf, 3)
        result.verification_status = self._determine_verification(
            avg_conf, cheat_flags
        )

        return result

    # -- helpers ---------------------------------------------------------------

    @staticmethod
    def _extract_elbow_angles(frame: FrameLandmarks) -> tuple[float, float]:
        """Return (left_elbow_angle, right_elbow_angle) in degrees."""
        lm = frame.landmarks

        l_shoulder = Point2D(lm[PoseLandmark.LEFT_SHOULDER].x, lm[PoseLandmark.LEFT_SHOULDER].y)
        l_elbow = Point2D(lm[PoseLandmark.LEFT_ELBOW].x, lm[PoseLandmark.LEFT_ELBOW].y)
        l_wrist = Point2D(lm[PoseLandmark.LEFT_WRIST].x, lm[PoseLandmark.LEFT_WRIST].y)

        r_shoulder = Point2D(lm[PoseLandmark.RIGHT_SHOULDER].x, lm[PoseLandmark.RIGHT_SHOULDER].y)
        r_elbow = Point2D(lm[PoseLandmark.RIGHT_ELBOW].x, lm[PoseLandmark.RIGHT_ELBOW].y)
        r_wrist = Point2D(lm[PoseLandmark.RIGHT_WRIST].x, lm[PoseLandmark.RIGHT_WRIST].y)

        left_angle = angle_2d(l_shoulder, l_elbow, l_wrist)
        right_angle = angle_2d(r_shoulder, r_elbow, r_wrist)

        return left_angle, right_angle

    @staticmethod
    def _extract_upper_arm_swing(frame: FrameLandmarks) -> tuple[float, float]:
        """Measure upper arm deviation from vertical (degrees). Higher = more swing."""
        lm = frame.landmarks

        l_shoulder = Point2D(lm[PoseLandmark.LEFT_SHOULDER].x, lm[PoseLandmark.LEFT_SHOULDER].y)
        l_elbow = Point2D(lm[PoseLandmark.LEFT_ELBOW].x, lm[PoseLandmark.LEFT_ELBOW].y)

        r_shoulder = Point2D(lm[PoseLandmark.RIGHT_SHOULDER].x, lm[PoseLandmark.RIGHT_SHOULDER].y)
        r_elbow = Point2D(lm[PoseLandmark.RIGHT_ELBOW].x, lm[PoseLandmark.RIGHT_ELBOW].y)

        # Create a vertical reference point below each shoulder
        l_vertical = Point2D(l_shoulder.x, l_shoulder.y + 0.2)
        r_vertical = Point2D(r_shoulder.x, r_shoulder.y + 0.2)

        left_swing = angle_2d(l_elbow, l_shoulder, l_vertical)
        right_swing = angle_2d(r_elbow, r_shoulder, r_vertical)

        return left_swing, right_swing

    @staticmethod
    def _should_advance(current_phase: str, value: float) -> Optional[str]:
        """Advance elbow angle through curl phases. Note: angle decreases during curl."""
        if current_phase == _EXTENDED and value < _MID_ANGLE:
            return _CURLING
        if current_phase == _CURLING and value <= _CONTRACTED_ANGLE:
            return _CONTRACTED
        if current_phase == _CONTRACTED and value > _MID_ANGLE:
            return _LOWERING
        if current_phase == _LOWERING and value >= _EXTENDED_ANGLE:
            return _EXTENDED
        return None

    def _build_rep_results(
        self,
        rep_data: list[dict],
        side: str,
    ) -> list[RepResult]:
        """Convert raw rep data into RepResult objects for one arm."""
        results: list[RepResult] = []
        for data in rep_data:
            rep_record = data["rep"]
            rom = rep_record.amplitude
            rom_sc = range_of_motion_score(rom, ideal_min=_PARTIAL_REP_ROM, ideal_max=140.0)
            conf = rep_confidence(data["frame_qualities"])
            tempo = tempo_from_duration(rep_record.duration_ms, expected_ms=3000)

            form_flags: list[str] = []
            avg_swing = (
                sum(data["swing_angles"]) / len(data["swing_angles"])
                if data["swing_angles"]
                else 0.0
            )
            if avg_swing > _UPPER_ARM_SWING_TOLERANCE:
                form_flags.append(f"{side}_arm_swinging")
            if rom < _PARTIAL_REP_ROM:
                form_flags.append(f"{side}_partial_rep")

            quality = self._classify_quality(rom_sc, form_flags, conf)

            results.append(RepResult(
                rep_index=rep_record.index,
                start_time_ms=rep_record.start_ms,
                end_time_ms=rep_record.end_ms,
                duration_ms=rep_record.duration_ms,
                quality=quality,
                confidence=round(conf, 3),
                range_of_motion_score=round(rom_sc, 1),
                tempo_score=round(tempo, 1),
                symmetry_score=100.0,  # Updated during merge
                form_flags=form_flags,
                metrics=RepMetrics(
                    primary_angle_min=round(rep_record.peak_value, 1),
                    primary_angle_max=round(rep_record.trough_value, 1),
                    range_of_motion=round(rom, 1),
                    tempo_seconds=round(rep_record.duration_ms / 1000, 2),
                ),
            ))
        return results

    @staticmethod
    def _merge_arm_reps(
        index: int,
        left: Optional[RepResult],
        right: Optional[RepResult],
    ) -> RepResult:
        """Merge left and right arm rep results, averaging scores."""
        if left is None and right is not None:
            return RepResult(
                rep_index=index,
                start_time_ms=right.start_time_ms,
                end_time_ms=right.end_time_ms,
                duration_ms=right.duration_ms,
                quality=right.quality,
                confidence=right.confidence,
                range_of_motion_score=right.range_of_motion_score,
                tempo_score=right.tempo_score,
                symmetry_score=0.0,
                form_flags=right.form_flags + ["missing_left_arm_data"],
                metrics=right.metrics,
            )
        if right is None and left is not None:
            return RepResult(
                rep_index=index,
                start_time_ms=left.start_time_ms,
                end_time_ms=left.end_time_ms,
                duration_ms=left.duration_ms,
                quality=left.quality,
                confidence=left.confidence,
                range_of_motion_score=left.range_of_motion_score,
                tempo_score=left.tempo_score,
                symmetry_score=0.0,
                form_flags=left.form_flags + ["missing_right_arm_data"],
                metrics=left.metrics,
            )

        # Both arms present — average
        assert left is not None and right is not None
        avg_rom = (left.range_of_motion_score + right.range_of_motion_score) / 2
        avg_tempo = (left.tempo_score + right.tempo_score) / 2
        avg_conf = (left.confidence + right.confidence) / 2

        left_rom = left.metrics.range_of_motion or 0.0
        right_rom = right.metrics.range_of_motion or 0.0
        sym = symmetry_score(left_rom, right_rom)

        combined_flags = list(set(left.form_flags + right.form_flags))
        if sym < 70:
            combined_flags.append("asymmetric_arms")

        quality = RepQuality.GOOD
        if avg_conf < 0.3:
            quality = RepQuality.INVALID
        elif avg_rom < 40 or sym < 50:
            quality = RepQuality.POOR
        elif avg_rom < 70 or combined_flags:
            quality = RepQuality.ACCEPTABLE

        return RepResult(
            rep_index=index,
            start_time_ms=min(left.start_time_ms, right.start_time_ms),
            end_time_ms=max(left.end_time_ms, right.end_time_ms),
            duration_ms=max(left.duration_ms, right.duration_ms),
            quality=quality,
            confidence=round(avg_conf, 3),
            range_of_motion_score=round(avg_rom, 1),
            tempo_score=round(avg_tempo, 1),
            symmetry_score=round(sym, 1),
            form_flags=combined_flags,
            metrics=RepMetrics(
                primary_angle_min=round(
                    ((left.metrics.primary_angle_min or 0) + (right.metrics.primary_angle_min or 0)) / 2, 1
                ),
                primary_angle_max=round(
                    ((left.metrics.primary_angle_max or 0) + (right.metrics.primary_angle_max or 0)) / 2, 1
                ),
                range_of_motion=round((left_rom + right_rom) / 2, 1),
                symmetry_left_right=round(sym, 1),
                tempo_seconds=round(max(left.duration_ms, right.duration_ms) / 1000, 2),
            ),
        )

    @staticmethod
    def _classify_quality(
        rom_score: float, form_flags: list[str], confidence: float
    ) -> RepQuality:
        if confidence < 0.3:
            return RepQuality.INVALID
        if rom_score >= 70 and not form_flags:
            return RepQuality.GOOD
        if rom_score >= 40:
            return RepQuality.ACCEPTABLE
        return RepQuality.POOR
