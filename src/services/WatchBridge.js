// src/services/WatchBridge.js
//
// iPhone ↔ Watch communication via WatchConnectivity.
//
// react-native-watch-connectivity is an iOS-only package.
// It must NOT be listed in package.json dependencies — the Android
// Gradle build will try to compile its broken Kotlin stub and fail.
//
// Instead it is required dynamically at runtime, iOS only.
// Install it separately after the Android build is working:
//   npm install react-native-watch-connectivity --legacy-peer-deps
//   cd ios && pod install && cd ..
//
// On Android all methods are silent no-ops — no crashes, no errors.

import {Platform} from 'react-native';

// Only attempt to load on iOS, and only if the package is installed.
// Keeping this in a try/catch means a missing package never crashes Android.
let WatchConnectivity = null;
if (Platform.OS === 'ios') {
  try {
    WatchConnectivity = require('react-native-watch-connectivity');
  } catch (e) {
    // Package not installed yet — iOS Watch features disabled.
    // Run: npm install react-native-watch-connectivity && cd ios && pod install
    console.log('[Selah] react-native-watch-connectivity not installed — Watch bridge disabled');
  }
}

const WatchBridge = {

  // ── iPhone → Watch: send simulate trigger ────────────────────────────────
  // hapticsEnabled rides along so the Watch re-syncs the toggle even if it
  // was unreachable when the user last changed it in Settings.
  sendSimulateToWatch: (isSecular = false, hapticsEnabled = true) => {
    if (!WatchConnectivity) return;
    try {
      WatchConnectivity.sendMessage(
        {event: 'simulateStress', isSecular, hapticsEnabled},
        () => console.log('[Selah] Simulate sent to Watch'),
        (err) => console.log('[Selah] Watch send error:', err),
      );
    } catch (e) {
      console.log('[Selah] WatchBridge sendSimulate error:', e);
    }
  },

  // ── iPhone → Watch: send mode change ─────────────────────────────────────
  sendModeToWatch: (isSecular) => {
    if (!WatchConnectivity) return;
    try {
      WatchConnectivity.sendMessage({isSecular}, null, null);
    } catch (e) {
      console.log('[Selah] WatchBridge sendMode error:', e);
    }
  },

  // ── iPhone → Watch: sync full settings snapshot ──────────────────────────
  // snapshot: {isSecular, hapticsEnabled, autoDetect, sensitivity}
  // Uses application context, not a live message: WatchConnectivity queues the
  // latest snapshot and delivers it even if the Watch is unreachable right
  // now, and the Watch re-reads it on every launch. This is the reliable
  // path — the sendMessage calls above are low-latency extras for a live
  // Watch. The Watch persists each value, so settings survive restarts.
  syncSettingsToWatch: (snapshot) => {
    if (!WatchConnectivity) return;
    try {
      WatchConnectivity.updateApplicationContext(snapshot);
    } catch (e) {
      console.log('[Selah] WatchBridge syncSettings error:', e);
    }
  },

  // ── Watch → iPhone: listen for stress detected / session completed ────────
  startListening: (onStressDetected, onSessionCompleted) => {
    if (!WatchConnectivity) return () => {};
    try {
      const unsubscribe = WatchConnectivity.watchEvents.on(
        'message',
        (message) => {
          if (message.event === 'stressDetected' && onStressDetected) {
            onStressDetected();
          }
          if (message.event === 'sessionCompleted' && onSessionCompleted) {
            onSessionCompleted();
          }
        },
      );
      return unsubscribe;
    } catch (e) {
      console.log('[Selah] WatchBridge startListening error:', e);
      return () => {};
    }
  },
};

export default WatchBridge;