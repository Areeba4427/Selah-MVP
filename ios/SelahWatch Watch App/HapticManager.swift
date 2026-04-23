// SelahWatch/HapticManager.swift
//
// Client's haptic patterns adapted for Apple Watch.
// Watch uses WKHapticType — different from iPhone CoreHaptics.
//
// Detection pattern (1.94s equivalent):
//   notification → pause → click → pause → directionUp (wave)
//
// Closing pattern (3.17s equivalent):
//   click → pause → click → long pause → directionUp → stop

import WatchKit

class HapticManager {

    static let shared = HapticManager()
    private let device = WKInterfaceDevice.current()

    // ── Detection haptic — fires when stress detected ─────────────────────────
    // Approximates the client's 1.94s CoreHaptics pattern
    func playDetection() {
        // Pulse 1 — medium (notification = strongest on Watch)
        device.play(.notification)

        // Pause 150ms then Pulse 2
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
            self.device.play(.click)

            // Pause then start exhale wave
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                self.device.play(.directionUp)

                DispatchQueue.main.asyncAfter(deadline: .now() + 0.20) {
                    self.device.play(.directionUp)

                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.20) {
                        self.device.play(.directionUp)
                    }
                }
            }
        }
    }

    // ── Closing haptic — fires when "Selah" appears ───────────────────────────
    // Approximates the client's 3.17s closing wave pattern
    func playClosing() {
        // Opening soft tap
        device.play(.click)

        // Second gentle tap
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.50) {
            self.device.play(.click)

            // Long pause then exhale wave
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.30) {
                self.device.play(.directionDown)

                DispatchQueue.main.asyncAfter(deadline: .now() + 0.20) {
                    self.device.play(.directionDown)

                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.20) {
                        // Final crisp micro-tap
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.80) {
                            self.device.play(.stop)
                        }
                    }
                }
            }
        }
    }
}
