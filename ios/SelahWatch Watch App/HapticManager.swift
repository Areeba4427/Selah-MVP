// SelahWatch/HapticManager.swift
//
// Haptic patterns aligned with HapticService.js (React Native phone):
//
//   Event           Phone (Android Vibration)      Watch (WKHapticType)
//   ─────────────   ────────────────────────────   ────────────────────────
//   Detection       [0, 80, 550, 80]               click → 550ms → click
//   Closing         [0, 60, 1100, 60, 350, 40]     click → 1100ms → ↓ → 350ms → ↓
//
// Haptics fire ONLY at these two bookend moments. The breathing session in
// between is intentionally silent — per-breath inhale/exhale cues were
// removed after client feedback that the session vibrated throughout.
//
// isEnabled mirrors the phone's Settings > Haptic feedback toggle (synced
// via WatchConnectivity, persisted so it survives watch app restarts).
//
// Philosophy: "feel more like a gentle nudge than an alert"

import WatchKit

class HapticManager {

    static let shared = HapticManager()
    private let device = WKInterfaceDevice.current()

    // Master switch — set from ConnectivityManager when the phone syncs its
    // hapticsEnabled setting. Defaults to on.
    var isEnabled: Bool = UserDefaults.standard.object(forKey: "haptics_enabled") as? Bool ?? true {
        didSet { UserDefaults.standard.set(isEnabled, forKey: "haptics_enabled") }
    }

    // ── Detection — fires when gradient rises in AlertView (~0.8s in) ─────────
    // Two soft clicks with a breath-space between them.
    // Mirrors phone: [0, 80ms buzz, 550ms silence, 80ms buzz]
    func playDetection() {
        guard isEnabled else { return }
        device.play(.click)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
            self.device.play(.click)
        }
    }

    // ── Closing — fires when "Selah" word appears in DoneView ─────────────────
    // One opening tap, long breath-space, two soft descending nudges.
    // Mirrors phone: [0, 60ms, 1100ms silence, 60ms, 350ms, 40ms]
    func playClosing() {
        guard isEnabled else { return }
        device.play(.click)

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.10) {
            self.device.play(.directionDown)

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                self.device.play(.directionDown)
            }
        }
    }
}