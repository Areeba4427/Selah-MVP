// src/screens/SettingsScreen.js
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {useApp} from '../context/AppContext';
import {Colors, Spacing, Radius, Typography} from '../theme';
import {Card, SectionLabel, ModeToggle} from '../components';

export default function SettingsScreen() {
  const {isSecular, toggleMode} = useApp();
  const accent = isSecular ? Colors.secularPrimary : Colors.faithPrimary;

  const [settings, setSettings] = useState({
    hapticsEnabled: true,
    breathingExercises: true,
    autoDetect: true,
    quietHours: false,
    sensitivityLevel: 1, // 0=low, 1=medium, 2=high
  });

  const toggle = key => setSettings(prev => ({...prev, [key]: !prev[key]}));

  const thresholds = {
    0: {hr: '>95 bpm', hrv: '<20 ms', label: 'Low'},
    1: {hr: '>88 bpm', hrv: '<30 ms', label: 'Medium'},
    2: {hr: '>82 bpm', hrv: '<40 ms', label: 'High'},
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, {color: accent}]}>Settings</Text>
          <Text style={styles.subtitle}>SELAH MVP CONFIGURATION</Text>
        </View>

        {/* Mode */}
        <Card style={styles.card}>
          <SectionLabel>Content Mode</SectionLabel>
          <ModeToggle isSecular={isSecular} onToggle={toggleMode} />
          <Text style={styles.settingDesc}>
            {isSecular
              ? 'Secular mode delivers mindfulness quotes, affirmations, and breathing exercises without religious content.'
              : 'Faith mode delivers Scripture verses, prayers, and guided breathing integrated with biblical text.'}
          </Text>
        </Card>

        {/* Biometric Thresholds */}
        <Card style={styles.card}>
          <SectionLabel>Stress Detection Sensitivity</SectionLabel>
          <Text style={styles.settingDesc}>
            Controls when Selah triggers an intervention based on your biometrics.
          </Text>
          <View style={styles.sensitivityRow}>
            {[0, 1, 2].map(level => (
              <TouchableOpacity
                key={level}
                onPress={() => setSettings(prev => ({...prev, sensitivityLevel: level}))}
                style={[
                  styles.sensitivityBtn,
                  settings.sensitivityLevel === level && {
                    backgroundColor: accent + '20',
                    borderColor: accent,
                  },
                ]}>
                <Text
                  style={[
                    styles.sensitivityLabel,
                    settings.sensitivityLevel === level && {color: accent},
                  ]}>
                  {thresholds[level].label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.thresholdInfo}>
            <ThresholdRow label="HR Trigger" value={thresholds[settings.sensitivityLevel].hr} accent={accent} />
            <ThresholdRow label="HRV Trigger" value={thresholds[settings.sensitivityLevel].hrv} accent={accent} />
          </View>
        </Card>

        {/* Features */}
        <Card style={styles.card}>
          <SectionLabel>Features</SectionLabel>
          <SettingRow
            label="Haptic Feedback"
            desc="Selah signature vibration pattern (heartbeat + exhale wave)"
            value={settings.hapticsEnabled}
            onToggle={() => toggle('hapticsEnabled')}
            accent={accent}
          />
          <SettingRow
            label="Guided Breathing"
            desc="4-4-6 breathing exercise after stress detection"
            value={settings.breathingExercises}
            onToggle={() => toggle('breathingExercises')}
            accent={accent}
          />
          <SettingRow
            label="Auto-Detection"
            desc="JITAI-based automatic stress monitoring"
            value={settings.autoDetect}
            onToggle={() => toggle('autoDetect')}
            accent={accent}
          />
          <SettingRow
            label="Quiet Hours"
            desc="Suppress alerts between 10PM – 7AM"
            value={settings.quietHours}
            onToggle={() => toggle('quietHours')}
            accent={accent}
            isLast
          />
        </Card>

        {/* Biometric Signals */}
        <Card style={styles.card}>
          <SectionLabel>Biometric Signals (MVP)</SectionLabel>
          {[
            {label: 'Heart Rate Variability (HRV)', status: 'PRIMARY', on: true},
            {label: 'Skin Temperature', status: 'SECONDARY', on: true},
            {label: 'Motion / Activity Filter', status: 'ACTIVE', on: true},
            {label: 'Respiration Rate', status: 'PHASE 2', on: false},
            {label: 'Galvanic Skin Response', status: 'PHASE 2', on: false},
          ].map(sig => (
            <View key={sig.label} style={styles.sigRow}>
              <View
                style={[
                  styles.sigDot,
                  {backgroundColor: sig.on ? Colors.success : Colors.textDimmer},
                ]}
              />
              <Text style={styles.sigLabel}>{sig.label}</Text>
              <Text
                style={[
                  styles.sigStatus,
                  {color: sig.on ? accent : Colors.textDimmer},
                ]}>
                {sig.status}
              </Text>
            </View>
          ))}
        </Card>

        {/* Haptic pattern */}
        <Card style={styles.card}>
          <SectionLabel>Selah Signature Haptic Pattern</SectionLabel>
          <View style={styles.hapticTable}>
            {[
              {step: 'Pulse 1', duration: '200ms', intensity: 'Medium'},
              {step: 'Pause', duration: '150ms', intensity: '—'},
              {step: 'Pulse 2', duration: '150ms', intensity: 'Medium'},
              {step: 'Exhale Wave', duration: '600ms', intensity: 'Low (taper)'},
              {step: 'Total', duration: '~1.1s', intensity: 'Calming'},
            ].map((row, i) => (
              <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                <Text style={styles.tableCell}>{row.step}</Text>
                <Text style={[styles.tableCell, {color: accent}]}>{row.duration}</Text>
                <Text style={[styles.tableCell, {textAlign: 'right'}]}>{row.intensity}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* About */}
        <Card style={[styles.card, {marginBottom: 40}]}>
          <SectionLabel>About</SectionLabel>
          <Text style={styles.aboutText}>Selah MVP v1.0.0</Text>
          <Text style={styles.aboutText}>React Native · Android</Text>
          <Text style={styles.aboutText}>Built on JITAI Principles</Text>
          <Text style={[styles.aboutText, {color: accent, marginTop: 8}]}>
            Proposal Date: January 28, 2026
          </Text>
        </Card>

      </ScrollView>
    </View>
  );
}

function SettingRow({label, desc, value, onToggle, accent, isLast}) {
  return (
    <View style={[styles.settingRow, !isLast && styles.settingRowBorder]}>
      <View style={styles.settingRowText}>
        <Text style={styles.settingRowLabel}>{label}</Text>
        <Text style={styles.settingRowDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{false: 'rgba(255,255,255,0.1)', true: accent + '60'}}
        thumbColor={value ? accent : Colors.textDim}
      />
    </View>
  );
}

function ThresholdRow({label, value, accent}) {
  return (
    <View style={styles.threshRow}>
      <Text style={styles.threshLabel}>{label}</Text>
      <Text style={[styles.threshValue, {color: accent}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg},
  scroll: {flex: 1},
  scrollContent: {padding: Spacing.md, gap: 14},
  header: {paddingVertical: Spacing.lg, alignItems: 'center'},
  title: {fontSize: 28, fontWeight: '200', letterSpacing: 6, marginBottom: 4},
  subtitle: {...Typography.labelSm, color: Colors.textDim, letterSpacing: 2},
  card: {marginBottom: 0},
  settingDesc: {
    ...Typography.bodySm,
    color: Colors.textDim,
    lineHeight: 18,
    marginTop: 10,
  },
  sensitivityRow: {flexDirection: 'row', gap: 8, marginTop: 12},
  sensitivityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  sensitivityLabel: {fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: Colors.textDim},
  thresholdInfo: {
    marginTop: 12,
    gap: 6,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  threshRow: {flexDirection: 'row', justifyContent: 'space-between'},
  threshLabel: {...Typography.labelSm, color: Colors.textDim},
  threshValue: {fontSize: 11, fontWeight: '600', letterSpacing: 0.8},
  settingRow: {paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12},
  settingRowBorder: {borderBottomWidth: 1, borderBottomColor: Colors.border},
  settingRowText: {flex: 1},
  settingRowLabel: {fontSize: 13, fontWeight: '500', color: Colors.text, marginBottom: 2},
  settingRowDesc: {...Typography.labelXs, color: Colors.textDim, letterSpacing: 0.8, lineHeight: 14},
  sigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sigDot: {width: 6, height: 6, borderRadius: 3},
  sigLabel: {flex: 1, fontSize: 12, color: Colors.text},
  sigStatus: {fontSize: 8, fontWeight: '700', letterSpacing: 1.2},
  hapticTable: {gap: 0},
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableRowAlt: {backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 4},
  tableCell: {flex: 1, fontSize: 11, color: Colors.textDim},
  aboutText: {...Typography.bodySm, color: Colors.textDim, marginBottom: 3},
});
