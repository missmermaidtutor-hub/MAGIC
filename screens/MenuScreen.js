import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ImageBackground } from 'react-native';

export default function MenuScreen({ navigation }) {
  const menuItems = [
    { name: 'Home Page', screen: 'Home' },
    { name: 'About Us', screen: 'AboutUs' },
    { name: 'About You', screen: 'AboutYou' },
    { name: 'Streak', screen: 'Grow' },
    { name: 'Quotes', screen: 'Quotes' },
    { name: 'Settings', screen: 'Settings' },
    { name: 'Legal Policies', screen: 'Legal' },
    { name: 'Contact Us', screen: 'Contact' },
    { name: 'Log Out', screen: null }
  ];

  const handleItemPress = (item) => {
    if (item.name === 'Log Out') {
      Alert.alert('Log Out', 'Log out feature coming soon!');
    } else if (item.screen) {
      navigation.navigate(item.screen);
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
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  menuContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
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
    color: '#90EE90',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 24,
    color: '#FFD700',
  },
});
