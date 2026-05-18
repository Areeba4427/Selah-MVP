// SelahWatch/HapticManager.swift
//
// Haptic patterns aligned with HapticService.js (React Native phone):
//
//   Event           Phone (Android Vibration)      Watch (WKHapticType)
//   ─────────────   ────────────────────────────   ────────────────────────
//   Detection       [0, 80, 550, 80]               click → 550ms → click
//   Closing         [0, 60, 1100, 60, 350, 40]     click → 1100ms → ↓ → 350ms → ↓
//   Inhale start    [0, 40]                         directionUp
//   Exhale start    [0, 30]                         directionDown
//   Hold            silence                         silence (intentional)
//
// Philosophy: "feel more like a gentle nudge than an alert"

import WatchKit

class HapticManager {

    static let shared = HapticManager()
    private let device = WKInterfaceDevice.current()

    // ── Detection — fires when gradient rises in AlertView (~0.8s in) ─────────
    // Two soft clicks with a breath-space between them.
    // Mirrors phone: [0, 80ms buzz, 550ms silence, 80ms buzz]
    func playDetection() {
        device.play(.click)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
            self.device.play(.click)
        }
    }

    // ── Closing — fires when "Selah" word appears in DoneView ─────────────────
    // One opening tap, long breath-space, two soft descending nudges.
    // Mirrors phone: [0, 60ms, 1100ms silence, 60ms, 350ms, 40ms]
    func playClosing() {
        device.play(.click)

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.10) {
            self.device.play(.directionDown)

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                self.device.play(.directionDown)
            }
        }
    }

    // ── Breathing phase cues ──────────────────────────────────────────────────
    // Called at the start of each phase in BreatheView.
    // Mirrors HapticService.inhaleStart() / exhaleStart() on phone.
    // Hold phase = no call (silence is intentional on both platforms).

    // Inhale — single upward nudge as circle begins to expand
    // Mirrors phone: [0, 40ms buzz]
    func playInhaleStart() {
        device.play(.directionUp)
    }

    // Exhale — single downward nudge as circle begins to contract
    // Mirrors phone: [0, 30ms buzz]
    func playExhaleStart() {
        device.play(.directionDown)
    }
}