// SelahWatch/HealthManager.swift
//
// Adaptive stress detector — aligned with AppContext.js scoring system.
// The scoring rules are intentionally duplicated on the phone
// (src/context/AppContext.js) — any scoring change must be applied to BOTH.
//
// Trigger logic:
//   - Personal rolling baseline (HRV + HR, warmed up independently:
//     HR adaptive after 1 calm sample, HRV after 3 distinct SDNN samples)
//   - Scoring: HRV drop +2, HR rise +2, low movement +1, persistence +1
//   - Trigger when score >= 4 AND fresh elevated evidence persisted across
//     2+ distinct HR samples spanning 30s+ (a stale HRV sample re-read on
//     later checks does not count as new evidence)
//   - Workout/active energy filter (> 20 kcal in a strict 5-minute window)
//   - Baseline only updated on calm readings (score < 4, not in a workout)
//   - 10-minute cooldown between triggers (= session window)
//
// Background detection (FIX 6):
//   - HKObserverQuery + enableBackgroundDelivery(.immediate) for HR and HRV
//     wake the app when the watch writes new samples (entitlement
//     com.apple.developer.healthkit.background-delivery, already present).
//   - A scheduled background refresh (SelahWatchApp) polls every ~15 min as
//     a fallback.
//   - Readings are fetched as one-shot queries on every wake instead of
//     accumulating in-memory anchored-query state — a background relaunch
//     starts with a fresh process, so nothing may live only in memory.
//   - ALL trigger state — including the pending isStressed flag — is
//     persisted in UserDefaults: the process is routinely killed between the
//     notification being posted and the user tapping it.
//   - A trigger while the app is not frontmost posts a local notification
//     (sound + haptic). The pending flag stays valid for the 10-minute
//     session window (hasPendingStress), then expires; any calm reading
//     also clears it.

import Foundation
import HealthKit
import Combine
import UserNotifications
import WatchKit

// ── Shared timing ─────────────────────────────────────────────────────────────
// Session lifetime (ContentView), background-trigger validity, and re-trigger
// cooldown share one window: a detected episode "lasts" 10 minutes.
enum SelahTiming {
    static let sessionWindow: TimeInterval = 10 * 60
}

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
// HR and HRV warm up independently: SDNN is written every 15 min–hours, so
// most calm readings are HR-only. A shared counter would activate adaptive
// HRV scoring while baseline.hrv still held the population default.
private struct AdaptiveBaseline {
    var hrv:      Double = 50.0   // ms  — population average resting HRV
    var hr:       Double = 68.0   // bpm — population average resting HR
    var hrvCount: Int    = 0
    var hrCount:  Int    = 0
}

class HealthManager: NSObject, ObservableObject {

    static let shared = HealthManager()

    // Must match the .backgroundTask(.appRefresh(...)) identifier in
    // SelahWatchApp — a mismatch silently kills background polling.
    static let backgroundRefreshID = "selah.stress.poll"

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

    // A trigger is "pending" (should open a session on next app entry) only
    // within the session window — after that an unattended episode expires
    // instead of throwing a user who opens the app hours later into a session.
    var hasPendingStress: Bool {
        guard isStressed, let triggeredAt = lastTriggerAt else { return false }
        return Date().timeIntervalSince(triggeredAt) < SelahTiming.sessionWindow
    }

    private let store = HKHealthStore()
    private var isMonitoring = false

    // ── Adaptive baseline ─────────────────────────────────────────────────────
    private var baseline = AdaptiveBaseline()

    // ── Settings synced from the phone (via ConnectivityManager) ──────────────
    // Persisted so they survive Watch app restarts while offline.

    // Mirrors phone Settings > Auto-detection. When off, monitoring and
    // baseline learning continue but triggering is suppressed — same split
    // as the phone's interval in AppContext.js.
    var autoDetectEnabled: Bool = UserDefaults.standard.object(forKey: "auto_detect") as? Bool ?? true {
        didSet { UserDefaults.standard.set(autoDetectEnabled, forKey: "auto_detect") }
    }

    // Mirrors phone Settings > Detection sensitivity.
    // Indexed 0 (Low) | 1 (Medium, default) | 2 (High) — same values as
    // SENSITIVITY_THRESHOLDS in AppContext.js.
    var sensitivityLevel: Int = UserDefaults.standard.object(forKey: "sensitivity_level") as? Int ?? 1 {
        didSet { UserDefaults.standard.set(sensitivityLevel, forKey: "sensitivity_level") }
    }

