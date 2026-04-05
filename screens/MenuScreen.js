import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../config/admin';
import { showDestructiveConfirm } from '../utils/alertUtils';
import { canShareApp } from '../utils/premiumUtils';

export default function MenuScreen({ navigation }) {
  const { user, userProfile, signOut } = useAuth();
  const menuItems = [
    { name: 'About Us', screen: 'AboutUs' },
    { name: 'About You', screen: 'AboutYou' },
    { name: 'Choose Your Skin', screen: 'ThemePicker' },
    { name: 'Coming Soon', screen: 'ComingSoon' },
    { name: 'FAQ', screen: 'FAQ' },
    { name: 'Intro Slide Deck', screen: 'Intro', params: { fromMenu: true } },
    { name: 'Invite Friends', screen: 'InviteFriends' },
    { name: 'Legal Policies', screen: 'Legal' },
    { name: 'Premium Membership', screen: 'PremiumSignup' },
    { name: 'Quick Launch Info', screen: 'QuickLaunch' },
    { name: 'Quotes', screen: 'Quotes' },
    ...(user && userProfile && canShareApp(userProfile) ? [
      { name: 'Share the App', screen: 'ShareApp' },
    ] : []),
    { name: 'Log Out', screen: null },
    ...(user && isAdmin(user.uid) ? [
      { name: '_Admin Analytics', screen: 'Analytics' },
      { name: '_Admin Bug Check', screen: 'Diagnostics' },
      { name: '_Admin Feature Ideas', screen: 'FeatureIdeas' },
      { name: '_Admin Invite Template', screen: 'InviteTemplate' },
    ] : []),
  ];

  const handleItemPress = async (item) => {
    if (item.name === 'Log Out') {
      showDestructiveConfirm(
        'Log Out',
        'Are you sure you want to log out?',
        async () => {
          await signOut();
        },
        'Log Out'
      );
    } else if (item.screen) {
      navigation.navigate(item.screen, item.params || {});
    }
  };

  return (
    <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Menu</Text>
        
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItem}
              onPress={() => handleItemPress(item)}
            >
              <Text style={styles.menuItemText}>{item.name}</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  content: {
    padding: 20,
  },
  header: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#8E0DD3',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  menuContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuItemText: {
    fontSize: 18,
    color: '#4B0082',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 24,
    color: '#4B0082',
  },
});
