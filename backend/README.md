# GymClash Video Analysis Service

Standalone Python service that analyzes workout videos using MediaPipe pose estimation. It detects exercises, counts reps, scores form quality, and flags potential cheating -- feeding results back into the GymClash anti-cheat and scoring pipeline.

## Architecture Overview

```
Expo App (React Native)
  |
  |  1. User records workout video
  |  2. Video uploaded to Supabase Storage
  |  3. App calls POST /analyze-from-url with the storage URL
  v
Video Analysis Service (this repo — FastAPI + MediaPipe)
  |
  |  4. Downloads video, extracts frames
  |  5. Runs MediaPipe Pose on sampled frames
  |  6. Detects exercise type, counts reps, scores form
  |  7. Persists results to workout_video_analyses table
  |  8. Returns structured JSON response
  v
Supabase (PostgreSQL)
  |
  |  9. workout_video_analyses row linked to workout
  | 10. Expo app queries analysis via RLS-protected SELECT
  v
Expo App (displays form score, rep count, flags)
```

The service runs independently from the Expo app. In production it is deployed as a containerized service (e.g., Cloud Run, Fly.io, Railway) and accessed via `EXPO_PUBLIC_VIDEO_ANALYSIS_URL`.

## Prerequisites

- **Python 3.11+**
- **MediaPipe Pose Landmarker model** -- download the heavy model:
  ```
  https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task
  ```
  Place the `.task` file in the `backend/` directory (or set `GYMCLASH_MEDIAPIPE_MODEL_PATH` to point to its location).

## Setup

```bash
# From the project root
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate   # macOS/Linux
# .venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Download MediaPipe model
curl -L -o pose_landmarker_heavy.task \
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task"

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials (optional for local dev)
```

## Running Locally

```bash
# From the backend/ directory with venv activated
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

In the Expo app, set the environment variable so the client hits your local service:

```bash
EXPO_PUBLIC_VIDEO_ANALYSIS_URL=http://localhost:8000
```

## API Endpoints

### `GET /health`

Health check.

```bash
curl http://localhost:8000/health
```

```json
{ "status": "ok", "version": "1.0.0" }
```

### `POST /analyze`

Analyze a video file uploaded as multipart form data.

```bash
curl -X POST http://localhost:8000/analyze \
  -F "file=@workout.mp4" \
  -F "exercise_type=squat" \
  -F "camera_angle=side"
```

### `POST /analyze-from-url`

Analyze a video by URL (used by the Expo app after uploading to Supabase Storage).

```bash
curl -X POST http://localhost:8000/analyze-from-url \
  -H "Content-Type: application/json" \
  -d '{
    "video_url": "https://your-project.supabase.co/storage/v1/object/public/workout-videos/abc123.mp4",
    "exercise_type": "squat",
    "workout_id": "uuid-of-workout",
    "user_id": "uuid-of-user",
    "camera_angle": "side"
  }'
```

Response:

```json
{
  "exercise_type": "squat",
  "video_summary": {
    "duration_ms": 45000,
    "total_frames": 1350,
    "sampled_frames": 135,
    "fps": 30,
    "resolution_width": 1080,
    "resolution_height": 1920
  },
  "rep_count": 10,
  "valid_rep_count": 8,
  "form_score": 72.5,
  "analysis_confidence": 0.85,
  "verification_status": "needs_review",
  "camera_angle": "side",
  "cheat_flags": [],
  "warnings": ["Depth below parallel not reached on reps 3, 7"],
  "aggregate_metrics": {
    "avg_range_of_motion": 0.78,
    "avg_tempo_seconds": 2.3,
    "avg_symmetry": 0.91,
    "avg_depth": 0.65,
    "tempo_consistency": 0.88,
    "best_rep_index": 4,
    "worst_rep_index": 7
  },
  "reps": [
    {
      "rep_index": 0,
      "start_time_ms": 2100,
      "end_time_ms": 4400,
      "duration_ms": 2300,
      "quality": "good",
      "confidence": 0.92,
      "range_of_motion_score": 0.85,
      "tempo_score": 0.90,
      "symmetry_score": 0.88,
      "form_flags": [],
      "metrics": {
        "primary_angle_min": 72.3,
        "primary_angle_max": 168.5,
        "range_of_motion": 96.2,
        "depth_score": 0.78,
        "lockout_score": 0.95,
        "symmetry_left_right": 0.88,
        "torso_lean": 12.4,
        "tempo_seconds": 2.3
      }
    }
  ]
}
```

### `GET /exercises`

List supported exercise types and their primary joint angles.

```bash
curl http://localhost:8000/exercises
```

## How the Expo App Calls This Service

The Expo app uses two functions in `services/api.ts`:

1. **`triggerVideoAnalysis(params)`** -- calls `POST /analyze-from-url` on this service to start analysis. Called after the user uploads a workout video to Supabase Storage.

2. **`fetchVideoAnalysis(workoutId)`** -- reads the persisted result from the `workout_video_analyses` table via Supabase (RLS-protected, user can only see their own).

The flow in the app:

```typescript
// 1. Upload video to Supabase Storage
const { data } = await supabase.storage
  .from('workout-videos')
  .upload(path, file);

