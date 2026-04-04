"""Jumping jack exercise analyzer."""
from __future__ import annotations

from typing import Optional

from app.analysis.base import BaseExerciseAnalyzer, AnalysisResult
from app.analysis.common.angles import (
    Point2D,
    distance_2d,
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
_CLOSED = "closed"
_OPENING = "opening"
_OPEN = "open"
_CLOSING = "closing"

# Thresholds (normalised image coordinates)
_ARM_OVERHEAD_THRESHOLD = 0.15  # Wrist must be this far above shoulder (y decreases upward)
_ARM_DOWN_THRESHOLD = 0.05  # Wrist near or below shoulder level
_LEG_SPREAD_OPEN = 0.20  # Ankle-to-ankle distance for "open"
_LEG_SPREAD_CLOSED = 0.10  # Ankle-to-ankle distance for "closed"

# Form deduction thresholds
_MIN_LEG_SPREAD = 0.12
_MIN_ARM_RAISE = 0.10
_RHYTHM_CV_THRESHOLD = 0.35  # Coefficient of variation for rhythm consistency


class JumpingJackAnalyzer(BaseExerciseAnalyzer):
    """Analyzes jumping jacks from front-facing video."""

    @property
    def exercise_type(self) -> ExerciseType:
        return ExerciseType.JUMPING_JACK

    @property
    def recommended_camera_angle(self) -> CameraAngle:
        return CameraAngle.FRONT

    @property
    def required_landmarks(self) -> list[int]:
        return [
            PoseLandmark.LEFT_SHOULDER,
            PoseLandmark.RIGHT_SHOULDER,
            PoseLandmark.LEFT_HIP,
            PoseLandmark.RIGHT_HIP,
            PoseLandmark.LEFT_WRIST,
            PoseLandmark.RIGHT_WRIST,
            PoseLandmark.LEFT_ANKLE,
            PoseLandmark.RIGHT_ANKLE,
        ]

    def analyze(self, sequence: PoseSequence) -> AnalysisResult:
        result = AnalysisResult(exercise_type=self.exercise_type)
        result.camera_angle = self.recommended_camera_angle

        arm_smoother = AngleSmoother("arm_height", window=5)
        leg_smoother = AngleSmoother("leg_spread", window=5)

        fsm = RepStateMachine(
            phases=[_CLOSED, _OPENING, _OPEN, _CLOSING],
            min_amplitude=0.05,
        )

        frame_qualities: list[float] = []
        rep_frame_qualities: list[float] = []
        per_rep_data: list[dict] = []
        current_rep_metrics: dict = {"arm_heights": [], "leg_spreads": []}

        for i, frame in enumerate(sequence.frames):
            quality = frame_quality_score(frame, self.required_landmarks)
            frame_qualities.append(quality)

            if not is_frame_usable(frame, self.required_landmarks):
                continue

            arm_height, leg_spread = self._extract_metrics(frame)
            smoothed_arm = arm_smoother.update(arm_height)
            smoothed_leg = leg_smoother.update(leg_spread)

            combined = smoothed_arm + smoothed_leg
            current_rep_metrics["arm_heights"].append(smoothed_arm)
            current_rep_metrics["leg_spreads"].append(smoothed_leg)
            rep_frame_qualities.append(quality)

            completed = fsm.update(
                value=combined,
                timestamp_ms=frame.timestamp_ms,
                frame_index=i,
                should_advance=self._should_advance,
            )

            if completed is not None:
                per_rep_data.append({
                    "rep": completed,
                    "arm_heights": list(current_rep_metrics["arm_heights"]),
                    "leg_spreads": list(current_rep_metrics["leg_spreads"]),
                    "frame_qualities": list(rep_frame_qualities),
                })
                current_rep_metrics = {"arm_heights": [], "leg_spreads": []}
                rep_frame_qualities = []

        result.frame_qualities = frame_qualities
        result.rep_count = fsm.rep_count

        # Build per-rep results
        durations: list[float] = []
        for data in per_rep_data:
            rep_record = data["rep"]
            arm_heights = data["arm_heights"]
            leg_spreads = data["leg_spreads"]

            max_arm = max(arm_heights) if arm_heights else 0.0
            max_leg = max(leg_spreads) if leg_spreads else 0.0

            rom_score = self._rom_score(max_arm, max_leg)
            form_flags = self._form_flags(max_arm, max_leg)
            conf = rep_confidence(data["frame_qualities"])
            tempo = tempo_from_duration(rep_record.duration_ms, expected_ms=1500)
            durations.append(rep_record.duration_ms)

            quality = self._classify_quality(rom_score, form_flags, conf)

            rep_result = RepResult(
                rep_index=rep_record.index,
                start_time_ms=rep_record.start_ms,
                end_time_ms=rep_record.end_ms,
                duration_ms=rep_record.duration_ms,
                quality=quality,
                confidence=round(conf, 3),
                range_of_motion_score=round(rom_score, 1),
                tempo_score=round(tempo, 1),
                symmetry_score=100.0,  # Jumping jacks are inherently symmetric
                form_flags=form_flags,
                metrics=RepMetrics(
                    range_of_motion=round(max_arm + max_leg, 3),
                    tempo_seconds=round(rep_record.duration_ms / 1000, 2),
                ),
            )
            result.reps.append(rep_result)

        result.valid_rep_count = sum(
            1 for r in result.reps if r.quality != RepQuality.INVALID
        )

        # Aggregate metrics
        if result.reps:
            rom_scores = [r.range_of_motion_score for r in result.reps]
            tempo_scores = [r.tempo_score for r in result.reps]
            result.form_score = round(sum(rom_scores) / len(rom_scores), 1)

            rhythm_consistency = self._rhythm_consistency(durations)

            result.aggregate_metrics = AggregateMetrics(
                avg_range_of_motion=round(sum(rom_scores) / len(rom_scores), 1),
                avg_tempo_seconds=round(
                    sum(d for d in durations) / len(durations) / 1000, 2
                ) if durations else None,
                tempo_consistency=round(rhythm_consistency, 1),
                best_rep_index=max(
                    range(len(rom_scores)), key=lambda idx: rom_scores[idx]
                ) + 1,
                worst_rep_index=min(
                    range(len(rom_scores)), key=lambda idx: rom_scores[idx]
                ) + 1,
            )

        # Anti-cheat and verification
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
    def _extract_metrics(frame: FrameLandmarks) -> tuple[float, float]:
        """Return (arm_height, leg_spread) from a frame."""
        lm = frame.landmarks

        l_shoulder = Point2D(lm[PoseLandmark.LEFT_SHOULDER].x, lm[PoseLandmark.LEFT_SHOULDER].y)
        r_shoulder = Point2D(lm[PoseLandmark.RIGHT_SHOULDER].x, lm[PoseLandmark.RIGHT_SHOULDER].y)
        l_wrist = Point2D(lm[PoseLandmark.LEFT_WRIST].x, lm[PoseLandmark.LEFT_WRIST].y)
        r_wrist = Point2D(lm[PoseLandmark.RIGHT_WRIST].x, lm[PoseLandmark.RIGHT_WRIST].y)
        l_ankle = Point2D(lm[PoseLandmark.LEFT_ANKLE].x, lm[PoseLandmark.LEFT_ANKLE].y)
        r_ankle = Point2D(lm[PoseLandmark.RIGHT_ANKLE].x, lm[PoseLandmark.RIGHT_ANKLE].y)

        # Arm height: average how far wrists are above shoulders (y decreases upward)
        l_arm_raise = max(0.0, l_shoulder.y - l_wrist.y)
        r_arm_raise = max(0.0, r_shoulder.y - r_wrist.y)
        arm_height = (l_arm_raise + r_arm_raise) / 2

        # Leg spread: horizontal distance between ankles
        leg_spread = abs(l_ankle.x - r_ankle.x)

        return arm_height, leg_spread

    @staticmethod
    def _should_advance(current_phase: str, value: float) -> Optional[str]:
        """Determine next phase based on combined arm+leg metric."""
        open_threshold = _ARM_OVERHEAD_THRESHOLD + _LEG_SPREAD_OPEN
        closed_threshold = _ARM_DOWN_THRESHOLD + _LEG_SPREAD_CLOSED
        mid_threshold = (open_threshold + closed_threshold) / 2

        if current_phase == _CLOSED and value > mid_threshold:
            return _OPENING
        if current_phase == _OPENING and value >= open_threshold:
            return _OPEN
        if current_phase == _OPEN and value < mid_threshold:
            return _CLOSING
        if current_phase == _CLOSING and value <= closed_threshold:
            return _CLOSED
        return None

    @staticmethod
    def _rom_score(max_arm: float, max_leg: float) -> float:
        """Score range of motion (0-100)."""
        arm_score = min(100.0, (max_arm / _ARM_OVERHEAD_THRESHOLD) * 100)
        leg_score = min(100.0, (max_leg / _LEG_SPREAD_OPEN) * 100)
        return (arm_score + leg_score) / 2

    @staticmethod
    def _form_flags(max_arm: float, max_leg: float) -> list[str]:
        flags: list[str] = []
        if max_arm < _MIN_ARM_RAISE:
            flags.append("partial_arm_raise")
        if max_leg < _MIN_LEG_SPREAD:
            flags.append("narrow_leg_spread")
        return flags

    @staticmethod
    def _rhythm_consistency(durations: list[float]) -> float:
        """Score rhythm consistency (0-100). Lower CV = higher score."""
        if len(durations) < 2:
            return 100.0
        mean = sum(durations) / len(durations)
        if mean < 1e-9:
            return 0.0
        variance = sum((d - mean) ** 2 for d in durations) / len(durations)
        cv = (variance ** 0.5) / mean
        if cv > _RHYTHM_CV_THRESHOLD:
            return max(0.0, 100.0 * (1.0 - (cv - _RHYTHM_CV_THRESHOLD) * 3))
        return 100.0

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
