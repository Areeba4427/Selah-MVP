// src/context/AppContext.js
import React, {createContext, useContext, useState, useEffect, useRef} from 'react';

const AppContext = createContext(null);

export const faithPrompts = [
  {
    text: '"Peace I leave with you; my peace I give to you."',
    source: 'John 14:27',
    breathe: {inhale: 'I am still...', hold: 'I know...', exhale: 'You are God.'},
  },
  {
    text: '"Be still and know that I am God."',
    source: 'Psalm 46:10',
    breathe: {inhale: 'Be still...', hold: 'and know...', exhale: 'He is God.'},
  },
  {
    text: '"Cast all your anxiety on him because he cares for you."',
    source: '1 Peter 5:7',
    breathe: {inhale: 'I release...', hold: 'to Him...', exhale: 'He holds me.'},
  },
  {
    text: '"The Lord is my shepherd; I shall not want."',
    source: 'Psalm 23:1',
    breathe: {inhale: 'He leads...', hold: 'me still...', exhale: 'I am safe.'},
  },
  {
    text: '"Do not be anxious about anything, but in every situation pray."',
    source: 'Philippians 4:6',
    breathe: {inhale: 'I breathe in...', hold: 'His grace...', exhale: 'Anxiety gone.'},
  },
  {
    text: '"Come to me, all you who are weary, and I will give you rest."',
    source: 'Matthew 11:28',
    breathe: {inhale: 'I come...', hold: 'to rest...', exhale: 'I am renewed.'},
  },
];

export const secularPrompts = [
  {
    text: '"Inhale the present. Exhale the past."',
    source: 'Mindfulness',
    breathe: {inhale: 'I am calm...', hold: 'I am present...', exhale: 'I release tension.'},
  },
  {
    text: '"This moment is enough. You are enough."',
    source: 'Affirmation',
    breathe: {inhale: 'I breathe in...', hold: 'stillness...', exhale: 'I let go.'},
  },
  {
    text: '"Stillness is not emptiness — it is wholeness."',
    source: 'Reflection',
    breathe: {inhale: 'I am here...', hold: 'right now...', exhale: 'That is enough.'},
  },
  {
    text: '"Your breath is an anchor to the present moment."',
    source: 'Mindfulness',
    breathe: {inhale: 'I anchor...', hold: 'to now...', exhale: 'I am grounded.'},
  },
  {
    text: '"Between stimulus and response there is a space. That space is peace."',
    source: 'Viktor Frankl',
    breathe: {inhale: 'I pause...', hold: 'I choose...', exhale: 'I respond.'},
  },
  {
    text: '"You don\'t have to control your thoughts. Just stop letting them control you."',
    source: 'Dan Millman',
    breathe: {inhale: 'I observe...', hold: 'with calm...', exhale: 'Thoughts pass.'},
  },
];

export function AppProvider({children}) {
  const [isSecular, setIsSecular] = useState(false);
  const [biometrics, setBiometrics] = useState({
    hr: 72,
    hrv: 48,
    temp: 0.1,
    stressIndex: 24,
    isResting: true,
  });
  const [isStressSimulating, setIsStressSimulating] = useState(false);
  const [activePrompt, setActivePrompt] = useState(null);

  const biometricRef = useRef(biometrics);
  biometricRef.current = biometrics;

  const simulatingRef = useRef(false);

  // Gentle idle drift
  useEffect(() => {
    const interval = setInterval(() => {
      if (simulatingRef.current) return;
      setBiometrics(prev => ({
        ...prev,
        hr: clamp(prev.hr + (Math.random() - 0.5) * 3, 62, 82),
        hrv: clamp(prev.hrv + (Math.random() - 0.5) * 4, 35, 65),
        stressIndex: clamp(prev.stressIndex + (Math.random() - 0.5) * 3, 15, 35),
      }));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const toggleMode = () => setIsSecular(v => !v);

  const getPrompts = () => (isSecular ? secularPrompts : faithPrompts);

  const simulateStress = (onPeak) => {
    simulatingRef.current = true;
    setIsStressSimulating(true);
    let step = 0;
    const ramp = setInterval(() => {
      step++;
      setBiometrics(prev => ({
        ...prev,
        hr: Math.min(98, 72 + step * 4),
        hrv: Math.max(20, 48 - step * 4),
        temp: Math.min(0.7, 0.1 + step * 0.08),
        stressIndex: Math.min(82, 24 + step * 8),
        isResting: true,
      }));
      if (step >= 7) {
        clearInterval(ramp);
        const prompts = isSecular ? secularPrompts : faithPrompts;
        const prompt = prompts[Math.floor(Math.random() * prompts.length)];
        setActivePrompt(prompt);
        if (onPeak) onPeak(prompt);
      }
    }, 220);
  };

  const resolveStress = () => {
    simulatingRef.current = false;
    setIsStressSimulating(false);
    let step = 0;
    const ramp = setInterval(() => {
      step++;
      setBiometrics(prev => ({
        ...prev,
        hr: Math.max(64, prev.hr - 4),
        hrv: Math.min(52, prev.hrv + 3),
        temp: Math.max(0.1, prev.temp - 0.08),
        stressIndex: Math.max(20, prev.stressIndex - 8),
      }));
      if (step >= 8) clearInterval(ramp);
    }, 350);
  };

  return (
    <AppContext.Provider
      value={{
        isSecular,
        toggleMode,
        biometrics,
        isStressSimulating,
        activePrompt,
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
