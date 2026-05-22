// src/screens/BreatheScreen.js
//
// Change from previous version:
//   Phase haptics added to runPhase — mirrors BreatheView.swift switch phaseIdx:
//     Inhale → HapticService.inhaleStart()   (Watch: playInhaleStart)
//     Hold   → silence                        (Watch: no haptic, intentional)
//     Exhale → HapticService.exhaleStart()   (Watch: playExhaleStart)

import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Easing,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useApp} from '../context/AppContext';
import HapticService from '../services/HapticService';

const CYCLES = 3;
const PHASES = [
  {name: 'Inhale', duration: 4, key: 'inhale'},
  {name: 'Hold',   duration: 4, key: 'hold'},
  {name: 'Exhale', duration: 6, key: 'exhale'},
];

const CIRCLE_FULL  = 1.0;
const CIRCLE_SMALL = 0.42;

export default function BreatheScreen({navigation, route}) {
  const {resolveStress, settings} = useApp();
  const prompt = route.params?.prompt;

  const [phase,      setPhase]      = useState(0);
  const [phrase,     setPhrase]     = useState(prompt?.breathe?.inhale || 'Breathe...');
  const [showEndBtn, setShowEndBtn] = useState(false);

  const circleScale   = useRef(new Animated.Value(CIRCLE_SMALL)).current;
  const circleOpacity = useRef(new Animated.Value(0.4)).current;
  const glowScale     = useRef(new Animated.Value(CIRCLE_SMALL)).current;
  const glowOpacity   = useRef(new Animated.Value(0.10)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;

  const mountedRef = useRef(true);
  const timerRef   = useRef(null);
  const circleAnim = useRef(null);

  useEffect(() => {
    Animated.timing(screenOpacity, {toValue: 1, duration: 1000, useNativeDriver: true}).start();
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (circleAnim.current) circleAnim.current.stop();
    };
  }, []);

  const runPhase = useCallback(
    (phaseIdx, cycleIdx) => {
      if (!mountedRef.current) return;
      const p     = PHASES[phaseIdx];
      const text  = prompt?.breathe?.[p.key] || p.name;
      const durMs = p.duration * 1000;

      setPhase(phaseIdx);
      setPhrase(text);

      // ── Phase haptics — mirrors BreatheView.swift switch phaseIdx ──────────
      // Hold (phaseIdx === 1) = silence, intentional — no call made
      if (settings?.hapticsEnabled) {
        if (phaseIdx === 0) HapticService.inhaleStart();
        if (phaseIdx === 2) HapticService.exhaleStart();
      }

      const targetCircle   = phaseIdx === 2 ? CIRCLE_SMALL : CIRCLE_FULL;
      const targetCircleOp = phaseIdx === 2 ? 0.28 : phaseIdx === 1 ? 0.55 : 0.65;
      const targetGlowSc   = phaseIdx === 2 ? CIRCLE_SMALL + 0.06 : CIRCLE_FULL + 0.35;
      const targetGlowOp   = phaseIdx === 2 ? 0.05 : phaseIdx === 1 ? 0.20 : 0.25;

      if (circleAnim.current) circleAnim.current.stop();

      if (phaseIdx === 1) {
        const anim = Animated.parallel([
          Animated.timing(circleOpacity, {toValue: targetCircleOp, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
          Animated.timing(glowOpacity,   {toValue: targetGlowOp,   duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        ]);
        anim.start();
        circleAnim.current = anim;
      } else {
        const anim = Animated.parallel([
          Animated.timing(circleScale,   {toValue: targetCircle,   duration: durMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
          Animated.timing(circleOpacity, {toValue: targetCircleOp, duration: durMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
          Animated.timing(glowScale,     {toValue: targetGlowSc,   duration: durMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
          Animated.timing(glowOpacity,   {toValue: targetGlowOp,   duration: durMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        ]);
        anim.start();
        circleAnim.current = anim;
      }

      let count = p.duration;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        count--;
        if (!mountedRef.current) return;
        if (count <= 0) {
          clearInterval(timerRef.current);
          const nextPhase = (phaseIdx + 1) % PHASES.length;
          const nextCycle = nextPhase === 0 ? cycleIdx + 1 : cycleIdx;
          if (nextPhase === 0 && nextCycle >= CYCLES) {
            setTimeout(() => {
              if (mountedRef.current) {
                resolveStress();
                navigation.replace('Done', {closing: prompt?.closing});
              }
            }, 800);
          } else {
            runPhase(nextPhase, nextCycle);
          }
        }
      }, 1000);
    },
    [prompt, circleScale, circleOpacity, glowScale, glowOpacity, settings],
  );

  useEffect(() => {
    const t = setTimeout(() => runPhase(0, 0), 500);
    return () => clearTimeout(t);
  }, []);

  const handleEndSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (circleAnim.current) circleAnim.current.stop();
    resolveStress();
    navigation.popToTop();
  };

  return (
    <TouchableWithoutFeedback onLongPress={() => setShowEndBtn(true)} delayLongPress={1500}>
      <Animated.View style={[styles.root, {opacity: screenOpacity}]}>
        <StatusBar hidden />

        <LinearGradient
          colors={['#eceef6', '#d4d8ec', '#b8bedd', '#8e97c4', '#6870a8']}
          locations={[0, 0.22, 0.48, 0.74, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Phase label */}
        <Text style={styles.phaseLabel}>{PHASES[phase].name}</Text>

        {/* Circle */}
        <View style={styles.circleWrap}>
          <Animated.View style={[styles.outerGlow, {opacity: glowOpacity, transform: [{scale: glowScale}]}]} />
          <Animated.View style={[styles.core, {opacity: circleOpacity, transform: [{scale: circleScale}]}]} />
        </View>

        {/* Phrase */}
        <Text style={styles.phrase}>{phrase}</Text>

        {/* End session button — shown after long press */}
        {showEndBtn && (
          <TouchableOpacity onPress={handleEndSession} style={styles.endBtn}>
            <Text style={styles.endBtnText}>End Session</Text>
          </TouchableOpacity>
        )}

      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  phaseLabel: {
    position: 'absolute', top: '14%',
    fontSize: 15, fontWeight: '400', letterSpacing: 5,
    color: 'rgba(40,50,90,0.84)',
  },
  circleWrap: {width: 280, height: 280, alignItems: 'center', justifyContent: 'center'},
  outerGlow: {
    position: 'absolute', width: 380, height: 380, borderRadius: 190,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  core: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(245,252,255,0.72)',
  },
  phrase: {
    position: 'absolute', bottom: '11%',
    fontSize: 17, fontWeight: '400', fontStyle: 'italic',
    color: 'rgba(30,40,80,0.92)', textAlign: 'center',
    letterSpacing: 0.3, paddingHorizontal: 44, lineHeight: 26,
  },
  endBtn: {
    position: 'absolute', bottom: '4%',
    paddingVertical: 8, paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(160,64,64,0.20)',
    borderWidth: 1, borderColor: 'rgba(160,64,64,0.40)',
  },
  endBtnText: {fontSize: 12, color: '#a04040', fontWeight: '500', letterSpacing: 1},
});