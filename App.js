import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Image, ImageBackground, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initSentry, Sentry } from './config/sentry';
import {
  configureNotificationHandler,
  requestNotificationPermissions,
  setupNotificationChannel,
  scheduleStreakReminder,
} from './utils/notificationUtils';

initSentry();
configureNotificationHandler();

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
import DiscussionPodsScreen from './screens/DiscussionPodsScreen';
import PodChatScreen from './screens/PodChatScreen';
import ManagePodsScreen from './screens/ManagePodsScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import DiagnosticsScreen from './screens/DiagnosticsScreen';
import { initAnalytics, stopAnalytics, onScreenChange } from './services/analyticsService';

// Import menu pages
import AboutUsScreen from './screens/menu-pages/AboutUsScreen';
import AboutYouScreen from './screens/menu-pages/AboutYouScreen';
import QuotesScreen from './screens/menu-pages/QuotesScreen';
// Settings now merged into AboutYou — keep route for backwards compatibility
const SettingsScreen = AboutYouScreen;
import LegalScreen from './screens/menu-pages/LegalScreen';
import ContactScreen from './screens/menu-pages/ContactScreen';
import QuickLaunchScreen from './screens/menu-pages/QuickLaunchScreen';
import ComingSoonScreen from './screens/menu-pages/ComingSoonScreen';
import ShareAppScreen from './screens/menu-pages/ShareAppScreen';
import InviteFriendsScreen from './screens/menu-pages/InviteFriendsScreen';
import InviteTemplateScreen from './screens/admin/InviteTemplateScreen';
import InviteAnalyticsScreen from './screens/admin/InviteAnalyticsScreen';
import FeatureIdeasScreen from './screens/FeatureIdeasScreen';
import IntroScreen from './screens/IntroScreen';
import PremiumSignupScreen from './screens/menu-pages/PremiumSignupScreen';

const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

// MAGIC tab bar icons — images for Home/Grow, emoji for the rest
const tabImages = {
  Home: require('./assets/home.png'),
  Grow: require('./assets/small-tree-icon-7690.jpg'),
  Connect: require('./assets/Connect.png'),
};

const tabEmojis = {
  Manifest: '📝',
  Art: '🎨',
  Inspire: '✨',
};

const tabColors = {
  Home: '#B8860B',
  Manifest: '#78000E',
  Art: '#9E4502',
  Grow: '#c1a900',
  Inspire: '#3c9820',
  Connect: '#5008a7',
};

// Tabs where the image needs to zoom in (whitespace around the art)
const zoomedTabs = { Home: true, Connect: true };

