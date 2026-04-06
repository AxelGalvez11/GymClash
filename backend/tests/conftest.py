"""
pytest configuration for the GymClash backend tests.

Sets GYMCLASH_MEDIAPIPE_MODEL_PATH to a dummy value so that importing
app modules doesn't crash due to a missing model file. The tests that
exercise the FSM and angle utilities don't load the model anyway.
"""
import os
import pytest

os.environ.setdefault("GYMCLASH_MEDIAPIPE_MODEL_PATH", "models/pose_landmarker_heavy.task")
os.environ.setdefault("GYMCLASH_SUPABASE_URL", "")
os.environ.setdefault("GYMCLASH_SUPABASE_SERVICE_KEY", "")
