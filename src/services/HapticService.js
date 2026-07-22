// src/services/HapticService.js
//
// Selah Haptics — iOS via native CoreHaptics, Android via Vibration API.
//
// Philosophy (aligned with HapticManager.swift on Watch):
//   "Feel more like a gentle nudge than an alert"
//
// Detection — fires when gradient rises on AlertScreen (~0.8s in):
//   Two soft taps with a breath-space between them (~1.1s total)
//   Watch equivalent: click → 550ms → click
//
// Closing — fires when "Selah" word appears on DoneScreen:
//   One soft tap, long breath-space, two descending nudges (~2.0s total)
//   Watch equivalent: click → 1100ms → directionDown → 350ms → directionDown
//
// Haptics fire ONLY at these two bookend moments. The breathing session in
// between is intentionally silent — per-breath inhale/exhale cues were
// removed after client feedback that the session vibrated throughout.

import {Platform, Vibration, NativeModules} from 'react-native';

const {SelahHaptics} = NativeModules;

const HapticService = {

  // ── Detection — two soft taps as light rises ──────────────────────────────
  // Android: 0ms pause → 80ms buzz → 550ms silence → 80ms buzz
  // Replaces the old aggressive [0, 300, 50, 150, 20, 180, 100, 400] pattern.
  // iOS: delegates to SelahHaptics.playDetection() (CoreHaptics — keep as-is,
  //      native module should mirror the two-tap softened pattern)
  detection: () => {
    if (Platform.OS === 'ios' && SelahHaptics) {
      SelahHaptics.playDetection();
    } else {
      // Two gentle taps — mirrors Watch click → 550ms → click
      Vibration.vibrate([0, 80, 550, 80]);
    }
  },

  // ── Closing — one tap, breath-space, soft descending wave ─────────────────
  // Android: 0ms → 60ms buzz → 1100ms silence → 60ms buzz → 350ms → 40ms buzz
  // Replaces the old [0, 100, 400, 100, 1200, 500, 200, 30] pattern.
  // iOS: delegates to SelahHaptics.playClosing()
  closing: () => {
    if (Platform.OS === 'ios' && SelahHaptics) {
      SelahHaptics.playClosing();
    } else {
      // One opening tap, breath-space, two soft descending taps
      // Mirrors Watch: click → 1100ms → directionDown → 350ms → directionDown
      Vibration.vibrate([0, 60, 1100, 60, 350, 40]);
    }
  },

  cancel: () => Vibration.cancel(),
};

export default HapticService;