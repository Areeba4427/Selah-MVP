// src/services/WatchBridge.js
//
// iPhone → Watch communication.
// When simulate is pressed on iPhone, Watch receives it and shows the flow.
// When Watch detects stress, iPhone updates its UI.
//
// Uses react-native-watch-connectivity package.
// INSTALL AT LAB: npm install react-native-watch-connectivity
//                 cd ios && pod install && cd ..

import {Platform} from 'react-native';

let WatchConnectivity = null;
if (Platform.OS === 'ios') {
  try {
    WatchConnectivity = require('react-native-watch-connectivity');
  } catch (e) {
    console.log('[Selah] react-native-watch-connectivity not installed');
  }
}

const WatchBridge = {

  // Send stress trigger to Watch (when iPhone simulate button pressed)
  sendSimulateToWatch: (isSecular = false) => {
    if (!WatchConnectivity) return;
    try {
      WatchConnectivity.sendMessage(
        {event: 'simulateStress', isSecular},
        () => console.log('[Selah] Simulate sent to Watch'),
        (err) => console.log('[Selah] Watch send error:', err),
      );
    } catch (e) {
      console.log('[Selah] WatchBridge error:', e);
    }
  },

  // Send mode change to Watch
  sendModeToWatch: (isSecular) => {
    if (!WatchConnectivity) return;
    try {
      WatchConnectivity.sendMessage(
        {isSecular},
        null,
        null,
      );
    } catch (e) {
      console.log('[Selah] Mode send error:', e);
    }
  },

  // Listen for Watch stress detection or session complete
  startListening: (onStressDetected, onSessionCompleted) => {
    if (!WatchConnectivity) return () => {};

    const unsubscribe = WatchConnectivity.watchEvents.on(
      'message',
      (message) => {
        if (message.event === 'stressDetected' && onStressDetected) {
          onStressDetected();
        }
        if (message.event === 'sessionCompleted' && onSessionCompleted) {
          onSessionCompleted();
        }
      },
    );

    return unsubscribe;
  },
};

export default WatchBridge;