    private let sensitivityThresholds: [(hrvDropPct: Double, hrRiseBpm: Double)] = [
        (hrvDropPct: 30, hrRiseBpm: 20),  // Low    — only strong signals
        (hrvDropPct: 25, hrRiseBpm: 15),  // Medium — default
        (hrvDropPct: 20, hrRiseBpm: 10),  // High   — more sensitive
    ]

    // ── Persistence counter ───────────────────────────────────────────────────
    // Counts distinct HR samples with FRESH elevated evidence. Persisted so a
    // background relaunch between two samples doesn't lose the streak.
    // A >30-min gap between counted samples starts a new episode.
    private var persistenceCount: Int   = 0
    private var firstElevatedAt:  Date? = nil
    private var lastCountedHRAt:  Date? = nil
    private var lastCountedHRVAt: Date? = nil
    private var lastTriggerAt:    Date? = nil

    private let episodeGapLimit: TimeInterval = 30 * 60

    // Debounce for observer-driven evaluations: during workouts the watch
    // writes HR every few seconds and each write would otherwise cost three
    // HealthKit queries. Persistence needs 30s spans anyway. Main-queue only.
    private var lastObserverFetchAt: Date? = nil

    // ── Sample recency windows ────────────────────────────────────────────────
    private let hrWindowMinutes:  Double = 15
    private let hrvWindowMinutes: Double = 60   // SDNN is written rarely

    // ── Active / workout filter ───────────────────────────────────────────────
    // > 20 kcal in the last 5 min = genuinely active. 5 kcal was exceeded by
    // ordinary walking (~4–5 kcal/min).
    private let activeEnergyThreshold: Double = 20.0
    var isActive: Bool { activeEnergy > activeEnergyThreshold }

    // ── Callback fired when trigger conditions are met ────────────────────────
    var onStressDetected: (() -> Void)?

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Authorization & Monitoring Setup
    // ─────────────────────────────────────────────────────────────────────────

