// src/screens/HomeScreen.js
import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useApp} from '../context/AppContext';
import WatchBridge from '../services/WatchBridge';

function LiveDot({color}) {
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(op, {toValue: 0.2, duration: 900, useNativeDriver: true}),
        Animated.timing(op, {toValue: 1,   duration: 900, useNativeDriver: true}),
      ]),
    ).start();
  }, []);
  return <Animated.View style={[styles.liveDot, {backgroundColor: color, opacity: op}]} />;
}

export default function HomeScreen({navigation}) {
  const {
    isSecular, toggleMode, biometrics,
    isStressSimulating, simulateStress,
    resetSession, activePrompt,
  } = useApp();

  const accentFaith = '#8a7055';
  const accentSec   = '#3a7090';
  const accent      = isSecular ? accentSec : accentFaith;

  const [time, setTime]       = useState('');
  const [dateStr, setDateStr] = useState('');
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {toValue: 1, duration: 1000, useNativeDriver: true}).start();
    const tick = () => {
      const now  = new Date();
      const h    = now.getHours().toString().padStart(2, '0');
      const m    = now.getMinutes().toString().padStart(2, '0');
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const mos  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      setTime(`${h}:${m}`);
      setDateStr(`${days[now.getDay()]} · ${mos[now.getMonth()]} ${now.getDate()}`);
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  const handleSimulate = () => {
    WatchBridge.sendSimulateToWatch(isSecular);
    simulateStress(prompt => navigation.navigate('Alert', {prompt}));
  };

  const stressIndex = Math.round(biometrics.stressIndex);

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

        <Animated.View style={[styles.inner, {opacity: fadeIn}]}>

          {/* Wordmark */}
          <View style={styles.header}>
            <Text style={styles.wordmark}>SELAH</Text>
            <Text style={styles.tagline}>Wearable stress companion</Text>
          </View>

          {/* Time */}
          <View style={styles.timeBlock}>
            <Text style={styles.timeText}>{time}</Text>
            <Text style={styles.dateText}>{dateStr}</Text>
            <View style={styles.statusRow}>
              <LiveDot color={accent} />
              <Text style={[styles.statusLabel, {color: accent}]}>HRV monitoring active</Text>
            </View>
          </View>

          {/* Mode toggle */}
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

          {/* Stress index */}
          <View style={styles.stressRow}>
            <Text style={styles.stressLabel}>Stress index</Text>
            <Text style={[styles.stressValue, stressIndex > 65 && {color: '#a04040'}]}>
              {stressIndex}<Text style={styles.stressMax}> /100</Text>
            </Text>
          </View>
          <View style={styles.stressTrack}>
            <View style={[
              styles.stressFill,
              {
                width: `${stressIndex}%`,
                backgroundColor: stressIndex > 65 ? '#a04040' : stressIndex > 40 ? '#6a8850' : accent,
              },
            ]} />
            <View style={styles.stressThreshold} />
          </View>

          {/* Active session warning + end button */}
          {activePrompt && (
            <TouchableOpacity onPress={resetSession} style={styles.endSessionBtn}>
              <Text style={styles.endSessionText}>⚠ Session active — Tap to end</Text>
            </TouchableOpacity>
          )}

          {/* Simulate button */}
          <TouchableOpacity
            onPress={isStressSimulating ? null : handleSimulate}
            activeOpacity={0.8}
            style={[styles.simulateBtn, isStressSimulating && {opacity: 0.5}]}>
            <View style={styles.simulateBtnInner}>
              <View style={[styles.simulateDot, {
                backgroundColor: isStressSimulating ? '#6a8850' : '#a04040',
              }]} />
              <Text style={styles.simulateBtnText}>
                {isStressSimulating ? 'Detecting...' : 'Simulate stress event'}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.simulateHint}>Triggers the full Selah flow</Text>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    {flex: 1},
  content: {paddingBottom: 40},
  inner: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 56,
    gap: 24,
  },
  header:   {alignItems: 'center'},
  wordmark: {
    fontSize: 34, fontWeight: '400', letterSpacing: 14,
    color: 'rgba(30,40,80,0.90)', marginBottom: 6,
  },
  tagline: {
    fontSize: 9, fontWeight: '500', letterSpacing: 2.5,
    color: 'rgba(40,50,90,0.65)', textTransform: 'uppercase',
  },
  timeBlock:   {alignItems: 'center'},
  timeText:    {fontSize: 58, fontWeight: '400', letterSpacing: 2, color: 'rgba(25,35,75,0.92)', lineHeight: 66},
  dateText:    {fontSize: 10, letterSpacing: 2, color: 'rgba(40,50,90,0.65)', marginTop: 4, marginBottom: 10, textTransform: 'uppercase'},
  statusRow:   {flexDirection: 'row', alignItems: 'center', gap: 6},
  liveDot:     {width: 5, height: 5, borderRadius: 3},
  statusLabel: {fontSize: 9, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(20,30,55,0.84)'},
  modeRow:     {flexDirection: 'row', gap: 10},
  modeBtn: {
    paddingVertical: 8, paddingHorizontal: 28, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(40,50,90,0.22)',
    backgroundColor: 'rgba(40,50,90,0.10)',
  },
  modeBtnText: {fontSize: 11, fontWeight: '600', letterSpacing: 1.5, color: 'rgba(40,50,90,0.65)', textTransform: 'uppercase'},
  stressRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', width: '100%'},
  stressLabel: {fontSize: 9, fontWeight: '600', letterSpacing: 1.5, color: 'rgba(40,50,90,0.72)', textTransform: 'uppercase'},
  stressValue: {fontSize: 20, fontWeight: '400', color: 'rgba(25,35,75,0.88)'},
  stressMax:   {fontSize: 11, color: 'rgba(40,50,90,0.60)'},
  stressTrack: {
    width: '100%', height: 3, backgroundColor: 'rgba(40,50,90,0.12)',
    borderRadius: 2, marginTop: -16, overflow: 'visible', position: 'relative',
  },
  stressFill:      {height: '100%', borderRadius: 2},
  stressThreshold: {position: 'absolute', top: -3, bottom: -3, left: '65%', width: 1, backgroundColor: 'rgba(40,50,90,0.20)'},
  endSessionBtn: {
    width: '100%', padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(160,64,64,0.20)',
    borderWidth: 1, borderColor: 'rgba(160,64,64,0.40)',
    alignItems: 'center',
  },
  endSessionText: {fontSize: 12, color: '#a04040', fontWeight: '500', letterSpacing: 0.5},
  simulateBtn: {
    width: '100%', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(40,50,90,0.25)',
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  simulateBtnInner: {paddingVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center'},
  simulateDot:      {width: 7, height: 7, borderRadius: 4},
  simulateBtnText:  {fontSize: 12, fontWeight: '600', letterSpacing: 2.5, color: 'rgba(25,35,75,0.90)', textTransform: 'uppercase'},
  simulateHint:     {fontSize: 10, color: 'rgba(40,50,90,0.60)', letterSpacing: 0.5, marginTop: -12},
});