// 2. Trigger analysis
const result = await triggerVideoAnalysis({
  videoUrl: publicUrl,
  exerciseType: 'squat',
  workoutId: workout.id,
  userId: user.id,
});

// 3. Later, fetch persisted result
const analysis = await fetchVideoAnalysis(workout.id);
```

## Adding a New Exercise Analyzer

To add support for a new exercise (e.g., `plank`):

1. **Define joint angles**: Identify the primary and secondary joint angles that characterize the exercise. Add the configuration to the exercise registry in `app/exercises/`.

2. **Create the analyzer module**: Add a new file `app/exercises/plank.py` implementing the exercise-specific analysis logic:
   - Define the rep detection criteria (or duration-based for static holds)
   - Set the form scoring rubric (which angles matter, acceptable ranges)
   - Define cheat flags (what constitutes bad form or cheating)

3. **Register the exercise**: Add the exercise to the exercise registry so the router can dispatch to it.

4. **Update the frontend type**: Add `'plank'` to the `VideoExerciseType` union in `types/index.ts`.

5. **Test**: Record sample videos from multiple angles and verify detection accuracy.

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `GYMCLASH_DEBUG` | `false` | Enable debug logging and verbose output |
| `GYMCLASH_APP_VERSION` | `1.0.0` | Version string returned by `/health` |
| `GYMCLASH_MEDIAPIPE_MODEL_PATH` | `pose_landmarker_heavy.task` | Path to MediaPipe model file |
| `GYMCLASH_NUM_POSES` | `1` | Max number of poses to detect per frame |
| `GYMCLASH_MIN_DETECTION_CONFIDENCE` | `0.5` | MediaPipe detection confidence threshold |
| `GYMCLASH_MIN_PRESENCE_CONFIDENCE` | `0.5` | MediaPipe presence confidence threshold |
| `GYMCLASH_MIN_TRACKING_CONFIDENCE` | `0.5` | MediaPipe tracking confidence threshold |
| `GYMCLASH_FRAME_SAMPLE_RATE` | `10` | Process every Nth frame (higher = faster, less accurate) |
| `GYMCLASH_MAX_VIDEO_DURATION_SECONDS` | `600` | Reject videos longer than this |
| `GYMCLASH_MAX_VIDEO_SIZE_MB` | `200` | Reject uploads larger than this |
| `GYMCLASH_SMOOTHING_WINDOW` | `5` | Frames to smooth joint angles over |
| `GYMCLASH_MIN_REP_AMPLITUDE_DEGREES` | `30` | Minimum angle change to count as a rep |
| `GYMCLASH_MIN_REP_CONFIDENCE` | `0.3` | Minimum confidence to count a detected rep |
| `GYMCLASH_ENABLE_DEBUG_OUTPUT` | `false` | Include debug_info in responses |
| `GYMCLASH_SUPABASE_URL` | _(empty)_ | Supabase project URL for persistence |
| `GYMCLASH_SUPABASE_SERVICE_KEY` | _(empty)_ | Supabase service_role key (server-only, never expose) |
| `GYMCLASH_SUPABASE_STORAGE_BUCKET` | `workout-videos` | Storage bucket name for video files |
| `GYMCLASH_HOST` | `0.0.0.0` | Server bind address |
| `GYMCLASH_PORT` | `8000` | Server port |

## Limitations and Future Work

**Current limitations:**

- Single-person analysis only (`NUM_POSES=1`). Multi-person scenes may produce unreliable results.
- Camera angle detection is basic. Best results with side or front-facing angles.
- Static hold exercises (plank, wall sit) are not yet supported -- only repetition-based exercises.
- No GPU acceleration in the default setup. MediaPipe runs on CPU which limits throughput.
- Video must be downloadable via URL. Direct streaming is not supported.

**Planned improvements:**

- GPU-accelerated inference for production throughput
- Automatic camera angle detection using pose geometry
- Support for compound movements (e.g., clean and press)
- Real-time analysis via WebSocket for live feedback during workouts
- Model fine-tuning on gym-specific datasets for higher accuracy
- Batch analysis endpoint for processing multiple videos
- Webhook notifications when analysis completes (for async workflows)
