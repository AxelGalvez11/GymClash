"""FastAPI route handlers."""
from __future__ import annotations

import time
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile, HTTPException
import mediapipe as mp

from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import (
    AnalyzeFromUrlRequest,
    AnalysisResponse,
    ErrorResponse,
    ExerciseType,
    CameraAngle,
    HealthResponse,
    SupportedExercisesResponse,
    SupportedExercise,
    VersionResponse,
)
from app.analysis.engine import AnalysisEngine
from app.services.video_loader import VideoLoader
from app.services.supabase_service import SupabaseService

router = APIRouter()
engine = AnalysisEngine()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        mediapipe_ready=True,
    )


@router.get("/version", response_model=VersionResponse)
async def get_version() -> VersionResponse:
    """Get service version info."""
    return VersionResponse(
        version=settings.app_version,
        mediapipe_version=mp.__version__,
    )


@router.get("/supported-exercises", response_model=SupportedExercisesResponse)
async def get_supported_exercises() -> SupportedExercisesResponse:
    """List all supported exercises."""
    exercises = engine.get_supported_exercises()
    return SupportedExercisesResponse(exercises=exercises)


@router.post("/analyze-workout", response_model=AnalysisResponse)
async def analyze_workout(
    video: UploadFile = File(...),
    exercise_type: ExerciseType = Form(...),
    user_id: Optional[str] = Form(None),
    camera_angle: Optional[CameraAngle] = Form(None),
) -> AnalysisResponse:
    """Analyze an uploaded workout video."""
    if not video.content_type or not video.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    # Save to temp file
    suffix = Path(video.filename or "video.mp4").suffix or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await video.read()
        if len(content) > settings.max_video_size_mb * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"Video exceeds {settings.max_video_size_mb}MB limit")
        tmp.write(content)
        tmp_path = tmp.name

    try:
        start = time.monotonic()
        result = engine.analyze(
            video_path=tmp_path,
            exercise_type=exercise_type,
            camera_angle=camera_angle or CameraAngle.UNKNOWN,
            user_id=user_id,
        )
        elapsed_ms = int((time.monotonic() - start) * 1000)
        logger.info(f"Analysis complete: {exercise_type.value} | {result.rep_count} reps | {elapsed_ms}ms")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed — see server logs")
    finally:
        Path(tmp_path).unlink(missing_ok=True)


@router.post("/analyze-from-url", response_model=AnalysisResponse)
async def analyze_from_url(request: AnalyzeFromUrlRequest) -> AnalysisResponse:
    """Analyze a workout video from a URL (e.g. Supabase Storage)."""
    loader = VideoLoader()
    try:
        tmp_path = await loader.download_from_url(request.video_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download video: {e}")

    try:
        start = time.monotonic()
        result = engine.analyze(
            video_path=tmp_path,
            exercise_type=request.exercise_type,
            camera_angle=request.camera_angle or CameraAngle.UNKNOWN,
            user_id=request.user_id,
        )
        elapsed_ms = int((time.monotonic() - start) * 1000)
        logger.info(f"URL analysis complete: {request.exercise_type.value} | {result.rep_count} reps | {elapsed_ms}ms")

        # Optionally upload results to Supabase
        if settings.supabase_url and settings.supabase_service_key and request.user_id:
            supa = SupabaseService()
            await supa.upload_analysis_result(request.user_id, result)

        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"URL analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed — see server logs")
    finally:
        Path(tmp_path).unlink(missing_ok=True)
