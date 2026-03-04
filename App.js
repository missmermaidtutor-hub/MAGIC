import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Auth
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth screens
import LoginScreen from './screens/auth/LoginScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';

// Import screens
import HomeScreen from './screens/HomeScreen';
import ManifestScreen from './screens/ManifestScreen';
import ArtScreen from './screens/ArtScreen';
import GoalScreen from './screens/GoalScreen';
import InspireScreen from './screens/InspireScreen';
import CommunityScreen from './screens/CommunityScreen';
import MenuScreen from './screens/MenuScreen';
import StreakScreen from './screens/StreakScreen';

// Import menu pages
import AboutUsScreen from './screens/menu-pages/AboutUsScreen';
import AboutYouScreen from './screens/menu-pages/AboutYouScreen';
import QuotesScreen from './screens/menu-pages/QuotesScreen';
// Settings now merged into AboutYou — keep route for backwards compatibility
const SettingsScreen = AboutYouScreen;
import LegalScreen from './screens/menu-pages/LegalScreen';
import ContactScreen from './screens/menu-pages/ContactScreen';

const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

// Flower images for tab icons
const flowerImages = {
  Home: require('./Cliparts/flower_purple.jpg'),
  Manifest: require('./Cliparts/flower_red.jpg'),
  Art: require('./Cliparts/flower-orange.png'),
  Grow: require('./Cliparts/flower_yellow.jpg'),
  Inspire: require('./Cliparts/flower_green.jpg'),
  Connect: require('./Cliparts/flower_Blue.jpeg'),
};

// Custom Tab Bar Icon Component — round flower button
function TabIcon({ tabName, focused }) {
  return (
    <View style={styles.tabIconWrapper}>
      {focused && <View style={styles.tabIconGlow} />}
      <View style={styles.tabIcon}>
        <Image
          source={flowerImages[tabName]}
          style={styles.tabIconImage}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ navigation, route }) => {
        const visibleTabs = ['Home', 'Manifest', 'Art', 'Grow', 'Inspire', 'Connect'];
        const isVisibleTab = visibleTabs.includes(route.name);
        return {
          headerShown: isVisibleTab,
          headerTransparent: true,
          headerTitle: '',
          headerStyle: { backgroundColor: 'transparent', borderBottomWidth: 0, elevation: 0, shadowOpacity: 0 },
          headerRight: isVisibleTab ? () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Menu')}
              style={styles.hamburgerButton}
            >
              <Text style={styles.hamburgerText}>☰</Text>
            </TouchableOpacity>
          ) : undefined,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#B8860B',
          tabBarInactiveTintColor: '#888',
          tabBarLabelStyle: styles.tabLabel,
        };
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon tabName="Home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Manifest"
        component={ManifestScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon tabName="Manifest" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Art"
        component={ArtScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon tabName="Art" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Grow"
        component={StreakScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon tabName="Grow" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Inspire"
        component={InspireScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon tabName="Inspire" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Connect"
        component={CommunityScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon tabName="Connect" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarButton: () => null, // Hides from tab bar
        }}
      />
      <Tab.Screen
        name="AboutUs"
        component={AboutUsScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="AboutYou"
        component={AboutYouScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Quotes"
        component={QuotesScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Legal"
        component={LegalScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Contact"
        component={ContactScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>MAGIC</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 20,
  },
  tabBar: {
    backgroundColor: '#fffaec',
    borderTopWidth: 2,
    borderTopColor: '#B8860B',
    height: 85,
    paddingBottom: 10,
    paddingTop: 5,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    color: '#333',
  },
  tabIconWrapper: {
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#B8860B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  tabIconImage: {
    width: '100%',
    height: '100%',
  },
  tabIconGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 215, 0, 0.35)',
  },
  hamburgerButton: {
    width: 44,
    height: 44,
    backgroundColor: '#050d61',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#B8860B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  hamburgerText: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
  },
});
