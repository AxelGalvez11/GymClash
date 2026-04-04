"""Push-up exercise analyzer."""
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

# Phase thresholds (elbow angle in degrees)
_TOP_ANGLE = 160.0
_BOTTOM_ANGLE = 90.0
_IDEAL_ROM_MIN = 60.0
_IDEAL_ROM_MAX = 100.0
_EXPECTED_REP_MS = 2500
# Body alignment: shoulder-hip-ankle angle close to 180 is straight
_STRAIGHT_BODY_THRESHOLD = 160.0


class PushUpAnalyzer(BaseExerciseAnalyzer):
    """Analyzes push-up form using elbow angle and body alignment."""

    @property
    def exercise_type(self) -> ExerciseType:
        return ExerciseType.PUSH_UP

    @property
    def required_landmarks(self) -> list[int]:
        return [
            PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
            PoseLandmark.LEFT_ELBOW, PoseLandmark.RIGHT_ELBOW,
            PoseLandmark.LEFT_WRIST, PoseLandmark.RIGHT_WRIST,
            PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
            PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE,
        ]

    @property
    def recommended_camera_angle(self) -> CameraAngle:
        return CameraAngle.SIDE

    @property
    def description(self) -> str:
        return "Push-up analyzer — tracks elbow angle, body straightness, depth"

    def analyze(self, sequence: PoseSequence) -> AnalysisResult:
        result = AnalysisResult(exercise_type=ExerciseType.PUSH_UP)

        left_elbow_sm = AngleSmoother("left_elbow")
        right_elbow_sm = AngleSmoother("right_elbow")
        body_sm = AngleSmoother("body_alignment")

        self._state_machine = RepStateMachine(
            phases=["top", "descending", "bottom", "ascending"],
        )

        rep_frames: list[list[_PushUpFrame]] = []
        current_rep_frames: list[_PushUpFrame] = []

        for frame in sequence.frames:
            if not is_frame_usable(frame, self.required_landmarks):
                result.frame_qualities.append(0.0)
                continue

            quality = frame_quality_score(frame, self.required_landmarks)
            result.frame_qualities.append(quality)
            lm = frame.landmarks

            # Elbow angles
            left_elbow = angle_2d(
                Point2D(lm[PoseLandmark.LEFT_SHOULDER].x, lm[PoseLandmark.LEFT_SHOULDER].y),
                Point2D(lm[PoseLandmark.LEFT_ELBOW].x, lm[PoseLandmark.LEFT_ELBOW].y),
                Point2D(lm[PoseLandmark.LEFT_WRIST].x, lm[PoseLandmark.LEFT_WRIST].y),
            )
            right_elbow = angle_2d(
                Point2D(lm[PoseLandmark.RIGHT_SHOULDER].x, lm[PoseLandmark.RIGHT_SHOULDER].y),
                Point2D(lm[PoseLandmark.RIGHT_ELBOW].x, lm[PoseLandmark.RIGHT_ELBOW].y),
                Point2D(lm[PoseLandmark.RIGHT_WRIST].x, lm[PoseLandmark.RIGHT_WRIST].y),
            )
            # Body straightness: shoulder-hip-ankle alignment
            mid_sh = Point2D(
                (lm[PoseLandmark.LEFT_SHOULDER].x + lm[PoseLandmark.RIGHT_SHOULDER].x) / 2,
                (lm[PoseLandmark.LEFT_SHOULDER].y + lm[PoseLandmark.RIGHT_SHOULDER].y) / 2,
            )
            mid_hp = Point2D(
                (lm[PoseLandmark.LEFT_HIP].x + lm[PoseLandmark.RIGHT_HIP].x) / 2,
                (lm[PoseLandmark.LEFT_HIP].y + lm[PoseLandmark.RIGHT_HIP].y) / 2,
            )
            mid_ak = Point2D(
                (lm[PoseLandmark.LEFT_ANKLE].x + lm[PoseLandmark.RIGHT_ANKLE].x) / 2,
                (lm[PoseLandmark.LEFT_ANKLE].y + lm[PoseLandmark.RIGHT_ANKLE].y) / 2,
            )
            body_angle = angle_2d(mid_sh, mid_hp, mid_ak)

            sl = left_elbow_sm.update(left_elbow)
            sr = right_elbow_sm.update(right_elbow)
            sb = body_sm.update(body_angle)
            avg_elbow = (sl + sr) / 2

            fd = _PushUpFrame(
                avg_elbow=avg_elbow, left_elbow=sl, right_elbow=sr,
                body_angle=sb, quality=quality, timestamp_ms=frame.timestamp_ms,
            )
            current_rep_frames.append(fd)

            completed = self._state_machine.update(
                value=avg_elbow,
                timestamp_ms=frame.timestamp_ms,
                frame_index=frame.frame_index,
                should_advance=_pushup_phase_advance,
            )
            if completed is not None:
                rep_frames.append(current_rep_frames)
                current_rep_frames = []

        # Build results
        reps: list[RepResult] = []
        form_scores: list[float] = []
        for i, frames_list in enumerate(rep_frames):
            rr = _build_pushup_rep(i, frames_list)
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


