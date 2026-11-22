import math
import struct
import wave
from pathlib import Path

SR = 48000
OUT = Path(__file__).resolve().parent.parent / "public" / "audio"
OUT.mkdir(parents=True, exist_ok=True)


def write_wav(name: str, samples: list[float]):
    path = OUT / name
    peak = max((abs(x) for x in samples), default=1.0)
    scale = 0.88 / max(peak, 1.0)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        buf = bytearray()
        for s in samples:
            val = max(-32767, min(32767, int(s * scale * 32767)))
            buf.extend(struct.pack("<hh", val, val))
        wf.writeframes(bytes(buf))


def synth_notes(dur: float, notes: list[tuple[float, float, float, float, str]]) -> list[float]:
    n = int(SR * dur)
    buf = [0.0] * n
    for t0, freq, ndur, amp, kind in notes:
        i0 = int(t0 * SR)
        i1 = min(n, i0 + int(ndur * SR))
        for i in range(i0, i1):
            t = (i - i0) / SR
            env = min(1.0, t / 0.012) * math.exp(-3.8 * t / max(ndur, 0.05))
            if kind == "sine":
                sig = math.sin(2 * math.pi * freq * t)
            elif kind == "tri":
                phase = (t * freq) % 1.0
                sig = 4.0 * abs(phase - 0.5) - 1.0
            else:
                sig = 0.6 * math.sin(2 * math.pi * freq * t) + 0.3 * math.sin(4 * math.pi * freq * t)
            buf[i] += sig * env * amp
    return buf


# 1. SFX stems
write_wav("intro.wav", synth_notes(1.3, [
    (0.0, 130.81, 1.1, 0.45, "sine"),
    (0.12, 523.25, 0.5, 0.32, "tri"),
    (0.28, 659.25, 0.7, 0.34, "sine"),
]))
write_wav("tap.wav", synth_notes(0.22, [
    (0.0, 700.0, 0.08, 0.30, "sine"),
    (0.04, 940.0, 0.10, 0.22, "sine"),
]))
write_wav("keypad.wav", synth_notes(0.45, [
    (0.0, 540.0, 0.07, 0.25, "tri"),
    (0.11, 620.0, 0.07, 0.25, "tri"),
    (0.22, 740.0, 0.12, 0.28, "tri"),
]))
write_wav("glide.wav", synth_notes(0.55, [
    (0.0, 240.0, 0.35, 0.25, "sine"),
    (0.14, 360.0, 0.38, 0.25, "sine"),
]))
write_wav("shutter.wav", synth_notes(0.55, [
    (0.0, 1180.0, 0.05, 0.26, "tri"),
    (0.08, 440.0, 0.28, 0.24, "sine"),
    (0.18, 880.0, 0.28, 0.20, "sine"),
]))
write_wav("gradeA.wav", synth_notes(0.85, [
    (0.0, 523.25, 0.45, 0.28, "tri"),
    (0.09, 659.25, 0.45, 0.28, "tri"),
    (0.18, 783.99, 0.62, 0.36, "sine"),
]))
write_wav("gradeB.wav", synth_notes(0.75, [
    (0.0, 440.0, 0.35, 0.28, "tri"),
    (0.11, 554.37, 0.55, 0.32, "sine"),
]))
write_wav("tail.wav", synth_notes(0.65, [
    (0.0, 392.0, 0.30, 0.26, "sine"),
    (0.14, 440.0, 0.45, 0.28, "sine"),
]))
write_wav("lift.wav", synth_notes(0.75, [
    (0.0, 392.0, 0.25, 0.25, "tri"),
    (0.11, 523.25, 0.30, 0.28, "tri"),
    (0.22, 659.25, 0.48, 0.34, "sine"),
]))
write_wav("alert.wav", synth_notes(0.55, [
    (0.0, 196.0, 0.16, 0.26, "tri"),
    (0.15, 164.81, 0.28, 0.28, "tri"),
]))
write_wav("lock.wav", synth_notes(0.65, [
    (0.0, 480.0, 0.06, 0.24, "tri"),
    (0.09, 480.0, 0.06, 0.24, "tri"),
    (0.18, 480.0, 0.06, 0.24, "tri"),
    (0.28, 720.0, 0.30, 0.30, "sine"),
]))
write_wav("print.wav", synth_notes(0.70, [
    (i * 0.055, 320.0 + i * 35.0, 0.045, 0.16, "tri") for i in range(6)
] + [(0.36, 783.99, 0.30, 0.28, "sine")]))
write_wav("sync.wav", synth_notes(0.80, [
    (0.0, 523.25, 0.22, 0.24, "sine"),
    (0.09, 659.25, 0.22, 0.24, "sine"),
    (0.18, 783.99, 0.26, 0.26, "sine"),
    (0.26, 1046.5, 0.48, 0.30, "sine"),
]))

# 2. Warm 98 BPM 8-bar loopable ocean marimba bed (~19.59s)
beat = 60.0 / 98.0
loop_dur = 32 * beat
bed_notes: list[tuple[float, float, float, float, str]] = []
chords = [
    (130.81, 261.63, 329.63, 392.00),  # Cmaj
    (110.00, 220.00, 261.63, 329.63),  # Am
    (87.31,  174.61, 220.00, 261.63),  # Fmaj
    (98.00,  196.00, 246.94, 293.66),  # Gmaj
]
for bar in range(8):
    bass, n1, n2, n3 = chords[bar % 4]
    t_bar = bar * 4 * beat
    bed_notes.append((t_bar, bass, 4 * beat * 0.95, 0.18, "sine"))
    for step, freq in enumerate([n1, n2, n3, n2, n1, n3, n2, n1]):
        bed_notes.append((t_bar + step * 0.5 * beat, freq, 0.42 * beat, 0.12, "marimba"))

write_wav("ocean-bed-98bpm.wav", synth_notes(loop_dur, bed_notes))
print("AUDIO_WAVS_OK")
