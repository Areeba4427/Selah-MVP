// src/screens/AlertScreen.js
//
// Fix from previous version:
//   HapticService.detection() moved from screen mount into the t0 callback,
//   so it fires at Phase 1 (gradient rise, ~0.8s in) — not while the screen
//   is still black. Matches AlertView.swift which fires playDetection() at
//   the same moment. Previously the haptic fired 0.8s before any visual,
//   making it feel disconnected.

import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  TouchableWithoutFeedback,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useApp} from '../context/AppContext';
import HapticService from '../services/HapticService';

export default function AlertScreen({navigation, route}) {
  const prompt     = route.params?.prompt;
  const skippedRef = useRef(false);
  const {settings} = useApp();
  const hapticsEnabled = settings?.hapticsEnabled;

  const lightOpacity = useRef(new Animated.Value(0)).current;
  const refOpacity   = useRef(new Animated.Value(0)).current;

  const goToBreathe = () => {
    if (skippedRef.current) return;
    skippedRef.current = true;
    navigation.replace('Breathe', {prompt});
  };

  useEffect(() => {
    // Phase 0 — dark pause (0.8s)
    const t0 = setTimeout(() => {

      // Phase 1 — gradient rises + haptic fires together
      // Haptic moved here from screen mount so it lands with the visual,
      // not 0.8s before it in the dark.
      if (hapticsEnabled) {
        HapticService.detection();
      }

      Animated.timing(lightOpacity, {
        toValue: 1, duration: 1600, useNativeDriver: true,
      }).start(() => {

        // Phase 2 — scripture reference fades in
        Animated.timing(refOpacity, {
          toValue: 1, duration: 700, useNativeDriver: true,
        }).start(() => {

          // Hold 3s then fade out and navigate
          const t2 = setTimeout(() => {
            Animated.timing(refOpacity, {
              toValue: 0, duration: 600, useNativeDriver: true,
            }).start(() => goToBreathe());
          }, 3000);

          return () => clearTimeout(t2);
        });
      });
    }, 800);

    return () => {
      clearTimeout(t0);
      HapticService.cancel();
    };
  }, []);

  return (
    <TouchableWithoutFeedback onPress={goToBreathe}>
      <View style={styles.root}>
        <StatusBar hidden />

        {/* Black base */}
        <View style={[StyleSheet.absoluteFillObject, {backgroundColor: '#04060a'}]} />

        {/* Icy gradient fades in */}
        <Animated.View style={[StyleSheet.absoluteFillObject, {opacity: lightOpacity}]}>
          <LinearGradient
            colors={['#eceef6', '#d4d8ec', '#b8bedd', '#8e97c4', '#6870a8']}
            locations={[0, 0.22, 0.48, 0.74, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        {/* Scripture reference */}
        <Animated.View style={[styles.centerWrap, {opacity: refOpacity}]}>
          <Text style={styles.referenceText}>
            {prompt?.source || 'Isaiah 26:3'}
          </Text>
        </Animated.View>

      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#04060a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  referenceText: {
    fontSize: 26,
    fontWeight: '400',
    letterSpacing: 0.8,
    color: 'rgba(30,40,80,0.92)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 38,
  },
});