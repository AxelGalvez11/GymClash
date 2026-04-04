"""Squat exercise analyzer."""
from __future__ import annotations

from typing import Optional

from app.models.schemas import (
    ExerciseType, CameraAngle, RepResult, RepMetrics, RepQuality,
    AggregateMetrics, VerificationStatus,
)
from app.services.pose_service import PoseSequence, FrameLandmarks
from app.analysis.base import BaseExerciseAnalyzer, AnalysisResult
from app.analysis.common.quality import (
    PoseLandmark, frame_quality_score, is_frame_usable,
    rep_confidence, overall_analysis_confidence,
)
from app.analysis.common.angles import (
    Point2D, angle_2d, symmetry_score, tempo_from_duration,
    range_of_motion_score,
)
from app.analysis.common.smoothing import AngleSmoother
from app.analysis.common.state_machine import RepStateMachine

# Phase thresholds (knee angle in degrees)
_STANDING_ANGLE = 150.0
_BOTTOM_ANGLE = 100.0
_IDEAL_DEPTH_MIN = 60.0  # ROM range for scoring
_IDEAL_DEPTH_MAX = 100.0
_EXPECTED_REP_MS = 3000


class SquatAnalyzer(BaseExerciseAnalyzer):
    """Analyzes squat form using knee angle as the primary metric."""

    @property
    def exercise_type(self) -> ExerciseType:
        return ExerciseType.SQUAT

    @property
    def required_landmarks(self) -> list[int]:
        return [
            PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
            PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
            PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE,
            PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
        ]

    @property
    def recommended_camera_angle(self) -> CameraAngle:
        return CameraAngle.SIDE

    @property
    def description(self) -> str:
        return "Squat analyzer — tracks knee angle, hip depth, torso lean, symmetry"

    def analyze(self, sequence: PoseSequence) -> AnalysisResult:
        result = AnalysisResult(exercise_type=ExerciseType.SQUAT)

        # Smoothers
        left_knee_sm = AngleSmoother("left_knee")
        right_knee_sm = AngleSmoother("right_knee")
        torso_sm = AngleSmoother("torso_lean")

        # State machine: standing -> descending -> bottom -> ascending -> standing
        self._state_machine = RepStateMachine(
            phases=["standing", "descending", "bottom", "ascending"],
        )

        # Per-rep accumulators
        rep_frames: list[_RepFrameData] = []
        current_rep_frames: list[_RepFrameData] = []

        for frame in sequence.frames:
            if not is_frame_usable(frame, self.required_landmarks):
                result.frame_qualities.append(0.0)
                continue

            quality = frame_quality_score(frame, self.required_landmarks)
            result.frame_qualities.append(quality)

            lm = frame.landmarks
            # Knee angles
            left_knee = angle_2d(
                Point2D(lm[PoseLandmark.LEFT_HIP].x, lm[PoseLandmark.LEFT_HIP].y),
                Point2D(lm[PoseLandmark.LEFT_KNEE].x, lm[PoseLandmark.LEFT_KNEE].y),
                Point2D(lm[PoseLandmark.LEFT_ANKLE].x, lm[PoseLandmark.LEFT_ANKLE].y),
            )
            right_knee = angle_2d(
                Point2D(lm[PoseLandmark.RIGHT_HIP].x, lm[PoseLandmark.RIGHT_HIP].y),
                Point2D(lm[PoseLandmark.RIGHT_KNEE].x, lm[PoseLandmark.RIGHT_KNEE].y),
                Point2D(lm[PoseLandmark.RIGHT_ANKLE].x, lm[PoseLandmark.RIGHT_ANKLE].y),
            )
            # Torso lean (shoulder-hip vertical alignment)
            mid_shoulder_y = (lm[PoseLandmark.LEFT_SHOULDER].y + lm[PoseLandmark.RIGHT_SHOULDER].y) / 2
            mid_hip_y = (lm[PoseLandmark.LEFT_HIP].y + lm[PoseLandmark.RIGHT_HIP].y) / 2
            mid_shoulder_x = (lm[PoseLandmark.LEFT_SHOULDER].x + lm[PoseLandmark.RIGHT_SHOULDER].x) / 2
            mid_hip_x = (lm[PoseLandmark.LEFT_HIP].x + lm[PoseLandmark.RIGHT_HIP].x) / 2
            torso_lean = angle_2d(
                Point2D(mid_shoulder_x, mid_shoulder_y),
                Point2D(mid_hip_x, mid_hip_y),
                Point2D(mid_hip_x, mid_hip_y - 0.1),  # vertical reference
            )

            sl = left_knee_sm.update(left_knee)
            sr = right_knee_sm.update(right_knee)
            st = torso_sm.update(torso_lean)
            avg_knee = (sl + sr) / 2

            frame_data = _RepFrameData(
                avg_knee=avg_knee, left_knee=sl, right_knee=sr,
                torso_lean=st, quality=quality, timestamp_ms=frame.timestamp_ms,
            )
            current_rep_frames.append(frame_data)

            completed = self._state_machine.update(
                value=avg_knee,
                timestamp_ms=frame.timestamp_ms,
                frame_index=frame.frame_index,
                should_advance=_squat_phase_advance,
            )
            if completed is not None:
                rep_frames.append(current_rep_frames)  # type: ignore[arg-type]
                current_rep_frames = []

        # Build per-rep results
        reps: list[RepResult] = []
        form_scores: list[float] = []
        for i, frames_list in enumerate(rep_frames):
            rep_result = _build_rep_result(i, frames_list)
            reps.append(rep_result)
            form_scores.append(
                (rep_result.range_of_motion_score + rep_result.tempo_score + rep_result.symmetry_score) / 3
            )

        valid_reps = [r for r in reps if r.quality != RepQuality.INVALID]

        result.reps = reps
        result.rep_count = len(reps)
        result.valid_rep_count = len(valid_reps)
        result.form_score = sum(form_scores) / len(form_scores) if form_scores else 0.0
        result.analysis_confidence = overall_analysis_confidence(
            result.frame_qualities, result.rep_count, result.valid_rep_count,
            sum(r.confidence for r in reps) / len(reps) if reps else 0.0,
        )
        result.aggregate_metrics = _build_aggregate(reps)
        result.cheat_flags = self._check_cheat_flags(result)
        result.verification_status = self._determine_verification(
            result.analysis_confidence, result.cheat_flags,
        )
        return result


