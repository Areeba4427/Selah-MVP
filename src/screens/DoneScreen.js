// src/screens/DoneScreen.js
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

export default function DoneScreen({navigation, route}) {
  const {settings} = useApp();
  const closing  = route.params?.closing || "God's peace is yours";
  const doneRef  = useRef(false);

  const closingOpacity = useRef(new Animated.Value(0)).current;
  const selahOpacity   = useRef(new Animated.Value(0)).current;
  const screenOpacity  = useRef(new Animated.Value(1)).current;

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    Animated.timing(screenOpacity, {
      toValue: 0, duration: 900, useNativeDriver: true,
    }).start(() => navigation.popToTop());
  };

  useEffect(() => {
    // 1. Closing line fades in
    Animated.timing(closingOpacity, {toValue: 1, duration: 900, useNativeDriver: true}).start(() => {
      // 2. Hold 3.5s
      const t1 = setTimeout(() => {
        // 3. Fade out closing line
        Animated.timing(closingOpacity, {toValue: 0, duration: 700, useNativeDriver: true}).start(() => {
          // 4. "Selah" rises in
          Animated.timing(selahOpacity, {toValue: 1, duration: 1200, useNativeDriver: true}).start(() => {
            // 5. Hold 1.2s
            const t2 = setTimeout(() => {
              // 6. Soft haptic tap as Selah fades
              if (settings?.hapticsEnabled) {
                HapticService.closing();
              }
              // 7. Selah fades out
              Animated.timing(selahOpacity, {toValue: 0, duration: 1400, useNativeDriver: true}).start(() => {
                setTimeout(finish, 300);
              });
            }, 1200);
            return () => clearTimeout(t2);
          });
        });
      }, 3500);
      return () => clearTimeout(t1);
    });
  }, []);

  return (
    <TouchableWithoutFeedback onPress={finish}>
      <Animated.View style={[styles.root, {opacity: screenOpacity}]}>
        <StatusBar hidden />

        <LinearGradient
          colors={['#eceef6', '#d4d8ec', '#b8bedd', '#8e97c4', '#6870a8']}
          locations={[0, 0.22, 0.48, 0.74, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <Animated.View style={[styles.centerWrap, {opacity: closingOpacity}]}>
          <ClosingText closing={closing} />
        </Animated.View>

        <Animated.View style={[styles.centerWrap, {opacity: selahOpacity}]}>
          <Text style={styles.selahText}>Selah</Text>
        </Animated.View>

      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

function ClosingText({closing}) {
  if (closing === "God's thoughts are full of you") {
    return (
      <Text style={styles.closingText}>
        {"God's thoughts are full of "}
        <Text style={[styles.closingText, {fontStyle: 'italic'}]}>you</Text>
      </Text>
    );
  }
  return <Text style={styles.closingText}>{closing}</Text>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eceef6',
  },
  centerWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  closingText: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 0.4,
    color: 'rgba(30,40,80,0.80)',
    textAlign: 'center',
    lineHeight: 36,
  },
  selahText: {
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: 5,
    color: '#8a7055',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
