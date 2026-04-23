// src/context/AppContext.js
import React, {createContext, useContext, useState, useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import HealthKitService from '../services/HealthKitService';
import WatchBridge from '../services/WatchBridge';


const AppContext = createContext(null);

// ── Faith Prompts — 20 Verses ─────────────────────────────────────────────────
export const faithPrompts = [
  {source: 'Psalm 46:10',        closing: 'God is GOD',                              breathe: {inhale: 'I am still',              hold: 'I know',                exhale: 'You are GOD'}},
  {source: 'Isaiah 26:3',        closing: "God's peace is yours",                    breathe: {inhale: 'I return to you',         hold: 'I trust you',           exhale: 'I am safe with you'}},
  {source: 'Philippians 4:7',    closing: 'God is guarding your heart and mind',     breathe: {inhale: 'Your peace surrounds me', hold: 'You are with me',       exhale: 'I am safe… I can rest.'}},
  {source: 'John 16:33',         closing: 'Jesus has overcome',                      breathe: {inhale: 'I turn my eyes to you',   hold: 'You have overcome',     exhale: 'You are my peace'}},
  {source: 'Psalm 23:4',         closing: 'God is with you',                         breathe: {inhale: 'I am not alone',          hold: 'I will not fear',       exhale: 'You are with me'}},
  {source: 'Isaiah 41:10',       closing: 'The Lord is with you. You are not alone', breathe: {inhale: 'You are with me',         hold: 'You are my strength',   exhale: 'I am held'}},
  {source: 'Deuteronomy 31:6',   closing: 'The Lord will never fail you',            breathe: {inhale: 'You go before',           hold: 'You are dependable',    exhale: 'You are faithful'}},
  {source: 'Psalm 91:15',        closing: 'God is with you',                         breathe: {inhale: 'You hear me',             hold: 'You are with me',       exhale: 'I am not alone'}},
  {source: 'Proverbs 3:5–6',     closing: 'Trust in the Lord',                       breathe: {inhale: 'I trust you',             hold: 'You are leading me',    exhale: 'It will be okay'}},
  {source: '1 Peter 5:7',        closing: 'The Lord cares about you',                breathe: {inhale: 'You see me',              hold: 'You know me',           exhale: 'You care about me'}},
  {source: 'Jeremiah 17:7',      closing: 'The Lord is holding you',                 breathe: {inhale: 'My trust is in you',      hold: 'You are my hope',       exhale: 'I am held'}},
  {source: '2 Corinthians 12:9', closing: "God's grace is enough for you",           breathe: {inhale: 'You are strong',          hold: 'Your strength carries me', exhale: 'Your grace is enough'}},
  {source: 'Jeremiah 29:11',     closing: "God's plans for you are good",            breathe: {inhale: 'You know everything about me', hold: 'You hold my future', exhale: 'I can trust you'}},
  {source: 'Isaiah 40:31',       closing: 'The Lord renews your strength',           breathe: {inhale: 'You are my hope',         hold: 'You renew my strength', exhale: 'I will not grow weary'}},
  {source: 'Isaiah 43:2–3',      closing: 'God is with you. Always.',                breathe: {inhale: 'You are with me',         hold: 'You cover me',          exhale: 'I am not alone'}},
  {source: 'Psalm 42:11',        closing: 'The Lord is your hope',                   breathe: {inhale: 'You are my hope',         hold: 'You are my God',        exhale: 'I trust you'}},
  {source: 'Psalm 139:17',       closing: "God's thoughts are full of you",          breathe: {inhale: 'You think of me',         hold: 'You care for me',       exhale: 'I am precious to You'}},
  {source: 'Psalm 62:6',         closing: 'The Lord is your refuge',                 breathe: {inhale: 'You are my rock',         hold: 'You are my fortress',   exhale: 'I am safe with You'}},
  {source: 'Psalm 94:19',        closing: 'The Lord fills you with His joy',         breathe: {inhale: 'You comfort me',          hold: 'You steady me',         exhale: 'Your joy fills my heart'}},
  {source: 'Jeremiah 33:3',      closing: 'The Lord hears you',                      breathe: {inhale: 'You hear me',             hold: 'You answer me',         exhale: 'I can call on you'}},
];

export const secularPrompts = [
  {source: 'Mindfulness',   closing: 'Carry this calm forward',        breathe: {inhale: 'I am calm',     hold: 'I am present',  exhale: 'I release tension'}},
  {source: 'Affirmation',   closing: 'This moment is enough',          breathe: {inhale: 'I breathe in',  hold: 'stillness',     exhale: 'I let go'}},
  {source: 'Reflection',    closing: 'You are grounded',               breathe: {inhale: 'I am here',     hold: 'right now',     exhale: 'That is enough'}},
  {source: 'Mindfulness',   closing: 'Return to this breath anytime',  breathe: {inhale: 'I anchor',      hold: 'to now',        exhale: 'I am grounded'}},
  {source: 'Viktor Frankl', closing: 'You chose stillness',            breathe: {inhale: 'I pause',       hold: 'I choose',      exhale: 'I respond'}},
  {source: 'Dan Millman',   closing: 'Thoughts pass. You remain.',     breathe: {inhale: 'I observe',     hold: 'with calm',     exhale: 'Thoughts pass'}},
];

export function AppProvider({children}) {
  const [isSecular,          setIsSecular]          = useState(false);
  const [isStressSimulating, setIsStressSimulating] = useState(false);
  const [activePrompt,       setActivePrompt]       = useState(null);
  const [healthKitReady,     setHealthKitReady]     = useState(false);
  const [biometrics,         setBiometrics]         = useState({
    hr: 72, hrv: 48, temp: 0.1, stressIndex: 24, isResting: true,
  });

  const simulatingRef    = useRef(false);
  const monitorIntervalRef = useRef(null);
  const sessionStartRef  = useRef(null);

  // ── Initialize HealthKit on iOS ───────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'ios') {
      HealthKitService.initialize().then(ready => {
        setHealthKitReady(ready);
        if (ready) {
          console.log('[Selah] HealthKit ready — starting real monitoring');
          startRealMonitoring();
        }
      });
    } else {
      // Android — simulated biometric drift
      startSimulatedDrift();
    }
    return () => {
      if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
    };
  }, []);

  // ── Real HealthKit monitoring (iOS) ──────────────────────────────────────
  const startRealMonitoring = () => {
    if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);

    // Check every 60 seconds on iOS (battery-conscious)
    monitorIntervalRef.current = setInterval(async () => {
      if (simulatingRef.current) return;

      const result = await HealthKitService.checkStress();

      setBiometrics(prev => ({
        ...prev,
        hr:          result.hr  ?? prev.hr,
        hrv:         result.hrv ?? prev.hrv,
        stressIndex: result.stressIndex,
        isResting:   true,
      }));

      // Auto-trigger intervention if stressed and no active session
      if (result.isStressed && !simulatingRef.current && !activePrompt) {
        console.log('[Selah] Stress detected:', result.reason);
        triggerIntervention();
      }
    }, 60000);
  };

  // ── Simulated drift (Android) ────────────────────────────────────────────
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

  // ── Pick a random prompt ─────────────────────────────────────────────────
  const pickPrompt = () => {
    const prompts = isSecular ? secularPrompts : faithPrompts;
    return prompts[Math.floor(Math.random() * prompts.length)];
  };

  // ── Trigger intervention (real or simulated) ─────────────────────────────
  const triggerIntervention = (onPeak) => {
    const prompt = pickPrompt();
    setActivePrompt(prompt);
    sessionStartRef.current = new Date();
    if (onPeak) onPeak(prompt);
    return prompt;
  };

  // ── Simulate stress (for testing) ───────────────────────────────────────
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

  // ── Resolve stress after session ─────────────────────────────────────────
  const resolveStress = () => {
    simulatingRef.current = false;
    setIsStressSimulating(false);
    setActivePrompt(null);

    // Save mindful session to Apple Health
    if (Platform.OS === 'ios' && sessionStartRef.current) {
      HealthKitService.saveMindfulSession(sessionStartRef.current, new Date());
      sessionStartRef.current = null;
    }

    // Ramp biometrics back down
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

const toggleMode = () => {
  setIsSecular(v => {
    const newVal = !v;
    WatchBridge.sendModeToWatch(newVal);
    return newVal;
  });
};
  const getPrompts  = () => isSecular ? secularPrompts : faithPrompts;

  return (
    <AppContext.Provider value={{
      isSecular,
      toggleMode,
      biometrics,
      isStressSimulating,
      activePrompt,
      healthKitReady,
      getPrompts,
      simulateStress,
      resolveStress,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
