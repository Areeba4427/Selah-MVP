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
  const {isSecular, toggleMode} = useApp();

  const accentFaith = '#8a7055';
  const accentSec   = '#3a7090';
  const accent      = isSecular ? accentSec : accentFaith;

  const [settings, setSettings] = useState({
    hapticsEnabled:     true,
    breathingExercises: true,
    autoDetect:         true,
    quietHours:         false,
    sensitivity:        1,
  });

  const toggle = key => setSettings(p => ({...p, [key]: !p[key]}));

  const thresholds = {
    0: {hr: '>95 bpm', hrv: '<20 ms', label: 'Low'},
    1: {hr: '>88 bpm', hrv: '<30 ms', label: 'Medium'},
    2: {hr: '>82 bpm', hrv: '<40 ms', label: 'High'},
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

        {/* Sensitivity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detection sensitivity</Text>
          <View style={styles.sensitivityRow}>
            {[0, 1, 2].map(l => (
              <TouchableOpacity
                key={l}
                onPress={() => setSettings(p => ({...p, sensitivity: l}))}
                style={[
                  styles.sensitivityBtn,
                  settings.sensitivity === l && {borderColor: accent, backgroundColor: accent + '15'},
                ]}>
                <Text style={[styles.sensitivityLabel, settings.sensitivity === l && {color: accent}]}>
                  {thresholds[l].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.thresholdBox}>
            <View style={styles.thresholdRow}>
              <Text style={styles.thresholdKey}>HR trigger</Text>
              <Text style={[styles.thresholdVal, {color: accent}]}>{thresholds[settings.sensitivity].hr}</Text>
            </View>
            <View style={styles.thresholdRow}>
              <Text style={styles.thresholdKey}>HRV trigger</Text>
              <Text style={[styles.thresholdVal, {color: accent}]}>{thresholds[settings.sensitivity].hrv}</Text>
            </View>
          </View>
        </View>

        {/* Features */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Features</Text>
          <SettingRow label="Haptic feedback"   desc="Selah signature vibration on stress detection"   value={settings.hapticsEnabled}     onToggle={() => toggle('hapticsEnabled')}     accent={accent} />
          <SettingRow label="Guided breathing"  desc="4-4-6 breathing exercise after stress detected"  value={settings.breathingExercises} onToggle={() => toggle('breathingExercises')} accent={accent} />
          <SettingRow label="Auto-detection"    desc="JITAI-based automatic stress monitoring"          value={settings.autoDetect}         onToggle={() => toggle('autoDetect')}         accent={accent} />
          <SettingRow label="Quiet hours"       desc="Suppress alerts between 10PM – 7AM"              value={settings.quietHours}         onToggle={() => toggle('quietHours')}         accent={accent} last />
        </View>

        {/* Haptic pattern */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selah signature haptic</Text>
          {[
            ['Pulse 1',     '200ms', 'Medium'],
            ['Pause',       '150ms', '—'],
            ['Pulse 2',     '150ms', 'Medium'],
            ['Exhale wave', '600ms', 'Low fade'],
            ['Total',       '~1.1s', 'Calming'],
          ].map(([step, dur, intensity], i) => (
            <View key={i} style={[styles.hapticRow, i < 4 && styles.hapticBorder]}>
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
          <Text style={styles.aboutLine}>React Native · Android & IOS</Text>
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
    fontWeight: '200',
    letterSpacing: 8,
    color: 'rgba(25,55,95,0.75)',
  },

  card: {
    borderWidth: 1,
    borderColor: 'rgba(40,75,115,0.12)',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    padding: 18,
    gap: 10,
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2,
    color: 'rgba(40,75,115,0.45)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  modeRow: {flexDirection: 'row', gap: 10},
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(40,75,115,0.18)',
    backgroundColor: 'rgba(40,75,115,0.04)',
    alignItems: 'center',
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: 'rgba(40,75,115,0.35)',
    textTransform: 'uppercase',
  },
  modeDesc: {
    fontSize: 12,
    color: 'rgba(40,75,115,0.50)',
    lineHeight: 18,
  },

  sensitivityRow: {flexDirection: 'row', gap: 8},
  sensitivityBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(40,75,115,0.15)',
    alignItems: 'center',
    backgroundColor: 'rgba(40,75,115,0.04)',
  },
  sensitivityLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: 'rgba(40,75,115,0.40)',
    textTransform: 'uppercase',
  },
  thresholdBox: {
    padding: 12,
    backgroundColor: 'rgba(40,75,115,0.06)',
    borderRadius: 10,
    gap: 6,
  },
  thresholdRow: {flexDirection: 'row', justifyContent: 'space-between'},
  thresholdKey: {fontSize: 11, color: 'rgba(40,75,115,0.50)'},
  thresholdVal: {fontSize: 11, fontWeight: '600'},

  settingRow: {paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12},
  settingRowBorder: {borderBottomWidth: 1, borderBottomColor: 'rgba(40,75,115,0.10)'},
  settingRowText:   {flex: 1},
  settingRowLabel:  {fontSize: 13, fontWeight: '400', color: 'rgba(25,55,95,0.80)', marginBottom: 2},
  settingRowDesc:   {fontSize: 10, color: 'rgba(40,75,115,0.45)', lineHeight: 14},

  hapticRow: {flexDirection: 'row', paddingVertical: 9, alignItems: 'center'},
  hapticBorder: {borderBottomWidth: 1, borderBottomColor: 'rgba(40,75,115,0.08)'},
  hapticStep:       {flex: 1, fontSize: 12, color: 'rgba(25,55,95,0.70)'},
  hapticDur:        {flex: 1, fontSize: 12, fontWeight: '500'},
  hapticIntensity:  {flex: 1, fontSize: 11, color: 'rgba(40,75,115,0.45)', textAlign: 'right'},

  aboutLine: {fontSize: 12, color: 'rgba(40,75,115,0.55)', marginBottom: 2},
});
