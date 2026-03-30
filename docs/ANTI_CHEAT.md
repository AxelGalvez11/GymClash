# GymClash — Anti-Cheat System Design

## Philosophy

Anti-cheat is core infrastructure, not a side feature. The entire competitive experience depends on leaderboard trust. If users believe scores are fake, they leave.

**Goals:**
- Prevent obvious fraud
- Reduce false positives (don't harass honest users)
- Preserve leaderboard trust
- Make review rare, not constant
- Provide clear, non-adversarial communication when issues arise

## Trust Hierarchy

Workout evidence is ranked by trust level:

| Level | Source | Trust Score Bonus |
|-------|--------|-------------------|
| 5 | Device/wearable verified data | +0.10 |
| 4 | Sensor-supported mobile data | +0.05 |
| 3 | Gym machine / photo evidence | +0.00 |
| 2 | Manual entry | +0.00 |
| 1 | Edited or disputed entry | -0.10 |

Higher trust sources start with higher baseline confidence.

## Validation Checks

### Scout (Running) Checks

| Check | What It Detects | Threshold | Severity |
|-------|----------------|-----------|----------|
| Impossible speed | Driving/biking | >25 km/h sustained | Critical |
| Pace sanity | Implausible pace values | <2.4 or >20 min/km | Warning |
| Route sanity | Distance/duration mismatch | >1 min/km discrepancy | Warning |
| Pace-cadence mismatch | Fake GPS with no steps | Future: requires step data | Warning |
| Pace-HR mismatch | Effort doesn't match heart rate | Future: requires HR data | Info |
| Spoof detection | GPS spoofing patterns | Future: location analysis | Critical |
| Pause abuse | Excessive pausing to inflate time | Future: pause pattern analysis | Warning |

### Strength (Lifting) Checks

| Check | What It Detects | Threshold | Severity |
|-------|----------------|-----------|----------|
| Tonnage plausibility | Impossible total volume | >50,000 kg per session | Critical |
| Workout density | Too many sets per hour | >40 sets/hour | Critical |
| Rest intervals | Impossibly short rests | <15s avg between sets | Critical |
| Tonnage spike | Sudden volume increase | >200% of 30-day average | Warning |
| Progression jump | Unrealistic weight increase | Future: progression tracking | Warning |
| Suspicious edit | Manual edits to validated data | Future: edit audit trail | Warning |
| Effort-biometric mismatch | Claimed effort vs biometrics | Future: requires biometric data | Info |

## Confidence Model

Every workout receives:

### Confidence Score (0.0 – 1.0)

Calculation:
```
base_confidence = 0.9 + source_trust_bonus
final_confidence = clamp(base_confidence + Σ check_impacts, 0, 1)
```

Each failed check applies a negative impact:
- Critical failure: -0.7 to -0.8
- Warning: -0.3 to -0.5
- Info: -0.1 to -0.2

### Validation Status

| Status | Confidence Range | Meaning |
|--------|-----------------|---------|
| `accepted` | ≥ 0.8 | Full credit for personal score and clan contribution |
| `accepted_with_low_confidence` | 0.6 – 0.8 | Full personal credit, reduced clan contribution visibility |
| `excluded_from_clan_score` | 0.4 – 0.6 | Personal XP only, no clan war contribution |
| `held_for_review` | 0.2 – 0.4 | No credit until review is completed |
| `rejected` | < 0.2 or critical failure | No credit, user notified |

### Reason Codes

Every validation check produces a reason code explaining what was checked and whether it passed. These are shown to users when a workout is flagged.

Codes: `impossible_speed`, `route_sanity_fail`, `pace_cadence_mismatch`, `pace_hr_mismatch`, `spoof_detected`, `pause_abuse`, `impossible_density`, `tonnage_spike`, `progression_jump`, `impossible_rest`, `suspicious_edit`, `effort_biometric_mismatch`, `clean`

## Appeal Flow

1. **Notification**: User is notified when a workout is flagged (push notification + in-app indicator)
2. **Explanation**: Clear display of which checks failed and what was suspicious
3. **Appeal submission**: User can describe why the flag is incorrect
4. **Proof upload**: Placeholder for photo/video evidence (MVP: text only)
5. **Admin review queue**: Flagged workouts enter a review queue for moderators

### Appeal Statuses
- `pending` — submitted, awaiting review
- `under_review` — moderator is examining
- `approved` — workout reinstated with full credit
- `denied` — flag upheld, no credit

### MVP Scope
- No community jury system (future feature)
- Admin review only
- Simple text-based appeals
- Proof upload UI scaffolded but not fully integrated

## Reporting System

Users can report suspicious entries from other users.

### Design Constraints
- Reports are a **signal**, not automatic conviction
- Reporter reputation is tracked internally (frequent false reports reduce weight)
- Spam/malicious reporting is rate-limited
- Reports do not instantly punish the reported user
- Multiple independent reports on the same workout increase investigation priority

### Report Categories
- `impossible_stats` — clearly fake numbers
- `suspected_spoofing` — GPS or data spoofing
- `inappropriate_behavior` — non-cheating violations
- `other` — free text