// Custom Tab Bar Icon Component — round button (image or emoji)
function TabIcon({ tabName, focused }) {
  const isImage = !!tabImages[tabName];
  const zoomed = zoomedTabs[tabName];
  return (
    <View style={styles.tabIconWrapper}>
      {focused && <View style={styles.tabIconGlow} />}
      <View style={[styles.tabIcon, isImage && styles.tabIconImageContainer, { borderColor: tabColors[tabName] || '#B8860B' }]}>
        {isImage ? (
          <Image source={tabImages[tabName]} style={zoomed ? styles.tabIconImageZoomed : styles.tabIconImage} resizeMode="cover" />
        ) : (
          <Text style={styles.tabIconEmoji}>{tabEmojis[tabName]}</Text>
        )}
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

function MainTabs({ initialRoute = 'Home' }) {
  return (
    <Tab.Navigator
      initialRouteName={initialRoute}
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
      <Tab.Screen
        name="QuickLaunch"
        component={QuickLaunchScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Intro"
        component={IntroScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="DiscussionPods"
        component={DiscussionPodsScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="PodChat"
        component={PodChatScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="ManagePods"
        component={ManagePodsScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Diagnostics"
        component={DiagnosticsScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="ComingSoon"
        component={ComingSoonScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="ShareApp"
        component={ShareAppScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="FeatureIdeas"
        component={FeatureIdeasScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="InviteFriends"
        component={InviteFriendsScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="InviteTemplate"
        component={InviteTemplateScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="PremiumSignup"
        component={PremiumSignupScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="InviteAnalytics"
        component={InviteAnalyticsScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { user, userProfile, loading } = useAuth();
  const [initialRoute, setInitialRoute] = useState(null);
  const [checkingLaunch, setCheckingLaunch] = useState(true);
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    // Only determine initial route when user is fully authenticated with a profile
    // This ensures we re-check after signup (which clears quick_launch_dismissed)
    if (!user || !userProfile) {
      setInitialRoute(null);
      setCheckingLaunch(true);
      return;
    }

    const checkQuickLaunch = async () => {
      try {
        const dismissed = await AsyncStorage.getItem('quick_launch_dismissed');
        setInitialRoute(dismissed === 'true' ? 'Home' : 'Intro');
      } catch {
        setInitialRoute('Home');
      }
      setCheckingLaunch(false);
    };
    checkQuickLaunch();
  }, [user, userProfile]);

  // Initialize/teardown analytics when user changes
  useEffect(() => {
    if (user && user.uid !== 'local') {
      initAnalytics(user.uid);
    } else {
      stopAnalytics();
    }
    return () => stopAnalytics();
  }, [user]);

  // Set up streak reminder notifications when user profile is available
  useEffect(() => {
    if (userProfile) {
      const setupNotifications = async () => {
        await setupNotificationChannel();
        await requestNotificationPermissions();
        const tz = userProfile.timezone || 'America/New_York';
        const pref = userProfile.notificationPreference || 'daily';
        await scheduleStreakReminder(tz, pref);
      };
      setupNotifications();
    }
  }, [userProfile]);

  const handleNavigationStateChange = () => {
    const currentRoute = navigationRef.getCurrentRoute();
    if (currentRoute?.name) {
      onScreenChange(currentRoute.name);
    }
    // User is interacting — cancel today's reminder, schedule for tomorrow
    if (userProfile) {
      const tz = userProfile.timezone || 'America/New_York';
      const pref = userProfile.notificationPreference || 'daily';
      scheduleStreakReminder(tz, pref, true); // forTomorrow = true
    }
  };

  if (loading || (user && userProfile && checkingLaunch)) {
    return (
      <ImageBackground source={require('./assets/background.png')} style={styles.loadingContainer} resizeMode="cover">
        <ActivityIndicator size="large" color="#FFD700" />
        <View style={styles.loadingLetters}>
          <Text style={[styles.loadingLetter, { color: '#78000E' }]}>M</Text>
          <Text style={[styles.loadingLetter, { color: '#9E4502' }]}>A</Text>
          <Text style={[styles.loadingLetter, { color: '#c1a900' }]}>G</Text>
          <Text style={[styles.loadingLetter, { color: '#3c9820' }]}>I</Text>
          <Text style={[styles.loadingLetter, { color: '#5008a7' }]}>C</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        const route = navigationRef.getCurrentRoute();
        if (route?.name) onScreenChange(route.name);
      }}
      onStateChange={handleNavigationStateChange}
    >
      {user && userProfile ? <MainTabs initialRoute={initialRoute} /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

function App() {
  return (
    <>
      <StatusBar style="light" />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </>
  );
}

export default Sentry.wrap(App);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLetters: {
    flexDirection: 'row',
    marginTop: 20,
  },
  loadingLetter: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 2,
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
    borderWidth: 2,
    borderColor: '#B8860B',
    backgroundColor: '#fffaec',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  tabIconImageContainer: {
    overflow: 'hidden',
  },
  tabIconImage: {
    width: '100%',
    height: '100%',
  },
  tabIconImageZoomed: {
    width: '140%',
    height: '140%',
  },
  tabIconEmoji: {
    fontSize: 22,
    textAlign: 'center',
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
