// SelahWatch/HealthManager.swift
//
// Adaptive stress detector — aligned with AppContext.js scoring system.
//
// Replaces fixed thresholds (HRV < 30, HR > 88) with:
//   - Personal rolling baseline (HRV + HR)
//   - Scoring: HRV drop +2, HR rise +2, low movement +1, persistence +1
//   - Trigger when score >= 5
//   - 15-minute cooldown between triggers
//   - Workout/active energy filter
//   - Baseline only updated on calm readings (score < 5)
//   - calculateStressScore() called once per evaluation cycle (no double-call)
//
// Debug info published via @Published debugInfo for IdleView display.

import Foundation
import HealthKit
import Combine

// ── Debug snapshot (mirrors AppContext debugInfo) ─────────────────────────────
struct StressDebugInfo {
    var currentHR:          Double?
    var currentHRV:         Double?
    var baselineHR:         Double
    var baselineHRV:        Double
    var score:              Int
    var reasons:            [String]
    var blocked:            Bool
    var cooldownRemaining:  Int     // minutes
}

// ── Adaptive baseline ─────────────────────────────────────────────────────────
// Mirrors DEFAULT_BASELINE + updateBaseline() in AppContext.js
private struct AdaptiveBaseline {
    var hrv:         Double = 50.0   // ms  — population average
    var hr:          Double = 68.0   // bpm — population average
    var sampleCount: Int    = 0
}

class HealthManager: NSObject, ObservableObject {

    static let shared = HealthManager()

    // ── Published state ───────────────────────────────────────────────────────
    @Published var hrv:          Double?         = nil
    @Published var hr:           Double?         = nil
    @Published var activeEnergy: Double          = 0     // kcal in last 5 min
    @Published var isStressed:   Bool            = false
    @Published var isAuthorized: Bool            = false
    @Published var debugInfo:    StressDebugInfo = StressDebugInfo(
        currentHR: nil, currentHRV: nil,
        baselineHR: 68, baselineHRV: 50,
        score: 0, reasons: [], blocked: false, cooldownRemaining: 0
    )

    private let store            = HKHealthStore()
    private var hrvQuery:        HKAnchoredObjectQuery?
    private var hrQuery:         HKAnchoredObjectQuery?
    private var energyQuery:     HKAnchoredObjectQuery?

    // ── Adaptive baseline ─────────────────────────────────────────────────────
    private var baseline = AdaptiveBaseline()

    // ── Persistence counter — mirrors persistenceRef in AppContext.js ─────────
    private var persistenceCount: Int = 0

    // ── Cooldown — 15 min, matches AppContext COOLDOWN_MS ────────────────────
    private var lastTrigger:   Date?           = nil
    private let cooldown:      TimeInterval    = 15 * 60

    // ── Active / workout filter ───────────────────────────────────────────────
    // > 5 kcal in 5 min = user is active (mirrors AppContext isActive check)
    private let activeEnergyThreshold: Double = 5.0

    var isActive: Bool { activeEnergy > activeEnergyThreshold }

    // ── Callback fired when trigger conditions are met ────────────────────────
    var onStressDetected: (() -> Void)?

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Authorization
    // ─────────────────────────────────────────────────────────────────────────

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

