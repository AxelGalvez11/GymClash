"""Landmark smoothing and preprocessing utilities."""
from __future__ import annotations
from collections import deque
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SmoothedValue:
    """Exponential moving average smoother for a single value."""
    alpha: float = 0.3  # Smoothing factor (higher = less smoothing)
    _value: Optional[float] = field(default=None, init=False)

    def update(self, raw: float) -> float:
        if self._value is None:
            self._value = raw
        else:
            self._value = self.alpha * raw + (1 - self.alpha) * self._value
        return self._value

    @property
    def value(self) -> Optional[float]:
        return self._value

    def reset(self) -> None:
        self._value = None


class MovingAverageSmoother:
    """Moving average smoother for a sequence of values."""

    def __init__(self, window: int = 5) -> None:
        self._window = max(1, window)
        self._buffer: deque[float] = deque(maxlen=self._window)

    def update(self, value: float) -> float:
        self._buffer.append(value)
        return sum(self._buffer) / len(self._buffer)

    def reset(self) -> None:
        self._buffer.clear()


class AngleSmoother:
    """Smooths a named angle measurement across frames."""

    def __init__(self, name: str, window: int = 5) -> None:
        self.name = name
        self._smoother = MovingAverageSmoother(window)
        self._raw_history: list[float] = []
        self._smoothed_history: list[float] = []

    def update(self, raw_angle: float) -> float:
        smoothed = self._smoother.update(raw_angle)
        self._raw_history.append(raw_angle)
        self._smoothed_history.append(smoothed)
        return smoothed

    @property
    def history(self) -> list[float]:
        return self._smoothed_history

    @property
    def raw_history(self) -> list[float]:
        return self._raw_history

    def reset(self) -> None:
        self._smoother.reset()
        self._raw_history.clear()
        self._smoothed_history.clear()


def interpolate_missing(
    values: list[Optional[float]],
    max_gap: int = 3,
) -> list[Optional[float]]:
    """
    Fill gaps of up to max_gap consecutive None values via linear interpolation.
    Longer gaps remain None.
    """
    result = list(values)
    n = len(result)
    i = 0
    while i < n:
        if result[i] is not None:
            i += 1
            continue
        # Find gap boundaries
        start = i
        while i < n and result[i] is None:
            i += 1
        end = i
        gap_len = end - start

        if gap_len > max_gap:
            continue

        # Find boundary values
        left = result[start - 1] if start > 0 else None
        right = result[end] if end < n else None

        if left is not None and right is not None:
            for j in range(start, end):
                t = (j - start + 1) / (gap_len + 1)
                result[j] = left + t * (right - left)
        elif left is not None:
            for j in range(start, end):
                result[j] = left
        elif right is not None:
            for j in range(start, end):
                result[j] = right

    return result
