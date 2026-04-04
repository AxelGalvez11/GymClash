"""Shoulder press exercise analyzer."""
from __future__ import annotations

from typing import Optional

from app.analysis.base import BaseExerciseAnalyzer, AnalysisResult
from app.analysis.common.angles import (
    Point2D,
    angle_2d,
    distance_2d,
    range_of_motion_score,
    symmetry_score,
    tempo_from_duration,
    vertical_displacement,
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
_RACKED = "racked"
_PRESSING = "pressing"
_LOCKOUT = "lockout"
_LOWERING = "lowering"

# Angle thresholds (degrees)
_RACKED_ANGLE = 90.0  # Elbow at ~90 degrees
_LOCKOUT_ANGLE = 160.0  # Elbow nearly straight overhead
_MID_ANGLE = 125.0  # Midpoint for transitions

# Form thresholds
_INCOMPLETE_LOCKOUT_ANGLE = 150.0  # Below this at top = incomplete lockout
_ASYMMETRY_THRESHOLD = 70.0  # Symmetry score below this triggers flag
_TORSO_SWAY_THRESHOLD = 0.03  # Hip lateral movement (normalised coords)


class ShoulderPressAnalyzer(BaseExerciseAnalyzer):
    """Analyzes shoulder press from front-facing video."""

    @property
    def exercise_type(self) -> ExerciseType:
        return ExerciseType.SHOULDER_PRESS

    @property
    def recommended_camera_angle(self) -> CameraAngle:
        return CameraAngle.FRONT

    @property
    def required_landmarks(self) -> list[int]:
        return [
            PoseLandmark.LEFT_SHOULDER,
            PoseLandmark.RIGHT_SHOULDER,
            PoseLandmark.LEFT_ELBOW,
            PoseLandmark.RIGHT_ELBOW,
            PoseLandmark.LEFT_WRIST,
            PoseLandmark.RIGHT_WRIST,
            PoseLandmark.LEFT_HIP,
            PoseLandmark.RIGHT_HIP,
        ]

    def analyze(self, sequence: PoseSequence) -> AnalysisResult:
        result = AnalysisResult(exercise_type=self.exercise_type)
        result.camera_angle = self.recommended_camera_angle

        # Use average of both elbows as primary metric
        elbow_smoother = AngleSmoother("avg_elbow", window=5)
        left_smoother = AngleSmoother("left_elbow", window=5)
        right_smoother = AngleSmoother("right_elbow", window=5)

        fsm = RepStateMachine(
            phases=[_RACKED, _PRESSING, _LOCKOUT, _LOWERING],
            min_amplitude=30.0,
        )

        frame_qualities: list[float] = []
        rep_frame_qualities: list[float] = []
        per_rep_data: list[dict] = []

        current_rep_metrics: dict = {
            "left_angles": [],
            "right_angles": [],
            "hip_positions": [],
            "wrist_heights": [],
        }

        # Track initial hip position for sway detection
        initial_hip_x: Optional[float] = None

        for i, frame in enumerate(sequence.frames):
            quality = frame_quality_score(frame, self.required_landmarks)
            frame_qualities.append(quality)

            if not is_frame_usable(frame, self.required_landmarks):
                continue

            left_angle, right_angle = self._extract_elbow_angles(frame)
            hip_x = self._extract_hip_center_x(frame)
            left_wrist_h, right_wrist_h = self._extract_wrist_heights(frame)

            if initial_hip_x is None:
                initial_hip_x = hip_x

            smoothed_left = left_smoother.update(left_angle)
            smoothed_right = right_smoother.update(right_angle)
            avg_angle = (smoothed_left + smoothed_right) / 2
            smoothed_avg = elbow_smoother.update(avg_angle)

            current_rep_metrics["left_angles"].append(smoothed_left)
            current_rep_metrics["right_angles"].append(smoothed_right)
            current_rep_metrics["hip_positions"].append(hip_x)
            current_rep_metrics["wrist_heights"].append(
                (left_wrist_h + right_wrist_h) / 2
            )
            rep_frame_qualities.append(quality)

            completed = fsm.update(
                value=smoothed_avg,
                timestamp_ms=frame.timestamp_ms,
                frame_index=i,
                should_advance=self._should_advance,
            )

            if completed is not None:
                per_rep_data.append({
                    "rep": completed,
                    "left_angles": list(current_rep_metrics["left_angles"]),
                    "right_angles": list(current_rep_metrics["right_angles"]),
                    "hip_positions": list(current_rep_metrics["hip_positions"]),
                    "wrist_heights": list(current_rep_metrics["wrist_heights"]),
                    "frame_qualities": list(rep_frame_qualities),
                    "initial_hip_x": initial_hip_x or hip_x,
                })
                current_rep_metrics = {
                    "left_angles": [],
                    "right_angles": [],
                    "hip_positions": [],
                    "wrist_heights": [],
                }
                rep_frame_qualities = []

        result.frame_qualities = frame_qualities
        result.rep_count = fsm.rep_count

        # Build per-rep results
        for data in per_rep_data:
            rep_record = data["rep"]
            left_angles = data["left_angles"]
            right_angles = data["right_angles"]
            hip_positions = data["hip_positions"]

            rom = rep_record.amplitude
            rom_sc = range_of_motion_score(rom, ideal_min=60.0, ideal_max=100.0)

            # Lockout quality: how close max angle gets to full extension
            max_left = max(left_angles) if left_angles else 0
            max_right = max(right_angles) if right_angles else 0
            lockout_quality = min(max_left, max_right)
            lockout_sc = min(100.0, (lockout_quality / _LOCKOUT_ANGLE) * 100)

            # Symmetry: compare left vs right peak angles
            sym = symmetry_score(max_left, max_right)

            # Torso sway: max hip lateral deviation
            ref_hip = data["initial_hip_x"]
            max_sway = max(
                (abs(h - ref_hip) for h in hip_positions), default=0.0
            )

            conf = rep_confidence(data["frame_qualities"])
            tempo = tempo_from_duration(rep_record.duration_ms, expected_ms=3000)

            form_flags = self._form_flags(lockout_quality, sym, max_sway)
            quality = self._classify_quality(rom_sc, form_flags, conf)

            # Weighted form score per rep
            rep_form = rom_sc * 0.4 + lockout_sc * 0.3 + sym * 0.2 + tempo * 0.1

            rep_result = RepResult(
                rep_index=rep_record.index,
                start_time_ms=rep_record.start_ms,
                end_time_ms=rep_record.end_ms,
                duration_ms=rep_record.duration_ms,
                quality=quality,
                confidence=round(conf, 3),
                range_of_motion_score=round(rom_sc, 1),
                tempo_score=round(tempo, 1),
                symmetry_score=round(sym, 1),
                form_flags=form_flags,
                metrics=RepMetrics(
                    primary_angle_min=round(rep_record.peak_value, 1),
                    primary_angle_max=round(rep_record.trough_value, 1),
                    range_of_motion=round(rom, 1),
                    lockout_score=round(lockout_sc, 1),
                    symmetry_left_right=round(sym, 1),
                    torso_lean=round(max_sway, 4),
                    tempo_seconds=round(rep_record.duration_ms / 1000, 2),
                ),
            )
            result.reps.append(rep_result)

        result.valid_rep_count = sum(
            1 for r in result.reps if r.quality != RepQuality.INVALID
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
    def _extract_hip_center_x(frame: FrameLandmarks) -> float:
        """Return horizontal center of hips (normalised x)."""
        lm = frame.landmarks
        return (lm[PoseLandmark.LEFT_HIP].x + lm[PoseLandmark.RIGHT_HIP].x) / 2

    @staticmethod
    def _extract_wrist_heights(frame: FrameLandmarks) -> tuple[float, float]:
        """Return (left_wrist_y, right_wrist_y) — lower y = higher position."""
        lm = frame.landmarks
        return lm[PoseLandmark.LEFT_WRIST].y, lm[PoseLandmark.RIGHT_WRIST].y

    @staticmethod
    def _should_advance(current_phase: str, value: float) -> Optional[str]:
        """Advance average elbow angle through press phases."""
        if current_phase == _RACKED and value > _MID_ANGLE:
            return _PRESSING
        if current_phase == _PRESSING and value >= _LOCKOUT_ANGLE:
            return _LOCKOUT
        if current_phase == _LOCKOUT and value < _MID_ANGLE:
            return _LOWERING
        if current_phase == _LOWERING and value <= _RACKED_ANGLE:
            return _RACKED
        return None

    @staticmethod
    def _form_flags(
        lockout_angle: float, sym: float, max_sway: float
    ) -> list[str]:
        flags: list[str] = []
        if lockout_angle < _INCOMPLETE_LOCKOUT_ANGLE:
            flags.append("incomplete_lockout")
        if sym < _ASYMMETRY_THRESHOLD:
            flags.append("asymmetric_press")
        if max_sway > _TORSO_SWAY_THRESHOLD:
            flags.append("excessive_lean_back")
        return flags

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