        store.requestAuthorization(toShare: typesToWrite, read: typesToRead) { success, _ in
            DispatchQueue.main.async {
                self.isAuthorized = success
                if success {
                    self.startHRVQuery()
                    self.startHRQuery()
                    self.startEnergyQuery()
                }
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - HealthKit Queries
    // ─────────────────────────────────────────────────────────────────────────

    private func startHRVQuery() {
        guard let type = HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN) else { return }
        let query = HKAnchoredObjectQuery(
            type: type, predicate: recentPredicate(minutes: 5),
            anchor: nil, limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, _, _ in self?.processHRV(samples: samples) }
        query.updateHandler = { [weak self] _, samples, _, _, _ in self?.processHRV(samples: samples) }
        store.execute(query)
        hrvQuery = query
    }

    private func startHRQuery() {
        guard let type = HKObjectType.quantityType(forIdentifier: .heartRate) else { return }
        let query = HKAnchoredObjectQuery(
            type: type, predicate: recentPredicate(minutes: 2),
            anchor: nil, limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, _, _ in self?.processHR(samples: samples) }
        query.updateHandler = { [weak self] _, samples, _, _, _ in self?.processHR(samples: samples) }
        store.execute(query)
        hrQuery = query
    }

    private func startEnergyQuery() {
        guard let type = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) else { return }
        let query = HKAnchoredObjectQuery(
            type: type, predicate: recentPredicate(minutes: 5),
            anchor: nil, limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, _, _ in self?.processEnergy(samples: samples) }
        query.updateHandler = { [weak self] _, samples, _, _, _ in self?.processEnergy(samples: samples) }
        store.execute(query)
        energyQuery = query
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Sample Processing
    // ─────────────────────────────────────────────────────────────────────────

    private func processHRV(samples: [HKSample]?) {
        guard let samples = samples as? [HKQuantitySample], !samples.isEmpty else { return }
        let value = samples.sorted { $0.endDate > $1.endDate }.first!
            .quantity.doubleValue(for: HKUnit.secondUnit(with: .milli))
        DispatchQueue.main.async {
            self.hrv = value
            self.evaluateStress()
        }
    }

    private func processHR(samples: [HKSample]?) {
        guard let samples = samples as? [HKQuantitySample], !samples.isEmpty else { return }
        let unit  = HKUnit.count().unitDivided(by: .minute())
        let value = samples.sorted { $0.endDate > $1.endDate }.first!
            .quantity.doubleValue(for: unit)
        DispatchQueue.main.async {
            self.hr = value
            self.evaluateStress()
        }
    }

    private func processEnergy(samples: [HKSample]?) {
        guard let samples = samples as? [HKQuantitySample] else { return }
        let total = samples.reduce(0.0) { $0 + $1.quantity.doubleValue(for: .kilocalorie()) }
        DispatchQueue.main.async {
            self.activeEnergy = total
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Adaptive Baseline
    // Mirrors updateBaseline() in AppContext.js — rolling weighted average.
    // ─────────────────────────────────────────────────────────────────────────

    private func updateBaseline(hrv: Double, hr: Double) {
        let n = baseline.sampleCount + 1
        if n < 5 {
            // Simple average while warming up (< 5 samples)
            baseline.hrv = (baseline.hrv * Double(baseline.sampleCount) + hrv) / Double(n)
            baseline.hr  = (baseline.hr  * Double(baseline.sampleCount) + hr)  / Double(n)
        } else {
            // Weighted rolling average — recent data weighted at 15%
            baseline.hrv = baseline.hrv * 0.85 + hrv * 0.15
            baseline.hr  = baseline.hr  * 0.85 + hr  * 0.15
        }
        baseline.sampleCount = min(n, 100)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Stress Scoring
    // Mirrors calculateStressScore() in AppContext.js exactly.
    // Score >= 5 triggers intervention.
    // ─────────────────────────────────────────────────────────────────────────

    private func calculateStressScore() -> (score: Int, reasons: [String]) {
        var score   = 0
        var reasons = [String]()
        let currentHRV = hrv
        let currentHR  = hr

        // ── HRV drop below personal baseline ─────────────────────────────────
        if let hrv = currentHRV {
            if baseline.sampleCount >= 3 {
                let drop = ((baseline.hrv - hrv) / baseline.hrv) * 100
                if drop >= 25 {
                    score += 2
                    reasons.append(String(format: "HRV %.0f%% below baseline (+2)", drop))
                }
            } else if hrv < 30 {
                // Fallback fixed floor while baseline is still warming up
                score += 2
                reasons.append(String(format: "HRV %.0fms below 30ms floor (+2)", hrv))
            }
        }

        // ── HR rise above personal baseline ──────────────────────────────────
        if let hr = currentHR {
            if baseline.sampleCount >= 3 {
                let rise = hr - baseline.hr
                if rise >= 15 {
                    score += 2
                    reasons.append(String(format: "HR %.0f bpm above baseline (+2)", rise))
                }
            } else if hr > 88 {
                score += 2
                reasons.append(String(format: "HR %.0fbpm above 88 floor (+2)", hr))
            }
        }

        // ── Low movement (not in workout) ─────────────────────────────────────
        if !isActive {
            score += 1
            reasons.append("Low movement (+1)")
        } else {
            reasons.append("Workout filter blocked")
        }

        // ── Persistence — conditions lasting 30-60s (2+ consecutive checks) ──
        if persistenceCount >= 2 {
            score += 1
            reasons.append(String(format: "Persisting %d checks (+1)", persistenceCount))
        }

        return (score, reasons)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Stress Evaluation
    // Called whenever HR or HRV updates. Mirrors the monitoring interval
    // logic in AppContext.startRealMonitoring().
    // ─────────────────────────────────────────────────────────────────────────

    private func evaluateStress() {
        guard let currentHRV = hrv, let currentHR = hr else { return }

        // Cooldown check
        let cooldownRemaining: TimeInterval
        if let last = lastTrigger {
            cooldownRemaining = max(0, cooldown - Date().timeIntervalSince(last))
        } else {
            cooldownRemaining = 0
        }

        // Single score calculation — used for both baseline gating and trigger logic
        let (score, reasons) = calculateStressScore()
        let blocked = isActive || cooldownRemaining > 0

        // Update baseline only during calm readings — mirrors AppContext.js:
        // `if (!rawStressed) updateBaseline(hrv, hr)`
        if score < 5 {
            updateBaseline(hrv: currentHRV, hr: currentHR)
        }

        // Publish debug info — mirrors AppContext setDebugInfo
        debugInfo = StressDebugInfo(
            currentHR:         currentHR,
            currentHRV:        currentHRV,
            baselineHR:        baseline.hr.rounded(),
            baselineHRV:       baseline.hrv.rounded(),
            score:             score,
            reasons:           reasons,
            blocked:           blocked,
            cooldownRemaining: Int((cooldownRemaining / 60).rounded())
        )

        // ── Persistence tracking ──────────────────────────────────────────────
        if score >= 5 {
            persistenceCount += 1
        } else {
            persistenceCount = 0
        }

        // ── Trigger ───────────────────────────────────────────────────────────
        // score >= 5, not in cooldown, not in active workout
        if score >= 5 && cooldownRemaining == 0 && !isActive {
            isStressed  = true
            lastTrigger = Date()
            persistenceCount = 0
            onStressDetected?()
            ConnectivityManager.shared.sendStressDetectedToPhone()
        } else if score < 5 {
            isStressed = false
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Mindful Session
    // ─────────────────────────────────────────────────────────────────────────

    func saveMindfulSession(start: Date, end: Date) {
        guard let type = HKObjectType.categoryType(forIdentifier: .mindfulSession) else { return }
        let sample = HKCategorySample(type: type, value: 0, start: start, end: end)
        store.save(sample) { _, _ in }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Helpers
    // ─────────────────────────────────────────────────────────────────────────

    func resetStress() {
        isStressed       = false
        persistenceCount = 0
    }

    private func recentPredicate(minutes: Int) -> NSPredicate {
        let start = Date().addingTimeInterval(-Double(minutes) * 60)
        return HKQuery.predicateForSamples(withStart: start, end: nil, options: .strictStartDate)
    }
}