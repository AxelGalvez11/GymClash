"""Biomechanics utility functions for pose analysis."""
from __future__ import annotations
import math
from typing import NamedTuple


class Point2D(NamedTuple):
    x: float
    y: float

class Point3D(NamedTuple):
    x: float
    y: float
    z: float


def angle_2d(a: Point2D, b: Point2D, c: Point2D) -> float:
    """
    Calculate angle at point B formed by rays BA and BC in 2D.
    Returns degrees [0, 180].
    """
    ba = Point2D(a.x - b.x, a.y - b.y)
    bc = Point2D(c.x - b.x, c.y - b.y)

    dot = ba.x * bc.x + ba.y * bc.y
    mag_ba = math.sqrt(ba.x**2 + ba.y**2)
    mag_bc = math.sqrt(bc.x**2 + bc.y**2)

    if mag_ba < 1e-9 or mag_bc < 1e-9:
        return 0.0

    cos_angle = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos_angle))


def angle_3d(a: Point3D, b: Point3D, c: Point3D) -> float:
    """
    Calculate angle at point B formed by rays BA and BC in 3D.
    Uses world coordinates for depth-aware measurements.
    Returns degrees [0, 180].
    """
    ba = Point3D(a.x - b.x, a.y - b.y, a.z - b.z)
    bc = Point3D(c.x - b.x, c.y - b.y, c.z - b.z)

    dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z
    mag_ba = math.sqrt(ba.x**2 + ba.y**2 + ba.z**2)
    mag_bc = math.sqrt(bc.x**2 + bc.y**2 + bc.z**2)

    if mag_ba < 1e-9 or mag_bc < 1e-9:
        return 0.0

    cos_angle = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos_angle))


def distance_2d(a: Point2D, b: Point2D) -> float:
    """Euclidean distance between two 2D points."""
    return math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2)


def distance_3d(a: Point3D, b: Point3D) -> float:
    """Euclidean distance between two 3D points."""
    return math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2 + (a.z - b.z)**2)


def vertical_displacement(a: Point2D, b: Point2D) -> float:
    """Vertical displacement from A to B (positive = downward in screen coords)."""
    return b.y - a.y


def midpoint_2d(a: Point2D, b: Point2D) -> Point2D:
    """Midpoint between two 2D points."""
    return Point2D((a.x + b.x) / 2, (a.y + b.y) / 2)


def symmetry_score(left_value: float, right_value: float) -> float:
    """
    Symmetry score between left and right measurements.
    Returns 0-100 where 100 = perfectly symmetric.
    """
    if left_value == 0 and right_value == 0:
        return 100.0
    avg = (abs(left_value) + abs(right_value)) / 2
    if avg < 1e-9:
        return 100.0
    diff = abs(left_value - right_value)
    ratio = diff / avg
    return max(0.0, 100.0 * (1.0 - ratio))


def tempo_from_duration(duration_ms: int, expected_ms: int = 3000) -> float:
    """
    Score tempo consistency.
    Returns 0-100 where 100 = exactly expected duration.
    Penalizes both too fast and too slow.
    """
    if expected_ms <= 0 or duration_ms <= 0:
        return 0.0
    ratio = duration_ms / expected_ms
    if ratio < 0.5 or ratio > 3.0:
        return 0.0
    # Bell curve around 1.0
    deviation = abs(1.0 - ratio)
    return max(0.0, 100.0 * (1.0 - deviation * 1.5))


def range_of_motion_score(
    actual_degrees: float,
    ideal_min: float,
    ideal_max: float,
) -> float:
    """
    Score range of motion within an ideal range.
    Returns 0-100.
    """
    if actual_degrees < ideal_min * 0.5:
        return 0.0
    if actual_degrees < ideal_min:
        return 50.0 * (actual_degrees / ideal_min)
    if actual_degrees <= ideal_max:
        return 100.0
    # Over-extended — mild penalty
    overshoot = actual_degrees - ideal_max
    return max(50.0, 100.0 - overshoot * 2)
