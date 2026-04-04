"""Supabase integration for video storage and analysis persistence."""
from __future__ import annotations

import json
import time
from typing import Any, Optional

import httpx

from app.core.config import settings
from app.core.logging import logger


class SupabaseService:
    """Handles Supabase Storage and DB operations for video analysis."""

    def __init__(self) -> None:
        if not settings.supabase_url or not settings.supabase_service_key:
            logger.warning("Supabase not configured — persistence disabled")
        self._url = settings.supabase_url
        self._key = settings.supabase_service_key
        self._headers = {
            "apikey": self._key or "",
            "Authorization": f"Bearer {self._key or ''}",
            "Content-Type": "application/json",
        }

    @property
    def is_configured(self) -> bool:
        """Return True when both Supabase URL and service key are set."""
        return bool(self._url and self._key)

    async def persist_analysis(
        self,
        workout_id: str,
        user_id: str,
        analysis_data: dict,
    ) -> Optional[str]:
        """Persist analysis result to workout_video_analyses table. Returns record ID."""
        if not self.is_configured:
            logger.warning("Supabase not configured — skipping persist")
            return None

        row = {
            "workout_id": workout_id,
            "user_id": user_id,
            "exercise_type": analysis_data.get("exercise_type"),
            "rep_count": analysis_data.get("rep_count", 0),
            "valid_rep_count": analysis_data.get("valid_rep_count", 0),
            "form_score": analysis_data.get("form_score", 0),
            "analysis_confidence": analysis_data.get("analysis_confidence", 0),
            "verification_status": analysis_data.get(
                "verification_status", "needs_review"
            ),
            "camera_angle": analysis_data.get("camera_angle", "unknown"),
            "cheat_flags": analysis_data.get("cheat_flags", []),
            "warnings": analysis_data.get("warnings", []),
            "aggregate_metrics": analysis_data.get("aggregate_metrics", {}),
            "reps": analysis_data.get("reps", []),
            "debug_info": (
                analysis_data.get("debug") if settings.enable_debug_output else None
            ),
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._url}/rest/v1/workout_video_analyses",
                headers=self._headers,
                json=row,
            )
            if resp.status_code not in (200, 201):
                logger.error(
                    "Failed to persist analysis: %d %s",
                    resp.status_code,
                    resp.text,
                )
                return None

            data = resp.json()
            record_id = data[0]["id"] if isinstance(data, list) and data else None
            logger.info("Analysis persisted: %s", record_id)
            return record_id

    async def write_validation_summary(
        self,
        workout_id: str,
        verification_status: str,
        confidence: float,
        cheat_flags: list[str],
    ) -> None:
        """Write a summary validation row to workout_validations for compatibility."""
        if not self.is_configured:
            return

        row = {
            "workout_id": workout_id,
            "validation_type": "video_analysis",
            "passed": verification_status == "verified",
            "confidence_impact": confidence - 0.9,  # Relative to baseline
            "reason_code": (
                "video_verified"
                if verification_status == "verified"
                else "video_flagged"
            ),
            "details": {
                "verification_status": verification_status,
                "cheat_flags": cheat_flags,
                "source": "video_analysis_service",
            },
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._url}/rest/v1/workout_validations",
                headers=self._headers,
                json=row,
            )
            if resp.status_code not in (200, 201):
                logger.error(
                    "Failed to write validation: %d", resp.status_code
                )

    async def upload_analysis_result(
        self,
        user_id: str,
        result: Any,
    ) -> Optional[str]:
        """Upload analysis JSON to Supabase Storage. Returns public URL."""
        if not self.is_configured:
            return None

        filename = f"analysis/{user_id}/{int(time.time())}_result.json"
        result_json = (
            result.model_dump_json()
            if hasattr(result, "model_dump_json")
            else json.dumps(result)
        )

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._url}/storage/v1/object/"
                f"{settings.supabase_storage_bucket}/{filename}",
                headers={**self._headers, "Content-Type": "application/json"},
                content=result_json,
            )
            if resp.status_code not in (200, 201):
                logger.error(
                    "Failed to upload result: %d", resp.status_code
                )
                return None

            public_url = (
                f"{self._url}/storage/v1/object/public/"
                f"{settings.supabase_storage_bucket}/{filename}"
            )
            return public_url
