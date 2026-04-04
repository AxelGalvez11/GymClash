"""MediaPipe Pose Landmarker wrapper using VIDEO running mode.

VIDEO vs LIVE_STREAM mode differences:
    - VIDEO mode processes frames synchronously via `detect_for_video(image, timestamp_ms)`.
      Each call blocks until detection completes, making it ideal for offline/batch processing
      of pre-recorded videos where latency per frame is acceptable.
    - LIVE_STREAM mode is asynchronous: you call `detect_async(image, timestamp_ms)` and results
      arrive via a callback. This is designed for real-time camera feeds where you cannot afford
      to block the capture thread.
    - Both modes require monotonically increasing timestamps. Supplying a timestamp <= the
      previous one raises a RuntimeError. This service calculates timestamps from frame index
      and FPS (via VideoLoader) to guarantee strict ordering.
    - VIDEO mode is used here because we process uploaded workout videos offline — there is no
      real-time constraint, and synchronous results simplify the pipeline.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    PoseLandmarker,
    PoseLandmarkerOptions,
    RunningMode,
)

from app.core.config import settings
from app.core.logging import logger
from app.services.video_loader import SampledFrame, VideoLoader, VideoMetadata

# MediaPipe defines 33 pose landmarks (BlazePose topology).
_EXPECTED_LANDMARKS = 33


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class LandmarkPoint:
    """A single pose landmark with position, visibility, and presence.

    Attributes:
        x: Horizontal position (normalized 0-1 for landmarks, meters for world).
        y: Vertical position (normalized 0-1 for landmarks, meters for world).
        z: Depth estimate (normalized for landmarks, meters for world).
        visibility: Likelihood the landmark is visible in the frame (0-1).
        presence: Likelihood the landmark exists on the person (0-1).
    """
    x: float
    y: float
    z: float
    visibility: float
    presence: float


@dataclass(frozen=True)
class FrameLandmarks:
    """Pose detection results for a single video frame.

    Attributes:
        timestamp_ms: Frame timestamp in milliseconds (monotonically increasing).
        frame_index: Original frame index in the source video.
        landmarks: 33 normalized landmarks in image coordinate space.
        world_landmarks: 33 world landmarks in meters (hip-centered).
        has_pose: Whether a pose was detected in this frame.
        avg_visibility: Mean visibility across all detected landmarks.
    """
    timestamp_ms: int
    frame_index: int
    landmarks: list[LandmarkPoint]
    world_landmarks: list[LandmarkPoint]
    has_pose: bool
    avg_visibility: float


@dataclass
class PoseSequence:
    """Full pose detection result for an entire video.

    Attributes:
        metadata: Source video metadata from VideoLoader.
        frames: Ordered list of per-frame landmark results.
        sampled_count: Number of frames successfully processed.
        rejected_count: Number of frames where no pose was detected.
    """
    metadata: VideoMetadata
    frames: list[FrameLandmarks] = field(default_factory=list)
    sampled_count: int = 0
    rejected_count: int = 0


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class PoseService:
    """Wraps MediaPipe PoseLandmarker in VIDEO mode for offline video analysis."""

    def __init__(self) -> None:
        self._landmarker: Optional[PoseLandmarker] = None
        self._model_path = Path(settings.mediapipe_model_path)

    # -- lifecycle -----------------------------------------------------------

    def _ensure_landmarker(self) -> PoseLandmarker:
        """Lazily create the PoseLandmarker, raising if the model file is missing."""
        if self._landmarker is not None:
            return self._landmarker

        if not self._model_path.exists():
            raise FileNotFoundError(
                f"MediaPipe model not found at '{self._model_path}'. "
                "Download pose_landmarker_heavy.task from "
                "https://developers.google.com/mediapipe/solutions/vision/pose_landmarker#models "
                f"and place it at '{self._model_path.resolve()}'."
            )

        options = PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(self._model_path)),
            running_mode=RunningMode.VIDEO,
            num_poses=settings.num_poses,
            min_pose_detection_confidence=settings.min_detection_confidence,
            min_pose_presence_confidence=settings.min_presence_confidence,
            min_tracking_confidence=settings.min_tracking_confidence,
            output_segmentation_masks=False,
        )

        self._landmarker = PoseLandmarker.create_from_options(options)
        logger.info(
            "PoseLandmarker initialised (VIDEO mode, model=%s)", self._model_path
        )
        return self._landmarker

    def close(self) -> None:
        """Release the underlying MediaPipe resources."""
        if self._landmarker is not None:
            self._landmarker.close()
            self._landmarker = None
            logger.debug("PoseLandmarker closed")

    # -- public API ----------------------------------------------------------

    def process_video(
        self,
        video_path: str,
        sample_rate: int | None = None,
    ) -> PoseSequence:
        """Run pose detection on every sampled frame of a video.

        Args:
            video_path: Path to the video file on disk.
            sample_rate: Override for frame sampling interval (None = use config).

        Returns:
            PoseSequence containing ordered FrameLandmarks for each processed frame.

        Raises:
            FileNotFoundError: If the MediaPipe model file is missing.
            ValueError: If the video cannot be opened or has no frames.
        """
        landmarker = self._ensure_landmarker()
        loader = VideoLoader()
        metadata = loader.get_metadata(video_path)

        sequence = PoseSequence(metadata=metadata)
        last_timestamp_ms = -1

        for sampled in loader.extract_frames(video_path, sample_rate=sample_rate):
            frame_landmarks = self._detect_frame(
                landmarker, sampled, last_timestamp_ms
            )
            if frame_landmarks is None:
                # Timestamp was not strictly increasing — skip frame.
                continue

            last_timestamp_ms = frame_landmarks.timestamp_ms
            sequence.frames.append(frame_landmarks)

            if frame_landmarks.has_pose:
                sequence.sampled_count += 1
            else:
                sequence.rejected_count += 1

        logger.info(
            "Pose extraction complete: %d frames with pose, %d rejected out of %d total",
            sequence.sampled_count,
            sequence.rejected_count,
            sequence.sampled_count + sequence.rejected_count,
        )
        return sequence

    # -- internals -----------------------------------------------------------

    @staticmethod
    def _detect_frame(
        landmarker: PoseLandmarker,
        sampled: SampledFrame,
        last_timestamp_ms: int,
    ) -> Optional[FrameLandmarks]:
        """Detect pose in a single frame.

        MediaPipe VIDEO mode requires strictly monotonically increasing
        timestamps.  If the incoming timestamp does not exceed
        ``last_timestamp_ms`` we bump it by 1 ms to satisfy the constraint
        rather than dropping the frame.
        """
        timestamp_ms = sampled.timestamp_ms

        # Guarantee monotonically increasing timestamps.
        if timestamp_ms <= last_timestamp_ms:
            timestamp_ms = last_timestamp_ms + 1

        # Convert BGR (OpenCV default) → RGB, then wrap as mp.Image.
        rgb_frame = cv2.cvtColor(sampled.frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        result = landmarker.detect_for_video(mp_image, timestamp_ms)

        if not result.pose_landmarks:
            return FrameLandmarks(
                timestamp_ms=timestamp_ms,
                frame_index=sampled.frame_index,
                landmarks=[],
                world_landmarks=[],
                has_pose=False,
                avg_visibility=0.0,
            )

        # Use the first detected pose (num_poses is typically 1).
        raw_landmarks = result.pose_landmarks[0]
        raw_world = result.pose_world_landmarks[0]

        landmarks = [
            LandmarkPoint(
                x=lm.x,
                y=lm.y,
                z=lm.z,
                visibility=lm.visibility if lm.visibility is not None else 0.0,
                presence=lm.presence if lm.presence is not None else 0.0,
            )
            for lm in raw_landmarks
        ]

        world_landmarks = [
            LandmarkPoint(
                x=wl.x,
                y=wl.y,
                z=wl.z,
                visibility=wl.visibility if wl.visibility is not None else 0.0,
                presence=wl.presence if wl.presence is not None else 0.0,
            )
            for wl in raw_world
        ]

        visibilities = [lm.visibility for lm in landmarks]
        avg_visibility = (
            sum(visibilities) / len(visibilities) if visibilities else 0.0
        )

        return FrameLandmarks(
            timestamp_ms=timestamp_ms,
            frame_index=sampled.frame_index,
            landmarks=landmarks,
            world_landmarks=world_landmarks,
            has_pose=True,
            avg_visibility=avg_visibility,
        )
