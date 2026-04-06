"""Pydantic models for API request/response contracts."""
from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ExerciseType(str, Enum):
    """Supported exercise types."""
    SQUAT = "squat"
    PUSH_UP = "push_up"
    LUNGE = "lunge"
    JUMPING_JACK = "jumping_jack"
    BICEP_CURL = "bicep_curl"
    SHOULDER_PRESS = "shoulder_press"
    # Future
    DEADLIFT = "deadlift"
    BENCH_PRESS = "bench_press"
    PULL_UP = "pull_up"
    ROW = "row"
    BURPEE = "burpee"


class CameraAngle(str, Enum):
    """Recommended camera angles."""
    FRONT = "front"
    SIDE = "side"
    DIAGONAL = "diagonal"
    UNKNOWN = "unknown"


class VerificationStatus(str, Enum):
    """Anti-cheat verification result."""
    VERIFIED = "verified"
    NEEDS_REVIEW = "needs_review"
    REJECTED = "rejected"


class RepQuality(str, Enum):
    """Per-rep quality rating."""
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    POOR = "poor"
    INVALID = "invalid"


# ─── Request Models ──────────────────────────────────────

class AnalyzeFromUrlRequest(BaseModel):
    """Request body for URL-based analysis."""
    video_url: str = Field(..., description="Public or signed URL to the video")
    exercise_type: ExerciseType
    user_id: Optional[str] = None
    camera_angle: Optional[CameraAngle] = None


# ─── Response Models ─────────────────────────────────────

class RepMetrics(BaseModel):
    """Metrics for a single rep."""
    primary_angle_min: Optional[float] = None
    primary_angle_max: Optional[float] = None
    range_of_motion: Optional[float] = None
    depth_score: Optional[float] = None
    lockout_score: Optional[float] = None
    symmetry_left_right: Optional[float] = None
    torso_lean: Optional[float] = None
    tempo_seconds: Optional[float] = None


class RepResult(BaseModel):
    """Analysis result for a single rep."""
    rep_index: int
    start_time_ms: int
    end_time_ms: int
    duration_ms: int
    quality: RepQuality
    confidence: float = Field(ge=0.0, le=1.0)
    range_of_motion_score: float = Field(ge=0.0, le=100.0)
    tempo_score: float = Field(ge=0.0, le=100.0)
    symmetry_score: float = Field(ge=0.0, le=100.0)
    form_flags: list[str] = Field(default_factory=list)
    metrics: RepMetrics = Field(default_factory=RepMetrics)


class AggregateMetrics(BaseModel):
    """Aggregate metrics across all reps."""
    avg_range_of_motion: Optional[float] = None
    avg_tempo_seconds: Optional[float] = None
    avg_symmetry: Optional[float] = None
    avg_depth: Optional[float] = None
    tempo_consistency: Optional[float] = None
    best_rep_index: Optional[int] = None
    worst_rep_index: Optional[int] = None


class VideoSummary(BaseModel):
    """Summary info about the analyzed video."""
    duration_ms: int
    total_frames: int
    sampled_frames: int
    fps: float
    resolution_width: int
    resolution_height: int


class DebugInfo(BaseModel):
    """Debug information (only included when enabled)."""
    sampled_frame_count: int = 0
    rejected_frame_count: int = 0
    avg_landmark_confidence: float = 0.0
    min_landmark_confidence: float = 0.0
    phase_transitions: list[dict] = Field(default_factory=list)
    processing_time_ms: int = 0


class AnalysisResponse(BaseModel):
    """Complete workout analysis response."""
    exercise_type: ExerciseType
    video_summary: VideoSummary
    rep_count: int
    valid_rep_count: int
    form_score: float = Field(ge=0.0, le=100.0)
    analysis_confidence: float = Field(ge=0.0, le=1.0)
    verification_status: VerificationStatus
    camera_angle: CameraAngle
    cheat_flags: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    aggregate_metrics: AggregateMetrics = Field(default_factory=AggregateMetrics)
    reps: list[RepResult] = Field(default_factory=list)
    debug: Optional[DebugInfo] = None


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
    code: str = "unknown_error"


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    version: str
    mediapipe_ready: bool


class SupportedExercise(BaseModel):
    """Info about a supported exercise."""
    type: ExerciseType
    name: str
    implemented: bool
    recommended_camera_angle: CameraAngle
    description: str


class SupportedExercisesResponse(BaseModel):
    """List of supported exercises."""
    exercises: list[SupportedExercise]


class VersionResponse(BaseModel):
    """Version info."""
    version: str
    api_version: str = "v1"
    mediapipe_version: str
