import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Switch,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen({ navigation }) {
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [anonymous, setAnonymous] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const data = JSON.parse(settings);
        setNotifications(data.notifications ?? true);
        setDailyReminder(data.dailyReminder ?? true);
        setAnonymous(data.anonymous ?? true);
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const saveSettings = async (key, value) => {
    try {
      const current = await AsyncStorage.getItem('app_settings');
      const settings = current ? JSON.parse(current) : {};
      settings[key] = value;
      await AsyncStorage.setItem('app_settings', JSON.stringify(settings));
    } catch (error) {
      console.log('Error saving settings:', error);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data?',
      'This will delete all your entries, artworks, and rankings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'All data has been cleared.');
              loadSettings();
            } catch (error) {
              Alert.alert('Error', 'Could not clear data.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with Back Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Settings</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        {/* Notifications Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>Get updates and reminders</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={(value) => {
                setNotifications(value);
                saveSettings('notifications', value);
              }}
              trackColor={{ false: '#333', true: '#9C27B0' }}
              thumbColor={notifications ? '#FFD700' : '#666'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Daily Reminder</Text>
              <Text style={styles.settingDescription}>Remind me to practice MAGIC</Text>
            </View>
            <Switch
              value={dailyReminder}
              onValueChange={(value) => {
                setDailyReminder(value);
                saveSettings('dailyReminder', value);
              }}
              trackColor={{ false: '#333', true: '#9C27B0' }}
              thumbColor={dailyReminder ? '#FFD700' : '#666'}
            />
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Post Anonymously</Text>
              <Text style={styles.settingDescription}>Hide your name on public posts</Text>
            </View>
            <Switch
              value={anonymous}
              onValueChange={(value) => {
                setAnonymous(value);
                saveSettings('anonymous', value);
              }}
              trackColor={{ false: '#333', true: '#9C27B0' }}
              thumbColor={anonymous ? '#FFD700' : '#666'}
            />
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={handleClearData}
          >
            <Text style={styles.dangerButtonText}>Clear All Data</Text>
          </TouchableOpacity>
          
          <Text style={styles.warningText}>
            ⚠️ This will delete all your entries, artworks, and rankings permanently.
          </Text>
        </View>

        {/* App Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>MAGIC Tracker v1.0.0</Text>
          <Text style={styles.infoSubtext}>Daily Creative Practice for Mental Health</Text>
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 40,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1a1a1a',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  backButtonPlaceholder: {
    width: 44,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#87CEEB',
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    color: '#DDA0DD',
    marginBottom: 4,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  dangerButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 12,
    color: '#FF6B6B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#444',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#87CEEB',
    marginBottom: 5,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
