// SelahWatch/HealthManager.swift
//
// Adaptive stress detector — aligned with AppContext.js scoring system.
//
// Trigger logic:
//   - Personal rolling baseline (HRV + HR)
//   - Scoring: HRV drop +2, HR rise +2, low movement +1, persistence +1
//   - Trigger when score >= 5 AND elevated physiology persisted 2+ checks / 30s+
//   - Workout/active energy filter (rolling 5-minute window)
//   - Baseline only updated on calm readings (score < 5, not in a workout)
//
// Fixes applied:
//   FIX 1 — HRV predicate window widened from 5 → 15 minutes.
//     Apple Watch writes HRV every 5–15 min at rest. A 5-min window
//     missed samples arriving at the edge, so evaluateStress() ran
//     far less often than expected in real wear conditions.
//
//   FIX 2 — Adaptive baseline kicks in after 1 calm sample (was 3).
//     The fallback fixed thresholds (HRV < 30ms, HR > 88bpm) are too
//     conservative for most users whose resting HRV is 40–70ms.
//     With the old setting, the first 30–45 min of every session used
//     fallbacks that would never fire, making early triggering impossible.
//
//   FIX 3 — activeEnergy is now a true rolling 5-minute sum.
//     An anchored query's update handler only delivers samples added since
//     the last anchor. The old code summed just that latest batch, so during
//     a workout activeEnergy was usually a fraction of a kcal and the
//     workout filter almost never engaged.
//
//   FIX 4 — Baseline is never learned from workout readings.
//     During a workout the movement point is withheld, capping the score
//     at 4 — which passed the old "score < 5 = calm" gate. Every workout
//     sample dragged baseline HR up / HRV down, masking later real stress.
//
//   FIX 5 — Persistence is a hard trigger gate, not just a +1.
//     HRV + HR + low movement alone sum to 5, so a single elevated reading
//     used to trigger instantly. Elevated physiology must now be seen on
//     2+ consecutive checks spanning at least 30 seconds.

import Foundation
import HealthKit
import Combine

// ── Debug snapshot ────────────────────────────────────────────────────────────
struct StressDebugInfo {
    var currentHR:   Double?
    var currentHRV:  Double?
    var baselineHR:  Double
    var baselineHRV: Double
    var score:       Int
    var reasons:     [String]
    var blocked:     Bool
}

// ── Adaptive baseline ─────────────────────────────────────────────────────────
private struct AdaptiveBaseline {
    var hrv:         Double = 50.0   // ms  — population average resting HRV
    var hr:          Double = 68.0   // bpm — population average resting HR
    var sampleCount: Int    = 0
}

class HealthManager: NSObject, ObservableObject {

    static let shared = HealthManager()

    // ── Published state ───────────────────────────────────────────────────────
    @Published var hrv:          Double?         = nil
    @Published var hr:           Double?         = nil
    @Published var activeEnergy: Double          = 0
    @Published var isStressed:   Bool            = false
    @Published var isAuthorized: Bool            = false
    @Published var debugInfo:    StressDebugInfo = StressDebugInfo(
        currentHR: nil, currentHRV: nil,
        baselineHR: 68, baselineHRV: 50,
        score: 0, reasons: [], blocked: false
    )

    private let store        = HKHealthStore()
    private var hrvQuery:    HKAnchoredObjectQuery?
    private var hrQuery:     HKAnchoredObjectQuery?
    private var energyQuery: HKAnchoredObjectQuery?

    // ── Adaptive baseline ─────────────────────────────────────────────────────
    private var baseline = AdaptiveBaseline()

    // ── Persistence counter ───────────────────────────────────────────────────
    // FIX 5: counts consecutive checks with elevated physiology (HRV or HR
    // points scored). firstElevatedAt anchors the 30-second minimum so a burst
    // of samples delivered together can't satisfy persistence instantly.
    private var persistenceCount: Int = 0
    private var firstElevatedAt: Date? = nil

    // ── Active / workout filter ───────────────────────────────────────────────
    // > 5 kcal in the last 5 min = user is active.
    // FIX 3: individual samples are kept with their timestamps so the total is
    // a true rolling window — a single update batch says nothing about it.
    private let activeEnergyThreshold: Double = 5.0
    private var energySamples: [(date: Date, kcal: Double)] = []
    var isActive: Bool { activeEnergy > activeEnergyThreshold }

    // ── Callback fired when trigger conditions are met ────────────────────────
    var onStressDetected: (() -> Void)?

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Authorization
    // ─────────────────────────────────────────────────────────────────────────

    func startMonitoring() {
        loadBaseline()
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
            type: type,
            // FIX 1: widened from 5 → 15 minutes.
            predicate: recentPredicate(minutes: 15),
            anchor: nil,
            limit: HKObjectQueryNoLimit
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
        // FIX 3: append the new batch, then recompute the rolling 5-min sum.
        // Replacing activeEnergy with just this batch's total made the workout
        // filter blind to everything delivered in earlier batches.
        let entries: [(date: Date, kcal: Double)] = samples.map {
            (date: $0.endDate, kcal: $0.quantity.doubleValue(for: .kilocalorie()))
        }
        DispatchQueue.main.async {
            self.energySamples.append(contentsOf: entries)
            self.refreshActiveEnergy()
        }
    }

