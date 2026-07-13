// SelahWatch/BreatheView.swift
//
// Breathing session on Apple Watch.
// 4-4-6 pattern × 3 cycles.
//
// Fixes from previous version:
//   - @State private var completedNaturally moved inside struct (was floating outside)
//   - .onDisappear chained correctly inside body (was pasted outside closing brace)
//   - switch phaseIdx haptic block moved inside runPhase() (was floating outside struct)
//   - Phase haptics: playInhaleStart() on inhale, playExhaleStart() on exhale, silence on hold
//   - Manual exit added: long-press (1.5s) reveals an End Session button —
//     mirrors BreatheScreen.js on the phone. Previously the breathing phase
//     was the only screen in the flow with no way out.

import SwiftUI

private struct Phase {
    let name:     String
    let duration: Int
    let key:      KeyPath<BreathePhrases, String>
}

private let phases: [Phase] = [
    Phase(name: "Inhale",  duration: 4, key: \.inhale),
    Phase(name: "Hold",    duration: 4, key: \.hold),
    Phase(name: "Exhale",  duration: 6, key: \.exhale),
]

private let CYCLES = 3

struct BreatheView: View {

    let prompt:     SelahPrompt
    let onComplete: () -> Void
    let onExit:     () -> Void   // manual end — long-press reveals the button

    @State private var phaseIndex:        Int     = 0
    @State private var cycleIndex:        Int     = 0
    @State private var phrase:            String  = ""
    @State private var circleScale:       CGFloat = 0.40
    @State private var circleOpacity:     Double  = 0.35
    @State private var glowOpacity:       Double  = 0.08
    @State private var countdown:         Int     = 4
    @State private var completedNaturally: Bool   = false   // ← moved inside struct
    @State private var showEndButton:      Bool   = false

    @State private var timer:        Timer? = nil
    @State private var sessionStart: Date   = Date()

    var body: some View {
        ZStack {
            // Icy gradient
            LinearGradient(
                colors: [
                    Color(red: 0.93, green: 0.96, blue: 0.98),
                    Color(red: 0.85, green: 0.91, blue: 0.95),
                    Color(red: 0.74, green: 0.83, blue: 0.91),
                    Color(red: 0.60, green: 0.74, blue: 0.86),
                    Color(red: 0.48, green: 0.64, blue: 0.78),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {

                // Phase label — top
                Text(phases[phaseIndex].name)
                    .font(.system(size: 11, weight: .medium))
                    .tracking(3)
                    .foregroundColor(Color(red: 0.25, green: 0.40, blue: 0.60).opacity(0.90))
                    .padding(.top, 6)

                Spacer()

                // Breathing circle — center
                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.20))
                        .frame(width: 90, height: 90)
                        .scaleEffect(circleScale * 1.3)
                        .opacity(glowOpacity)

                    Circle()
                        .fill(Color(red: 0.96, green: 0.98, blue: 1.0).opacity(0.72))
                        .frame(width: 80, height: 80)
                        .scaleEffect(circleScale)
                        .opacity(circleOpacity)
                }

                Spacer()

                // Phrase — bottom (stable per phase)
                Text(phrase)
                    .font(.system(size: 11, weight: .regular, design: .serif))
                    .italic()
                    .foregroundColor(Color(red: 0.18, green: 0.30, blue: 0.50).opacity(0.92))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 8)
                    .padding(.bottom, 8)
            }

            // End session — revealed by long-press, mirrors BreatheScreen.js
            if showEndButton {
                VStack {
                    Spacer()
                    Button(action: {
                        timer?.invalidate()
                        onExit()
                    }) {
                        Text("End Session")
                            .font(.system(size: 10, weight: .medium))
                            .tracking(1)
                            .foregroundColor(Color(red: 0.63, green: 0.25, blue: 0.25))
                            .padding(.vertical, 5)
                            .padding(.horizontal, 14)
                            .background(
                                Capsule()
                                    .fill(Color(red: 0.63, green: 0.25, blue: 0.25).opacity(0.12))
                                    .overlay(
                                        Capsule()
                                            .stroke(Color(red: 0.63, green: 0.25, blue: 0.25).opacity(0.28), lineWidth: 0.5)
                                    )
                            )
                    }
                    .buttonStyle(PlainButtonStyle())
                    .padding(.bottom, 2)
                }
            }
        }
        .onLongPressGesture(minimumDuration: 1.5) {
            showEndButton = true
        }
        .onAppear {
            sessionStart = Date()
            runPhase(phaseIdx: 0, cycleIdx: 0)
        }
        .onDisappear {
            // ← moved inside body, chained correctly
            timer?.invalidate()
            // If user abandoned mid-session (crown press, wrist-down, notification),
            // reset stress state — mirrors AppContext AppState background → resetSession()
            if !completedNaturally {
                HealthManager.shared.resetStress()
            }
        }
    }

    // ── Phase runner ──────────────────────────────────────────────────────────
    private func runPhase(phaseIdx: Int, cycleIdx: Int) {
        timer?.invalidate()

        let p     = phases[phaseIdx]
        let durMs = Double(p.duration)

        phaseIndex = phaseIdx
        cycleIndex = cycleIdx
        countdown  = p.duration
        phrase     = prompt.breathe[keyPath: p.key]

        // ── Phase haptics — subtle tactile anchor ─────────────────────────────
        // switch moved inside runPhase (was floating outside struct)
        // Hold phase = silence, intentional
        switch phaseIdx {
        case 0: HapticManager.shared.playInhaleStart()
        case 2: HapticManager.shared.playExhaleStart()
        default: break
        }

        // Circle animation
        let targetScale:   CGFloat = phaseIdx == 2 ? 0.40 : 1.0
        let targetOpacity: Double  = phaseIdx == 2 ? 0.28 : phaseIdx == 1 ? 0.52 : 0.62
        let targetGlow:    Double  = phaseIdx == 2 ? 0.05 : phaseIdx == 1 ? 0.18 : 0.22

        if phaseIdx == 1 {
            // Hold — no scale change
            withAnimation(.easeInOut(duration: 0.6)) {
                circleOpacity = targetOpacity
                glowOpacity   = targetGlow
            }
        } else {
            withAnimation(.easeInOut(duration: durMs)) {
                circleScale   = targetScale
                circleOpacity = targetOpacity
                glowOpacity   = targetGlow
            }
        }

        // Countdown ticker
        var count = p.duration
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { t in
            count -= 1
            countdown = max(0, count)

            if count <= 0 {
                t.invalidate()
                let nextPhase = (phaseIdx + 1) % phases.count
                let nextCycle = nextPhase == 0 ? cycleIdx + 1 : cycleIdx

                if nextPhase == 0 && nextCycle >= CYCLES {
                    // Session complete — mark before calling onComplete so
                    // onDisappear knows not to reset stress
                    HealthManager.shared.saveMindfulSession(start: sessionStart, end: Date())
                    ConnectivityManager.shared.sendSessionCompletedToPhone()
                    completedNaturally = true

                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        onComplete()
                    }
                } else {
                    runPhase(phaseIdx: nextPhase, cycleIdx: nextCycle)
                }
            }
        }
    }
}