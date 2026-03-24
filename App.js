// App.js
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {AppProvider, useApp} from './src/context/AppContext';
import {Colors, Typography} from './src/theme';

import HomeScreen from './src/screens/HomeScreen';
import AlertScreen from './src/screens/AlertScreen';
import BreatheScreen from './src/screens/BreatheScreen';
import DoneScreen from './src/screens/DoneScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: {backgroundColor: Colors.bg, elevation: 0, shadowOpacity: 0},
  headerTintColor: Colors.text,
  headerTitleStyle: {fontSize: 13, letterSpacing: 2, fontWeight: '500'},
  cardStyle: {backgroundColor: Colors.bg},
  headerBackTitleVisible: false,
};

function TabIcon({name, focused, accent}) {
  const icons = {
    Home: focused ? '⬤' : '○',
    Settings: focused ? '✦' : '✧',
  };
  return (
    <View style={tabStyles.iconWrap}>
      <Text style={[tabStyles.icon, focused && {color: accent}]}>{icons[name]}</Text>
      <Text style={[tabStyles.label, focused && {color: accent}]}>{name.toUpperCase()}</Text>
    </View>
  );
}

function MainTabs() {
  const {isSecular} = useApp();
  const accent = isSecular ? Colors.secularPrimary : Colors.faithPrimary;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: tabStyles.bar,
        tabBarShowLabel: false,
        headerShown: false,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({focused}) => <TabIcon name="Home" focused={focused} accent={accent} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({focused}) => <TabIcon name="Settings" focused={focused} accent={accent} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RootStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Alert"
        component={AlertScreen}
        options={{headerShown: false, gestureEnabled: false, presentation: 'modal'}}
      />
      <Stack.Screen
        name="Breathe"
        component={BreatheScreen}
        options={{headerShown: false, gestureEnabled: false}}
      />
      <Stack.Screen
        name="Done"
        component={DoneScreen}
        options={{headerShown: false, gestureEnabled: false}}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <AppProvider>
          <NavigationContainer
            theme={{
              dark: true,
              colors: {
                primary: Colors.faithPrimary,
                background: Colors.bg,
                card: Colors.surface,
                text: Colors.text,
                border: Colors.border,
                notification: Colors.faithPrimary,
              },
            }}>
            <RootStack />
          </NavigationContainer>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 8,
  },
  icon: {
    fontSize: 10,
    color: Colors.textDim,
  },
  label: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Colors.textDim,
  },
});
