"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import logger
from app.api.routes import router

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Workout video analysis service for GymClash",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def startup() -> None:
    logger.info(f"{settings.app_name} v{settings.app_version} starting")
    logger.info(f"Debug mode: {settings.debug}")


@app.on_event("shutdown")
async def shutdown() -> None:
    logger.info("Shutting down")
