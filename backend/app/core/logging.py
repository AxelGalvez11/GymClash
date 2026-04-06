"""Structured logging configuration."""
import logging
import sys
from app.core.config import settings


def setup_logging() -> logging.Logger:
    """Configure application logging."""
    level = logging.DEBUG if settings.debug else logging.INFO

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    logger = logging.getLogger("gymclash")
    logger.setLevel(level)
    logger.addHandler(handler)

    # Suppress noisy libraries
    logging.getLogger("mediapipe").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    return logger


logger = setup_logging()
