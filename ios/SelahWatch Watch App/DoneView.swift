// SelahWatch/DoneView.swift
//
// Closing sequence on Watch:
//   1. Closing line fades in (3.5s)
//   2. "Selah" fades in with closing haptic
//   3. "Selah" fades out
//   4. Returns to idle

import SwiftUI

struct DoneView: View {

    let closing:  String
    let onFinish: () -> Void

    @State private var closingOpacity: Double = 0
    @State private var selahOpacity:   Double = 0

    var body: some View {
        ZStack {
            // Icy gradient — same as all other screens
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

            // Closing line
            closingText
                .opacity(closingOpacity)

            // "Selah" in warm muted gold
            Text("Selah")
                .font(.system(size: 20, weight: .light, design: .serif))
                .italic()
                .tracking(4)
                .foregroundColor(Color(red: 0.54, green: 0.44, blue: 0.33))
                .opacity(selahOpacity)
        }
        .onAppear { startSequence() }
        .onTapGesture { onFinish() }
    }

    // ── Closing text — italicise "you" for Psalm 139:17 ──────────────────────
    @ViewBuilder
    private var closingText: some View {
        if closing == "God's thoughts are full of you" {
            (Text("God's thoughts are full of ")
                .font(.system(size: 14, weight: .light))
                .foregroundColor(Color(red: 0.18, green: 0.27, blue: 0.40))
            + Text("you")
                .font(.system(size: 14, weight: .light, design: .serif))
                .italic()
                .foregroundColor(Color(red: 0.18, green: 0.27, blue: 0.40)))
            .multilineTextAlignment(.center)
            .padding(.horizontal, 10)
        } else {
            Text(closing)
                .font(.system(size: 14, weight: .light, design: .serif))
                .foregroundColor(Color(red: 0.18, green: 0.27, blue: 0.40))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 10)
        }
    }

    // ── Sequence ──────────────────────────────────────────────────────────────
    private func startSequence() {
        // 1. Closing line fades in
        withAnimation(.easeIn(duration: 0.9)) {
            closingOpacity = 1
        }
        // 2. Hold 3.5s then fade out
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.5) {
            withAnimation(.easeOut(duration: 0.7)) {
                closingOpacity = 0
            }
            // 3. "Selah" rises in + closing haptic
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                HapticManager.shared.playClosing()
                withAnimation(.easeIn(duration: 1.2)) {
                    selahOpacity = 1
                }
                // 4. Hold 1.2s then fade out
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                    withAnimation(.easeOut(duration: 1.4)) {
                        selahOpacity = 0
                    }
                    // 5. Return to idle
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
                        HealthManager.shared.resetStress()
                        onFinish()
                    }
                }
            }
        }
    }
}
