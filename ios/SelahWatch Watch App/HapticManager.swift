// SelahWatch/HapticManager.swift
//
// Softened haptic patterns per client feedback:
//   "haptic feedback feels too aggressive — soften/refine so it feels
//    more like a gentle nudge than an alert"
//
// Detection pattern (~1.5s):
//   click → pause → click  (two soft taps, no notification)
//
// Closing pattern (~2.0s):
//   click → long pause → directionDown × 2  (whisper-soft exhale wave)
//
// Breathing phase cue (optional, per-phase):
//   directionUp  on Inhale start
//   directionDown on Exhale start

import WatchKit

class HapticManager {

    static let shared = HapticManager()
    private let device = WKInterfaceDevice.current()

    // ── Detection haptic — fires when stress detected ─────────────────────────
    // Replaced .notification (jarring) with two gentle .click taps.
    func playDetection() {
        device.play(.click)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
            self.device.play(.click)
        }
    }

    // ── Closing haptic — fires when "Selah" word appears ─────────────────────
    // One opening tap, long breath-space, then a soft descending wave.
    func playClosing() {
        device.play(.click)

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.10) {
            self.device.play(.directionDown)

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                self.device.play(.directionDown)
            }
        }
    }

    // ── Breathing phase cues (optional) ──────────────────────────────────────
    // Call at the start of each phase for a subtle tactile anchor.
    func playInhaleStart() {
        device.play(.directionUp)
    }

    func playExhaleStart() {
        device.play(.directionDown)
    }

    // Hold phase: no haptic — silence is intentional.
}