import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function MenuScreen({ navigation }) {
  const menuItems = [
    { name: 'Home Page', screen: 'Home' },
    { name: 'Streak', screen: 'Streak' },
    { name: 'About Us', screen: null },
    { name: 'About You', screen: null },
    { name: 'Quotes', screen: null },
    { name: 'Research/Articles', screen: null },
    { name: 'Settings', screen: null },
    { name: 'Legal Policies', screen: null },
    { name: 'Contact Us', screen: null },
    { name: 'Log Out', screen: null }
  ];

  const handleItemPress = (item) => {
    if (item.screen) {
      navigation.navigate(item.screen);
    } else {
      // Placeholder for future screens
      console.log(`${item.name} coming soon`);
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
