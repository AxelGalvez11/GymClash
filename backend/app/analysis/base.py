"""Base class for exercise analyzers."""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

from app.models.schemas import (
    ExerciseType, CameraAngle, RepResult, RepMetrics, RepQuality,
    AggregateMetrics, VerificationStatus,
)
from app.services.pose_service import PoseSequence, FrameLandmarks
from app.analysis.common.quality import PoseLandmark


@dataclass
class AnalysisResult:
    """Internal analysis result before conversion to API response."""
    exercise_type: ExerciseType
    rep_count: int = 0
    valid_rep_count: int = 0
    form_score: float = 0.0
    analysis_confidence: float = 0.0
    verification_status: VerificationStatus = VerificationStatus.NEEDS_REVIEW
    camera_angle: CameraAngle = CameraAngle.UNKNOWN
    cheat_flags: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    aggregate_metrics: AggregateMetrics = field(default_factory=AggregateMetrics)
    reps: list[RepResult] = field(default_factory=list)
    frame_qualities: list[float] = field(default_factory=list)


class BaseExerciseAnalyzer(ABC):
    """
    Abstract base for exercise-specific analyzers.

    Each concrete analyzer must define:
    - exercise_type: which exercise this handles
    - required_landmarks: MediaPipe landmark indices needed
    - recommended_camera_angle: best camera position
    - analyze(): full analysis pipeline
    """

    @property
    @abstractmethod
    def exercise_type(self) -> ExerciseType:
        ...

    @property
    @abstractmethod
    def required_landmarks(self) -> list[int]:
        """MediaPipe PoseLandmark indices required for this exercise."""
        ...

    @property
    @abstractmethod
    def recommended_camera_angle(self) -> CameraAngle:
        ...

    @property
    def is_implemented(self) -> bool:
        """Override to False for placeholder/future analyzers."""
        return True

    @property
    def description(self) -> str:
        return f"{self.exercise_type.value} analyzer"

    @abstractmethod
    def analyze(self, sequence: PoseSequence) -> AnalysisResult:
        """Run full analysis on a pose sequence. Returns AnalysisResult."""
        ...

    def _check_cheat_flags(self, result: AnalysisResult) -> list[str]:
        """
        Common anti-cheat heuristics. Subclasses can extend.
        """
        flags: list[str] = []

        if result.rep_count > 0:
            # Check for tiny range of motion
            rom_scores = [r.range_of_motion_score for r in result.reps]
            if rom_scores and sum(rom_scores) / len(rom_scores) < 20:
                flags.append("extremely_small_range_of_motion")

            # Check for implausible tempo
            durations = [r.duration_ms for r in result.reps if r.duration_ms > 0]
            if durations:
                avg_dur = sum(durations) / len(durations)
                if avg_dur < 500:  # < 0.5s per rep
                    flags.append("implausible_rep_tempo_too_fast")
                if avg_dur > 30000:  # > 30s per rep
                    flags.append("implausible_rep_tempo_too_slow")

            # Check for suspiciously identical reps
            if len(rom_scores) >= 3:
                mean = sum(rom_scores) / len(rom_scores)
                variance = sum(
                    (s - mean) ** 2 for s in rom_scores
                ) / len(rom_scores)
                if variance < 0.01:
                    flags.append("suspiciously_identical_reps")

        # Low confidence frames
        if result.frame_qualities:
            low_conf = sum(1 for q in result.frame_qualities if q < 0.3)
            if low_conf / len(result.frame_qualities) > 0.5:
                flags.append("excessive_low_confidence_frames")

        return flags

    def _determine_verification(
        self,
        confidence: float,
        cheat_flags: list[str],
    ) -> VerificationStatus:
        """Determine verification status from confidence and flags."""
        if any("extremely" in f or "implausible" in f for f in cheat_flags):
            return VerificationStatus.REJECTED
        if cheat_flags or confidence < 0.5:
            return VerificationStatus.NEEDS_REVIEW
        if confidence >= 0.7:
            return VerificationStatus.VERIFIED
        return VerificationStatus.NEEDS_REVIEW
