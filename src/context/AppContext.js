// src/context/AppContext.js
//
// ── Fixes in this version ────────────────────────────────────────────────────
//
// BUG 1 — result.isStressed / result.stressIndex don't exist
//   HealthKitService.checkStress() returns { hrv, hr, isActive } only.
//   startRealMonitoring was destructuring isStressed and reading stressIndex
//   from the result object — both undefined. This caused:
//     - updateBaseline() to always fire (rawStressed was always undefined/falsy)
//     - biometrics.stressIndex to always be NaN/undefined on the UI bar
//   Fix: removed those destructures. Score is now calculated first, then used
//   to gate baseline updates (score < 5) and derive stressIndex, exactly
//   mirroring HealthManager.swift's evaluateStress() pattern.
//
// BUG 2 — activePrompt stale closure in monitoring interval
//   The trigger guard inside setInterval read activePrompt from the closure
//   captured when startRealMonitoring() was first called — always null.
//   A session already in progress would not block a new auto-trigger.
//   Fix: added activePromptRef, kept in sync via useEffect, read in interval.
//
// BUG 3 — sensitivity, setSensitivity, settings, updateSetting missing from context
//   SettingsScreen.js pulls these four values from useApp(). None were defined
//   in state or passed in the Provider value — SettingsScreen crashed on mount.
//   Fix: added sensitivity state (default 1 = Medium), setSensitivity(),
//   settings state (hapticsEnabled/breathingExercises/autoDetect/quietHours),
//   updateSetting(), and all four passed in Provider value.
//   calculatePhysioScore() now reads sensitivity thresholds from context so
//   changing sensitivity in Settings actually affects trigger logic.
//
// BUG 4a — session timeout not started on auto-trigger (stuck session)
//   triggerIntervention() set activePrompt but never started sessionTimeoutRef.
//   Only the AppState background transition started the timeout.
//   So if a session auto-triggered and the user ignored it (didn't exit the app),
//   the session stayed stuck indefinitely — exactly the stuck session reported.
//   Fix: triggerIntervention() now starts the session timeout immediately.
//
// BUG 4b — resetSession() didn't clear its own timeout
//   If a session timed out naturally in the background and the user opened the
//   app and started a new session, the old setTimeout callback could fire later
//   and reset the new session.
//   Fix: resetSession() now clears sessionTimeoutRef at the top.
//
// BUG 5 — settings.autoDetect read from a stale closure
//   The monitoring interval captured `settings` from the first render, so
//   toggling Auto-detection off in Settings never actually stopped
//   auto-triggering. Fixed with settingsRef — same pattern as activePromptRef
//   and sensitivityRef.
//
// BUG 6 — workout readings poisoned the "calm" baseline
//   Baseline updates were gated on score < 5 only. During a workout the
//   movement point is withheld, capping the score at 4 — so workout HR/HRV
//   passed the gate and dragged the baseline toward workout levels, masking
//   later real stress. Baseline updates now also require isActive !== true.
//
// BUG 7 — persistence was not actually required (or was impossible)
//   The counter tracked score >= 5, but HRV+HR+movement alone reach 5, so a
//   single 30s check could trigger with zero persistence. And with movement
//   unknown (isActive null) the score capped at 4, so the counter never
//   incremented and triggering was impossible. Persistence now tracks
//   elevated physiology (any HRV/HR points) and is a hard trigger gate
//   (2+ consecutive checks ≈ 60s at the 30s interval), matching the client's
//   "conditions persist 30–60s" requirement. The trigger also gained an
//   explicit isActive !== true gate, since persistence can now accumulate
//   during workouts.

import React, {createContext, useContext, useState, useEffect, useRef} from 'react';
import {Platform, AppState} from 'react-native';
import HealthKitService from '../services/HealthKitService';
import WatchBridge from '../services/WatchBridge';

const AppContext = createContext(null);

