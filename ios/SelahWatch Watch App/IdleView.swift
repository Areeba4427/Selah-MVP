// SelahWatch/IdleView.swift
//
// Aligned with HomeScreen.js + AppContext.js debug panel.
//
// Additions vs previous version:
//   - Debug panel (toggle) wired to health.debugInfo (StressDebugInfo)
//   - Mirrors HomeScreen debugPanel row-for-row

import SwiftUI
import Combine

struct IdleView: View {

    let onSimulate:   () -> Void
    let onEndSession: () -> Void
    let isSimulating: Bool
    let activePrompt: Bool
    let isSecular:    Bool
    let stressIndex:  Double   // 0–100

    @EnvironmentObject var health: HealthManager
    @State private var timeStr    = ""
    @State private var dotOpacity: Double = 1.0
    @State private var showDebug  = false

    private let clockTimer = Timer.publish(every: 10, on: .main, in: .common).autoconnect()

    private var accent: Color {
        isSecular
            ? Color(red: 0.23, green: 0.44, blue: 0.56)
            : Color(red: 0.54, green: 0.44, blue: 0.33)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {

                // ── Wordmark + tagline ────────────────────────────────────────
                VStack(spacing: 2) {
                    Text("SELAH")
                        .font(.system(size: 13, weight: .ultraLight))
                        .tracking(6)
                        .foregroundColor(Color(red: 0.18, green: 0.25, blue: 0.50).opacity(0.75))

                    Text("stress companion")
                        .font(.system(size: 7, weight: .light))
                        .tracking(2)
                        .foregroundColor(Color(red: 0.25, green: 0.32, blue: 0.56).opacity(0.40))
                        .textCase(.uppercase)
                }
                .padding(.top, 6)

                // ── Time ──────────────────────────────────────────────────────
                Text(timeStr)
                    .font(.system(size: 28, weight: .ultraLight))
                    .foregroundColor(Color(red: 0.15, green: 0.22, blue: 0.45).opacity(0.80))
                    .padding(.top, 4)

                // ── Live dot + mode label ─────────────────────────────────────
                HStack(spacing: 4) {
                    Circle()
                        .fill(accent)
                        .frame(width: 4, height: 4)
                        .opacity(dotOpacity)
                        .animation(
                            Animation.easeInOut(duration: 0.9).repeatForever(autoreverses: true),
                            value: dotOpacity
                        )
                    Text(isSecular ? "Secular · monitoring" : "Faith · monitoring")
                        .font(.system(size: 7, weight: .semibold))
                        .tracking(1.2)
                        .foregroundColor(accent.opacity(0.85))
                        .textCase(.uppercase)
                }
                .padding(.top, 3)

                Spacer(minLength: 6)

                // ── Stress index bar ──────────────────────────────────────────
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text("Stress index")
                            .font(.system(size: 7, weight: .semibold))
                            .tracking(1.2)
                            .foregroundColor(Color(red: 0.25, green: 0.32, blue: 0.56).opacity(0.50))
                            .textCase(.uppercase)
                        Spacer()
                        Text("\(Int(stressIndex))")
                            .font(.system(size: 13, weight: .ultraLight))
                            .foregroundColor(stressIndex > 65
                                ? Color(red: 0.63, green: 0.25, blue: 0.25)
                                : Color(red: 0.15, green: 0.22, blue: 0.45).opacity(0.80))
                        + Text(" /100")
                            .font(.system(size: 7, weight: .light))
                            .foregroundColor(Color(red: 0.25, green: 0.32, blue: 0.56).opacity(0.40))
                    }

                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 1)
                            .fill(Color(red: 0.25, green: 0.32, blue: 0.56).opacity(0.12))
                            .frame(height: 2)
                        RoundedRectangle(cornerRadius: 1)
                            .fill(stressFillColor)
                            .frame(width: barWidth(for: stressIndex), height: 2)
                        Rectangle()
                            .fill(Color(red: 0.25, green: 0.32, blue: 0.56).opacity(0.22))
                            .frame(width: 1, height: 6)
                            .offset(x: barWidth(for: 65))
                            .offset(y: -2)
                    }
                }
                .padding(.horizontal, 2)

                Spacer(minLength: 6)

                // ── Active session warning ────────────────────────────────────
                if activePrompt {
                    Button(action: onEndSession) {
                        HStack(spacing: 4) {
                            Text("⚠")
                                .font(.system(size: 9))
                            Text("Session active · Tap to end")
                                .font(.system(size: 8, weight: .medium))
                                .tracking(0.3)
                        }
                        .foregroundColor(Color(red: 0.63, green: 0.25, blue: 0.25))
                        .padding(.vertical, 5)
                        .padding(.horizontal, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color(red: 0.63, green: 0.25, blue: 0.25).opacity(0.12))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color(red: 0.63, green: 0.25, blue: 0.25).opacity(0.28), lineWidth: 0.5)
                                )
                        )
                    }
                    .buttonStyle(PlainButtonStyle())
                    .padding(.bottom, 4)
                }

                // ── Simulate button ───────────────────────────────────────────
                Button(action: isSimulating ? {} : onSimulate) {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(isSimulating
                                  ? Color(red: 0.42, green: 0.53, blue: 0.31)
                                  : Color(red: 0.63, green: 0.25, blue: 0.25))
                            .frame(width: 5, height: 5)
                        Text(isSimulating ? "Detecting..." : "Simulate stress")
                            .font(.system(size: 9, weight: .light))
                            .tracking(1.5)
                            .textCase(.uppercase)
                            .foregroundColor(Color(red: 0.15, green: 0.22, blue: 0.45).opacity(0.70))
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color(red: 0.25, green: 0.32, blue: 0.56).opacity(0.18), lineWidth: 0.5)
                            .background(Color.white.opacity(0.20).cornerRadius(8))
                    )
                }
                .buttonStyle(PlainButtonStyle())
                .opacity(isSimulating ? 0.50 : 1.0)
                .padding(.bottom, 6)

                // ── Debug toggle ──────────────────────────────────────────────
                Button(action: { showDebug.toggle() }) {
                    Text(showDebug ? "▲ Hide debug" : "▼ Debug info")
                        .font(.system(size: 8, weight: .light))
                        .tracking(1)
                        .foregroundColor(Color(red: 0.25, green: 0.32, blue: 0.56).opacity(0.45))
                }
                .buttonStyle(PlainButtonStyle())
                .padding(.bottom, 4)

                // ── Debug panel ───────────────────────────────────────────────
                // Mirrors HomeScreen.js debugPanel row-for-row.
                // Reads from health.debugInfo (published by HealthManager).
                if showDebug {
                    let d = health.debugInfo
                    VStack(alignment: .leading, spacing: 4) {

                        Text("Stress detection debug")
                            .font(.system(size: 7, weight: .bold))
                            .tracking(1.5)
                            .foregroundColor(Color(red: 0.25, green: 0.32, blue: 0.56).opacity(0.55))
                            .textCase(.uppercase)
                            .padding(.bottom, 2)

                        DebugRow(label: "Current HR",
                                 value: d.currentHR.map { "\(Int($0)) bpm" } ?? "—")
                        DebugRow(label: "Baseline HR",
                                 value: "\(Int(d.baselineHR)) bpm")
                        DebugRow(label: "Current HRV",
                                 value: d.currentHRV.map { "\(Int($0)) ms" } ?? "—")
                        DebugRow(label: "Baseline HRV",
                                 value: "\(Int(d.baselineHRV)) ms")

                        Divider()
                            .background(Color(red: 0.25, green: 0.32, blue: 0.56).opacity(0.15))
                            .padding(.vertical, 2)

                        HStack {
                            Text("Score")
                                .font(.system(size: 9))
                                .foregroundColor(Color(red: 0.25, green: 0.32, blue: 0.56).opacity(0.55))
                            Spacer()
                            Text("\(d.score) / 5")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(d.score >= 5
                                    ? Color(red: 0.63, green: 0.25, blue: 0.25)
                                    : Color(red: 0.42, green: 0.53, blue: 0.31))
                        }

                        DebugRow(label: "Blocked", value: d.blocked ? "Yes" : "No")

                        if d.cooldownRemaining > 0 {
                            DebugRow(label: "Cooldown",
                                     value: "\(d.cooldownRemaining) min left")
                        }

                        Text("Reasons")
                            .font(.system(size: 7, weight: .medium))
                            .foregroundColor(Color(red: 0.25, green: 0.32, blue: 0.56).opacity(0.45))
                            .padding(.top, 2)

                        ForEach(d.reasons, id: \.self) { reason in
                            Text("· \(reason)")
                                .font(.system(size: 8))
                                .foregroundColor(Color(red: 0.25, green: 0.32, blue: 0.56).opacity(0.55))
                        }
                    }
                    .padding(8)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.white.opacity(0.22))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color(red: 0.25, green: 0.32, blue: 0.56).opacity(0.15), lineWidth: 0.5)
                            )
                    )
                    .padding(.horizontal, 2)
                    .padding(.bottom, 8)
                }
            }
            .padding(.horizontal, 8)
        }
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.93, green: 0.93, blue: 0.96),
                    Color(red: 0.83, green: 0.85, blue: 0.93),
                    Color(red: 0.72, green: 0.75, blue: 0.87),
                    Color(red: 0.56, green: 0.59, blue: 0.77),
                    Color(red: 0.41, green: 0.44, blue: 0.66),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
        )
        .onAppear {
            updateTime()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { dotOpacity = 0.2 }
        }
        .onReceive(clockTimer) { _ in updateTime() }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private func updateTime() {
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        timeStr = f.string(from: Date())
    }

    private var stressFillColor: Color {
        if stressIndex > 65 { return Color(red: 0.63, green: 0.25, blue: 0.25) }
        if stressIndex > 40 { return Color(red: 0.42, green: 0.53, blue: 0.31) }
        return accent
    }

    private func barWidth(for value: Double) -> CGFloat {
        let totalWidth: CGFloat = 168
        return CGFloat(min(max(value, 0), 100) / 100.0) * totalWidth
    }
}

// ── Reusable debug row ────────────────────────────────────────────────────────
private struct DebugRow: View {
    let label: String
    let value: String
    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 9))
                .foregroundColor(Color(red: 0.25, green: 0.32, blue: 0.56).opacity(0.55))
            Spacer()
            Text(value)
                .font(.system(size: 9, weight: .medium))
                .foregroundColor(Color(red: 0.15, green: 0.22, blue: 0.45).opacity(0.80))
        }
    }
}