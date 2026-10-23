import type { AlarmSound } from '../model/settings'

type Tone = { at: number; length: number; hz: number; wave: OscillatorType }

const SOUNDS: Record<AlarmSound, Tone[]> = {
  klaxon: [0, 0.4, 0.8, 1.2].map((at, i) => ({
    at,
    length: 0.34,
    hz: i % 2 ? 392 : 523,
    wave: 'sawtooth',
  })),
  chime: [
    { at: 0, length: 0.7, hz: 880, wave: 'sine' },
    { at: 0.45, length: 1, hz: 659, wave: 'sine' },
  ],
  beep: [0, 0.25, 0.5].map((at) => ({
    at,
    length: 0.15,
    hz: 1000,
    wave: 'square',
  })),
}

let context: AudioContext | null = null

/** Browsers start audio only after a tap, so the first tap calls this. */
export function unlockAudio(): void {
  if (typeof AudioContext === 'undefined') return
  context ??= new AudioContext()
  if (context.state === 'suspended') void context.resume()
}

export function playAlarm(sound: AlarmSound): void {
  if (!context) return
  const start = context.currentTime + 0.05
  for (const tone of SOUNDS[sound]) {
    const osc = context.createOscillator()
    const gain = context.createGain()
    osc.type = tone.wave
    osc.frequency.value = tone.hz
    gain.gain.setValueAtTime(0.0001, start + tone.at)
    gain.gain.exponentialRampToValueAtTime(0.3, start + tone.at + 0.02)
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      start + tone.at + tone.length,
    )
    osc.connect(gain).connect(context.destination)
    osc.start(start + tone.at)
    osc.stop(start + tone.at + tone.length + 0.05)
  }
}