    // Drop samples older than 5 minutes and re-sum. Also called from
    // evaluateStress() so a finished workout decays out of the window even
    // when no new energy samples arrive.
    private func refreshActiveEnergy() {
        let cutoff = Date().addingTimeInterval(-5 * 60)
        energySamples.removeAll { $0.date < cutoff }
        activeEnergy = energySamples.reduce(0.0) { $0 + $1.kcal }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Adaptive Baseline
    // ─────────────────────────────────────────────────────────────────────────

    private func updateBaseline(hrv: Double, hr: Double) {
        let n = baseline.sampleCount + 1
        if n < 5 {
            baseline.hrv = (baseline.hrv * Double(baseline.sampleCount) + hrv) / Double(n)
            baseline.hr  = (baseline.hr  * Double(baseline.sampleCount) + hr)  / Double(n)
        } else {
            baseline.hrv = baseline.hrv * 0.85 + hrv * 0.15
            baseline.hr  = baseline.hr  * 0.85 + hr  * 0.15
        }
        baseline.sampleCount = min(n, 100)

        saveBaseline()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Stress Scoring
    // Score >= 5 AND persisted elevated physiology triggers intervention.
    // ─────────────────────────────────────────────────────────────────────────

    // HRV + HR points only — this is what the persistence counter tracks.
    // Movement and persistence points are added in evaluateStress().
    private func calculatePhysioScore() -> (score: Int, reasons: [String]) {
        var score   = 0
        var reasons = [String]()

        // ── HRV drop below personal baseline ─────────────────────────────────
        if let hrv = hrv {
            // FIX 2: adaptive threshold now kicks in after 1 calm sample (was 3).
            if baseline.sampleCount >= 1 {
                let drop = ((baseline.hrv - hrv) / baseline.hrv) * 100
                if drop >= 25 {
                    score += 2
                    reasons.append(String(format: "HRV %.0f%% below baseline (+2)", drop))
                }
            } else if hrv < 30 {
                // Fallback — only before any calm reading is recorded
                score += 2
                reasons.append(String(format: "HRV %.0fms below 30ms floor (+2)", hrv))
            }
        }

        // ── HR rise above personal baseline ──────────────────────────────────
        if let hr = hr {
            if baseline.sampleCount >= 1 {
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

        return (score, reasons)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Stress Evaluation
    // ─────────────────────────────────────────────────────────────────────────

    private func evaluateStress() {
        guard let currentHRV = hrv, let currentHR = hr else { return }

        // FIX 3: decay the energy window even if no new samples arrived,
        // so a finished workout stops blocking triggers after 5 minutes.
        refreshActiveEnergy()

        // ── 1. Physiological signals drive the persistence counter ───────────
        // FIX 5: persistence tracks elevated physiology (any HRV/HR points),
        // updated BEFORE the full score so its +1 applies from the 2nd check.
        // The old counter tracked score >= 5 — which the score reached on a
        // single reading, so persistence never actually gated anything.
        let (physioScore, physioReasons) = calculatePhysioScore()

        if physioScore >= 2 {
            if persistenceCount == 0 { firstElevatedAt = Date() }
            persistenceCount += 1
        } else {
            persistenceCount = 0
            firstElevatedAt  = nil
        }

        // ── 2. Full score ─────────────────────────────────────────────────────
        var score   = physioScore
        var reasons = physioReasons

        if !isActive {
            score += 1
            reasons.append("Low movement (+1)")
        } else {
            reasons.append("Workout filter blocked")
        }

        if persistenceCount >= 2 {
            score += 1
            reasons.append(String(format: "Persisting %d checks (+1)", persistenceCount))
        }

        // ── 3. Baseline — calm readings only, never during a workout ─────────
        // FIX 4: workout readings capped at score 4 used to pass the old
        // "score < 5" gate and drag the baseline toward workout HR/HRV.
        if score < 5 && !isActive {
            updateBaseline(hrv: currentHRV, hr: currentHR)
        }

        debugInfo = StressDebugInfo(
            currentHR:   currentHR,
            currentHRV:  currentHRV,
            baselineHR:  baseline.hr.rounded(),
            baselineHRV: baseline.hrv.rounded(),
            score:       score,
            reasons:     reasons,
            blocked:     isActive
        )

        // ── 4. Trigger — score + persistence + workout gates ──────────────────
        // FIX 5: elevated physiology must span 2+ consecutive checks AND at
        // least 30 seconds of wall-clock time ("is it lasting long enough
        // to matter?").
        let persistedLongEnough = persistenceCount >= 2
            && (firstElevatedAt.map { Date().timeIntervalSince($0) >= 30 } ?? false)

        if score >= 5 && persistedLongEnough && !isActive {
            isStressed       = true
            persistenceCount = 0
            firstElevatedAt  = nil
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
        firstElevatedAt  = nil
    }

    private func recentPredicate(minutes: Int) -> NSPredicate {
        let start = Date().addingTimeInterval(-Double(minutes) * 60)
        return HKQuery.predicateForSamples(withStart: start, end: nil, options: .strictStartDate)
    }

        // Save after every baseline update
    private func saveBaseline() {
        UserDefaults.standard.set(baseline.hrv,         forKey: "baseline_hrv")
        UserDefaults.standard.set(baseline.hr,          forKey: "baseline_hr")
        UserDefaults.standard.set(baseline.sampleCount, forKey: "baseline_count")
    }

    // Load on init
    private func loadBaseline() {
        let count = UserDefaults.standard.integer(forKey: "baseline_count")
        guard count > 0 else { return }  // no saved data, keep defaults
        baseline.hrv         = UserDefaults.standard.double(forKey: "baseline_hrv")
        baseline.hr          = UserDefaults.standard.double(forKey: "baseline_hr")
        baseline.sampleCount = count
    }

}