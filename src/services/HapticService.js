// src/services/HapticService.js
//
// Selah Haptics — uses native CoreHaptics on iOS, Vibration on Android.
//
// iOS patterns are the exact client-provided CoreHaptics sequences:
//   detection: 1.94s — fires on stress detected (AlertScreen)
//   closing:   3.17s — fires when "Selah" appears (DoneScreen)
//
// Android: approximated with Vibration API timing.

import {Platform, Vibration, NativeModules} from 'react-native';

const {SelahHaptics} = NativeModules;

const HapticService = {

  // Detection haptic — fires immediately when stress is detected
  // iOS: exact CoreHaptics pattern (1.94s)
  // Android: approximated vibration pattern
  detection: () => {
    if (Platform.OS === 'ios' && SelahHaptics) {
      SelahHaptics.playDetection();
    } else {
      // Android approximation
      Vibration.vibrate([0, 300, 50, 150, 20, 180, 100, 400]);
    }
  },

  // Closing haptic — fires when "Selah" appears on DoneScreen
  // iOS: exact CoreHaptics pattern (3.17s)
  // Android: gentle approximation
  closing: () => {
    if (Platform.OS === 'ios' && SelahHaptics) {
      SelahHaptics.playClosing();
    } else {
      // Android approximation
      Vibration.vibrate([0, 100, 400, 100, 1200, 500, 200, 30]);
    }
  },

  cancel: () => Vibration.cancel(),
};

export default HapticService;