    // Idempotent — called from SelahWatchApp.init() (covers background
    // launches) and ContentView.onAppear. The latch is released on an
    // authorization failure so a later foreground call can retry.
    func startMonitoring() {
        guard !isMonitoring else { return }
        guard HKHealthStore.isHealthDataAvailable() else { return }
        isMonitoring = true

        loadBaseline()
        loadTriggerState()
        requestNotificationAuthIfNeeded()

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
                guard success else {
                    self.isMonitoring = false
                    return
                }
                self.startObserving(.heartRate)
                self.startObserving(.heartRateVariabilitySDNN)
                // Populate state immediately on launch.
                self.fetchAndEvaluate()
            }
        }
    }

    // Needed for background stress alerts. Only ask while undetermined — a
    // background launch can't present the prompt, so the request is retried
    // on every launch until the user answers one in the foreground.
    private func requestNotificationAuthIfNeeded() {
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { settings in
            guard settings.authorizationStatus == .notDetermined else { return }
            center.requestAuthorization(options: [.alert, .sound]) { _, _ in }
        }
    }

    private func startObserving(_ identifier: HKQuantityTypeIdentifier) {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier) else { return }

        let query = HKObserverQuery(sampleType: type, predicate: nil) {
            [weak self] _, completionHandler, error in
            guard error == nil, let self = self else {
                completionHandler()
                return
            }
            // Completion handler MUST be called after processing, or the
            // system throttles future background deliveries.
            DispatchQueue.main.async {
                if let last = self.lastObserverFetchAt,
                   Date().timeIntervalSince(last) < 30 {
                    completionHandler()
                    return
                }
                self.lastObserverFetchAt = Date()
                self.fetchAndEvaluate { completionHandler() }
            }
        }
        store.execute(query)

        store.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - One-shot Fetch + Evaluate
    // Every wake — observer delivery, background refresh, or foreground —
    // re-reads the latest samples fresh from the store. Nothing depends on
    // long-lived in-memory query state, so a cold background relaunch
    // evaluates exactly like a warm one.
    // ─────────────────────────────────────────────────────────────────────────

    func fetchAndEvaluate(completion: @escaping () -> Void = {}) {
        let group = DispatchGroup()

        var latestHR:  (value: Double, date: Date)? = nil
        var latestHRV: (value: Double, date: Date)? = nil
        var energySum: Double = 0

        group.enter()
        fetchLatestQuantity(
            .heartRate, withinMinutes: hrWindowMinutes,
            unit: HKUnit.count().unitDivided(by: .minute())
        ) { sample in
            latestHR = sample
            group.leave()
        }

        group.enter()
        fetchLatestQuantity(
            .heartRateVariabilitySDNN, withinMinutes: hrvWindowMinutes,
            unit: HKUnit.secondUnit(with: .milli)
        ) { sample in
            latestHRV = sample
            group.leave()
        }

        group.enter()
        fetchActiveEnergySum { total in
            energySum = total
            group.leave()
        }

        group.notify(queue: .main) { [weak self] in
            guard let self = self else { completion(); return }
            self.hr           = latestHR?.value
            self.hrv          = latestHRV?.value
            self.activeEnergy = energySum
            self.evaluateStress(hrSampleDate: latestHR?.date, hrvSampleDate: latestHRV?.date)
            completion()
        }
    }

    // Async wrapper for SelahWatchApp's scheduled background refresh task.
    func backgroundPoll() async {
        await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
            fetchAndEvaluate { cont.resume() }
        }
    }

    func scheduleBackgroundRefresh() {
        WKApplication.shared().scheduleBackgroundRefresh(
            withPreferredDate: Date().addingTimeInterval(15 * 60),
            userInfo: HealthManager.backgroundRefreshID as NSString
        ) { _ in }
    }

    // .strictStartDate: a sample must START inside the window. Without it, a
    // long sample merely OVERLAPPING the window matches — e.g. a 40-minute
    // 250 kcal workout sample would count at full value for 5 minutes after
    // the workout ends, blocking triggers exactly when post-exercise stress
    // detection should resume.
    private func recentPredicate(minutes: Double) -> NSPredicate {
        HKQuery.predicateForSamples(
            withStart: Date().addingTimeInterval(-minutes * 60),
            end: nil, options: .strictStartDate
        )
    }

    private func fetchLatestQuantity(
        _ identifier: HKQuantityTypeIdentifier,
        withinMinutes: Double,
        unit: HKUnit,
        done: @escaping ((value: Double, date: Date)?) -> Void
    ) {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier) else {
            done(nil)
            return
        }
        let sort  = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(
            sampleType: type, predicate: recentPredicate(minutes: withinMinutes),
            limit: 1, sortDescriptors: [sort]
        ) { _, samples, _ in
            guard let sample = (samples as? [HKQuantitySample])?.first else {
                done(nil)
                return
            }
            done((value: sample.quantity.doubleValue(for: unit), date: sample.endDate))
        }
        store.execute(query)
    }

    // A statistics sum over the last 5 minutes is a true rolling window and
    // needs no in-memory sample bookkeeping (which a relaunch would lose).
    private func fetchActiveEnergySum(done: @escaping (Double) -> Void) {
        guard let type = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) else {
            done(0)
            return
        }
        let query = HKStatisticsQuery(
            quantityType: type, quantitySamplePredicate: recentPredicate(minutes: 5),
            options: .cumulativeSum
        ) { _, stats, _ in
            done(stats?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0)
        }
        store.execute(query)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Adaptive Baseline
    // ─────────────────────────────────────────────────────────────────────────

    // hrv is optional — an HR-only calm reading teaches the HR baseline while
    // leaving the HRV baseline (and its warm-up count) untouched.
    private func updateBaseline(hrv: Double?, hr: Double) {
        let nHR = baseline.hrCount + 1
        baseline.hr = nHR < 5
            ? (baseline.hr * Double(baseline.hrCount) + hr) / Double(nHR)
            : baseline.hr * 0.85 + hr * 0.15
        baseline.hrCount = min(nHR, 100)

        if let hrv = hrv {
            let nHRV = baseline.hrvCount + 1
            baseline.hrv = nHRV < 5
                ? (baseline.hrv * Double(baseline.hrvCount) + hrv) / Double(nHRV)
                : baseline.hrv * 0.85 + hrv * 0.15
            baseline.hrvCount = min(nHRV, 100)
        }

        saveBaseline()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Stress Scoring
    // Score >= 4 AND persisted fresh elevated evidence triggers intervention.
    // ─────────────────────────────────────────────────────────────────────────

    // HRV + HR points only — movement and persistence points are added in
    // evaluateStress(). Points are returned per-signal because persistence
    // only counts FRESH evidence (see evaluateStress).
    private func calculatePhysioScore() -> (hrPoints: Int, hrvPoints: Int, reasons: [String]) {
        var hrPoints  = 0
        var hrvPoints = 0
        var reasons   = [String]()

        // Thresholds follow the phone's sensitivity setting (synced snapshot)
        let t = sensitivityThresholds[min(max(sensitivityLevel, 0), 2)]

        // ── HRV drop below personal baseline ─────────────────────────────────
        // Adaptive only after 3 distinct SDNN samples: a single sample is too
        // noisy to serve as a baseline (SDNN swings widely at rest), and it
        // must never be scored against the un-personalized 50ms default.
        if let hrv = hrv {
            if baseline.hrvCount >= 3 {
                let drop = ((baseline.hrv - hrv) / baseline.hrv) * 100
                if drop >= t.hrvDropPct {
                    hrvPoints = 2
                    reasons.append(String(format: "HRV %.0f%% below baseline (+2)", drop))
                }
            } else if hrv < 30 {
                // Fallback fixed floor while the HRV baseline warms up
                hrvPoints = 2
                reasons.append(String(format: "HRV %.0fms below 30ms floor (+2)", hrv))
            }
        }

        // ── HR rise above personal baseline ──────────────────────────────────
        // HR baselines are far less noisy — adaptive after 1 calm sample so
        // the conservative 88bpm floor rules out early triggering as briefly
        // as possible.
        if let hr = hr {
            if baseline.hrCount >= 1 {
                let rise = hr - baseline.hr
                if rise >= t.hrRiseBpm {
                    hrPoints = 2
                    reasons.append(String(format: "HR %.0f bpm above baseline (+2)", rise))
                }
            } else if hr > 88 {
                hrPoints = 2
                reasons.append(String(format: "HR %.0fbpm above 88 floor (+2)", hr))
            }
        }

        return (hrPoints, hrvPoints, reasons)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Stress Evaluation
    // ─────────────────────────────────────────────────────────────────────────

    private func evaluateStress(hrSampleDate: Date?, hrvSampleDate: Date?) {
        // HRV is optional — HR alone is enough to evaluate. SDNN may not be
        // written for hours in normal wear; that must not block detection.
        guard let currentHR = hr, let hrDate = hrSampleDate else { return }

        let physio      = calculatePhysioScore()
        let physioScore = physio.hrPoints + physio.hrvPoints

        // ── 1. Persistence — counts distinct HR samples with FRESH evidence ──
        // A stale HRV sample stays "current" for up to 60 min and would
        // otherwise score +2 on every later check: one transient SDNN dip
        // could satisfy the whole persistence gate with completely normal HR.
        // So HRV elevation only counts as new evidence once per SDNN sample;
        // an echo neither increments nor resets the streak.
        if let last = lastCountedHRAt, hrDate.timeIntervalSince(last) > episodeGapLimit {
            persistenceCount = 0
            firstElevatedAt  = nil
        }

        let isNewHRSample = lastCountedHRAt.map { hrDate > $0 } ?? true
        let hrvIsFresh    = hrvSampleDate.map { d in
            lastCountedHRVAt.map { d > $0 } ?? true
        } ?? false

        if isNewHRSample {
            let freshEvidence = physio.hrPoints > 0 || (physio.hrvPoints > 0 && hrvIsFresh)
            if freshEvidence {
                if persistenceCount == 0 { firstElevatedAt = hrDate }
                persistenceCount += 1
                if physio.hrvPoints > 0 && hrvIsFresh {
                    lastCountedHRVAt = hrvSampleDate
                }
            } else if physioScore == 0 {
                persistenceCount = 0
                firstElevatedAt  = nil
            }
            // physioScore > 0 from an HRV echo alone: hold the streak —
            // neither fresh evidence of stress nor evidence of calm.
            lastCountedHRAt = hrDate
            saveTriggerState()
        }

        // ── 2. Full score ─────────────────────────────────────────────────────
        var score   = physioScore
        var reasons = physio.reasons

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
        // Gate matches the trigger gate (score < 4) so a triggering reading
        // can never feed the baseline.
        if score < 4 && !isActive {
            updateBaseline(hrv: hrv, hr: currentHR)
        }

        debugInfo = StressDebugInfo(
            currentHR:   currentHR,
            currentHRV:  hrv,
            baselineHR:  baseline.hr.rounded(),
            baselineHRV: baseline.hrv.rounded(),
            score:       score,
            reasons:     reasons,
            blocked:     isActive
        )

        // ── 4. Trigger — score + persistence + workout + autoDetect gates ─────
        // Gate is 4: one strong physio signal (+2) with low movement (+1) and
        // persistence (+1) suffices. (The old gate of 5 demanded HRV drop AND
        // HR rise simultaneously — effectively unreachable given real SDNN
        // write cadence.) Fresh elevated evidence must span 2+ distinct HR
        // samples AND at least 30 seconds. 10-min cooldown so background
        // wakes can't re-trigger the same episode.
        // autoDetectEnabled gates only the trigger — monitoring, debug info,
        // and baseline learning continue while it's off (mirrors the phone).
        let persistedLongEnough = persistenceCount >= 2
            && (firstElevatedAt.map { hrDate.timeIntervalSince($0) >= 30 } ?? false)
        let cooldownElapsed = lastTriggerAt
            .map { Date().timeIntervalSince($0) >= SelahTiming.sessionWindow } ?? true

        if score >= 4 && persistedLongEnough && !isActive
            && autoDetectEnabled && cooldownElapsed {
            isStressed       = true
            persistenceCount = 0
            firstElevatedAt  = nil
            lastTriggerAt    = Date()
            saveTriggerState()
            onStressDetected?()
            ConnectivityManager.shared.sendStressDetectedToPhone()

            // With the app off-screen there is no UI to show — alert the
            // wrist with a local notification. Tapping it opens the app,
            // where hasPendingStress routes into a session.
            if WKApplication.shared().applicationState != .active {
                postStressNotification()
            }
        } else if score < 4 && isStressed {
            // Any calm reading clears a pending trigger — physiology says the
            // episode is over, so an app open should land on the idle screen.
            isStressed = false
            saveTriggerState()
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: - Stress Notification
    // ─────────────────────────────────────────────────────────────────────────

    private func postStressNotification() {
        let content   = UNMutableNotificationContent()
        content.title = "Selah"
        content.body  = "Your body is showing signs of stress. Take a moment to breathe."
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: "selah.stress.alert",
            content:    content,
            trigger:    nil
        )
        UNUserNotificationCenter.current().add(request)
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
        saveTriggerState()
    }

    // Save after every baseline update
    private func saveBaseline() {
        let d = UserDefaults.standard
        d.set(baseline.hrv,      forKey: "baseline_hrv")
        d.set(baseline.hr,       forKey: "baseline_hr")
        d.set(baseline.hrCount,  forKey: "baseline_hr_count")
        d.set(baseline.hrvCount, forKey: "baseline_hrv_count")
    }

    // Load on init. "baseline_count" is the legacy shared counter from before
    // the counts were split — seed both from it once, then the split keys win.
    private func loadBaseline() {
        let d      = UserDefaults.standard
        let legacy = d.integer(forKey: "baseline_count")
        baseline.hrCount  = max(d.integer(forKey: "baseline_hr_count"),  legacy)
        baseline.hrvCount = max(d.integer(forKey: "baseline_hrv_count"), legacy)
        if baseline.hrCount  > 0 { baseline.hr  = d.double(forKey: "baseline_hr") }
        if baseline.hrvCount > 0 { baseline.hrv = d.double(forKey: "baseline_hrv") }
    }

    // Trigger state — including the pending isStressed flag — survives
    // background relaunches: the process is routinely killed between posting
    // the stress notification and the user tapping it.
    private func saveTriggerState() {
        let d = UserDefaults.standard
        d.set(persistenceCount, forKey: "persistence_count")
        d.set(isStressed,       forKey: "stress_pending")
        setDate(firstElevatedAt,  forKey: "first_elevated_at")
        setDate(lastCountedHRAt,  forKey: "last_counted_hr_at")
        setDate(lastCountedHRVAt, forKey: "last_counted_hrv_at")
        setDate(lastTriggerAt,    forKey: "last_trigger_at")
    }

    private func loadTriggerState() {
        let d = UserDefaults.standard
        persistenceCount = d.integer(forKey: "persistence_count")
        firstElevatedAt  = d.object(forKey: "first_elevated_at")   as? Date
        lastCountedHRAt  = d.object(forKey: "last_counted_hr_at")  as? Date
        lastCountedHRVAt = d.object(forKey: "last_counted_hrv_at") as? Date
        lastTriggerAt    = d.object(forKey: "last_trigger_at")     as? Date

        // Restore a pending trigger only while it is still actionable.
        isStressed = d.bool(forKey: "stress_pending")
            && (lastTriggerAt.map {
                    Date().timeIntervalSince($0) < SelahTiming.sessionWindow
                } ?? false)
    }

    private func setDate(_ date: Date?, forKey key: String) {
        if let date = date {
            UserDefaults.standard.set(date, forKey: key)
        } else {
            UserDefaults.standard.removeObject(forKey: key)
        }
    }

}