// ── Faith Prompts — 20 Verses ─────────────────────────────────────────────────
export const faithPrompts = [
  {source: 'Psalm 46:10',        closing: 'God is GOD',                              breathe: {inhale: 'I am still',                   hold: 'I know',                   exhale: 'You are GOD'}},
  {source: 'Isaiah 26:3',        closing: "God's peace is yours",                    breathe: {inhale: 'I return to you',               hold: 'I trust you',              exhale: 'I am safe with you'}},
  {source: 'Philippians 4:7',    closing: 'God is guarding your heart and mind',     breathe: {inhale: 'Your peace surrounds me',       hold: 'You are with me',          exhale: 'I am safe… I can rest.'}},
  {source: 'John 16:33',         closing: 'Jesus has overcome',                      breathe: {inhale: 'I turn my eyes to you',         hold: 'You have overcome',        exhale: 'You are my peace'}},
  {source: 'Psalm 23:4',         closing: 'God is with you',                         breathe: {inhale: 'I am not alone',                hold: 'I will not fear',          exhale: 'You are with me'}},
  {source: 'Isaiah 41:10',       closing: 'The Lord is with you. You are not alone', breathe: {inhale: 'You are with me',               hold: 'You are my strength',      exhale: 'I am held'}},
  {source: 'Deuteronomy 31:6',   closing: 'The Lord will never fail you',            breathe: {inhale: 'You go before',                 hold: 'You are dependable',       exhale: 'You are faithful'}},
  {source: 'Psalm 91:15',        closing: 'God is with you',                         breathe: {inhale: 'You hear me',                   hold: 'You are with me',          exhale: 'I am not alone'}},
  {source: 'Proverbs 3:5–6',     closing: 'Trust in the Lord',                       breathe: {inhale: 'I trust you',                   hold: 'You are leading me',       exhale: 'It will be okay'}},
  {source: '1 Peter 5:7',        closing: 'The Lord cares about you',                breathe: {inhale: 'You see me',                    hold: 'You know me',              exhale: 'You care about me'}},
  {source: 'Jeremiah 17:7',      closing: 'The Lord is holding you',                 breathe: {inhale: 'My trust is in you',            hold: 'You are my hope',          exhale: 'I am held'}},
  {source: '2 Corinthians 12:9', closing: "God's grace is enough for you",           breathe: {inhale: 'You are strong',                hold: 'Your strength carries me', exhale: 'Your grace is enough'}},
  {source: 'Jeremiah 29:11',     closing: "God's plans for you are good",            breathe: {inhale: 'You know everything about me',  hold: 'You hold my future',       exhale: 'I can trust you'}},
  {source: 'Isaiah 40:31',       closing: 'The Lord renews your strength',           breathe: {inhale: 'You are my hope',               hold: 'You renew my strength',    exhale: 'I will not grow weary'}},
  {source: 'Isaiah 43:2–3',      closing: 'God is with you. Always.',                breathe: {inhale: 'You are with me',               hold: 'You cover me',             exhale: 'I am not alone'}},
  {source: 'Psalm 42:11',        closing: 'The Lord is your hope',                   breathe: {inhale: 'You are my hope',               hold: 'You are my God',           exhale: 'I trust you'}},
  {source: 'Psalm 139:17',       closing: "God's thoughts are full of you",          breathe: {inhale: 'You think of me',               hold: 'You care for me',          exhale: 'I am precious to You'}},
  {source: 'Psalm 62:6',         closing: 'The Lord is your refuge',                 breathe: {inhale: 'You are my rock',               hold: 'You are my fortress',      exhale: 'I am safe with You'}},
  {source: 'Psalm 94:19',        closing: 'The Lord fills you with His joy',         breathe: {inhale: 'You comfort me',                hold: 'You steady me',            exhale: 'Your joy fills my heart'}},
  {source: 'Jeremiah 33:3',      closing: 'The Lord hears you',                      breathe: {inhale: 'You hear me',                   hold: 'You answer me',            exhale: 'I can call on you'}},
];

