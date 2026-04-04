"""Lunge exercise analyzer."""
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

# Phase thresholds (front knee angle)
_STANDING_ANGLE = 150.0
_BOTTOM_ANGLE = 110.0
_IDEAL_ROM_MIN = 50.0
_IDEAL_ROM_MAX = 90.0
_EXPECTED_REP_MS = 3000
_KNEE_OVER_TOES_TOLERANCE = 0.02  # normalized coordinate tolerance


class LungeAnalyzer(BaseExerciseAnalyzer):
    """Analyzes lunge form using front knee angle, rear extension, and torso lean."""

    @property
    def exercise_type(self) -> ExerciseType:
        return ExerciseType.LUNGE

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
        return "Lunge analyzer — tracks front knee angle, rear leg, torso lean, L/R balance"

    def analyze(self, sequence: PoseSequence) -> AnalysisResult:
        result = AnalysisResult(exercise_type=ExerciseType.LUNGE)

        left_knee_sm = AngleSmoother("left_knee")
        right_knee_sm = AngleSmoother("right_knee")
        torso_sm = AngleSmoother("torso_lean")

        self._state_machine = RepStateMachine(
            phases=["standing", "descending", "bottom", "ascending"],
        )

        rep_frames: list[list[_LungeFrame]] = []
        current_rep_frames: list[_LungeFrame] = []

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
            # Torso lean via shoulder-hip vertical
            mid_sh_x = (lm[PoseLandmark.LEFT_SHOULDER].x + lm[PoseLandmark.RIGHT_SHOULDER].x) / 2
            mid_sh_y = (lm[PoseLandmark.LEFT_SHOULDER].y + lm[PoseLandmark.RIGHT_SHOULDER].y) / 2
            mid_hp_x = (lm[PoseLandmark.LEFT_HIP].x + lm[PoseLandmark.RIGHT_HIP].x) / 2
            mid_hp_y = (lm[PoseLandmark.LEFT_HIP].y + lm[PoseLandmark.RIGHT_HIP].y) / 2
            torso_lean = angle_2d(
                Point2D(mid_sh_x, mid_sh_y),
                Point2D(mid_hp_x, mid_hp_y),
                Point2D(mid_hp_x, mid_hp_y - 0.1),
            )

            sl = left_knee_sm.update(left_knee)
            sr = right_knee_sm.update(right_knee)
            st = torso_sm.update(torso_lean)

            # Front knee = whichever is more bent (lower angle)
            front_knee = min(sl, sr)

            # Detect knee-over-toes: front knee x vs front ankle x
            front_is_left = sl < sr
            if front_is_left:
                knee_x = lm[PoseLandmark.LEFT_KNEE].x
                ankle_x = lm[PoseLandmark.LEFT_ANKLE].x
            else:
                knee_x = lm[PoseLandmark.RIGHT_KNEE].x
                ankle_x = lm[PoseLandmark.RIGHT_ANKLE].x
            knee_past_toes = knee_x - ankle_x > _KNEE_OVER_TOES_TOLERANCE

            fd = _LungeFrame(
                front_knee=front_knee, left_knee=sl, right_knee=sr,
                torso_lean=st, quality=quality, timestamp_ms=frame.timestamp_ms,
                knee_past_toes=knee_past_toes,
            )
            current_rep_frames.append(fd)

            completed = self._state_machine.update(
                value=front_knee,
                timestamp_ms=frame.timestamp_ms,
                frame_index=frame.frame_index,
                should_advance=_lunge_phase_advance,
            )
            if completed is not None:
                rep_frames.append(current_rep_frames)
                current_rep_frames = []

        # Build results
        reps: list[RepResult] = []
        form_scores: list[float] = []
        for i, frames_list in enumerate(rep_frames):
            rr = _build_lunge_rep(i, frames_list)
            reps.append(rr)
            form_scores.append(
                (rr.range_of_motion_score + rr.tempo_score + rr.symmetry_score) / 3
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


class _LungeFrame:
    __slots__ = ("front_knee", "left_knee", "right_knee", "torso_lean",
                 "quality", "timestamp_ms", "knee_past_toes")

    def __init__(self, *, front_knee: float, left_knee: float, right_knee: float,
                 torso_lean: float, quality: float, timestamp_ms: int,
                 knee_past_toes: bool) -> None:
        self.front_knee = front_knee
        self.left_knee = left_knee
        self.right_knee = right_knee
        self.torso_lean = torso_lean
        self.quality = quality
        self.timestamp_ms = timestamp_ms
        self.knee_past_toes = knee_past_toes


def _lunge_phase_advance(current: str, value: float) -> Optional[str]:
    if current == "standing" and value < _STANDING_ANGLE:
        return "descending"
    if current == "descending" and value < _BOTTOM_ANGLE:
        return "bottom"
    if current == "bottom" and value > _BOTTOM_ANGLE:
        return "ascending"
    if current == "ascending" and value > _STANDING_ANGLE:
        return "standing"
    return None


def _build_lunge_rep(index: int, frames: list[_LungeFrame]) -> RepResult:
    min_knee = min(f.front_knee for f in frames)
    max_knee = max(f.front_knee for f in frames)
    rom = max_knee - min_knee
    rom_score = range_of_motion_score(rom, _IDEAL_ROM_MIN, _IDEAL_ROM_MAX)

    duration_ms = frames[-1].timestamp_ms - frames[0].timestamp_ms
    t_score = tempo_from_duration(duration_ms, _EXPECTED_REP_MS)

    # Symmetry between left and right knee angles at bottom position
    bottom_frames = [f for f in frames if f.front_knee < _BOTTOM_ANGLE + 10]
    if bottom_frames:
        sym_scores = [symmetry_score(f.left_knee, f.right_knee) for f in bottom_frames]
        avg_sym = sum(sym_scores) / len(sym_scores)
    else:
        avg_sym = symmetry_score(
            sum(f.left_knee for f in frames) / len(frames),
            sum(f.right_knee for f in frames) / len(frames),
        )

    avg_torso = sum(f.torso_lean for f in frames) / len(frames)
    knee_past_count = sum(1 for f in frames if f.knee_past_toes)
    knee_past_ratio = knee_past_count / len(frames) if frames else 0

    qualities = [f.quality for f in frames]
    conf = rep_confidence(qualities)

    flags: list[str] = []
    if knee_past_ratio > 0.3:
        flags.append("knee_past_toes")
    if min_knee > _BOTTOM_ANGLE:
        flags.append("insufficient_depth")
    if avg_torso > 40:
        flags.append("excessive_torso_lean")

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
