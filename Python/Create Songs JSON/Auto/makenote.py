import librosa
import numpy as np
import json
import random

# SETTINGS
AUDIO_FILE = "song.mp3"
OUTPUT_FILE = "chart.json"

# keys for your game
KEYS = ["KeyZ", "KeyX", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]

# tweak these to control difficulty
MIN_TIME_BETWEEN_NOTES = 0.35   # seconds
THRESHOLD = 1.3                # higher = fewer notes

# 1. LOAD AUDIO
y, sr = librosa.load(AUDIO_FILE)

# 2. DETECT ONSETS (energy spikes)
onset_env = librosa.onset.onset_strength(y=y, sr=sr)

# 3. FIND PEAKS
peaks = librosa.util.peak_pick(
    onset_env,
    pre_max=3,
    post_max=3,
    pre_avg=3,
    post_avg=5,
    delta=THRESHOLD,
    wait=int(MIN_TIME_BETWEEN_NOTES * sr / 512)
)

# 4. CONVERT TO TIMES
times = librosa.frames_to_time(peaks, sr=sr)

# 5. BUILD NOTES
notes = []
last_time = -999

for t in times:
    if t - last_time < MIN_TIME_BETWEEN_NOTES:
        continue

    note = {
        "time": int(t * 1000),  # ms
        "key": random.choice(KEYS)
    }

    notes.append(note)
    last_time = t

# 6. SAVE JSON
chart = {"notes": notes}

with open(OUTPUT_FILE, "w") as f:
    json.dump(chart, f, indent=2)

print(f"Generated {len(notes)} notes!")