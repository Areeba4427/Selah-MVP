// SelahWatch/ContentView.swift
//
// Main screen coordinator.
// Routes through the Selah flow:
//   idle → alert → breathe → done → idle
//
// Stress can be triggered by:
//   1. Watch HealthManager (primary — direct Watch sensor reading)
//   2. iPhone simulate button (via WatchConnectivity)

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

    @State private var phase:  SelahPhase  = .idle
    @State private var prompt: SelahPrompt? = nil

    var body: some View {
        Group {
            switch phase {

            case .idle:
                IdleView(onSimulate: {
                    triggerSession()
                })

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
                        phase  = .idle
                        prompt = nil
                    })
                }
            }
        }
        // Watch HealthManager detected stress directly
        .onChange(of: health.isStressed) { stressed in
            guard stressed, phase == .idle else { return }
            triggerSession()
        }
        // iPhone sent a simulate trigger
        .onChange(of: connectivity.incomingPrompt) { incoming in
            guard let p = incoming, phase == .idle else { return }
            prompt = p
            phase  = .alert
            HapticManager.shared.playDetection()
        }
        .onAppear {
            health.startMonitoring()
        }
    }

    private func triggerSession() {
        let p  = SelahPrompt.random(secular: connectivity.isSecular)
        prompt = p
        phase  = .alert
        HapticManager.shared.playDetection()
    }
}
