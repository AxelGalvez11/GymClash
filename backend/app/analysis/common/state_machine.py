"""Finite state machine framework for rep counting."""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Callable, Optional

from app.core.config import settings


class Phase(str, Enum):
    """Generic movement phases. Exercises define their own mappings."""
    NEUTRAL = "neutral"
    PHASE_A = "phase_a"  # e.g., descending
    PHASE_B = "phase_b"  # e.g., bottom
    PHASE_C = "phase_c"  # e.g., ascending
    PHASE_D = "phase_d"  # e.g., lockout


@dataclass(frozen=True)
class PhaseTransition:
    """A recorded phase transition."""
    from_phase: str
    to_phase: str
    timestamp_ms: int
    trigger_value: float  # The angle/position that triggered it


@dataclass
class RepRecord:
    """Data for a single counted rep."""
    index: int
    start_ms: int
    end_ms: int = 0
    peak_value: float = 0.0  # Min angle (squat depth, etc.)
    trough_value: float = 0.0  # Max angle (lockout, etc.)
    frame_indices: list[int] = field(default_factory=list)
    transitions: list[PhaseTransition] = field(default_factory=list)

    @property
    def duration_ms(self) -> int:
        return self.end_ms - self.start_ms if self.end_ms > self.start_ms else 0

    @property
    def amplitude(self) -> float:
        return abs(self.peak_value - self.trough_value)


@dataclass
class Threshold:
    """Angle threshold for phase transitions."""
    enter: float  # Angle to enter this phase
    exit: float   # Angle to exit this phase


class RepStateMachine:
    """
    Finite state machine for counting exercise repetitions.

    Each exercise defines:
    - phases: ordered list of phase names
    - thresholds: angle values that trigger transitions
    - primary_metric: which angle drives the state machine

    The FSM tracks the primary metric through phases:
    e.g., for squat: standing(>160°) → descending → bottom(<90°) → ascending → standing

    A rep is counted when the full cycle completes back to the initial phase.
    """

    def __init__(
        self,
        phases: list[str],
        min_amplitude: float | None = None,
    ) -> None:
        self.phases = phases
        self.min_amplitude = min_amplitude or settings.min_rep_amplitude_degrees

        self._current_phase = phases[0]
        self._phase_index = 0
        self._current_rep: Optional[RepRecord] = None
        self._completed_reps: list[RepRecord] = []
        self._rep_counter = 0
        self._transitions: list[PhaseTransition] = []

        # Tracking extremes for amplitude check
        self._current_min = float('inf')
        self._current_max = float('-inf')

    @property
    def current_phase(self) -> str:
        return self._current_phase

    @property
    def reps(self) -> list[RepRecord]:
        return self._completed_reps

    @property
    def rep_count(self) -> int:
        return len(self._completed_reps)

    @property
    def all_transitions(self) -> list[PhaseTransition]:
        return self._transitions

    def update(
        self,
        value: float,
        timestamp_ms: int,
        frame_index: int,
        should_advance: Callable[[str, float], Optional[str]] | None = None,
    ) -> Optional[RepRecord]:
        """
        Feed a new measurement into the state machine.

        Args:
            value: The primary metric (e.g., knee angle)
            timestamp_ms: Frame timestamp
            frame_index: Frame index in video
            should_advance: Callback(current_phase, value) -> next_phase or None

        Returns:
            RepRecord if a rep was just completed, else None.
        """
        # Track extremes
        self._current_min = min(self._current_min, value)
        self._current_max = max(self._current_max, value)

        # Determine next phase
        next_phase: Optional[str] = None
        if should_advance:
            next_phase = should_advance(self._current_phase, value)

        if next_phase is None or next_phase == self._current_phase:
            # No transition — track frame in current rep
            if self._current_rep is not None:
                self._current_rep.frame_indices.append(frame_index)
            return None

        # Record transition
        transition = PhaseTransition(
            from_phase=self._current_phase,
            to_phase=next_phase,
            timestamp_ms=timestamp_ms,
            trigger_value=value,
        )
        self._transitions.append(transition)

        # Start tracking a new rep at the first transition from initial phase
        if self._current_phase == self.phases[0] and self._current_rep is None:
            self._rep_counter += 1
            self._current_rep = RepRecord(
                index=self._rep_counter,
                start_ms=timestamp_ms,
            )
            self._current_min = value
            self._current_max = value

        if self._current_rep is not None:
            self._current_rep.transitions.append(transition)
            self._current_rep.frame_indices.append(frame_index)

        self._current_phase = next_phase

        # Check if we completed a full cycle back to initial phase
        if next_phase == self.phases[0] and self._current_rep is not None:
            rep = self._current_rep
            rep.end_ms = timestamp_ms
            rep.peak_value = self._current_min
            rep.trough_value = self._current_max

            # Validate amplitude
            amplitude = rep.amplitude
            if amplitude >= self.min_amplitude:
                self._completed_reps.append(rep)

            # Reset for next rep
            self._current_rep = None
            self._current_min = float('inf')
            self._current_max = float('-inf')

            if amplitude >= self.min_amplitude:
                return rep

        return None

    def reset(self) -> None:
        """Reset the state machine."""
        self._current_phase = self.phases[0]
        self._phase_index = 0
        self._current_rep = None
        self._completed_reps.clear()
        self._rep_counter = 0
        self._transitions.clear()
        self._current_min = float('inf')
        self._current_max = float('-inf')
