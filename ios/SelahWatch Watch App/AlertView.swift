// SelahWatch/AlertView.swift
//
// Screen 1 & 2 of the Selah flow on Watch:
//   Phase 0 (~0.8s) — dark screen
//   Phase 1 (~1.5s) — icy gradient rises
//   Phase 2 (~3.0s) — scripture reference fades in
//   → auto-navigates to BreatheView

import SwiftUI

struct AlertView: View {

    let prompt:     SelahPrompt
    let onContinue: () -> Void

    @State private var lightOpacity: Double = 0
    @State private var refOpacity:   Double = 0

    var body: some View {
        ZStack {
            // Dark base
            Color.black.ignoresSafeArea()

            // Icy gradient fades in
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
            .opacity(lightOpacity)

            // Scripture reference
            Text(prompt.source)
                .font(.system(size: 16, weight: .regular, design: .serif))
                .italic()
                .foregroundColor(Color(red: 0.18, green: 0.27, blue: 0.40).opacity(0.92))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12)
                .opacity(refOpacity)
        }
        .onAppear { startSequence() }
        .onTapGesture  { onContinue() }
    }

    private func startSequence() {
        // Phase 0 — dark pause
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            HapticManager.shared.playDetection()   // ← add here
            // Phase 1 — gradient rises
            withAnimation(.easeInOut(duration: 1.6)) {
                lightOpacity = 1
            }
            // Phase 2 — scripture fades in
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
                withAnimation(.easeIn(duration: 0.7)) {
                    refOpacity = 1
                }
                // Hold 3s then navigate
                DispatchQueue.main.asyncAfter(deadline: .now() + 3.7) {
                    withAnimation(.easeOut(duration: 0.5)) {
                        refOpacity = 0
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                        onContinue()
                    }
                }
            }
        }
    }
}
