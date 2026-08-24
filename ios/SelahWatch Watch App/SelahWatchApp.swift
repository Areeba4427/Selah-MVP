// SelahWatch/SelahWatchApp.swift
//
// Entry point for the Selah Apple Watch app.
// Bundle ID: com.pause.selah.watchkitapp
//
// FIX 6 (background detection):
//   - startMonitoring() is called from init(), not just ContentView.onAppear.
//     When HealthKit background delivery or a scheduled refresh relaunches
//     the app in the background, no view ever appears — monitoring must be
//     set up at process launch or background wakes would evaluate nothing.
//   - A background app-refresh task re-polls HealthKit every ~15 minutes as
//     a fallback for gaps in observer-query background delivery, and always
//     reschedules itself. The identifier string must match the userInfo
//     passed in HealthManager.scheduleBackgroundRefresh().

import SwiftUI

@main
struct SelahWatchApp: App {

    @StateObject private var connectivity = ConnectivityManager.shared
    @StateObject private var health       = HealthManager.shared
    @Environment(\.scenePhase) private var scenePhase

    init() {
        HealthManager.shared.startMonitoring()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(connectivity)
                .environmentObject(health)
        }
        // Schedule the fallback poll only when actually going to background —
        // rescheduling on every activation (each wrist-raise) would keep
        // pushing the preferred date 15 minutes out and could postpone the
        // poll indefinitely. After each run the backgroundTask handler
        // reschedules itself.
        .onChange(of: scenePhase) { newPhase in
            if newPhase == .background {
                HealthManager.shared.scheduleBackgroundRefresh()
            }
        }
        .backgroundTask(.appRefresh(HealthManager.backgroundRefreshID)) {
            await HealthManager.shared.backgroundPoll()
            await MainActor.run {
                HealthManager.shared.scheduleBackgroundRefresh()
            }
        }
    }
}