export const secularPrompts = [
  {source: 'Mindfulness',   closing: 'Carry this calm forward',       breathe: {inhale: 'I am calm',    hold: 'I am present',  exhale: 'I release tension'}},
  {source: 'Affirmation',   closing: 'This moment is enough',         breathe: {inhale: 'I breathe in', hold: 'stillness',     exhale: 'I let go'}},
  {source: 'Reflection',    closing: 'You are grounded',              breathe: {inhale: 'I am here',    hold: 'right now',     exhale: 'That is enough'}},
  {source: 'Mindfulness',   closing: 'Return to this breath anytime', breathe: {inhale: 'I anchor',     hold: 'to now',        exhale: 'I am grounded'}},
  {source: 'Viktor Frankl', closing: 'You chose stillness',           breathe: {inhale: 'I pause',      hold: 'I choose',      exhale: 'I respond'}},
  {source: 'Dan Millman',   closing: 'Thoughts pass. You remain.',    breathe: {inhale: 'I observe',    hold: 'with calm',     exhale: 'Thoughts pass'}},
];

// ── Adaptive Baseline ─────────────────────────────────────────────────────────
const DEFAULT_BASELINE = {
  hrv: 50,   // ms — population average resting HRV
  hr:  68,   // bpm — population average resting HR
  sampleCount: 0,
};

// ── Sensitivity thresholds ────────────────────────────────────────────────────
// Indexed 0 (Low) | 1 (Medium, default) | 2 (High).
// Used by calculatePhysioScore() — changing sensitivity in Settings immediately
// affects what HRV drop % and HR rise bpm count as +2 toward the trigger score.
const SENSITIVITY_THRESHOLDS = {
  0: {hrvDropPct: 30, hrRiseBpm: 20}, // Low    — only strong signals
  1: {hrvDropPct: 25, hrRiseBpm: 15}, // Medium — default, matches original spec
  2: {hrvDropPct: 20, hrRiseBpm: 10}, // High   — more sensitive
};

// ── Stress Scoring ────────────────────────────────────────────────────────────
// Score >= 5 AND 2+ persistent elevated checks triggers intervention.
// Split in two (BUG 7): the physiological part (HRV + HR) is what the
// persistence counter tracks; movement and persistence points are layered on
// top in assembleStressScore().

// HRV + HR points only. Accepts sensitivityLevel so Settings changes apply.
function calculatePhysioScore({hrv, hr, baseline, sensitivityLevel = 1}) {
  let score = 0;
  const reasons = [];
  const thresholds = SENSITIVITY_THRESHOLDS[sensitivityLevel] ?? SENSITIVITY_THRESHOLDS[1];

  // HRV drop below personal baseline
  if (hrv !== null) {
    if (baseline.sampleCount >= 3) {
      const hrvDrop = ((baseline.hrv - hrv) / baseline.hrv) * 100;
      if (hrvDrop >= thresholds.hrvDropPct) {
        score += 2;
        reasons.push(`HRV ${hrvDrop.toFixed(0)}% below baseline (+2)`);
      }
    } else if (hrv < 30) {
      // Fallback fixed floor while baseline is still warming up (<3 samples)
      score += 2;
      reasons.push(`HRV ${hrv.toFixed(0)}ms below 30ms floor (+2)`);
    }
  }

  // HR rise above personal baseline
  if (hr !== null) {
    if (baseline.sampleCount >= 3) {
      const hrRise = hr - baseline.hr;
      if (hrRise >= thresholds.hrRiseBpm) {
        score += 2;
        reasons.push(`HR ${hrRise.toFixed(0)} bpm above baseline (+2)`);
      }
    } else if (hr > 88) {
      score += 2;
      reasons.push(`HR ${hr.toFixed(0)}bpm above 88 floor (+2)`);
    }
  }

  return {score, reasons};
}

