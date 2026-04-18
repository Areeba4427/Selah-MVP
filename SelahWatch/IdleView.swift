// SelahWatch/IdleView.swift
//
// Shown when app is idle.
// Displays time + HRV + simulate button for testing.

import SwiftUI

struct IdleView: View {

    let onSimulate: () -> Void

    @EnvironmentObject var health: HealthManager
    @State private var timeStr = ""
    private let timer = Timer.publish(every: 10, on: .main, in: .common).autoconnect()

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

            VStack(spacing: 6) {
                // Wordmark
                Text("SELAH")
                    .font(.system(size: 14, weight: .ultraLight))
                    .tracking(6)
                    .foregroundColor(Color(red: 0.18, green: 0.30, blue: 0.50).opacity(0.75))

                // Time
                Text(timeStr)
                    .font(.system(size: 28, weight: .ultraLight))
                    .foregroundColor(Color(red: 0.15, green: 0.25, blue: 0.45).opacity(0.80))

                // HRV if available
                if let hrv = health.hrv {
                    Text("HRV \(Int(hrv)) ms")
                        .font(.system(size: 10, weight: .light))
                        .foregroundColor(Color(red: 0.25, green: 0.40, blue: 0.60).opacity(0.55))
                }

                // Simulate button (for testing)
                Button(action: onSimulate) {
                    Text("Simulate")
                        .font(.system(size: 10, weight: .light))
                        .foregroundColor(Color(red: 0.18, green: 0.30, blue: 0.50).opacity(0.65))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 5)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color(red: 0.25, green: 0.40, blue: 0.60).opacity(0.25), lineWidth: 0.8)
                                .background(Color.white.opacity(0.20).cornerRadius(10))
                        )
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .onAppear { updateTime() }
        .onReceive(timer) { _ in updateTime() }
    }

    private func updateTime() {
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        timeStr = f.string(from: Date())
    }
}
