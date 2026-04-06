"""Application configuration with Pydantic Settings."""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Configuration loaded from environment variables."""

    # App
    app_name: str = "GymClash Workout Analyzer"
    app_version: str = "1.0.0"
    debug: bool = False

    # MediaPipe
    mediapipe_model_path: str = "pose_landmarker_heavy.task"
    num_poses: int = 1
    min_detection_confidence: float = 0.5
    min_presence_confidence: float = 0.5
    min_tracking_confidence: float = 0.5

    # Video processing
    max_video_duration_seconds: int = 600  # 10 minutes
    frame_sample_rate: int = 10  # Process every Nth frame (0 = all)
    max_video_size_mb: int = 200

    # Analysis
    smoothing_window: int = 5
    min_rep_amplitude_degrees: float = 30.0
    min_rep_confidence: float = 0.3
    enable_debug_output: bool = False

    # Supabase
    supabase_url: Optional[str] = None
    supabase_service_key: Optional[str] = None
    supabase_storage_bucket: str = "workout-videos"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = {"env_file": ".env", "env_prefix": "GYMCLASH_"}


settings = Settings()
