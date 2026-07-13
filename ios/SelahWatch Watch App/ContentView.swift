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
// Fixes applied:
//   FIX 1 — Removed HapticManager.shared.playDetection() from triggerSession().
//     AlertView.startSequence() fires it at Phase 1 (gradient rise, ~0.8s in).
//     Calling it here too caused a double haptic on every Watch-detected trigger.
//
//   FIX 2 — IdleView's "Session active" banner removed as dead code.
//     phase == .idle and hasActiveSession == true are mutually exclusive by
//     construction (both are set together in triggerSession/resetSession), so
//     the banner could never render. Manual exit now lives where the user
//     actually is during a session: long-press in BreatheView, tap in
//     AlertView/DoneView. hasActiveSession is kept — the session timeout
//     logic still depends on it.

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
    @State private var hasActiveSession: Bool         = false
    @State private var sessionBackgroundAt: Date?     = nil

    // ── Session timeout — mirrors AppContext SESSION_TIMEOUT_MS (10 min) ──────
    @State private var sessionTimer: DispatchWorkItem? = nil
    private let SESSION_TIMEOUT: TimeInterval = 10 * 60

    // ── Live stress index for IdleView bar ────────────────────────────────────
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
                    isSimulating: false,
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
                    BreatheView(
                        prompt: p,
                        onComplete: { phase = .done },
                        onExit:     { resetSession() }   // FIX 2 — manual exit
                    )
                }

            case .done:
                if let p = prompt {
                    DoneView(closing: p.closing, onFinish: {
                        resetSession()
                    })
                }
            }
        }
        // ── Watch HealthManager detected stress ───────────────────────────────
        .onChange(of: health.isStressed) { stressed in
            guard stressed, phase == .idle else { return }
            triggerSession()
        }
        // ── iPhone sent a simulate trigger ────────────────────────────────────
        // No playDetection() here — AlertView fires it at Phase 1 internally.
        .onChange(of: connectivity.incomingPrompt) { incoming in
            guard let p = incoming, phase == .idle else { return }
            prompt           = p
            phase            = .alert
            hasActiveSession = true
            startSessionTimeout()
        }
        // ── Background/foreground — session timeout ───────────────────────────
        .onChange(of: scenePhase) { newPhase in
            switch newPhase {
            case .background, .inactive:
                if hasActiveSession {
                    sessionBackgroundAt = Date()
                    startSessionTimeout()
                }
            case .active:
                if let backgroundAt = sessionBackgroundAt,
                   Date().timeIntervalSince(backgroundAt) >= SESSION_TIMEOUT {
                    resetSession()
                } else {
                    cancelSessionTimeout()
                }
                sessionBackgroundAt = nil
            @unknown default:
                break
            }
        }
        .onAppear {
            health.startMonitoring()
        }
    }

    // ── Trigger session ───────────────────────────────────────────────────────
    // FIX 1: playDetection() removed — AlertView.startSequence() fires it at
    // Phase 1 (gradient rise, ~0.8s in). Calling it here too caused a double
    // haptic on every Watch-detected stress event.
    private func triggerSession() {
        let p            = SelahPrompt.random(secular: connectivity.isSecular)
        prompt           = p
        phase            = .alert
        hasActiveSession = true
        startSessionTimeout()
    }

    // ── Reset session ─────────────────────────────────────────────────────────
    private func resetSession() {
        cancelSessionTimeout()
        sessionBackgroundAt = nil
        phase            = .idle
        prompt           = nil
        hasActiveSession = false
        health.resetStress()
    }

    // ── Session timeout ───────────────────────────────────────────────────────
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