import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

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
    <View style={styles.container}>
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
    </View>
  );
}