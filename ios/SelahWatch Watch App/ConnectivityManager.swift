// SelahWatch/ConnectivityManager.swift
//
// Two-way communication between Watch and iPhone.
//
// Watch → iPhone:  stress detected on Watch, session completed
// iPhone → Watch:  simulate trigger (live message) + settings snapshot
//                  {isSecular, hapticsEnabled, autoDetect, sensitivity}
//
// Settings arrive on two paths, both funneled through applySettings():
//   - live sendMessage      — instant, but only while the Watch is reachable
//   - application context   — reliable: iOS queues the latest snapshot and
//     delivers it when possible; receivedApplicationContext also survives
//     relaunches, so settings are re-applied on every activation.
// Every value is persisted on the Watch so it survives restarts offline.
//
// Uses WatchConnectivity framework.

import Foundation
import Combine
import WatchConnectivity

class ConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {

    static let shared = ConnectivityManager()

    @Published var incomingPrompt: SelahPrompt? = nil
    @Published var isSecular: Bool = UserDefaults.standard.bool(forKey: "is_secular")

    private override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    // ── Watch → iPhone: stress detected on Watch ──────────────────────────────
    func sendStressDetectedToPhone() {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(
            ["event": "stressDetected"],
            replyHandler: nil,
            errorHandler: nil
        )
    }

    // ── Watch → iPhone: session completed ────────────────────────────────────
    func sendSessionCompletedToPhone() {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(
            ["event": "sessionCompleted"],
            replyHandler: nil,
            errorHandler: nil
        )
    }

    // ── Apply a settings snapshot ─────────────────────────────────────────────
    // Shared by live messages, application context, and activation. Each key
    // is optional so partial messages (e.g. mode-only) still work.
    private func applySettings(_ dict: [String: Any]) {
        if let secular = dict["isSecular"] as? Bool {
            isSecular = secular
            UserDefaults.standard.set(secular, forKey: "is_secular")
        }
        if let haptics = dict["hapticsEnabled"] as? Bool {
            HapticManager.shared.isEnabled = haptics          // persists itself
        }
        if let autoDetect = dict["autoDetect"] as? Bool {
            HealthManager.shared.autoDetectEnabled = autoDetect
        }
        if let sensitivity = dict["sensitivity"] as? Int {
            HealthManager.shared.sensitivityLevel = sensitivity
        }
    }

    // ── iPhone → Watch: live message (simulate trigger / setting change) ──────
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            self.applySettings(message)

            // iPhone simulate button pressed — trigger flow on Watch
            if let event = message["event"] as? String, event == "simulateStress" {
                let prompt = SelahPrompt.random(secular: self.isSecular)
                self.incomingPrompt = prompt

                // Reset after a moment so onChange fires again next time
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    self.incomingPrompt = nil
                }
            }
        }
    }

    // ── iPhone → Watch: settings snapshot via application context ─────────────
    // Delivered even if the Watch was unreachable when the user changed the
    // setting on the phone.
    func session(_ session: WCSession,
                 didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async {
            self.applySettings(applicationContext)
        }
    }

    // ── Required WCSessionDelegate methods ────────────────────────────────────
    func session(_ session: WCSession,
                 activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {
        // Re-apply the last snapshot the phone ever sent — this is what makes
        // settings stick across Watch app relaunches even while offline.
        DispatchQueue.main.async {
            if !session.receivedApplicationContext.isEmpty {
                self.applySettings(session.receivedApplicationContext)
            }
        }
    }
}
