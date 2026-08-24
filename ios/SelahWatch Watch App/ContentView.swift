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

    // ── Session timeout — SelahTiming.sessionWindow (10 min), shared with
    // HealthManager's trigger cooldown and pending-stress validity, and
    // mirroring AppContext SESSION_TIMEOUT_MS.
    @State private var sessionTimer: DispatchWorkItem? = nil

    // ── Live stress index for IdleView bar ────────────────────────────────────
    // HRV is optional (FIX 7 in HealthManager) — with no recent SDNN sample
    // the bar runs on the HR component alone instead of a placeholder.
    private var liveStressIndex: Double {
        let d = health.debugInfo
        guard d.currentHR != nil || d.currentHRV != nil else { return 24 }
        let hrvComponent = d.currentHRV.map { max(0, (1 - $0 / max(d.baselineHRV, 1)) * 50) } ?? 0
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
        // ── Watch HealthManager detected stress (app in foreground) ───────────
        .onChange(of: health.isStressed) { stressed in
            guard stressed else { return }
            startPendingStressSession()
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
                // Stress detected while the app was suspended — e.g. user
                // opened it from the notification. onChange(of: isStressed)
                // never fires for a value that was already true before the
                // UI attached, so check here. Captured BEFORE the stale-
                // session cleanup: resetSession() → resetStress() clears
                // isStressed, which must not swallow a new pending trigger.
                let stressPending = health.hasPendingStress
                if let backgroundAt = sessionBackgroundAt,
                   Date().timeIntervalSince(backgroundAt) >= SelahTiming.sessionWindow {
                    resetSession()
                } else {
                    cancelSessionTimeout()
                }
                sessionBackgroundAt = nil
                if stressPending {
                    startPendingStressSession()
                }
            @unknown default:
                break
            }
        }
        .onAppear {
            // startMonitoring is idempotent; this call also serves as the
            // retry path after an authorization failure at background launch.
            health.startMonitoring()
            // Same launch-with-stress-pending case as scenePhase above, for
            // a cold start from the stress notification.
            if health.hasPendingStress {
                startPendingStressSession()
            }
        }
    }

    // ── Pending stress → session ──────────────────────────────────────────────
    // Single entry point for every "stress was detected" path: live foreground
    // detection (onChange), notification-tap cold start (onAppear), and
    // re-activation with a pending trigger (scenePhase .active).
    private func startPendingStressSession() {
        guard phase == .idle else { return }
        triggerSession()
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
        DispatchQueue.main.asyncAfter(deadline: .now() + SelahTiming.sessionWindow, execute: item)
    }

    private func cancelSessionTimeout() {
        sessionTimer?.cancel()
        sessionTimer = nil
    }
}