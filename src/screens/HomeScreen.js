// src/screens/HomeScreen.js
import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {useApp} from '../context/AppContext';
import {Colors, Spacing, Radius, Typography} from '../theme';
import {
  Card,
  SectionLabel,
  ModeToggle,
  BiometricRow,
  HeartbeatIcon,
  ActivityBadge,
  PromptCard,
  PrimaryButton,
} from '../components';

const {width} = Dimensions.get('window');

export default function HomeScreen({navigation}) {
  const {isSecular, toggleMode, biometrics, isStressSimulating, getPrompts, simulateStress} =
    useApp();

  const accent = isSecular ? Colors.secularPrimary : Colors.faithPrimary;
  const accentGlow = isSecular ? Colors.secularGlow : Colors.faithGlow;

  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Ambient glow animation
  const glowAnim = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(titleOpacity, {toValue: 1, duration: 800, useNativeDriver: true}),
      Animated.timing(titleTranslate, {toValue: 0, duration: 800, useNativeDriver: true}),
    ]).start();

    // Glow pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {toValue: 1, duration: 3000, useNativeDriver: true}),
        Animated.timing(glowAnim, {toValue: 0, duration: 3000, useNativeDriver: true}),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      setTime(`${h}:${m}`);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      setDateStr(`${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`);
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = () => {
    simulateStress(prompt => {
      navigation.navigate('Alert', {prompt});
    });
  };

  const hrPercent = Math.min(100, ((biometrics.hr - 40) / 120) * 100);
  const hrvPercent = Math.min(100, (biometrics.hrv / 80) * 100);
  const tempPercent = Math.min(100, ((biometrics.temp + 0.5) / 1.5) * 100);
  const stressIndex = Math.round(biometrics.stressIndex);

  const prompts = getPrompts();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Ambient background glow */}
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            backgroundColor: accent,
            opacity: glowAnim.interpolate({inputRange: [0, 1], outputRange: [0.03, 0.07]}),
          },
        ]}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {opacity: titleOpacity, transform: [{translateY: titleTranslate}]},
          ]}>
          <Text style={[styles.appTitle, {color: accent}]}>SELAH</Text>
          <Text style={styles.appSubtitle}>Wearable Stress Companion</Text>
        </Animated.View>

        {/* Mode Toggle */}
        <View style={styles.toggleRow}>
          <ModeToggle isSecular={isSecular} onToggle={toggleMode} />
        </View>

        {/* Watch-style time card */}
        <Card style={[styles.timeCard, {borderColor: accent + '30'}]}>
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, {color: Colors.text}]}>{time}</Text>
            <View style={styles.hrBadge}>
              <HeartbeatIcon size={14} />
              <Text style={styles.hrBadgeText}>
                {Math.round(biometrics.hr)} bpm
              </Text>
            </View>
          </View>
          <Text style={styles.dateText}>{dateStr}</Text>
          <Text style={[styles.monitoringLabel, {color: accent}]}>
            ● HRV MONITORING ACTIVE
          </Text>
        </Card>

        {/* Biometrics */}
        <Card style={styles.bioCard}>
          <SectionLabel>Live Biometrics</SectionLabel>
          <ActivityBadge isResting={biometrics.isResting} />
          <BiometricRow
            label="HR"
            value={`${Math.round(biometrics.hr)} bpm`}
            percent={hrPercent}
            isStress={stressIndex > 65}
          />
          <BiometricRow
            label="HRV"
            value={`${Math.round(biometrics.hrv)} ms`}
            percent={hrvPercent}
            isStress={false}
          />
          <BiometricRow
            label="Temp"
            value={`${biometrics.temp >= 0 ? '+' : ''}${biometrics.temp.toFixed(1)}°`}
            percent={tempPercent}
            isStress={stressIndex > 65}
          />

          {/* Stress Gauge */}
          <View style={styles.stressSect}>
            <View style={styles.stressLabelRow}>
              <Text style={styles.stressTitle}>STRESS INDEX</Text>
              <Text style={[styles.stressNum, {color: stressIndex > 65 ? Colors.danger : Colors.text}]}>
                {stressIndex}
                <Text style={styles.stressOf}> / 100</Text>
              </Text>
            </View>
            <View style={styles.stressTrack}>
              <Animated.View
                style={[
                  styles.stressFill,
                  {width: `${stressIndex}%`},
                ]}
              />
              {/* Threshold marker */}
              <View style={[styles.thresholdLine, {left: '65%'}]} />
            </View>
            <View style={styles.stressRangeRow}>
              <Text style={styles.stressRange}>Calm</Text>
              <Text style={styles.stressRange}>Moderate</Text>
              <Text style={styles.stressRange}>High</Text>
            </View>
          </View>
        </Card>

        {/* Simulate button */}
        <Card style={styles.simCard}>
          <SectionLabel>Simulation Controls</SectionLabel>
          <Text style={styles.simDesc}>
            Trigger a simulated stress event to preview the full Selah intervention flow — alert → haptic → guided breathing.
          </Text>
          <PrimaryButton
            label={isStressSimulating ? '⚡ Detecting...' : '⚡ Simulate Stress Event'}
            accent={accent}
            onPress={isStressSimulating ? null : handleSimulate}
            style={isStressSimulating ? {opacity: 0.5} : {}}
          />
        </Card>

        {/* Prompt library */}
        <Card style={styles.promptCard}>
          <SectionLabel>{isSecular ? 'Prompt Library — Secular' : 'Prompt Library — Faith'}</SectionLabel>
          {prompts.slice(0, 4).map((p, i) => (
            <PromptCard
              key={i}
              prompt={p}
              onPress={() => navigation.navigate('Alert', {prompt: p})}
            />
          ))}
        </Card>

        {/* JITAI info */}
        <Card style={styles.infoCard}>
          <SectionLabel>About Selah</SectionLabel>
          <Text style={styles.infoText}>
            Built on <Text style={{color: accent}}>JITAI principles</Text> — Just-In-Time Adaptive Interventions. Selah monitors your HRV, skin temperature, and motion to deliver calming prompts exactly when your body signals stress — not before, not after.
          </Text>
          <View style={styles.signalRow}>
            {['HRV', 'Skin Temp', 'Motion'].map(s => (
              <View key={s} style={[styles.signalChip, {borderColor: accent + '40'}]}>
                <Text style={[styles.signalText, {color: accent}]}>{s}</Text>
              </View>
            ))}
          </View>
        </Card>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  ambientGlow: {
    position: 'absolute',
    top: -200,
    left: -200,
    right: -200,
    height: 500,
    borderRadius: 300,
    zIndex: 0,
  },
  scroll: {flex: 1},
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
    gap: 14,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: 10,
  },
  appSubtitle: {
    ...Typography.labelSm,
    color: Colors.textDim,
    marginTop: 4,
    letterSpacing: 2,
  },
  toggleRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  timeCard: {
    padding: Spacing.lg,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 42,
    fontWeight: '200',
    letterSpacing: 2,
  },
  hrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.hrRedBg,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(224,80,80,0.2)',
  },
  hrBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.hrRed,
    letterSpacing: 0.5,
  },
  dateText: {
    ...Typography.labelSm,
    color: Colors.textDim,
    marginTop: 4,
    marginBottom: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  monitoringLabel: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  bioCard: {},
  stressSect: {
    marginTop: 4,
  },
  stressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stressTitle: {
    ...Typography.labelSm,
    color: Colors.textDim,
  },
  stressNum: {
    fontSize: 22,
    fontWeight: '300',
  },
  stressOf: {
    fontSize: 12,
    color: Colors.textDim,
  },
  stressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  stressFill: {
    height: '100%',
    backgroundColor: Colors.faithPrimary,
    borderRadius: 3,
    // gradient-like: computed as single color, update dynamically if needed
  },
  thresholdLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stressRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  stressRange: {
    ...Typography.labelXs,
    color: Colors.textDimmer,
    textTransform: 'uppercase',
  },
  simCard: {},
  simDesc: {
    ...Typography.bodySm,
    color: Colors.textDim,
    lineHeight: 18,
    marginBottom: 12,
  },
  promptCard: {},
  infoCard: {},
  infoText: {
    ...Typography.bodySm,
    color: Colors.textDim,
    lineHeight: 19,
    marginBottom: 12,
  },
  signalRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  signalChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  signalText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
