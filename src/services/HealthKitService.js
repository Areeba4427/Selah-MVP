// src/services/HealthKitService.js
//
// Real HRV + Heart Rate on iOS via react-native-health.
// Simulation fallback on Android — no code changes needed between platforms.
//
// INSTALL AT LAB:
//   npm install react-native-health
//   cd ios && pod install && cd ..
//   Add HealthKit capability in Xcode (see ios_haptics/HEALTHKIT_SETUP.txt)

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

const THRESHOLDS = {
  hrv: {stressed: 30, borderline: 40},
  hr:  {elevated: 88, high: 95},
  activeCalories5min: 5,
};

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
      resolve(Math.random() * 45 + 20); // simulate 20-65ms
      return;
    }
    AppleHealthKit.getHeartRateVariabilitySamples(
      {unit: 'ms', startDate: new Date(Date.now() - 3600000).toISOString(), ascending: false, limit: 1},
      (err, results) => resolve(!err && results?.length ? results[0].value : null)
    );
  }),

  getHeartRate: () => new Promise((resolve) => {
    if (!AppleHealthKit || !isInitialized) {
      resolve(Math.random() * 30 + 65); // simulate 65-95 bpm
      return;
    }
    AppleHealthKit.getHeartRateSamples(
      {unit: 'bpm', startDate: new Date(Date.now() - 1800000).toISOString(), ascending: false, limit: 1},
      (err, results) => resolve(!err && results?.length ? results[0].value : null)
    );
  }),

  isUserActive: () => new Promise((resolve) => {
    if (!AppleHealthKit || !isInitialized) { resolve(false); return; }
    AppleHealthKit.getActiveEnergyBurned(
      {startDate: new Date(Date.now() - 300000).toISOString(), endDate: new Date().toISOString()},
      (err, results) => {
        if (err || !results?.length) { resolve(false); return; }
        const total = results.reduce((s, r) => s + r.value, 0);
        resolve(total > THRESHOLDS.activeCalories5min);
      }
    );
  }),

  saveMindfulSession: (startDate, endDate) => new Promise((resolve) => {
    if (!AppleHealthKit || !isInitialized) { resolve(false); return; }
    AppleHealthKit.saveMindfulSession(
      {startDate: startDate.toISOString(), endDate: endDate.toISOString()},
      (err) => resolve(!err)
    );
  }),

  // Main stress check — returns {isStressed, hrv, hr, stressIndex, reason}
  checkStress: async () => {
    try {
      const [hrv, hr, isActive] = await Promise.all([
        HealthKitService.getHRV(),
        HealthKitService.getHeartRate(),
        HealthKitService.isUserActive(),
      ]);

      if (isActive) return {isStressed: false, hrv, hr, stressIndex: 20, reason: 'user_active'};

      const hrvStressed = hrv !== null && hrv < THRESHOLDS.hrv.stressed;
      const hrvBorder   = hrv !== null && hrv < THRESHOLDS.hrv.borderline;
      const hrHigh      = hr  !== null && hr  > THRESHOLDS.hr.elevated;
      const hrVeryHigh  = hr  !== null && hr  > THRESHOLDS.hr.high;

      let stressIndex = 20;
      if (hrv !== null) stressIndex += Math.max(0, (50 - hrv) * 1.2);
      if (hr  !== null) stressIndex += Math.max(0, (hr  - 65) * 0.8);
      stressIndex = Math.min(100, Math.round(stressIndex));

      const isStressed = hrvStressed || hrVeryHigh || (hrvBorder && hrHigh);
      const reason = hrvStressed ? 'low_hrv' : hrVeryHigh ? 'high_hr' : isStressed ? 'combined' : 'normal';

      return {isStressed, hrv, hr, stressIndex, reason};
    } catch (e) {
      return {isStressed: false, hrv: null, hr: null, stressIndex: 20, reason: 'error'};
    }
  },
};

export default HealthKitService;