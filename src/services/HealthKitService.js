// src/services/HealthKitService.js
//
// Real HRV + Heart Rate on iOS via react-native-health.
// Simulation fallback on Android.
//
// ── Fix in this version ──────────────────────────────────────────────────────
//
// GAP — isUserActive() returned false as fallback when HealthKit was not yet
//   initialised (fresh install, permissions not granted).
//   false is a meaningful value — it means "not active" and AppContext awards
//   the +1 low-movement point freely, making the score inflated from the start.
//   Returning false before permissions are confirmed means the workout filter
//   is non-functional until HealthKit is ready.
//
//   Fix: isUserActive() now returns null when HealthKit is unavailable/uninitialised.
//   AppContext.calculateStressScore() treats null isActive as "unknown" — it skips
//   the movement point entirely rather than freely awarding it.
//   This makes the trigger score more conservative before permissions are granted.
//
//   calculateStressScore() in AppContext.js updated to handle null isActive:
//     if (isActive === false)  → +1 low movement (confirmed not active)
//     if (isActive === null)   → skip point (unknown, don't award or block)
//     if (isActive === true)   → workout filter blocked
//
// checkStress() return shape is unchanged: { hrv, hr, isActive }
// isActive is now: true | false | null  (was: true | false)

import {Platform} from 'react-native';

let AppleHealthKit = null;
let isInitialized  = false;

if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch (e) {
    console.log('[Selah] react-native-health not installed — using simulation');
  }
}

const PERMISSIONS = AppleHealthKit ? {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.HeartRateVariability,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.MindfulSession,
    ],
  },
} : null;

// Active energy threshold — mirrors AppContext / HealthManager.swift
// > 5 kcal in 5 min = user is in a workout, skip trigger
const ACTIVE_CALORIES_THRESHOLD = 5;

const HealthKitService = {

  initialize: () => new Promise((resolve) => {
    if (!AppleHealthKit) { resolve(false); return; }
    if (isInitialized)   { resolve(true);  return; }
    AppleHealthKit.initHealthKit(PERMISSIONS, (err) => {
      if (err) { console.log('[Selah] HealthKit error:', err); resolve(false); }
      else     { isInitialized = true; resolve(true); }
    });
  }),

  getHRV: () => new Promise((resolve) => {
    if (!AppleHealthKit || !isInitialized) {
      resolve(Math.random() * 45 + 20); // simulate 20–65ms
      return;
    }
    AppleHealthKit.getHeartRateVariabilitySamples(
      {
        unit:      'ms',
        startDate: new Date(Date.now() - 3600000).toISOString(),
        ascending: false,
        limit:     1,
      },
      (err, results) => resolve(!err && results?.length ? results[0].value : null)
    );
  }),

  getHeartRate: () => new Promise((resolve) => {
    if (!AppleHealthKit || !isInitialized) {
      resolve(Math.random() * 30 + 65); // simulate 65–95 bpm
      return;
    }
    AppleHealthKit.getHeartRateSamples(
      {
        unit:      'bpm',
        startDate: new Date(Date.now() - 1800000).toISOString(),
        ascending: false,
        limit:     1,
      },
      (err, results) => resolve(!err && results?.length ? results[0].value : null)
    );
  }),

  // GAP FIX: returns null (not false) when HealthKit is unavailable/uninitialised.
  // null = "unknown activity state" — AppContext will skip the +1 movement point.
  // false = "confirmed not active"  — AppContext awards +1 low-movement point.
  // true  = "confirmed active"      — workout filter blocks trigger.
  isUserActive: () => new Promise((resolve) => {
    if (!AppleHealthKit || !isInitialized) {
      // Return null: we don't know activity state yet, don't award the point freely.
      resolve(null);
      return;
    }
    AppleHealthKit.getActiveEnergyBurned(
      {
        startDate: new Date(Date.now() - 300000).toISOString(),
        endDate:   new Date().toISOString(),
      },
      (err, results) => {
        if (err || !results?.length) {
          // Query failed or no data — treat as unknown, not as inactive
          resolve(null);
          return;
        }
        const total = results.reduce((s, r) => s + r.value, 0);
        resolve(total > ACTIVE_CALORIES_THRESHOLD);
      }
    );
  }),

  saveMindfulSession: (startDate, endDate) => new Promise((resolve) => {
    if (!AppleHealthKit || !isInitialized) { resolve(false); return; }
    AppleHealthKit.saveMindfulSession(
      {
        startDate: startDate.toISOString(),
        endDate:   endDate.toISOString(),
      },
      (err) => resolve(!err)
    );
  }),

  // ── checkStress ─────────────────────────────────────────────────────────────
  // Returns raw biometric readings only — { hrv, hr, isActive }.
  // isActive is now: true | false | null
  //   null means HealthKit is not ready yet — AppContext skips the movement point.
  // AppContext.js owns all stress scoring (adaptive baseline, scoring, cooldown,
  // persistence). Do NOT add isStressed or stressIndex here.
  checkStress: async () => {
    try {
      const [hrv, hr, isActive] = await Promise.all([
        HealthKitService.getHRV(),
        HealthKitService.getHeartRate(),
        HealthKitService.isUserActive(),
      ]);
      return {hrv, hr, isActive};
    } catch (e) {
      console.log('[Selah] checkStress error:', e);
      return {hrv: null, hr: null, isActive: null};
    }
  },
};

export default HealthKitService;