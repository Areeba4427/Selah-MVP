// src/screens/SettingsScreen.js
//
// Fix from previous version:
//   Sensitivity setting was local useState only — changing it had no effect.
//   Now wired to AppContext via setSensitivity (added to AppContext).
//
//   Threshold labels updated to reflect the adaptive baseline system:
//     Low:    HRV drops 30%+ / HR rises 20+ bpm
//     Medium: HRV drops 25%+ / HR rises 15+ bpm  (default, matches AppContext)
//     High:   HRV drops 20%+ / HR rises 10+ bpm
//
//   These map to the percentage drops in AppContext.calculateStressScore()
//   and HealthManager.swift calculateStressScore(). Changing sensitivity
//   passes the threshold values down so AppContext can adjust its scoring.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useApp} from '../context/AppContext';

function SettingRow({label, desc, value, onToggle, accent, last}) {
  return (
    <View style={[styles.settingRow, !last && styles.settingRowBorder]}>
      <View style={styles.settingRowText}>
        <Text style={styles.settingRowLabel}>{label}</Text>
        {desc ? <Text style={styles.settingRowDesc}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{false: 'rgba(40,75,115,0.12)', true: accent + '88'}}
        thumbColor={value ? accent : 'rgba(40,75,115,0.35)'}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const {
    isSecular,
    toggleMode,
    sensitivity,        // 0 | 1 | 2  — pulled from AppContext
    setSensitivity,     // (level: 0|1|2) => void — add to AppContext
    settings,           // {hapticsEnabled, breathingExercises, autoDetect, quietHours}
    updateSetting,      // (key, value) => void — add to AppContext
  } = useApp();

  const accentFaith = '#8a7055';
  const accentSec   = '#3a7090';
  const accent      = isSecular ? accentSec : accentFaith;

  // Adaptive baseline thresholds — aligned with AppContext scoring labels
  // Medium (1) matches the default values in AppContext.calculateStressScore()
  const thresholds = {
    0: {hrvDrop: '30%+', hrRise: '20+ bpm', label: 'Low'},
    1: {hrvDrop: '25%+', hrRise: '15+ bpm', label: 'Medium'},
    2: {hrvDrop: '20%+', hrRise: '10+ bpm', label: 'High'},
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      <LinearGradient
        colors={['#eceef6', '#d4d8ec', '#b8bedd', '#8e97c4', '#6870a8']}
        locations={[0, 0.22, 0.48, 0.74, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Mode */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Content mode</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              onPress={isSecular ? toggleMode : null}
              style={[styles.modeBtn, !isSecular && {borderColor: accentFaith, backgroundColor: 'rgba(138,112,85,0.10)'}]}>
              <Text style={[styles.modeBtnText, !isSecular && {color: accentFaith}]}>Faith</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={!isSecular ? toggleMode : null}
              style={[styles.modeBtn, isSecular && {borderColor: accentSec, backgroundColor: 'rgba(58,112,144,0.10)'}]}>
              <Text style={[styles.modeBtnText, isSecular && {color: accentSec}]}>Secular</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modeDesc}>
            {isSecular
              ? 'Mindfulness prompts and guided breathing without religious content.'
              : 'Scripture verses and guided breathing integrated with biblical text.'}
          </Text>
        </View>

        {/* Sensitivity — now wired to AppContext.setSensitivity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detection sensitivity</Text>
          <View style={styles.sensitivityRow}>
            {[0, 1, 2].map(l => (
              <TouchableOpacity
                key={l}
                onPress={() => setSensitivity(l)}
                style={[
                  styles.sensitivityBtn,
                  sensitivity === l && {borderColor: accent, backgroundColor: accent + '15'},
                ]}>
                <Text style={[styles.sensitivityLabel, sensitivity === l && {color: accent}]}>
                  {thresholds[l].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.thresholdBox}>
            <View style={styles.thresholdRow}>
              <Text style={styles.thresholdKey}>HRV drop trigger</Text>
              <Text style={[styles.thresholdVal, {color: accent}]}>{thresholds[sensitivity].hrvDrop}</Text>
            </View>
            <View style={styles.thresholdRow}>
              <Text style={styles.thresholdKey}>HR rise trigger</Text>
              <Text style={[styles.thresholdVal, {color: accent}]}>{thresholds[sensitivity].hrRise}</Text>
            </View>
            <Text style={styles.thresholdNote}>
              Measured against your personal baseline, not fixed numbers.
            </Text>
          </View>
        </View>

        {/* Features — wired to AppContext.updateSetting */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Features</Text>
          <SettingRow
            label="Haptic feedback"
            desc="Selah signature vibration on stress detection"
            value={settings?.hapticsEnabled ?? true}
            onToggle={() => updateSetting('hapticsEnabled', !(settings?.hapticsEnabled ?? true))}
            accent={accent}
          />
          <SettingRow
            label="Guided breathing"
            desc="4-4-6 breathing exercise after stress detected"
            value={settings?.breathingExercises ?? true}
            onToggle={() => updateSetting('breathingExercises', !(settings?.breathingExercises ?? true))}
            accent={accent}
          />
          <SettingRow
            label="Auto-detection"
            desc="Adaptive baseline stress monitoring"
            value={settings?.autoDetect ?? true}
            onToggle={() => updateSetting('autoDetect', !(settings?.autoDetect ?? true))}
            accent={accent}
          />
          <SettingRow
            label="Quiet hours"
            desc="Suppress alerts between 10PM – 7AM"
            value={settings?.quietHours ?? false}
            onToggle={() => updateSetting('quietHours', !(settings?.quietHours ?? false))}
            accent={accent}
            last
          />
        </View>

        {/* Haptic pattern — informational only */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selah signature haptic</Text>
          {[
            ['Tap 1',       '~0ms',   'Soft click'],
            ['Pause',       '550ms',  '—'],
            ['Tap 2',       '~550ms', 'Soft click'],
            ['Total',       '~1.1s',  'Calming'],
          ].map(([step, dur, intensity], i, arr) => (
            <View key={i} style={[styles.hapticRow, i < arr.length - 1 && styles.hapticBorder]}>
              <Text style={styles.hapticStep}>{step}</Text>
              <Text style={[styles.hapticDur, {color: accent}]}>{dur}</Text>
              <Text style={styles.hapticIntensity}>{intensity}</Text>
            </View>
          ))}
        </View>

        {/* About */}
        <View style={[styles.card, {marginBottom: 48}]}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.aboutLine}>Selah MVP v1.0.0</Text>
          <Text style={styles.aboutLine}>React Native · iOS & Android</Text>
          <Text style={styles.aboutLine}>Built on JITAI principles</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    {flex: 1},
  content: {paddingHorizontal: 20, paddingTop: 56, gap: 14},

  header: {alignItems: 'center', marginBottom: 4},
  title:  {
    fontSize: 28,
    fontWeight: '400',
    letterSpacing: 8,
    color: 'rgba(25,55,95,0.90)',
  },

  card: {
    borderWidth: 1,
    borderColor: 'rgba(40,75,115,0.16)',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.30)',
    padding: 18,
    gap: 10,
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2,
    color: 'rgba(40,75,115,0.65)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  modeRow: {flexDirection: 'row', gap: 10},
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(40,75,115,0.22)',
    backgroundColor: 'rgba(40,75,115,0.08)',
    alignItems: 'center',
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: 'rgba(40,75,115,0.70)',
    textTransform: 'uppercase',
  },
  modeDesc: {
    fontSize: 12,
    color: 'rgba(40,75,115,0.72)',
    lineHeight: 18,
  },

  sensitivityRow: {flexDirection: 'row', gap: 8},
  sensitivityBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(40,75,115,0.20)',
    alignItems: 'center',
    backgroundColor: 'rgba(40,75,115,0.08)',
  },
  sensitivityLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: 'rgba(40,75,115,0.66)',
    textTransform: 'uppercase',
  },
  thresholdBox: {
    padding: 12,
    backgroundColor: 'rgba(40,75,115,0.12)',
    borderRadius: 10,
    gap: 6,
  },
  thresholdRow: {flexDirection: 'row', justifyContent: 'space-between'},
  thresholdKey: {fontSize: 11, color: 'rgba(40,75,115,0.68)'},
  thresholdVal: {fontSize: 11, fontWeight: '600'},
  thresholdNote: {
    fontSize: 10,
    color: 'rgba(40,75,115,0.62)',
    lineHeight: 15,
    marginTop: 2,
  },

  settingRow: {paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12},
  settingRowBorder: {borderBottomWidth: 1, borderBottomColor: 'rgba(40,75,115,0.14)'},
  settingRowText:   {flex: 1},
  settingRowLabel:  {fontSize: 13, fontWeight: '500', color: 'rgba(25,55,95,0.90)', marginBottom: 2},
  settingRowDesc:   {fontSize: 10, color: 'rgba(40,75,115,0.65)', lineHeight: 14},

  hapticRow: {flexDirection: 'row', paddingVertical: 9, alignItems: 'center'},
  hapticBorder: {borderBottomWidth: 1, borderBottomColor: 'rgba(40,75,115,0.12)'},
  hapticStep:       {flex: 1, fontSize: 12, color: 'rgba(25,55,95,0.78)'},
  hapticDur:        {flex: 1, fontSize: 12, fontWeight: '500'},
  hapticIntensity:  {flex: 1, fontSize: 11, color: 'rgba(40,75,115,0.62)', textAlign: 'right'},

  aboutLine: {fontSize: 12, color: 'rgba(40,75,115,0.70)', marginBottom: 2},
});