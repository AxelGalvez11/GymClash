"""Frame and rep quality assessment."""
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.pose_service import FrameLandmarks


# MediaPipe pose landmark indices (subset of 33 total)
class PoseLandmark:
    """MediaPipe pose landmark indices."""
    NOSE = 0
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    LEFT_HEEL = 29
    RIGHT_HEEL = 30
    LEFT_FOOT_INDEX = 31
    RIGHT_FOOT_INDEX = 32


def frame_quality_score(frame: FrameLandmarks, required_indices: list[int]) -> float:
    """
    Score frame quality based on landmark visibility.
    Returns 0.0-1.0.
    """
    if not frame.has_pose or not frame.landmarks:
        return 0.0

    total_vis = 0.0
    count = 0
    for idx in required_indices:
        if idx < len(frame.landmarks):
            total_vis += frame.landmarks[idx].visibility
            count += 1

    return total_vis / count if count > 0 else 0.0


def is_frame_usable(
    frame: FrameLandmarks,
    required_indices: list[int],
    min_visibility: float = 0.5,
) -> bool:
    """Check if a frame has sufficient landmark quality for analysis."""
    if not frame.has_pose:
        return False
    score = frame_quality_score(frame, required_indices)
    return score >= min_visibility


def rep_confidence(
    frame_qualities: list[float],
    min_frames: int = 5,
) -> float:
    """
    Calculate confidence for a single rep based on frame qualities during that rep.
    Returns 0.0-1.0.
    """
    if len(frame_qualities) < min_frames:
        return max(0.1, len(frame_qualities) / min_frames * 0.5)

    avg = sum(frame_qualities) / len(frame_qualities)
    # Penalize for frames below threshold
    good_frames = sum(1 for q in frame_qualities if q > 0.5)
    good_ratio = good_frames / len(frame_qualities)

    return min(1.0, avg * 0.6 + good_ratio * 0.4)


def overall_analysis_confidence(
    frame_qualities: list[float],
    rep_count: int,
    valid_rep_count: int,
    avg_rep_confidence: float,
) -> float:
    """
    Calculate overall analysis confidence.
    Considers frame quality, rep detection reliability, and per-rep confidence.
    """
    if not frame_qualities:
        return 0.0

    avg_frame_quality = sum(frame_qualities) / len(frame_qualities)
    rep_validity_ratio = valid_rep_count / max(rep_count, 1)

    confidence = (
        avg_frame_quality * 0.3
        + rep_validity_ratio * 0.3
        + avg_rep_confidence * 0.4
    )

    return min(1.0, max(0.0, confidence))
