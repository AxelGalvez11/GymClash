"""Placeholder analyzers for future exercises with documented challenges."""
from __future__ import annotations

from app.analysis.base import BaseExerciseAnalyzer, AnalysisResult
from app.analysis.common.quality import PoseLandmark
from app.models.schemas import CameraAngle, ExerciseType
from app.services.pose_service import PoseSequence


class FutureAnalyzer(BaseExerciseAnalyzer):
    """Base for not-yet-implemented analyzers."""

    def __init__(
        self,
        exercise: ExerciseType,
        angle: CameraAngle,
        desc: str,
        landmarks: list[int],
    ) -> None:
        self._exercise = exercise
        self._angle = angle
        self._desc = desc
        self._landmarks = landmarks

    @property
    def exercise_type(self) -> ExerciseType:
        return self._exercise

    @property
    def required_landmarks(self) -> list[int]:
        return self._landmarks

    @property
    def recommended_camera_angle(self) -> CameraAngle:
        return self._angle

    @property
    def is_implemented(self) -> bool:
        return False

    @property
    def description(self) -> str:
        return self._desc

    def analyze(self, sequence: PoseSequence) -> AnalysisResult:
        raise ValueError(
            f"{self._exercise.value} analysis not yet implemented: {self._desc}"
        )


def get_future_analyzers() -> list[BaseExerciseAnalyzer]:
    """Return all placeholder analyzers for future exercises."""
    return [
        FutureAnalyzer(
            ExerciseType.DEADLIFT,
            CameraAngle.SIDE,
            "Requires side camera for hip hinge detection. Barbell occludes "
            "landmarks. Floor-level start position loses ankle/foot tracking.",
            [
                PoseLandmark.LEFT_HIP,
                PoseLandmark.RIGHT_HIP,
                PoseLandmark.LEFT_KNEE,
                PoseLandmark.RIGHT_KNEE,
                PoseLandmark.LEFT_SHOULDER,
                PoseLandmark.RIGHT_SHOULDER,
            ],
        ),
        FutureAnalyzer(
            ExerciseType.BENCH_PRESS,
            CameraAngle.SIDE,
            "Horizontal position loses most landmarks. Camera must be "
            "overhead or lateral. Bench occludes torso.",
            [
                PoseLandmark.LEFT_SHOULDER,
                PoseLandmark.RIGHT_SHOULDER,
                PoseLandmark.LEFT_ELBOW,
                PoseLandmark.RIGHT_ELBOW,
                PoseLandmark.LEFT_WRIST,
                PoseLandmark.RIGHT_WRIST,
            ],
        ),
        FutureAnalyzer(
            ExerciseType.PULL_UP,
            CameraAngle.FRONT,
            "Bar occludes hands/wrists. Must see from side or front. "
            "Top position has overlapping landmarks.",
            [
                PoseLandmark.LEFT_SHOULDER,
                PoseLandmark.RIGHT_SHOULDER,
                PoseLandmark.LEFT_ELBOW,
                PoseLandmark.RIGHT_ELBOW,
            ],
        ),
        FutureAnalyzer(
            ExerciseType.ROW,
            CameraAngle.SIDE,
            "Hip hinge with barbell occlusion. Cable vs barbell rows have "
            "different biomechanics. Requires torso angle tracking.",
            [
                PoseLandmark.LEFT_SHOULDER,
                PoseLandmark.RIGHT_SHOULDER,
                PoseLandmark.LEFT_ELBOW,
                PoseLandmark.RIGHT_ELBOW,
                PoseLandmark.LEFT_HIP,
                PoseLandmark.RIGHT_HIP,
            ],
        ),
        FutureAnalyzer(
            ExerciseType.BURPEE,
            CameraAngle.SIDE,
            "Multi-phase compound movement (squat->pushup->jump). Rapid "
            "transitions confuse tracking. Requires detecting 3+ distinct "
            "positions.",
            [
                PoseLandmark.LEFT_SHOULDER,
                PoseLandmark.RIGHT_SHOULDER,
                PoseLandmark.LEFT_HIP,
                PoseLandmark.RIGHT_HIP,
                PoseLandmark.LEFT_KNEE,
                PoseLandmark.RIGHT_KNEE,
                PoseLandmark.LEFT_ANKLE,
                PoseLandmark.RIGHT_ANKLE,
            ],
        ),
    ]
