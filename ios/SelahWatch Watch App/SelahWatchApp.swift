// SelahWatch/SelahWatchApp.swift
//
// Entry point for the Selah Apple Watch app.
// Bundle ID: com.pause.selah.watchkitapp

import SwiftUI

@main
struct SelahWatchApp: App {

    @StateObject private var connectivity = ConnectivityManager.shared
    @StateObject private var health       = HealthManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(connectivity)
                .environmentObject(health)
        }
    }
}