# ── Internal helpers ─────────────────────────────────────────


class _RepFrameData:
    __slots__ = ("avg_knee", "left_knee", "right_knee", "torso_lean", "quality", "timestamp_ms")

    def __init__(self, *, avg_knee: float, left_knee: float, right_knee: float,
                 torso_lean: float, quality: float, timestamp_ms: int) -> None:
        self.avg_knee = avg_knee
        self.left_knee = left_knee
        self.right_knee = right_knee
        self.torso_lean = torso_lean
        self.quality = quality
        self.timestamp_ms = timestamp_ms


def _squat_phase_advance(current: str, value: float) -> Optional[str]:
    """Determine squat phase from knee angle."""
    if current == "standing" and value < _STANDING_ANGLE:
        return "descending"
    if current == "descending" and value < _BOTTOM_ANGLE:
        return "bottom"
    if current == "bottom" and value > _BOTTOM_ANGLE:
        return "ascending"
    if current == "ascending" and value > _STANDING_ANGLE:
        return "standing"
    return None


def _build_rep_result(index: int, frames: list[_RepFrameData]) -> RepResult:
    """Convert accumulated frame data into a RepResult."""
    min_knee = min(f.avg_knee for f in frames)
    max_knee = max(f.avg_knee for f in frames)
    rom = max_knee - min_knee
    rom_score = range_of_motion_score(rom, _IDEAL_DEPTH_MIN, _IDEAL_DEPTH_MAX)

    duration_ms = frames[-1].timestamp_ms - frames[0].timestamp_ms
    t_score = tempo_from_duration(duration_ms, _EXPECTED_REP_MS)

    sym_scores = [symmetry_score(f.left_knee, f.right_knee) for f in frames]
    avg_sym = sum(sym_scores) / len(sym_scores) if sym_scores else 100.0

    avg_torso = sum(f.torso_lean for f in frames) / len(frames)
    qualities = [f.quality for f in frames]
    conf = rep_confidence(qualities)

    # Form flags
    flags: list[str] = []
    if min_knee > _BOTTOM_ANGLE:
        flags.append("shallow_depth")
    if avg_torso > 45:
        flags.append("excessive_forward_lean")
    if avg_sym < 70:
        flags.append("left_right_asymmetry")

    quality = _quality_from_scores(rom_score, t_score, avg_sym)

    return RepResult(
        rep_index=index,
        start_time_ms=frames[0].timestamp_ms,
        end_time_ms=frames[-1].timestamp_ms,
        duration_ms=duration_ms,
        quality=quality,
        confidence=conf,
        range_of_motion_score=rom_score,
        tempo_score=t_score,
        symmetry_score=avg_sym,
        form_flags=flags,
        metrics=RepMetrics(
            primary_angle_min=round(min_knee, 1),
            primary_angle_max=round(max_knee, 1),
            range_of_motion=round(rom, 1),
            depth_score=round(rom_score, 1),
            symmetry_left_right=round(avg_sym, 1),
            torso_lean=round(avg_torso, 1),
            tempo_seconds=round(duration_ms / 1000, 2),
        ),
    )


def _quality_from_scores(rom: float, tempo: float, sym: float) -> RepQuality:
    avg = (rom + tempo + sym) / 3
    if avg >= 80:
        return RepQuality.GOOD
    if avg >= 60:
        return RepQuality.ACCEPTABLE
    if avg >= 30:
        return RepQuality.POOR
    return RepQuality.INVALID


def _build_aggregate(reps: list[RepResult]) -> AggregateMetrics:
    if not reps:
        return AggregateMetrics()
    roms = [r.metrics.range_of_motion for r in reps if r.metrics.range_of_motion is not None]
    tempos = [r.metrics.tempo_seconds for r in reps if r.metrics.tempo_seconds is not None]
    syms = [r.metrics.symmetry_left_right for r in reps if r.metrics.symmetry_left_right is not None]
    depths = [r.metrics.depth_score for r in reps if r.metrics.depth_score is not None]
    form_avgs = [(r.range_of_motion_score + r.tempo_score + r.symmetry_score) / 3 for r in reps]
    best_idx = form_avgs.index(max(form_avgs)) if form_avgs else None
    worst_idx = form_avgs.index(min(form_avgs)) if form_avgs else None
    tempo_consistency = None
    if len(tempos) >= 2:
        mean_t = sum(tempos) / len(tempos)
        variance = sum((t - mean_t) ** 2 for t in tempos) / len(tempos)
        tempo_consistency = max(0.0, 100.0 - variance * 50)
    return AggregateMetrics(
        avg_range_of_motion=round(sum(roms) / len(roms), 1) if roms else None,
        avg_tempo_seconds=round(sum(tempos) / len(tempos), 2) if tempos else None,
        avg_symmetry=round(sum(syms) / len(syms), 1) if syms else None,
        avg_depth=round(sum(depths) / len(depths), 1) if depths else None,
        tempo_consistency=round(tempo_consistency, 1) if tempo_consistency is not None else None,
        best_rep_index=best_idx,
        worst_rep_index=worst_idx,
    )