// Full score: physio + movement + persistence.
function assembleStressScore({physio, isActive, persistenceCount}) {
  let score = physio.score;
  const reasons = [...physio.reasons];

  // Low movement (not in workout)
  // isActive: true = workout (block), false = confirmed inactive (+1), null = unknown (skip)
  if (isActive === true) {
    reasons.push('Workout filter blocked');
  } else if (isActive === false) {
    score += 1;
    reasons.push('Low movement (+1)');
  } else {
    // null — HealthKit not ready yet, activity unknown, skip point conservatively
    reasons.push('Movement unknown (HealthKit not ready)');
  }

  // Persistence — conditions lasting 30–60s (2+ consecutive checks at 30s interval)
  if (persistenceCount >= 2) {
    score += 1;
    reasons.push(`Persisting ${persistenceCount} checks (+1)`);
  }

  return {score, reasons};
}

export function AppProvider({children}) {
  const [isSecular,          setIsSecular]          = useState(false);
  const [isStressSimulating, setIsStressSimulating] = useState(false);
  const [activePrompt,       setActivePrompt]       = useState(null);
  const [healthKitReady,     setHealthKitReady]     = useState(false);
  const [biometrics,         setBiometrics]         = useState({
    hr: 72, hrv: 48, stressIndex: 24, isResting: true,
  });

  // ── BUG 3 FIX: sensitivity + settings state ───────────────────────────────
  // SettingsScreen reads these from context. Previously undefined → crash.
  const [sensitivity,  setSensitivity]  = useState(1); // 0=Low, 1=Medium, 2=High
  const [settings,     setSettings]     = useState({
    hapticsEnabled:     true,
    breathingExercises: true,
    autoDetect:         true,
    quietHours:         false,
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({...prev, [key]: value}));
  };

  // Debug info for HomeScreen debug panel
  const [debugInfo, setDebugInfo] = useState({
    currentHR:         null,
    currentHRV:        null,
    baselineHR:        DEFAULT_BASELINE.hr,
    baselineHRV:       DEFAULT_BASELINE.hrv,
    score:             0,
    reasons:           [],
    blocked:           false,
  });

  const simulatingRef      = useRef(false);
  const monitorIntervalRef = useRef(null);
  const sessionStartRef    = useRef(null);
  const persistenceRef     = useRef(0);
  const baselineRef        = useRef({...DEFAULT_BASELINE});
  const sessionTimeoutRef  = useRef(null);
  const sessionBackgroundAtRef = useRef(null);
  const appStateRef        = useRef(AppState.currentState);
  const sensitivityRef     = useRef(sensitivity);

  // ── BUG 2 FIX: activePrompt ref to avoid stale closure in interval ────────
  // The setInterval callback captures the closure at creation time.
  // Reading activePrompt directly inside the interval always sees null.
  // This ref is kept in sync so the interval reads the current value.
  const activePromptRef    = useRef(activePrompt);

  useEffect(() => {
    activePromptRef.current = activePrompt;
  }, [activePrompt]);

  // Keep sensitivity ref in sync so the interval always uses current value
  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  // BUG 5 FIX: settings ref for the same reason — the interval closure would
  // otherwise read the first render's settings forever, making the
  // Auto-detection toggle a no-op.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

  // ── App state listener — reset session on background ─────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (
        appStateRef.current === 'active' &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        // App went to background — start session timeout if session is active
        if (activePromptRef.current) {
          sessionBackgroundAtRef.current = Date.now();
          if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = setTimeout(() => {
            resetSession();
          }, SESSION_TIMEOUT_MS);
        }
      }
      if (nextState === 'active') {
        // App came back to foreground — reset immediately if timeout already elapsed,
        // otherwise cancel pending timeout.
        if (
          activePromptRef.current &&
          sessionBackgroundAtRef.current &&
          Date.now() - sessionBackgroundAtRef.current >= SESSION_TIMEOUT_MS
        ) {
          resetSession();
        } else if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
        sessionBackgroundAtRef.current = null;
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // ── Initialize ────────────────────────────────────────────────────────────
  useEffect(() => {
    let unsubscribe = () => {};
    if (Platform.OS === 'ios') {
      HealthKitService.initialize().then(ready => {
        setHealthKitReady(ready);
        if (ready) startRealMonitoring();
      });
      unsubscribe = WatchBridge.startListening(
        () => {
          console.log('[Selah] Watch -> Phone stress detected');
        },
        () => {
          console.log('[Selah] Watch -> Phone session completed');
        }
      );
    } else {
      startSimulatedDrift();
    }
    return () => {
      if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
      if (sessionTimeoutRef.current)  clearTimeout(sessionTimeoutRef.current);
      unsubscribe();
    };
  }, []);

  // ── Update baseline with calm readings ────────────────────────────────────
  const updateBaseline = (hrv, hr) => {
    const b = baselineRef.current;
    if (hrv !== null && hr !== null) {
      const n = b.sampleCount + 1;
      baselineRef.current = {
        hrv: n < 5 ? (b.hrv * b.sampleCount + hrv) / n
                   : b.hrv * 0.85 + hrv * 0.15,
        hr:  n < 5 ? (b.hr  * b.sampleCount + hr)  / n
                   : b.hr  * 0.85 + hr  * 0.15,
        sampleCount: Math.min(n, 100),
      };
    }
  };

  // ── Real HealthKit monitoring (iOS) ──────────────────────────────────────
  const startRealMonitoring = () => {
    if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);

    monitorIntervalRef.current = setInterval(async () => {
      if (simulatingRef.current) return;

      // BUG 1 FIX: checkStress returns { hrv, hr, isActive } only.
      // isStressed and stressIndex no longer exist on the result object.
      // Removed the broken destructure of isStressed / result.stressIndex.
      const {hrv, hr, isActive} = await HealthKitService.checkStress();

      // BUG 7 FIX: persistence tracks elevated physiology (any HRV/HR points),
      // updated BEFORE the full score so its +1 applies from the 2nd check.
      const physio = calculatePhysioScore({
        hrv,
        hr,
        baseline:         baselineRef.current,
        sensitivityLevel: sensitivityRef.current,
      });
      if (physio.score >= 2) {
        persistenceRef.current += 1;
      } else {
        persistenceRef.current = 0;
      }

      const {score, reasons} = assembleStressScore({
        physio,
        isActive,
        persistenceCount: persistenceRef.current,
      });

      // BUG 1 FIX: baseline updated when score < 5 (calm reading).
      // BUG 6 FIX: ...and never during a workout — workout readings capped at
      // score 4 used to pass this gate and drag the baseline toward workout
      // HR/HRV. Mirrors HealthManager.swift evaluateStress().
      if (score < 5 && isActive !== true) {
        updateBaseline(hrv, hr);
      }

      // BUG 1 FIX: stressIndex derived from score, not from result.stressIndex
      // (which was undefined). Scaled so score=5 → ~80, score=0 → ~0.
      const derivedStressIndex = Math.min(100, Math.round((score / 5) * 80));

      setBiometrics(prev => ({
        ...prev,
        hr:          hr  ?? prev.hr,
        hrv:         hrv ?? prev.hrv,
        stressIndex: derivedStressIndex,
        isResting:   isActive === false,
      }));


      // Update debug info
      setDebugInfo({
        currentHR:         hr,
        currentHRV:        hrv,
        baselineHR:        Math.round(baselineRef.current.hr),
        baselineHRV:       Math.round(baselineRef.current.hrv),
        score,
        reasons,
        blocked:           isActive === true,
      });

      // Respect autoDetect setting
      // BUG 5 FIX: read through settingsRef, not the stale `settings` closure.
      if (!settingsRef.current.autoDetect) return;

      // BUG 2 FIX: use activePromptRef (current value) not activePrompt (stale closure).
      // BUG 7 FIX: persistence is a hard gate — 2+ consecutive elevated checks
      // (≈60s) — and the workout gate is explicit, since persistence can now
      // accumulate while isActive is true.
      if (
        score >= 5 &&
        persistenceRef.current >= 2 &&
        isActive !== true &&
        !simulatingRef.current &&
        !activePromptRef.current
      ) {
        triggerIntervention();
      }
    }, 30000); // Check every 30 seconds
  };

  // ── Simulated drift (Android / no HealthKit) ──────────────────────────────
  const startSimulatedDrift = () => {
    if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
    monitorIntervalRef.current = setInterval(() => {
      if (simulatingRef.current) return;
      setBiometrics(prev => ({
        ...prev,
        hr:          clamp(prev.hr  + (Math.random() - 0.5) * 3, 62, 82),
        hrv:         clamp(prev.hrv + (Math.random() - 0.5) * 4, 35, 65),
        stressIndex: clamp(prev.stressIndex + (Math.random() - 0.5) * 3, 15, 35),
      }));
    }, 2500);
  };

  // ── Trigger intervention ──────────────────────────────────────────────────
  const triggerIntervention = (onPeak) => {
    const prompts = isSecular ? secularPrompts : faithPrompts;
    const prompt  = prompts[Math.floor(Math.random() * prompts.length)];
    setActivePrompt(prompt);
    sessionStartRef.current = new Date();
    persistenceRef.current  = 0;

    // BUG 4a FIX: start session timeout immediately on trigger.
    // Previously only the AppState background transition started the timeout,
    // so sessions triggered while the app was active never auto-reset.
    if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    sessionBackgroundAtRef.current = null;
    sessionTimeoutRef.current = setTimeout(() => {
      resetSession();
    }, SESSION_TIMEOUT_MS);

    if (onPeak) onPeak(prompt);
    return prompt;
  };

  // ── Simulate stress (testing) ─────────────────────────────────────────────
  const simulateStress = (onPeak) => {
    simulatingRef.current = true;
    setIsStressSimulating(true);
    let step = 0;
    const ramp = setInterval(() => {
      step++;
      setBiometrics(prev => ({
        ...prev,
        hr:          Math.min(98, 72 + step * 4),
        hrv:         Math.max(20, 48 - step * 4),
        stressIndex: Math.min(82, 24 + step * 8),
        isResting:   true,
      }));
      if (step >= 7) {
        clearInterval(ramp);
        triggerIntervention(onPeak);
      }
    }, 220);
  };

  // ── Resolve stress (session completed naturally) ──────────────────────────
  const resolveStress = () => {
    simulatingRef.current = false;
    setIsStressSimulating(false);
    setActivePrompt(null);
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }

    if (Platform.OS === 'ios' && sessionStartRef.current) {
      HealthKitService.saveMindfulSession(sessionStartRef.current, new Date());
      sessionStartRef.current = null;
    }

    let step = 0;
    const ramp = setInterval(() => {
      step++;
      setBiometrics(prev => ({
        ...prev,
        hr:          Math.max(64, prev.hr - 4),
        hrv:         Math.min(52, prev.hrv + 3),
        stressIndex: Math.max(20, prev.stressIndex - 8),
      }));
      if (step >= 8) clearInterval(ramp);
    }, 350);
  };

  // ── Reset session (timeout / background / manual end) ────────────────────
  const resetSession = () => {
    // BUG 4b FIX: clear the timeout at the top of resetSession so a naturally
    // expired timeout doesn't leave a dangling handle that fires against a
    // subsequent new session.
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    simulatingRef.current = false;
    setIsStressSimulating(false);
    setActivePrompt(null);
    sessionStartRef.current = null;
    persistenceRef.current  = 0;
    sessionBackgroundAtRef.current = null;
    console.log('[Selah] Session reset due to timeout/background/manual');
  };

  const toggleMode = () => {
    setIsSecular(v => {
      const newVal = !v;
      WatchBridge.sendModeToWatch(newVal);
      return newVal;
    });
  };

  const getPrompts = () => isSecular ? secularPrompts : faithPrompts;

  return (
    <AppContext.Provider value={{
      isSecular,
      toggleMode,
      biometrics,
      isStressSimulating,
      activePrompt,
      healthKitReady,
      debugInfo,
      getPrompts,
      simulateStress,
      resolveStress,
      resetSession,
      // BUG 3 FIX: expose settings state to SettingsScreen
      sensitivity,
      setSensitivity,
      settings,
      updateSetting,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}