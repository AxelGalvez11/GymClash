"""
Unit tests for the SquatAnalyzer.

These tests use mocked pose landmarks so they don't need the MediaPipe
model file or a real video — just pure Python.
"""
import math
import pytest
from unittest.mock import MagicMock, patch

from app.analysis.common.angles import Point2D
from app.analysis.common.state_machine import RepStateMachine


# ─── Minimal mocks ───────────────────────────────────────────────────────────

def _make_landmark(x: float, y: float, z: float = 0.0, visibility: float = 1.0) -> MagicMock:
    lm = MagicMock()
    lm.x = x
    lm.y = y
    lm.z = z
    lm.visibility = visibility
    return lm


def _landmarks_for_angle(knee_angle_deg: float) -> dict[int, MagicMock]:
    """
    Build a minimal set of landmarks that produce a given knee angle.
    Uses a simple triangle with the knee as vertex B.

    Landmark indices (MediaPipe):
      23/24 = hip, 25/26 = knee, 27/28 = ankle, 11/12 = shoulder
    """
    # Place hip at origin, knee below, ankle at an angle from knee
    hip = Point2D(0.5, 0.3)
    knee = Point2D(0.5, 0.6)

    # Ankle position determined by desired knee angle
    rad = math.radians(knee_angle_deg)
    ankle_x = knee.x + 0.15 * math.sin(math.pi - rad)
    ankle_y = knee.y + 0.15 * math.cos(math.pi - rad)
    ankle = Point2D(ankle_x, ankle_y)

    shoulder = Point2D(0.5, 0.1)

    lm = {}
    for idx, pt in [
        (11, shoulder), (12, shoulder),
        (23, hip), (24, hip),
        (25, knee), (26, knee),
        (27, ankle), (28, ankle),
    ]:
        lm[idx] = _make_landmark(pt.x, pt.y)

    return lm


# ─── angle_2d correctness ─────────────────────────────────────────────────────

class TestAngle2DForSquat:
    """Verify the angle calculation that the squat analyzer uses internally."""

    def test_standing_angle(self):
        from app.analysis.common.angles import angle_2d, Point2D
        # Straight leg: hip, knee, ankle in a vertical line
        hip = Point2D(0.5, 0.3)
        knee = Point2D(0.5, 0.6)
        ankle = Point2D(0.5, 0.9)
        angle = angle_2d(hip, knee, ankle)
        assert abs(angle - 180.0) < 1.0

    def test_deep_squat_angle(self):
        from app.analysis.common.angles import angle_2d, Point2D
        # 90-degree knee angle
        hip = Point2D(0.3, 0.3)
        knee = Point2D(0.5, 0.5)
        ankle = Point2D(0.5, 0.8)
        angle = angle_2d(hip, knee, ankle)
        # Should be somewhere in the 60-120 range for a bent knee
        assert 40.0 < angle < 130.0


# ─── RepStateMachine integration for squat logic ─────────────────────────────

class TestSquatStateMachineIntegration:
    """
    Integration test for the squat FSM with realistic angle sequences.
    Doesn't need the full SquatAnalyzer — tests the core logic directly.
    """

    PHASES = ["standing", "descending", "bottom", "ascending"]
    STANDING = 150.0
    BOTTOM = 100.0

    def _advance(self, phase: str, value: float):
        if phase == "standing" and value < self.STANDING:
            return "descending"
        if phase == "descending" and value < self.BOTTOM:
            return "bottom"
        if phase == "bottom" and value > self.BOTTOM:
            return "ascending"
        if phase == "ascending" and value > self.STANDING:
            return "standing"
        return None

    def _feed(self, sm: RepStateMachine, angles: list[float]) -> list:
        completed = []
        for i, a in enumerate(angles):
            rep = sm.update(a, i * 33, i, self._advance)
            if rep:
                completed.append(rep)
        return completed

    def test_one_good_squat(self):
        sm = RepStateMachine(self.PHASES, min_amplitude=30.0)
        angles = (
            [165.0] * 8
            + list(range(160, 85, -5))
            + [80.0] * 4
            + list(range(85, 168, 5))
            + [165.0] * 8
        )
        completed = self._feed(sm, angles)
        assert sm.rep_count == 1
        assert completed[0].amplitude > 60.0

    def test_three_squats_counted(self):
        sm = RepStateMachine(self.PHASES, min_amplitude=30.0)
        single = (
            [165.0] * 5
            + list(range(160, 85, -5))
            + [80.0] * 3
            + list(range(85, 168, 5))
        )
        angles = single * 3 + [165.0] * 5
        self._feed(sm, angles)
        assert sm.rep_count == 3

    def test_partial_squat_not_counted(self):
        """Goes down but never completes the up phase."""
        sm = RepStateMachine(self.PHASES, min_amplitude=30.0)
        angles = [165.0] * 5 + list(range(160, 80, -5))
        self._feed(sm, angles)
        assert sm.rep_count == 0

    def test_minimal_amplitude_threshold(self):
        """High amplitude threshold filters out shallow reps."""
        sm = RepStateMachine(self.PHASES, min_amplitude=90.0)
        # Goes down to 100 (boundary) — amplitude ~65 degrees, below threshold
        angles = (
            [165.0] * 5
            + list(range(160, 95, -5))
            + [95.0] * 3
            + list(range(95, 168, 5))
            + [165.0] * 5
        )
        self._feed(sm, angles)
        assert sm.rep_count == 0


# ─── Symmetry score for squats ────────────────────────────────────────────────

class TestSquatSymmetryScoring:
    def test_perfect_symmetry(self):
        from app.analysis.common.angles import symmetry_score
        # Both knees at 90 degrees
        assert symmetry_score(90.0, 90.0) == 100.0

    def test_moderate_asymmetry(self):
        from app.analysis.common.angles import symmetry_score
        # 80 vs 100 degrees
        score = symmetry_score(80.0, 100.0)
        assert 75.0 <= score <= 90.0

    def test_large_asymmetry_penalized(self):
        from app.analysis.common.angles import symmetry_score
        # 60 vs 120 degrees (significant imbalance)
        score = symmetry_score(60.0, 120.0)
        assert score < 70.0


# ─── ROM scoring for squats ───────────────────────────────────────────────────

class TestSquatROMScoring:
    # Squat ideal depth range (from squat.py): 60–100 degrees
    IDEAL_MIN = 60.0
    IDEAL_MAX = 100.0

    def test_ideal_depth_scores_100(self):
        from app.analysis.common.angles import range_of_motion_score
        assert range_of_motion_score(80.0, self.IDEAL_MIN, self.IDEAL_MAX) == 100.0

    def test_shallow_squat_scores_lower(self):
        from app.analysis.common.angles import range_of_motion_score
        # Only reaches 120 degrees — above ideal range (didn't squat deep enough)
        score = range_of_motion_score(120.0, self.IDEAL_MIN, self.IDEAL_MAX)
        assert score < 100.0

    def test_too_shallow_scores_zero(self):
        from app.analysis.common.angles import range_of_motion_score
        # Only 20 degrees — less than half of IDEAL_MIN (30 degrees)
        score = range_of_motion_score(20.0, self.IDEAL_MIN, self.IDEAL_MAX)
        assert score == 0.0
