"""Unit tests for the RepStateMachine FSM."""
import pytest

from app.analysis.common.state_machine import RepStateMachine, PhaseTransition


# ─── Helpers ──────────────────────────────────────────────────────────────────

SQUAT_PHASES = ["standing", "descending", "bottom", "ascending"]

def _squat_advance(phase: str, value: float):
    """Squat phase transition logic (mirrors SquatAnalyzer thresholds)."""
    STANDING = 150.0
    BOTTOM = 100.0
    if phase == "standing" and value < STANDING:
        return "descending"
    if phase == "descending" and value < BOTTOM:
        return "bottom"
    if phase == "bottom" and value > BOTTOM:
        return "ascending"
    if phase == "ascending" and value > STANDING:
        return "standing"
    return None


def _feed(machine: RepStateMachine, angles: list[float], fps: int = 30) -> list:
    """Feed a list of angles into the FSM, return completed reps."""
    completed = []
    for i, angle in enumerate(angles):
        ts = int(i * (1000 / fps))
        rep = machine.update(angle, ts, i, _squat_advance)
        if rep is not None:
            completed.append(rep)
    return completed


# ─── RepStateMachine ─────────────────────────────────────────────────────────

class TestRepStateMachineInitialState:
    def test_initial_phase_is_first(self):
        sm = RepStateMachine(phases=SQUAT_PHASES)
        assert sm.current_phase == "standing"

    def test_initial_rep_count_is_zero(self):
        sm = RepStateMachine(phases=SQUAT_PHASES)
        assert sm.rep_count == 0

    def test_initial_reps_list_is_empty(self):
        sm = RepStateMachine(phases=SQUAT_PHASES)
        assert sm.reps == []


class TestRepStateMachineOneRep:
    def _one_rep_angles(self) -> list[float]:
        """Simulate a single clean squat: stand → descend → bottom → ascend → stand."""
        angles = []
        # Standing phase
        angles += [165.0] * 10
        # Descend through transition at 150
        angles += list(range(160, 95, -5))
        # At bottom
        angles += [90.0] * 5
        # Ascend through transition at 100
        angles += list(range(95, 165, 5))
        # Back to standing
        angles += [165.0] * 10
        return angles

    def test_counts_one_complete_rep(self):
        sm = RepStateMachine(phases=SQUAT_PHASES, min_amplitude=30.0)
        completed = _feed(sm, self._one_rep_angles())
        assert sm.rep_count == 1
        assert len(completed) == 1

    def test_rep_has_expected_amplitude(self):
        sm = RepStateMachine(phases=SQUAT_PHASES, min_amplitude=30.0)
        completed = _feed(sm, self._one_rep_angles())
        rep = completed[0]
        # Peak value is the minimum angle reached (deepest squat)
        assert rep.peak_value <= 100.0
        # Trough is the maximum (standing position)
        assert rep.trough_value >= 150.0
        # Amplitude should be substantial
        assert rep.amplitude >= 50.0

    def test_rep_has_nonzero_duration(self):
        sm = RepStateMachine(phases=SQUAT_PHASES, min_amplitude=30.0)
        completed = _feed(sm, self._one_rep_angles())
        rep = completed[0]
        assert rep.duration_ms > 0

    def test_rep_has_correct_index(self):
        sm = RepStateMachine(phases=SQUAT_PHASES, min_amplitude=30.0)
        completed = _feed(sm, self._one_rep_angles())
        assert completed[0].index == 1


class TestRepStateMachineMultipleReps:
    def _n_rep_angles(self, n: int) -> list[float]:
        single = (
            [165.0] * 5
            + list(range(160, 90, -5))
            + [85.0] * 3
            + list(range(90, 165, 5))
        )
        # Finish in standing
        return single * n + [165.0] * 10

    def test_counts_three_reps(self):
        sm = RepStateMachine(phases=SQUAT_PHASES, min_amplitude=30.0)
        _feed(sm, self._n_rep_angles(3))
        assert sm.rep_count == 3

    def test_counts_five_reps(self):
        sm = RepStateMachine(phases=SQUAT_PHASES, min_amplitude=30.0)
        _feed(sm, self._n_rep_angles(5))
        assert sm.rep_count == 5

    def test_rep_indices_are_sequential(self):
        sm = RepStateMachine(phases=SQUAT_PHASES, min_amplitude=30.0)
        completed = _feed(sm, self._n_rep_angles(3))
        assert [r.index for r in completed] == [1, 2, 3]


class TestRepStateMachineAmplitudeFiltering:
    def test_shallow_rep_not_counted(self):
        """A rep that only descends slightly should not be counted."""
        sm = RepStateMachine(phases=SQUAT_PHASES, min_amplitude=60.0)
        # Only descend to ~140 degrees — amplitude < 60
        angles = (
            [165.0] * 10
            + list(range(160, 135, -5))  # go to 135
            + [135.0] * 3
            + list(range(135, 165, 5))
            + [165.0] * 10
        )
        _feed(sm, angles)
        assert sm.rep_count == 0

    def test_deep_rep_counted(self):
        sm = RepStateMachine(phases=SQUAT_PHASES, min_amplitude=60.0)
        angles = (
            [165.0] * 10
            + list(range(160, 80, -5))  # go to 80 — amplitude > 60
            + [75.0] * 3
            + list(range(80, 165, 5))
            + [165.0] * 10
        )
        _feed(sm, angles)
        assert sm.rep_count == 1


class TestRepStateMachineReset:
    def test_reset_clears_reps(self):
        sm = RepStateMachine(phases=SQUAT_PHASES)
        angles = [165.0] * 5 + list(range(160, 85, -5)) + [80.0] * 3 + list(range(85, 165, 5)) + [165.0] * 5
        _feed(sm, angles)
        assert sm.rep_count >= 1
        sm.reset()
        assert sm.rep_count == 0

    def test_reset_restores_initial_phase(self):
        sm = RepStateMachine(phases=SQUAT_PHASES)
        sm.reset()
        assert sm.current_phase == "standing"

    def test_reset_clears_transitions(self):
        sm = RepStateMachine(phases=SQUAT_PHASES)
        sm.update(140.0, 0, 0, _squat_advance)
        sm.reset()
        assert sm.all_transitions == []


class TestRepStateMachineNoReps:
    def test_steady_signal_no_reps(self):
        """Constant standing angle — nothing should be counted."""
        sm = RepStateMachine(phases=SQUAT_PHASES)
        _feed(sm, [165.0] * 100)
        assert sm.rep_count == 0

    def test_partial_descent_no_completion(self):
        """Goes down but never comes back up — incomplete rep, not counted."""
        sm = RepStateMachine(phases=SQUAT_PHASES)
        angles = [165.0] * 10 + list(range(160, 80, -5))
        _feed(sm, angles)
        assert sm.rep_count == 0


class TestPhaseTransition:
    def test_transitions_recorded(self):
        sm = RepStateMachine(phases=SQUAT_PHASES)
        # Trigger the standing → descending transition
        sm.update(165.0, 0, 0, _squat_advance)
        sm.update(140.0, 33, 1, _squat_advance)  # crosses 150 threshold
        assert len(sm.all_transitions) >= 1

    def test_transition_fields(self):
        sm = RepStateMachine(phases=SQUAT_PHASES)
        sm.update(165.0, 0, 0, _squat_advance)
        sm.update(140.0, 33, 1, _squat_advance)
        t = sm.all_transitions[0]
        assert isinstance(t, PhaseTransition)
        assert t.from_phase == "standing"
        assert t.to_phase == "descending"
        assert t.timestamp_ms == 33
        assert t.trigger_value == 140.0