class _PushUpFrame:
    __slots__ = ("avg_elbow", "left_elbow", "right_elbow", "body_angle",
                 "quality", "timestamp_ms")

    def __init__(self, *, avg_elbow: float, left_elbow: float, right_elbow: float,
                 body_angle: float, quality: float, timestamp_ms: int) -> None:
        self.avg_elbow = avg_elbow
        self.left_elbow = left_elbow
        self.right_elbow = right_elbow
        self.body_angle = body_angle
        self.quality = quality
        self.timestamp_ms = timestamp_ms


def _pushup_phase_advance(current: str, value: float) -> Optional[str]:
    if current == "top" and value < _TOP_ANGLE:
        return "descending"
    if current == "descending" and value < _BOTTOM_ANGLE:
        return "bottom"
    if current == "bottom" and value > _BOTTOM_ANGLE:
        return "ascending"
    if current == "ascending" and value > _TOP_ANGLE:
        return "top"
    return None


def _build_pushup_rep(index: int, frames: list[_PushUpFrame]) -> RepResult:
    min_elbow = min(f.avg_elbow for f in frames)
    max_elbow = max(f.avg_elbow for f in frames)
    rom = max_elbow - min_elbow
    rom_score = range_of_motion_score(rom, _IDEAL_ROM_MIN, _IDEAL_ROM_MAX)

    duration_ms = frames[-1].timestamp_ms - frames[0].timestamp_ms
    t_score = tempo_from_duration(duration_ms, _EXPECTED_REP_MS)

    sym_scores = [symmetry_score(f.left_elbow, f.right_elbow) for f in frames]
    avg_sym = sum(sym_scores) / len(sym_scores) if sym_scores else 100.0

    avg_body = sum(f.body_angle for f in frames) / len(frames)
    lockout = 100.0 if max_elbow >= _TOP_ANGLE else max(0.0, max_elbow / _TOP_ANGLE * 100)
    depth = 100.0 if min_elbow <= _BOTTOM_ANGLE else max(0.0, (1 - (min_elbow - _BOTTOM_ANGLE) / 60) * 100)

    qualities = [f.quality for f in frames]
    conf = rep_confidence(qualities)

    flags: list[str] = []
    if avg_body < _STRAIGHT_BODY_THRESHOLD:
        flags.append("sagging_hips")
    if max_elbow < _TOP_ANGLE:
        flags.append("incomplete_lockout")
    if min_elbow > _BOTTOM_ANGLE:
        flags.append("shallow_depth")

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
            primary_angle_min=round(min_elbow, 1),
            primary_angle_max=round(max_elbow, 1),
            range_of_motion=round(rom, 1),
            depth_score=round(depth, 1),
            lockout_score=round(lockout, 1),
            symmetry_left_right=round(avg_sym, 1),
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
