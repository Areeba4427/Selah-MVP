// src/screens/DoneScreen.js
import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import {useApp} from '../context/AppContext';
import {Colors, Spacing, Radius, Typography} from '../theme';
import {PrimaryButton, HeartbeatIcon} from '../components';

export default function DoneScreen({navigation}) {
  const {isSecular, biometrics} = useApp();
  const accent = isSecular ? Colors.secularPrimary : Colors.faithPrimary;

  const checkScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(checkScale, {toValue: 1, tension: 120, friction: 7, useNativeDriver: true}),
      Animated.timing(cardOpacity, {toValue: 1, duration: 500, useNativeDriver: true}),
      Animated.timing(statsOpacity, {toValue: 1, duration: 500, useNativeDriver: true}),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {toValue: 1, duration: 2000, useNativeDriver: true}),
        Animated.timing(glowAnim, {toValue: 0, duration: 2000, useNativeDriver: true}),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const hrAfter = Math.max(58, Math.round(biometrics.hr));
  const hrDrop = Math.round(Math.random() * 6 + 10);
  const hrvGain = Math.round(Math.random() * 8 + 6);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Ambient glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: Colors.success,
            opacity: glowAnim.interpolate({inputRange: [0, 1], outputRange: [0.03, 0.07]}),
          },
        ]}
      />

      <View style={styles.content}>

        {/* Check mark */}
        <Animated.View style={[styles.checkWrap, {transform: [{scale: checkScale}]}]}>
          <Text style={styles.checkIcon}>✦</Text>
          <View style={[styles.checkRing, {borderColor: accent + '50'}]} />
        </Animated.View>

        <Text style={[styles.title, {color: accent}]}>Well done</Text>
        <Text style={styles.subtitle}>3 cycles complete · Session ended</Text>

        {/* Stats */}
        <Animated.View style={[styles.statsRow, {opacity: statsOpacity}]}>
          <StatBlock
            label="Heart Rate"
            before={`${hrAfter + hrDrop} bpm`}
            after={`${hrAfter} bpm`}
            delta={`↓ ${hrDrop} bpm`}
            deltaColor={Colors.success}
          />
          <View style={styles.statDivider} />
          <StatBlock
            label="HRV"
            before={`${Math.round(biometrics.hrv - hrvGain)} ms`}
            after={`${Math.round(biometrics.hrv)} ms`}
            delta={`↑ ${hrvGain} ms`}
            deltaColor={Colors.success}
          />
        </Animated.View>

        {/* Message */}
        <Animated.View style={[styles.messageBox, {opacity: cardOpacity, borderColor: accent + '25'}]}>
          <Text style={styles.messageText}>
            {isSecular
              ? '"Your breath returned to stillness. Carry this calm forward."'
              : '"The peace of God, which transcends all understanding, will guard your heart."'}
          </Text>
          <Text style={[styles.messageSource, {color: accent}]}>
            {isSecular ? '— Mindfulness Practice' : '— Philippians 4:7'}
          </Text>
        </Animated.View>

        {/* Haptic pattern recap */}
        <View style={styles.hapticRecap}>
          <Text style={styles.hapticTitle}>SELAH SIGNATURE HAPTIC</Text>
          <View style={styles.hapticBars}>
            {hapticData.map((bar, i) => (
              <View
                key={i}
                style={[
                  styles.hapticBar,
                  {height: bar.h, backgroundColor: accent, opacity: bar.op},
                ]}
              />
            ))}
          </View>
          <Text style={styles.hapticLabel}>Heartbeat · Pause · Exhale Wave · ~1.1s</Text>
        </View>

        {/* Action */}
        <PrimaryButton
          label="Return Home"
          accent={accent}
          onPress={() => navigation.popToTop()}
          style={styles.homeBtn}
        />

        <Text style={styles.footerNote}>
          Next check-in in ~25 min · HRV monitoring resumed
        </Text>
      </View>
    </View>
  );
}

function StatBlock({label, before, after, delta, deltaColor}) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statBefore}>{before}</Text>
      <Text style={styles.statArrow}>↓</Text>
      <Text style={styles.statAfter}>{after}</Text>
      <Text style={[styles.statDelta, {color: deltaColor}]}>{delta}</Text>
    </View>
  );
}

const hapticData = [
  {h: 28, op: 1},
  {h: 8, op: 0.2},
  {h: 22, op: 1},
  {h: 6, op: 0.15},
  {h: 38, op: 1},
  {h: 32, op: 0.9},
  {h: 26, op: 0.75},
  {h: 18, op: 0.55},
  {h: 12, op: 0.35},
  {h: 7, op: 0.2},
  {h: 4, op: 0.1},
];

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: -250,
    width: 600,
    height: 600,
    borderRadius: 300,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },
  checkWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  checkIcon: {
    fontSize: 36,
    color: Colors.success,
  },
  checkRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '200',
    letterSpacing: 4,
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.labelSm,
    color: Colors.textDim,
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    width: '100%',
    marginBottom: 16,
    gap: 0,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Colors.textDim,
    marginBottom: 4,
  },
  statBefore: {
    fontSize: 12,
    color: Colors.textDim,
    textDecorationLine: 'line-through',
  },
  statArrow: {
    fontSize: 10,
    color: Colors.success,
  },
  statAfter: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  statDelta: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  messageBox: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: 20,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  messageText: {
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '300',
    color: Colors.text,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  messageSource: {
    ...Typography.labelXs,
    textAlign: 'center',
    letterSpacing: 1,
  },
  hapticRecap: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  hapticTitle: {
    ...Typography.labelXs,
    color: Colors.textDimmer,
    marginBottom: 8,
    letterSpacing: 1.5,
  },
  hapticBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 44,
    marginBottom: 6,
  },
  hapticBar: {
    width: 10,
    borderRadius: 2,
  },
  hapticLabel: {
    fontSize: 8,
    color: Colors.textDimmer,
    letterSpacing: 1,
  },
  homeBtn: {
    width: '100%',
    marginBottom: 16,
  },
  footerNote: {
    ...Typography.labelXs,
    color: Colors.textDimmer,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
