// src/screens/BreatheScreen.js
import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Easing,
} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import {useApp} from '../context/AppContext';
import {Colors, Spacing, Radius, Typography} from '../theme';
import {GhostButton} from '../components';

const CYCLES = 3;
const PHASES = [
  {name: 'Inhale', duration: 4, scriptureKey: 'inhale'},
  {name: 'Hold', duration: 4, scriptureKey: 'hold'},
  {name: 'Exhale', duration: 6, scriptureKey: 'exhale'},
];
const CIRCUMFERENCE = 2 * Math.PI * 100; // r=100

// Animated circle wrapper
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function BreatheScreen({navigation, route}) {
  const {isSecular, resolveStress} = useApp();
  const prompt = route.params?.prompt;

  const accent = isSecular ? Colors.secularPrimary : Colors.faithPrimary;

  const [phase, setPhase] = useState(0);       // 0=inhale 1=hold 2=exhale
  const [cycle, setCycle] = useState(0);       // 0-2
  const [countdown, setCountdown] = useState(PHASES[0].duration);
  const [scripture, setScripture] = useState(prompt?.breathe?.inhale || 'Breathe...');
  const [done, setDone] = useState(false);

  // Animated values
  const ringProgress = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(0.35)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const countdownOpacity = useRef(new Animated.Value(1)).current;

  const phaseRef = useRef(0);
  const cycleRef = useRef(0);
  const timerRef = useRef(null);
  const animRef = useRef(null);
  const mountedRef = useRef(true);

  // Entrance animation
  useEffect(() => {
    Animated.timing(textOpacity, {toValue: 1, duration: 600, useNativeDriver: true}).start();
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (animRef.current) animRef.current.stop();
    };
  }, []);

  const runPhase = useCallback((phaseIdx, cycleIdx) => {
    if (!mountedRef.current) return;

    const p = PHASES[phaseIdx];
    const breathe = prompt?.breathe || {};
    const scriptureText = breathe[p.scriptureKey] || p.name;

    // Update UI
    setPhase(phaseIdx);
    setCycle(cycleIdx);
    setCountdown(p.duration);
    setScripture(scriptureText);

    // Ring animation
    if (animRef.current) animRef.current.stop();
    ringProgress.setValue(0);
    const ringAnim = Animated.timing(ringProgress, {
      toValue: 1,
      duration: p.duration * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    ringAnim.start();
    animRef.current = ringAnim;

    // Bubble scale
    Animated.timing(bubbleScale, {
      toValue: phaseIdx === 0 ? 1 : phaseIdx === 1 ? 1 : 0.35,
      duration: p.duration * 1000,
      easing: Easing.inOut(Easing.sine),
      useNativeDriver: true,
    }).start();

    // Countdown
    let count = p.duration;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      count--;
      if (!mountedRef.current) return;
      if (count >= 0) setCountdown(count);
      if (count <= 0) {
        clearInterval(timerRef.current);
        // Advance
        const nextPhase = (phaseIdx + 1) % PHASES.length;
        const nextCycle = nextPhase === 0 ? cycleIdx + 1 : cycleIdx;
        if (nextPhase === 0 && nextCycle >= CYCLES) {
          // All done
          if (mountedRef.current) setDone(true);
          setTimeout(() => {
            if (mountedRef.current) {
              resolveStress();
              navigation.replace('Done');
            }
          }, 1200);
        } else {
          runPhase(nextPhase, nextCycle);
        }
      }
    }, 1000);
  }, [prompt, ringProgress, bubbleScale]);

  useEffect(() => {
    runPhase(0, 0);
  }, []);

  const handleSkip = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animRef.current) animRef.current.stop();
    resolveStress();
    navigation.replace('Done');
  };

  const currentPhase = PHASES[phase];
  const phaseColor = phase === 2 ? Colors.secularPrimary : accent;

  const strokeDashoffset = ringProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const phaseLabels = {0: 'Inhale', 1: 'Hold', 2: 'Exhale'};
  const phaseColors = {
    0: accent,
    1: Colors.warning,
    2: isSecular ? Colors.secularPrimary : Colors.faithSoft,
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Ambient bubble fill */}
      <Animated.View
        style={[
          styles.ambientBubble,
          {
            backgroundColor: accent,
            transform: [{scale: bubbleScale}],
            opacity: bubbleScale.interpolate({inputRange: [0.35, 1], outputRange: [0.03, 0.08]}),
          },
        ]}
      />

      <Animated.View style={[styles.content, {opacity: textOpacity}]}>

        {/* Header */}
        <Text style={[styles.title, {color: accent}]}>SELAH</Text>
        <Text style={styles.subtitle}>Guided Breathing · Cycle {cycle + 1} of {CYCLES}</Text>

        {/* Cycle dots */}
        <View style={styles.cycleDots}>
          {[...Array(CYCLES)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.cycleDot,
                i < cycle ? {backgroundColor: accent} :
                i === cycle ? {backgroundColor: accent, opacity: 0.6} :
                {backgroundColor: Colors.textDimmer},
              ]}
            />
          ))}
        </View>

        {/* Ring + Bubble */}
        <View style={styles.ringWrap}>
          {/* Animated bubble */}
          <Animated.View
            style={[
              styles.innerBubble,
              {
                backgroundColor: accent,
                transform: [{scale: bubbleScale}],
                opacity: bubbleScale.interpolate({inputRange: [0.35, 1], outputRange: [0.15, 0.25]}),
              },
            ]}
          />

          {/* SVG ring */}
          <Svg width={240} height={240} style={styles.ringsvg}>
            {/* Background track */}
            <Circle
              cx="120"
              cy="120"
              r="100"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={3}
              fill="none"
            />
            {/* Progress */}
            <AnimatedCircle
              cx="120"
              cy="120"
              r="100"
              stroke={phaseColors[phase]}
              strokeWidth={3}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin="120,120"
            />
          </Svg>

          {/* Center content */}
          <View style={styles.ringCenter}>
            <Text style={[styles.phaseLabel, {color: phaseColors[phase]}]}>
              {phaseLabels[phase].toUpperCase()}
            </Text>
            <Text style={styles.countdown}>{countdown}</Text>
          </View>
        </View>

        {/* Scripture text */}
        <View style={styles.scriptureBox}>
          <Text style={styles.scriptureText}>{scripture}</Text>
        </View>

        {/* Phase progress bar */}
        <View style={styles.phaseBar}>
          {PHASES.map((p, i) => (
            <View
              key={i}
              style={[
                styles.phaseSegment,
                i < phase ? {backgroundColor: accent} :
                i === phase ? {backgroundColor: phaseColors[phase]} :
                {backgroundColor: Colors.textDimmer},
              ]}
            />
          ))}
        </View>
        <View style={styles.phaseBarLabels}>
          {PHASES.map((p, i) => (
            <Text
              key={i}
              style={[styles.phaseBarLabel, i === phase && {color: phaseColors[phase]}]}>
              {p.name.toUpperCase()}
            </Text>
          ))}
        </View>

        {/* Breathing ratio */}
        <Text style={styles.ratioText}>4 · 4 · 6 breathing pattern</Text>

        {/* Skip */}
        <GhostButton label="Skip" onPress={handleSkip} style={styles.skipBtn} />

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientBubble: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '300',
    letterSpacing: 7,
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.labelSm,
    color: Colors.textDim,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  cycleDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  cycleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ringWrap: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  innerBubble: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  ringsvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  countdown: {
    fontSize: 56,
    fontWeight: '200',
    color: Colors.text,
    lineHeight: 64,
  },
  scriptureBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    width: '100%',
    minHeight: 52,
    justifyContent: 'center',
  },
  scriptureText: {
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '300',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  phaseBar: {
    flexDirection: 'row',
    gap: 4,
    width: '80%',
    marginBottom: 6,
  },
  phaseSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  phaseBarLabels: {
    flexDirection: 'row',
    width: '80%',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  phaseBarLabel: {
    fontSize: 7,
    fontWeight: '600',
    letterSpacing: 1,
    color: Colors.textDimmer,
  },
  ratioText: {
    ...Typography.labelXs,
    color: Colors.textDimmer,
    letterSpacing: 1.5,
    marginBottom: 24,
    textTransform: 'uppercase',
  },
  skipBtn: {
    paddingHorizontal: 32,
  },
});
