"""Unit tests for biomechanics angle utilities."""
import math
import pytest

from app.analysis.common.angles import (
    Point2D,
    Point3D,
    angle_2d,
    angle_3d,
    distance_2d,
    distance_3d,
    symmetry_score,
    range_of_motion_score,
    midpoint_2d,
)


# ─── angle_2d ────────────────────────────────────────────────────────────────

class TestAngle2D:
    def test_right_angle(self):
        a = Point2D(0, 1)
        b = Point2D(0, 0)
        c = Point2D(1, 0)
        assert abs(angle_2d(a, b, c) - 90.0) < 0.01

    def test_straight_angle(self):
        a = Point2D(0, 0)
        b = Point2D(1, 0)
        c = Point2D(2, 0)
        assert abs(angle_2d(a, b, c) - 180.0) < 0.01

    def test_acute_angle(self):
        # 45-degree angle
        a = Point2D(1, 0)
        b = Point2D(0, 0)
        c = Point2D(1, 1)
        assert abs(angle_2d(a, b, c) - 45.0) < 0.01

    def test_zero_length_vector_returns_zero(self):
        # Both a and b are the same point — degenerate case
        a = Point2D(1, 0)
        b = Point2D(1, 0)
        c = Point2D(2, 0)
        assert angle_2d(a, b, c) == 0.0

    def test_symmetric_inputs_give_same_result(self):
        a = Point2D(0, 1)
        b = Point2D(0, 0)
        c = Point2D(1, 0)
        # angle(a, b, c) == angle(c, b, a)
        assert abs(angle_2d(a, b, c) - angle_2d(c, b, a)) < 1e-9

    def test_result_in_valid_range(self):
        import random
        rng = random.Random(42)
        for _ in range(100):
            a = Point2D(rng.uniform(-10, 10), rng.uniform(-10, 10))
            b = Point2D(rng.uniform(-10, 10), rng.uniform(-10, 10))
            c = Point2D(rng.uniform(-10, 10), rng.uniform(-10, 10))
            result = angle_2d(a, b, c)
            assert 0.0 <= result <= 180.0, f"Out of range: {result}"


# ─── angle_3d ────────────────────────────────────────────────────────────────

class TestAngle3D:
    def test_right_angle_3d(self):
        a = Point3D(1, 0, 0)
        b = Point3D(0, 0, 0)
        c = Point3D(0, 1, 0)
        assert abs(angle_3d(a, b, c) - 90.0) < 0.01

    def test_straight_angle_3d(self):
        a = Point3D(-1, 0, 0)
        b = Point3D(0, 0, 0)
        c = Point3D(1, 0, 0)
        assert abs(angle_3d(a, b, c) - 180.0) < 0.01

    def test_diagonal_3d(self):
        # 45 degrees in x-z plane
        a = Point3D(1, 0, 0)
        b = Point3D(0, 0, 0)
        c = Point3D(0, 0, 1)
        assert abs(angle_3d(a, b, c) - 90.0) < 0.01

    def test_zero_vector_returns_zero(self):
        a = Point3D(0, 0, 0)
        b = Point3D(0, 0, 0)
        c = Point3D(1, 0, 0)
        assert angle_3d(a, b, c) == 0.0


# ─── distance_2d ─────────────────────────────────────────────────────────────

class TestDistance2D:
    def test_unit_distance(self):
        a = Point2D(0, 0)
        b = Point2D(1, 0)
        assert abs(distance_2d(a, b) - 1.0) < 1e-9

    def test_diagonal_distance(self):
        a = Point2D(0, 0)
        b = Point2D(3, 4)
        assert abs(distance_2d(a, b) - 5.0) < 1e-9

    def test_same_point_is_zero(self):
        a = Point2D(3.5, -2.1)
        assert distance_2d(a, a) == 0.0

    def test_symmetric(self):
        a = Point2D(1, 2)
        b = Point2D(4, 6)
        assert abs(distance_2d(a, b) - distance_2d(b, a)) < 1e-9


# ─── distance_3d ─────────────────────────────────────────────────────────────

class TestDistance3D:
    def test_unit_cube_diagonal(self):
        a = Point3D(0, 0, 0)
        b = Point3D(1, 1, 1)
        assert abs(distance_3d(a, b) - math.sqrt(3)) < 1e-9

    def test_same_point_is_zero(self):
        p = Point3D(1.0, -2.0, 3.5)
        assert distance_3d(p, p) == 0.0


# ─── symmetry_score ───────────────────────────────────────────────────────────

class TestSymmetryScore:
    def test_perfect_symmetry(self):
        assert symmetry_score(45.0, 45.0) == 100.0

    def test_zero_symmetry_both_zero(self):
        assert symmetry_score(0.0, 0.0) == 100.0

    def test_large_asymmetry(self):
        # One side has double the angle of the other
        score = symmetry_score(30.0, 90.0)
        assert score < 70.0

    def test_small_asymmetry(self):
        score = symmetry_score(88.0, 92.0)
        assert score >= 90.0

    def test_always_in_range(self):
        assert 0.0 <= symmetry_score(0.0, 100.0) <= 100.0
        assert 0.0 <= symmetry_score(100.0, 0.0) <= 100.0


# ─── range_of_motion_score ───────────────────────────────────────────────────

class TestRangeOfMotionScore:
    def test_perfect_score_in_ideal_range(self):
        # Squat ideal range: 60–100 degrees
        assert range_of_motion_score(80.0, 60.0, 100.0) == 100.0

    def test_on_ideal_boundary(self):
        assert range_of_motion_score(60.0, 60.0, 100.0) == 100.0
        assert range_of_motion_score(100.0, 60.0, 100.0) == 100.0

    def test_below_half_ideal_min_returns_zero(self):
        assert range_of_motion_score(20.0, 60.0, 100.0) == 0.0

    def test_partial_below_min(self):
        # Between half-min and min — should be 0–50
        score = range_of_motion_score(45.0, 60.0, 100.0)
        assert 0.0 <= score <= 50.0

    def test_over_extended_penalized(self):
        # Slightly over ideal max — modest penalty, still > 50
        score = range_of_motion_score(115.0, 60.0, 100.0)
        assert score >= 50.0

    def test_severely_over_extended(self):
        # Far over ideal max — larger penalty
        score_slight = range_of_motion_score(105.0, 60.0, 100.0)
        score_severe = range_of_motion_score(140.0, 60.0, 100.0)
        assert score_slight >= score_severe


# ─── midpoint_2d ─────────────────────────────────────────────────────────────

class TestMidpoint2D:
    def test_basic_midpoint(self):
        a = Point2D(0, 0)
        b = Point2D(2, 4)
        mid = midpoint_2d(a, b)
        assert mid.x == 1.0
        assert mid.y == 2.0

    def test_same_point_midpoint(self):
        a = Point2D(3.5, -1.0)
        mid = midpoint_2d(a, a)
        assert mid.x == 3.5
        assert mid.y == -1.0
