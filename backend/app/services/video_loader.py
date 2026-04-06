"""Video loading and frame extraction using OpenCV."""
from __future__ import annotations

import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

import cv2
import httpx
import numpy as np

from app.core.config import settings
from app.core.logging import logger


@dataclass(frozen=True)
class VideoMetadata:
    """Video file metadata."""
    path: str
    fps: float
    width: int
    height: int
    total_frames: int
    duration_ms: int


@dataclass(frozen=True)
class SampledFrame:
    """A single sampled video frame with timestamp."""
    frame: np.ndarray  # BGR format from OpenCV
    timestamp_ms: int
    frame_index: int


class VideoLoader:
    """Loads videos and extracts frames for analysis."""

    def get_metadata(self, video_path: str) -> VideoMetadata:
        """Extract video metadata without reading all frames."""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")
        try:
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration_ms = int((total_frames / fps) * 1000) if fps > 0 else 0

            if total_frames == 0:
                raise ValueError("Video has no frames")
            if duration_ms > settings.max_video_duration_seconds * 1000:
                raise ValueError(
                    f"Video too long: {duration_ms/1000:.0f}s exceeds "
                    f"{settings.max_video_duration_seconds}s limit"
                )

            return VideoMetadata(
                path=video_path,
                fps=fps,
                width=width,
                height=height,
                total_frames=total_frames,
                duration_ms=duration_ms,
            )
        finally:
            cap.release()

    def extract_frames(
        self,
        video_path: str,
        sample_rate: int | None = None,
    ) -> Iterator[SampledFrame]:
        """
        Extract frames from video, optionally sampling every Nth frame.

        Yields SampledFrame objects with accurate timestamps in ms.
        Timestamps are calculated from frame index and FPS for consistency
        with MediaPipe's detect_for_video which requires monotonically
        increasing timestamps.
        """
        rate = sample_rate if sample_rate is not None else settings.frame_sample_rate
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        try:
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            frame_idx = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Sample every Nth frame (0 or 1 = process all)
                if rate > 1 and frame_idx % rate != 0:
                    frame_idx += 1
                    continue

                # Calculate timestamp from frame index (more reliable than CAP_PROP_POS_MSEC)
                timestamp_ms = int((frame_idx / fps) * 1000)

                yield SampledFrame(
                    frame=frame,
                    timestamp_ms=timestamp_ms,
                    frame_index=frame_idx,
                )

                frame_idx += 1
        finally:
            cap.release()
            logger.debug(f"Released video capture for {video_path}")

    async def download_from_url(self, url: str) -> str:
        """Download a video from URL to a temp file. Returns temp file path."""
        logger.info(f"Downloading video from URL: {url[:80]}...")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url)
            response.raise_for_status()

            content_length = len(response.content)
            if content_length > settings.max_video_size_mb * 1024 * 1024:
                raise ValueError(f"Video exceeds {settings.max_video_size_mb}MB limit")

            # Determine extension from content type or URL
            ext = ".mp4"
            content_type = response.headers.get("content-type", "")
            if "quicktime" in content_type:
                ext = ".mov"
            elif "webm" in content_type:
                ext = ".webm"

            tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
            tmp.write(response.content)
            tmp.close()

            logger.info(f"Downloaded {content_length / 1024:.0f}KB to {tmp.name}")
            return tmp.name
