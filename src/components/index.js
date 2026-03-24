// src/components/index.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import {Colors, Radius, Spacing, Typography} from '../theme';

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({children, style}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── SectionLabel ──────────────────────────────────────────────────────────────
export function SectionLabel({children, style}) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

// ── PrimaryButton ─────────────────────────────────────────────────────────────
export function PrimaryButton({label, onPress, accent, style}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[styles.primaryBtn, {backgroundColor: accent || Colors.faithPrimary}, style]}>
      <Text style={styles.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── GhostButton ───────────────────────────────────────────────────────────────
export function GhostButton({label, onPress, style}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.ghostBtn, style]}>
      <Text style={styles.ghostBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── ModeToggle ────────────────────────────────────────────────────────────────
export function ModeToggle({isSecular, onToggle}) {
  const translateX = React.useRef(new Animated.Value(isSecular ? 24 : 0)).current;

  React.useEffect(() => {
    Animated.spring(translateX, {
      toValue: isSecular ? 24 : 0,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  }, [isSecular, translateX]);

  const accent = isSecular ? Colors.secularPrimary : Colors.faithPrimary;

  return (
    <View style={styles.toggleWrap}>
      <Text style={[styles.toggleLabel, !isSecular && {color: Colors.faithPrimary}]}>FAITH</Text>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.9}
        style={[styles.toggleTrack, {borderColor: accent + '44'}]}>
        <Animated.View
          style={[styles.toggleKnob, {backgroundColor: accent, transform: [{translateX}]}]}
        />
      </TouchableOpacity>
      <Text style={[styles.toggleLabel, isSecular && {color: Colors.secularPrimary}]}>SECULAR</Text>
    </View>
  );
}

// ── BiometricRow ──────────────────────────────────────────────────────────────
export function BiometricRow({label, value, percent, isStress}) {
  const width = React.useRef(new Animated.Value(percent)).current;

  React.useEffect(() => {
    Animated.timing(width, {toValue: percent, duration: 800, useNativeDriver: false}).start();
  }, [percent, width]);

  const barColor = isStress ? Colors.danger : Colors.faithPrimary;

  return (
    <View style={styles.bioRow}>
      <Text style={styles.bioLabel}>{label}</Text>
      <View style={styles.bioTrack}>
        <Animated.View
          style={[
            styles.bioFill,
            {
              backgroundColor: barColor,
              width: width.interpolate({inputRange: [0, 100], outputRange: ['0%', '100%']}),
            },
          ]}
        />
      </View>
      <Text style={styles.bioValue}>{value}</Text>
    </View>
  );
}

// ── HeartbeatIcon ─────────────────────────────────────────────────────────────
export function HeartbeatIcon({size = 16, color = Colors.hrRed}) {
  const scale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {toValue: 1.25, duration: 140, useNativeDriver: true}),
        Animated.timing(scale, {toValue: 1,    duration: 140, useNativeDriver: true}),
        Animated.timing(scale, {toValue: 1.12, duration: 120, useNativeDriver: true}),
        Animated.timing(scale, {toValue: 1,    duration: 500, useNativeDriver: true}),
      ]),
      {iterations: -1},
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <Animated.Text style={{fontSize: size, color, transform: [{scale}]}}>♥</Animated.Text>
  );
}

// ── ActivityBadge ─────────────────────────────────────────────────────────────
export function ActivityBadge({isResting}) {
  const dot = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(dot, {toValue: 0.2, duration: 600, useNativeDriver: true}),
        Animated.timing(dot, {toValue: 1,   duration: 600, useNativeDriver: true}),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [dot]);

  const color = isResting ? Colors.success : Colors.warning;
  const label = isResting ? 'SEDENTARY' : 'ACTIVE';

  return (
    <View style={[styles.badge, {backgroundColor: color + '18', borderColor: color + '33'}]}>
      <Animated.View style={[styles.badgeDot, {backgroundColor: color, opacity: dot}]} />
      <Text style={[styles.badgeText, {color}]}>{label}</Text>
    </View>
  );
}

// ── PromptCard ────────────────────────────────────────────────────────────────
// Shows only the scripture reference — no full verse text (per spec)
export function PromptCard({prompt, onPress}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.promptCard}>
      <Text style={styles.promptSource}>{prompt.source}</Text>
      <Text style={styles.promptBreathHint}>
        {prompt.breathe?.inhale && `${prompt.breathe.inhale} · ${prompt.breathe.exhale}`}
      </Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  sectionLabel: {
    ...Typography.labelMd,
    color: Colors.textDim,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Radius.full,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.bg,
  },
  ghostBtn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ghostBtnText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textDim,
  },
  toggleWrap: {flexDirection: 'row', alignItems: 'center', gap: 12},
  toggleLabel: {...Typography.labelSm, color: Colors.textDim},
  toggleTrack: {
    width: 52, height: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, borderWidth: 1,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleKnob: {width: 20, height: 20, borderRadius: 10},
  bioRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10},
  bioLabel: {...Typography.labelSm, color: Colors.textDim, width: 34},
  bioTrack: {
    flex: 1, height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2, overflow: 'hidden',
  },
  bioFill: {height: '100%', borderRadius: 2},
  bioValue: {...Typography.labelSm, color: Colors.text, width: 48, textAlign: 'right'},
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: Radius.full, borderWidth: 1,
    alignSelf: 'flex-start', marginBottom: Spacing.sm,
  },
  badgeDot: {width: 5, height: 5, borderRadius: 3},
  badgeText: {fontSize: 8, fontWeight: '700', letterSpacing: 1.2},
  promptCard: {
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  promptSource: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.text,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  promptBreathHint: {
    fontSize: 9,
    fontWeight: '400',
    color: Colors.textDimmer,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
});
