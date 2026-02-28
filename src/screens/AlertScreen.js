// src/screens/AlertScreen.js
import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import {useApp} from '../context/AppContext';
import {Colors, Spacing, Radius, Typography} from '../theme';
import {PrimaryButton, GhostButton} from '../components';

const {height} = Dimensions.get('window');

export default function AlertScreen({navigation, route}) {
  const {isSecular, resolveStress} = useApp();
  const prompt = route.params?.prompt;

  const accent = isSecular ? Colors.secularPrimary : Colors.faithPrimary;
  const accentGlow = isSecular ? Colors.secularGlow : Colors.faithGlow;

  const iconScale = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.spring(iconScale, {toValue: 1, tension: 120, friction: 8, useNativeDriver: true}),
      Animated.timing(cardOpacity, {toValue: 1, duration: 600, useNativeDriver: true}),
      Animated.spring(cardTranslate, {toValue: 0, tension: 100, friction: 10, useNativeDriver: true}),
      Animated.timing(glowOpacity, {toValue: 1, duration: 800, useNativeDriver: true}),
    ]).start();

    // Pulse animation on icon
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1.12, duration: 1200, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 1, duration: 1200, useNativeDriver: true}),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handleBreathe = () => {
    navigation.replace('Breathe', {prompt});
  };

  const handleDismiss = () => {
    resolveStress();
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Radial glow */}
      <Animated.View style={[styles.radialGlow, {opacity: glowOpacity, backgroundColor: accent}]} />

      {/* Alert lines */}
      <View style={styles.alertLines}>
        {[...Array(3)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.alertRing,
              {
                width: 200 + i * 120,
                height: 200 + i * 120,
                borderRadius: (200 + i * 120) / 2,
                borderColor: accent + (30 - i * 8).toString(16).padStart(2, '0'),
                opacity: glowOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1 - i * 0.28],
                }),
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>
        {/* Icon */}
        <Animated.View style={{transform: [{scale: pulseAnim}]}}>
          <Animated.Text style={[styles.icon, {transform: [{scale: iconScale}]}]}>🌬</Animated.Text>
        </Animated.View>

        {/* Brand */}
        <Text style={[styles.brandName, {color: accent}]}>Selah</Text>
        <Text style={styles.brandTag}>Stress detected</Text>

        {/* HR spike indicator */}
        <View style={[styles.spikeBadge, {borderColor: Colors.hrRed + '50', backgroundColor: Colors.hrRedBg}]}>
          <Text style={styles.spikeText}>HR ↑ elevated · HRV ↓ reduced</Text>
        </View>

        {/* Prompt */}
        <Animated.View
          style={[
            styles.promptBox,
            {
              opacity: cardOpacity,
              transform: [{translateY: cardTranslate}],
              borderColor: accent + '30',
            },
          ]}>
          <Text style={[styles.promptQuote, {color: Colors.text}]}>
            {prompt?.text || '"Be still and know that I am God."'}
          </Text>
          <Text style={[styles.promptSource, {color: accent}]}>
            — {prompt?.source || 'Psalm 46:10'}
          </Text>
        </Animated.View>

        {/* Description */}
        <Text style={styles.description}>
          Take a moment. A guided breathing exercise is ready for you.
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <PrimaryButton
            label="Start Breathing"
            accent={accent}
            onPress={handleBreathe}
            style={styles.primaryBtn}
          />
          <GhostButton
            label="Dismiss"
            onPress={handleDismiss}
            style={styles.ghostBtn}
          />
        </View>

        {/* Mode chip */}
        <View style={[styles.modeChip, {borderColor: accent + '30'}]}>
          <Text style={[styles.modeText, {color: accent}]}>
            {isSecular ? 'Secular Mode' : 'Faith Mode'}
          </Text>
        </View>
      </View>
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
  radialGlow: {
    position: 'absolute',
    top: -250,
    width: 600,
    height: 600,
    borderRadius: 300,
    opacity: 0.04,
  },
  alertLines: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },
  icon: {
    fontSize: 56,
    marginBottom: 12,
  },
  brandName: {
    fontSize: 34,
    fontWeight: '200',
    letterSpacing: 8,
    marginBottom: 4,
  },
  brandTag: {
    ...Typography.labelMd,
    color: Colors.textDim,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  spikeBadge: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginBottom: 28,
  },
  spikeText: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.hrRed,
    letterSpacing: 0.8,
  },
  promptBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: 20,
    width: '100%',
  },
  promptQuote: {
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: '300',
    lineHeight: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  promptSource: {
    ...Typography.labelSm,
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  description: {
    ...Typography.bodySm,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 28,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
  },
  ghostBtn: {
    width: '100%',
  },
  modeChip: {
    marginTop: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  modeText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
