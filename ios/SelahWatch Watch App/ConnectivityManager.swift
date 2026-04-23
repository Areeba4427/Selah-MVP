// SelahWatch/ConnectivityManager.swift
//
// Two-way communication between Watch and iPhone.
//
// Watch → iPhone:  stress detected on Watch, notify iPhone to update its UI
// iPhone → Watch:  simulate button pressed on iPhone, Watch shows flow
//
// Uses WatchConnectivity framework.

import Foundation
import Combine
import WatchConnectivity

class ConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {

    static let shared = ConnectivityManager()

    @Published var incomingPrompt: SelahPrompt? = nil
    @Published var isSecular: Bool = false

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

    // ── iPhone → Watch: receive stress trigger or mode change ─────────────────
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            // iPhone sends mode setting
            if let secular = message["isSecular"] as? Bool {
                self.isSecular = secular
            }

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

    // ── Required WCSessionDelegate methods ────────────────────────────────────
    func session(_ session: WCSession,
                 activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {}
}
