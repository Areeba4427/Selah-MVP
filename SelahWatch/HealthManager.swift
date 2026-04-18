// SelahWatch/HealthManager.swift
//
// PRIMARY stress detector — reads HRV directly from Apple Watch sensors.
// Watch is the source of truth. iPhone is notified after detection.
//
// Stress thresholds (medium sensitivity):
//   HRV < 30ms = stressed
//   HR  > 88   = elevated
//   Active (calories > 5 in 5min) = skip trigger

import Foundation
import HealthKit
import Combine

class HealthManager: NSObject, ObservableObject {

    static let shared = HealthManager()

    @Published var hrv: Double?         = nil
    @Published var hr:  Double?         = nil
    @Published var isStressed: Bool     = false
    @Published var isAuthorized: Bool   = false

    private let store = HKHealthStore()
    private var hrvQuery:  HKAnchoredObjectQuery?
    private var hrQuery:   HKAnchoredObjectQuery?
    private var lastTrigger: Date?      = nil
    private let cooldown: TimeInterval  = 300 // 5 min between triggers

    // Stress thresholds
    private let hrvThreshold: Double = 30.0
    private let hrThreshold:  Double = 88.0

    // ── Authorization ─────────────────────────────────────────────────────────
    func startMonitoring() {
        guard HKHealthStore.isHealthDataAvailable() else { return }

        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
        ]
        let typesToWrite: Set<HKSampleType> = [
            HKObjectType.categoryType(forIdentifier: .mindfulSession)!,
        ]

        store.requestAuthorization(toShare: typesToWrite, read: typesToRead) { success, error in
            DispatchQueue.main.async {
                self.isAuthorized = success
                if success {
                    self.startHRVQuery()
                    self.startHRQuery()
                }
            }
        }
    }

    // ── Real-time HRV query ───────────────────────────────────────────────────
    private func startHRVQuery() {
        guard let hrvType = HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN) else { return }

        let query = HKAnchoredObjectQuery(
            type: hrvType,
            predicate: recentPredicate(minutes: 5),
            anchor: nil,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, _, _ in
            self?.processHRV(samples: samples)
        }

        query.updateHandler = { [weak self] _, samples, _, _, _ in
            self?.processHRV(samples: samples)
        }

        store.execute(query)
        hrvQuery = query
    }

    // ── Real-time HR query ────────────────────────────────────────────────────
    private func startHRQuery() {
        guard let hrType = HKObjectType.quantityType(forIdentifier: .heartRate) else { return }

        let query = HKAnchoredObjectQuery(
            type: hrType,
            predicate: recentPredicate(minutes: 2),
            anchor: nil,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, _, _ in
            self?.processHR(samples: samples)
        }

        query.updateHandler = { [weak self] _, samples, _, _, _ in
            self?.processHR(samples: samples)
        }

        store.execute(query)
        hrQuery = query
    }

    // ── Process HRV samples ───────────────────────────────────────────────────
    private func processHRV(samples: [HKSample]?) {
        guard let samples = samples as? [HKQuantitySample], !samples.isEmpty else { return }
        let latest = samples.sorted { $0.endDate > $1.endDate }.first!
        let value  = latest.quantity.doubleValue(for: HKUnit.secondUnit(with: .milli))

        DispatchQueue.main.async {
            self.hrv = value
            self.evaluateStress()
        }
    }

    // ── Process HR samples ────────────────────────────────────────────────────
    private func processHR(samples: [HKSample]?) {
        guard let samples = samples as? [HKQuantitySample], !samples.isEmpty else { return }
        let latest = samples.sorted { $0.endDate > $1.endDate }.first!
        let unit   = HKUnit.count().unitDivided(by: .minute())
        let value  = latest.quantity.doubleValue(for: unit)

        DispatchQueue.main.async {
            self.hr = value
            self.evaluateStress()
        }
    }

    // ── Stress evaluation ─────────────────────────────────────────────────────
    private func evaluateStress() {
        // Cooldown — don't trigger too frequently
        if let last = lastTrigger, Date().timeIntervalSince(last) < cooldown { return }

        let hrvStressed = hrv != nil && hrv! < hrvThreshold
        let hrStressed  = hr  != nil && hr!  > hrThreshold
        let stressed    = hrvStressed || hrStressed

        if stressed && !isStressed {
            isStressed  = true
            lastTrigger = Date()

            // Notify iPhone that Watch detected stress
            ConnectivityManager.shared.sendStressDetectedToPhone()
        } else if !stressed {
            isStressed = false
        }
    }

    // ── Save mindful session after breathing completes ────────────────────────
    func saveMindfulSession(start: Date, end: Date) {
        guard let type = HKObjectType.categoryType(forIdentifier: .mindfulSession) else { return }
        let sample = HKCategorySample(type: type, value: 0, start: start, end: end)
        store.save(sample) { _, _ in }
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private func recentPredicate(minutes: Int) -> NSPredicate {
        let start = Date().addingTimeInterval(-Double(minutes) * 60)
        return HKQuery.predicateForSamples(withStart: start, end: nil, options: .strictStartDate)
    }

    // ── Reset after session ───────────────────────────────────────────────────
    func resetStress() {
        isStressed = false
    }
}
