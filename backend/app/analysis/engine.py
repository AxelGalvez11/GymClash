"""Analysis engine that orchestrates video processing and exercise analysis."""
from __future__ import annotations
import time
from typing import Optional

from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import (
    ExerciseType, CameraAngle, AnalysisResponse, VideoSummary,
    SupportedExercise, DebugInfo,
)
from app.services.pose_service import PoseService
from app.analysis.base import BaseExerciseAnalyzer

# Import all analyzers
from app.analysis.exercises.squat import SquatAnalyzer
from app.analysis.exercises.push_up import PushUpAnalyzer
from app.analysis.exercises.lunge import LungeAnalyzer
from app.analysis.exercises.future.stubs import get_future_analyzers


class AnalysisEngine:
    """Orchestrates video analysis using the appropriate exercise analyzer."""

    def __init__(self) -> None:
        self._pose_service = PoseService()
        self._analyzers: dict[ExerciseType, BaseExerciseAnalyzer] = {}
        self._register_analyzers()

    def _register_analyzers(self) -> None:
        """Register all available exercise analyzers."""
        implemented: list[BaseExerciseAnalyzer] = [
            SquatAnalyzer(),
            PushUpAnalyzer(),
            LungeAnalyzer(),
        ]
        for a in implemented:
            self._analyzers[a.exercise_type] = a

        for a in get_future_analyzers():
            self._analyzers[a.exercise_type] = a

        logger.info(f"Registered {len(self._analyzers)} exercise analyzers")

    def get_supported_exercises(self) -> list[SupportedExercise]:
        """List all supported exercises with metadata."""
        return [
            SupportedExercise(
                type=a.exercise_type,
                name=a.exercise_type.value.replace("_", " ").title(),
                implemented=a.is_implemented,
                recommended_camera_angle=a.recommended_camera_angle,
                description=a.description,
            )
            for a in self._analyzers.values()
        ]

    def analyze(
        self,
        video_path: str,
        exercise_type: ExerciseType,
        camera_angle: CameraAngle = CameraAngle.UNKNOWN,
        user_id: Optional[str] = None,
    ) -> AnalysisResponse:
        """
        Full analysis pipeline:
        1. Validate exercise type
        2. Process video with MediaPipe
        3. Run exercise-specific analyzer
        4. Build response
        """
        start_time = time.monotonic()

        # Get analyzer
        analyzer = self._analyzers.get(exercise_type)
        if analyzer is None:
            raise ValueError(f"Unsupported exercise type: {exercise_type.value}")
        if not analyzer.is_implemented:
            raise ValueError(
                f"{exercise_type.value} analysis is not yet implemented. "
                f"Reason: {analyzer.description}"
            )

        # Process video
        logger.info(f"Starting analysis: {exercise_type.value}")
        sequence = self._pose_service.process_video(video_path)

        # Run analyzer
        result = analyzer.analyze(sequence)
        result.camera_angle = camera_angle

        # Build response
        elapsed_ms = int((time.monotonic() - start_time) * 1000)

        video_summary = VideoSummary(
            duration_ms=sequence.metadata.duration_ms,
            total_frames=sequence.metadata.total_frames,
            sampled_frames=sequence.sampled_count,
            fps=sequence.metadata.fps,
            resolution_width=sequence.metadata.width,
            resolution_height=sequence.metadata.height,
        )

        debug = None
        if settings.enable_debug_output:
            valid_frames = [f for f in sequence.frames if f.has_pose]
            debug = DebugInfo(
                sampled_frame_count=sequence.sampled_count,
                rejected_frame_count=sequence.rejected_count,
                avg_landmark_confidence=(
                    sum(f.avg_visibility for f in valid_frames) / len(valid_frames)
                    if valid_frames else 0.0
                ),
                min_landmark_confidence=(
                    min((f.avg_visibility for f in valid_frames), default=0.0)
                ),
                phase_transitions=[
                    {
                        "from": t.from_phase,
                        "to": t.to_phase,
                        "ms": t.timestamp_ms,
                    }
                    for t in (
                        analyzer._state_machine.all_transitions
                        if hasattr(analyzer, "_state_machine")
                        else []
                    )
                ],
                processing_time_ms=elapsed_ms,
            )

        return AnalysisResponse(
            exercise_type=exercise_type,
            video_summary=video_summary,
            rep_count=result.rep_count,
            valid_rep_count=result.valid_rep_count,
            form_score=result.form_score,
            analysis_confidence=result.analysis_confidence,
            verification_status=result.verification_status,
            camera_angle=result.camera_angle,
            cheat_flags=result.cheat_flags,
            warnings=result.warnings,
            aggregate_metrics=result.aggregate_metrics,
            reps=result.reps,
            debug=debug,
        )
