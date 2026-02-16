import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Import screens
import HomeScreen from './screens/HomeScreen';
import ManifestScreen from './screens/ManifestScreen';
import ArtScreen from './screens/ArtScreen';
import GoalScreen from './screens/GoalScreen';
import InspireScreen from './screens/InspireScreen';
import CommunityScreen from './screens/CommunityScreen';
import MenuScreen from './screens/MenuScreen';

const Tab = createBottomTabNavigator();

// Custom Tab Bar Icon Component
function TabIcon({ color, focused, emoji }) {
  return (
    <View style={[styles.tabIcon, { backgroundColor: color }]}>
      <View style={styles.tabIconInner} />
      {focused && <View style={styles.tabIconGlow} />}
    </View>
  );
}

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: '#FFD700',
            tabBarInactiveTintColor: '#666',
            tabBarLabelStyle: styles.tabLabel,
          }}
        >
          <Tab.Screen 
            name="Home" 
            component={HomeScreen}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon color="#90EE90" focused={focused} />
              ),
            }}
          />
          <Tab.Screen 
            name="Manifest" 
            component={ManifestScreen}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon color="#DDA0DD" focused={focused} />
              ),
            }}
          />
          <Tab.Screen 
            name="Art" 
            component={ArtScreen}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon color="#FFD700" focused={focused} />
              ),
            }}
          />
          <Tab.Screen 
            name="Goal" 
            component={GoalScreen}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon color="#FF6B6B" focused={focused} />
              ),
            }}
          />
          <Tab.Screen 
            name="Inspire" 
            component={InspireScreen}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon color="#87CEEB" focused={focused} />
              ),
            }}
          />
          <Tab.Screen 
            name="Community" 
            component={CommunityScreen}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon color="#DDA0DD" focused={focused} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 2,
    borderTopColor: '#B8860B',
    height: 80,
    paddingBottom: 10,
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 5,
  },
  tabIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabIconInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    opacity: 0.4,
  },
  tabIconGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    top: -5,
    left: -5,
  },
});
