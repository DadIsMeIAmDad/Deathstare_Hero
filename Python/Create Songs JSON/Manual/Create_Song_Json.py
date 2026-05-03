import time
import json
from pynput import keyboard
import pygame

# --------------------
# CONFIG
# --------------------
audio_file = "song1.mp3"
output_file = "chart.json"

key_map = {
    "up": "ArrowUp",
    "down": "ArrowDown",
    "left": "ArrowLeft",
    "right": "ArrowRight",
    "z": "KeyZ",
    "x": "KeyX"
}

recording = []
start_time = None

# --------------------
# PLAY AUDIO
# --------------------
pygame.mixer.init()
pygame.mixer.music.load(audio_file)

# --------------------
# KEY HANDLER
# --------------------
def on_press(key):
    global recording

    try:
        k = key.char.lower()
    except:
        k = key.name

    if k in key_map:
        t = (time.perf_counter() - start_time) * 1000
        print(f"{key_map[k]} @ {int(t)}ms")

        recording.append({
            "time": int(t),
            "key": key_map[k]
        })

# --------------------
# START RECORDING
# --------------------
input("Press ENTER to start recording...")

start_time = time.perf_counter()
pygame.mixer.music.play()

with keyboard.Listener(on_press=on_press) as listener:
    while pygame.mixer.music.get_busy():
        time.sleep(0.01)

    listener.stop()

# --------------------
# SAVE JSON
# --------------------
chart = {
    "bpm": 120,
    "offset": 0,
    "music": {
        "audio": "./songs/song1.mp3"
    },
    "notes": recording
}

with open(output_file, "w") as f:
    json.dump(chart, f, indent=2)

print("Chart saved!")