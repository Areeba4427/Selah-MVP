// SelahWatch/ContentView.swift
//
// Main screen coordinator.
// Routes through the Selah flow:
//   idle → alert → breathe → done → idle
//
// Stress can be triggered by:
//   1. Watch HealthManager (primary — direct Watch sensor reading)
//   2. iPhone simulate button (via WatchConnectivity)
//
// Session lifecycle (aligned with AppContext.js):
//   - 30-min auto-reset on background (mirrors SESSION_TIMEOUT_MS + AppState listener)
//   - resetSession() clears phase + prompt + cancels timeout
//
// Fixes from previous version:
//   - Removed HapticManager.shared.playDetection() from triggerSession() —
//     AlertView.startSequence() fires it at Phase 1 (gradient rise). Calling it
//     here too caused a double haptic on every Watch-detected trigger.
//   - activePrompt now uses @State var hasActiveSession instead of (phase != .idle)
//     which always evaluated to false inside the .idle case block.

import SwiftUI

enum SelahPhase {
    case idle
    case alert
    case breathe
    case done
}

struct ContentView: View {

    @EnvironmentObject var connectivity: ConnectivityManager
    @EnvironmentObject var health:       HealthManager
    @Environment(\.scenePhase) private var scenePhase

    @State private var phase:            SelahPhase   = .idle
    @State private var prompt:           SelahPrompt? = nil

    // Tracks whether a session is active across all phases.
    // Used by IdleView's "Session active" banner.
    // Cannot use (phase != .idle) inside the .idle case — it always evaluates false.
    @State private var hasActiveSession: Bool         = false

    // ── Session timeout — mirrors AppContext SESSION_TIMEOUT_MS (30 min) ──────
    @State private var sessionTimer: DispatchWorkItem? = nil
    private let SESSION_TIMEOUT: TimeInterval = 30 * 60

    // ── Live stress index for IdleView bar ────────────────────────────────────
    // Derived from HealthManager's published debugInfo (HRV + HR vs baseline).
    // HRV component: 0–50 pts (lower HRV = higher stress)
    // HR  component: 0–50 pts (higher HR  = higher stress, normalised over 30bpm rise)
    private var liveStressIndex: Double {
        let d = health.debugInfo
        guard let currentHRV = d.currentHRV else { return 24 }
        let hrvComponent = max(0, (1 - currentHRV / max(d.baselineHRV, 1)) * 50)
        let hrComponent  = max(0, min(50, ((d.currentHR ?? d.baselineHR) - d.baselineHR) / 30 * 50))
        return min(100, hrvComponent + hrComponent)
    }

    var body: some View {
        Group {
            switch phase {

            case .idle:
                IdleView(
                    onSimulate:   { triggerSession() },
                    onEndSession: { resetSession() },
                    isSimulating: false,
                    activePrompt: hasActiveSession,   // ← uses @State var, not phase != .idle
                    isSecular:    connectivity.isSecular,
                    stressIndex:  liveStressIndex
                )

            case .alert:
                if let p = prompt {
                    AlertView(prompt: p, onContinue: {
                        phase = .breathe
                    })
                }

            case .breathe:
                if let p = prompt {
                    BreatheView(prompt: p, onComplete: {
                        phase = .done
                    })
                }

            case .done:
                if let p = prompt {
                    DoneView(closing: p.closing, onFinish: {
                        resetSession()
                    })
                }
            }
        }
        // ── Watch HealthManager detected stress directly ───────────────────────
        .onChange(of: health.isStressed) { stressed in
            guard stressed, phase == .idle else { return }
            triggerSession()
        }
        // ── iPhone sent a simulate trigger ────────────────────────────────────
        // Note: no playDetection() here — AlertView fires it at Phase 1 internally
        .onChange(of: connectivity.incomingPrompt) { incoming in
            guard let p = incoming, phase == .idle else { return }
            prompt           = p
            phase            = .alert
            hasActiveSession = true
            startSessionTimeout()
        }
        // ── Background / foreground — mirrors AppContext AppState listener ─────
        .onChange(of: scenePhase) { newPhase in
            switch newPhase {
            case .background, .inactive:
                if hasActiveSession { startSessionTimeout() }
            case .active:
                cancelSessionTimeout()
            @unknown default:
                break
            }
        }
        .onAppear {
            health.startMonitoring()
        }
    }

    // ── Trigger session ───────────────────────────────────────────────────────
    // Note: playDetection() removed — AlertView.startSequence() fires it at
    // Phase 1 (gradient rise, ~0.8s in), which is the correct moment.
    // Firing it here too caused a double haptic on Watch-detected stress.
    private func triggerSession() {
        let p            = SelahPrompt.random(secular: connectivity.isSecular)
        prompt           = p
        phase            = .alert
        hasActiveSession = true
        startSessionTimeout()
    }

    // ── Reset session ─────────────────────────────────────────────────────────
    // Mirrors AppContext.js resetSession()
    private func resetSession() {
        cancelSessionTimeout()
        phase            = .idle
        prompt           = nil
        hasActiveSession = false
        health.resetStress()
    }

    // ── Session timeout ───────────────────────────────────────────────────────
    // Mirrors AppContext.js setTimeout(() => resetSession(), SESSION_TIMEOUT_MS)
    private func startSessionTimeout() {
        cancelSessionTimeout()
        guard hasActiveSession else { return }

        let item = DispatchWorkItem {
            DispatchQueue.main.async { resetSession() }
        }
        sessionTimer = item
        DispatchQueue.main.asyncAfter(deadline: .now() + SESSION_TIMEOUT, execute: item)
    }

    private func cancelSessionTimeout() {
        sessionTimer?.cancel()
        sessionTimer = nil
    }
}