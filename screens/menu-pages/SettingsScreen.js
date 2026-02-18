import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mediumsData from '../../mediums.json';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Phoenix',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

const TIMEZONE_LABELS = {
  'America/New_York': 'Eastern (EST/EDT)',
  'America/Chicago': 'Central (CST/CDT)',
  'America/Denver': 'Mountain (MST/MDT)',
  'America/Los_Angeles': 'Pacific (PST/PDT)',
  'America/Anchorage': 'Alaska (AKST/AKDT)',
  'Pacific/Honolulu': 'Hawaii (HST)',
  'America/Phoenix': 'Arizona (MST)',
  'America/Toronto': 'Toronto (EST/EDT)',
  'America/Vancouver': 'Vancouver (PST/PDT)',
  'Europe/London': 'London (GMT/BST)',
  'Europe/Paris': 'Paris (CET/CEST)',
  'Europe/Berlin': 'Berlin (CET/CEST)',
  'Asia/Tokyo': 'Tokyo (JST)',
  'Asia/Shanghai': 'Shanghai (CST)',
  'Asia/Kolkata': 'Kolkata (IST)',
  'Australia/Sydney': 'Sydney (AEST/AEDT)',
};

const ACCOUNT_METHODS = [
  { key: 'apple', label: 'Apple ID' },
  { key: 'google', label: 'Google' },
  { key: 'email', label: 'Email' },
];

const MEDIUM_CATEGORIES = Object.keys(mediumsData);

export default function SettingsScreen({ navigation }) {
  // Preferences (existing)
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [anonymous, setAnonymous] = useState(true);

  // Account
  const [accountMethod, setAccountMethod] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');

  // Timezone
  const [timezone, setTimezone] = useState('America/New_York');
  const [showTimezoneList, setShowTimezoneList] = useState(false);

  // Location
  const [currentLocation, setCurrentLocation] = useState({ country: '', state: '', city: '' });
  const [heartLocation, setHeartLocation] = useState({ country: '', state: '', city: '' });

  // Medium Favorites
  const [favoriteMediums, setFavoriteMediums] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const raw = await AsyncStorage.getItem('app_settings');
      if (raw) {
        const data = JSON.parse(raw);
        setNotifications(data.notifications ?? true);
        setDailyReminder(data.dailyReminder ?? true);
        setAnonymous(data.anonymous ?? true);
        setAccountMethod(data.accountMethod ?? '');
        setEmail(data.email ?? '');
        setUsername(data.username ?? '');
        setTimezone(data.timezone ?? 'America/New_York');
        setCurrentLocation(data.currentLocation ?? { country: '', state: '', city: '' });
        setHeartLocation(data.heartLocation ?? { country: '', state: '', city: '' });
        setFavoriteMediums(data.favoriteMediums ?? []);
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

  const toggleMedium = (medium) => {
    setFavoriteMediums(prev => {
      const next = prev.includes(medium)
        ? prev.filter(m => m !== medium)
        : [...prev, medium];
      saveSettings('favoriteMediums', next);
      return next;
    });
  };

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data?',
      'This will delete all your entries, artworks, and rankings. This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'All of your data will be permanently erased. This cannot be undone.',
              [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Yes, Clear Everything',
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

        {/* ===== A. ACCOUNT ===== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Text style={styles.settingLabel}>Sign-in Method</Text>
          <View style={styles.methodRow}>
            {ACCOUNT_METHODS.map(method => (
              <TouchableOpacity
                key={method.key}
                style={[
                  styles.methodButton,
                  accountMethod === method.key && styles.methodButtonActive,
                ]}
                onPress={() => {
                  setAccountMethod(method.key);
                  saveSettings('accountMethod', method.key);
                }}
              >
                <Text style={[
                  styles.methodButtonText,
                  accountMethod === method.key && styles.methodButtonTextActive,
                ]}>{method.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.textInput}
            value={email}
            onChangeText={setEmail}
            onEndEditing={() => saveSettings('email', email)}
            placeholder="your@email.com"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.textInput}
            value={username}
            onChangeText={setUsername}
            onEndEditing={() => saveSettings('username', username)}
            placeholder="ArtistName"
            placeholderTextColor="#555"
          />

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => Alert.alert('Coming Soon', 'Password reset will be available in a future update.')}
          >
            <Text style={styles.secondaryButtonText}>Password Reset</Text>
          </TouchableOpacity>
        </View>

        {/* ===== B. TIMEZONE ===== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Timezone</Text>

          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowTimezoneList(!showTimezoneList)}
          >
            <Text style={styles.dropdownText}>
              {TIMEZONE_LABELS[timezone] || timezone}
            </Text>
            <Text style={styles.dropdownArrow}>{showTimezoneList ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showTimezoneList && (
            <View style={styles.dropdownList}>
              {TIMEZONES.map(tz => (
                <TouchableOpacity
                  key={tz}
                  style={[
                    styles.dropdownItem,
                    timezone === tz && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setTimezone(tz);
                    saveSettings('timezone', tz);
                    setShowTimezoneList(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    timezone === tz && styles.dropdownItemTextActive,
                  ]}>{TIMEZONE_LABELS[tz] || tz}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ===== C. LOCATION ===== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Location</Text>

          <Text style={styles.locationSubtitle}>Current Location</Text>
          <View style={styles.locationRow}>
            <View style={styles.locationField}>
              <Text style={styles.inputLabelSmall}>Country</Text>
              <TextInput
                style={styles.textInputSmall}
                value={currentLocation.country}
                onChangeText={v => setCurrentLocation(prev => ({ ...prev, country: v }))}
                onEndEditing={() => saveSettings('currentLocation', currentLocation)}
                placeholder="US"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.locationField}>
              <Text style={styles.inputLabelSmall}>State</Text>
              <TextInput
                style={styles.textInputSmall}
                value={currentLocation.state}
                onChangeText={v => setCurrentLocation(prev => ({ ...prev, state: v }))}
                onEndEditing={() => saveSettings('currentLocation', currentLocation)}
                placeholder="New York"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.locationField}>
              <Text style={styles.inputLabelSmall}>City</Text>
              <TextInput
                style={styles.textInputSmall}
                value={currentLocation.city}
                onChangeText={v => setCurrentLocation(prev => ({ ...prev, city: v }))}
                onEndEditing={() => saveSettings('currentLocation', currentLocation)}
                placeholder="Brooklyn"
                placeholderTextColor="#555"
              />
            </View>
          </View>

          <Text style={styles.locationSubtitle}>Heart Location</Text>
          <View style={styles.locationRow}>
            <View style={styles.locationField}>
              <Text style={styles.inputLabelSmall}>Country</Text>
              <TextInput
                style={styles.textInputSmall}
                value={heartLocation.country}
                onChangeText={v => setHeartLocation(prev => ({ ...prev, country: v }))}
                onEndEditing={() => saveSettings('heartLocation', heartLocation)}
                placeholder="Country"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.locationField}>
              <Text style={styles.inputLabelSmall}>State</Text>
              <TextInput
                style={styles.textInputSmall}
                value={heartLocation.state}
                onChangeText={v => setHeartLocation(prev => ({ ...prev, state: v }))}
                onEndEditing={() => saveSettings('heartLocation', heartLocation)}
                placeholder="State"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.locationField}>
              <Text style={styles.inputLabelSmall}>City</Text>
              <TextInput
                style={styles.textInputSmall}
                value={heartLocation.city}
                onChangeText={v => setHeartLocation(prev => ({ ...prev, city: v }))}
                onEndEditing={() => saveSettings('heartLocation', heartLocation)}
                placeholder="City"
                placeholderTextColor="#555"
              />
            </View>
          </View>
        </View>

        {/* ===== D. MEDIUM FAVORITES ===== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Medium Favorites</Text>

          {/* Selected mediums chips */}
          {favoriteMediums.length > 0 && (
            <View style={styles.chipContainer}>
              {favoriteMediums.map(med => (
                <TouchableOpacity
                  key={med}
                  style={styles.chip}
                  onPress={() => toggleMedium(med)}
                >
                  <Text style={styles.chipText}>{med}</Text>
                  <Text style={styles.chipRemove}> x</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Category sections */}
          {MEDIUM_CATEGORIES.map(cat => (
            <View key={cat}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(cat)}
              >
                <Text style={styles.categoryTitle}>{cat}</Text>
                <Text style={styles.categoryArrow}>
                  {expandedCategories[cat] ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {expandedCategories[cat] && (
                <View style={styles.mediumList}>
                  {mediumsData[cat].map(medium => (
                    <TouchableOpacity
                      key={medium}
                      style={[
                        styles.mediumItem,
                        favoriteMediums.includes(medium) && styles.mediumItemActive,
                      ]}
                      onPress={() => toggleMedium(medium)}
                    >
                      <Text style={[
                        styles.mediumText,
                        favoriteMediums.includes(medium) && styles.mediumTextActive,
                      ]}>{medium}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ===== E. PREFERENCES ===== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Preferences</Text>

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

        {/* ===== F. DATA & INFO ===== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Data & Info</Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearData}
          >
            <Text style={styles.dangerButtonText}>Clear All Data</Text>
          </TouchableOpacity>

          <Text style={styles.warningText}>
            This will delete all your entries, artworks, and rankings permanently.
          </Text>
        </View>

        {/* App Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>MAGIC Tracker v1.0.0</Text>
          <Text style={styles.infoSubtext}>Daily Creative Practice for Mental Health</Text>
        </View>

        <View style={{ height: 40 }} />
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

  // Account section
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    marginTop: 8,
  },
  methodButton: {
    flex: 1,
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  methodButtonActive: {
    borderColor: '#FFD700',
    backgroundColor: '#2a2a1a',
  },
  methodButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  methodButtonTextActive: {
    color: '#FFD700',
  },
  inputLabel: {
    fontSize: 14,
    color: '#DDA0DD',
    marginBottom: 6,
    marginTop: 12,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  secondaryButton: {
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#87CEEB',
  },
  secondaryButtonText: {
    color: '#87CEEB',
    fontSize: 14,
    fontWeight: '600',
  },

  // Timezone
  dropdownButton: {
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  dropdownText: {
    color: 'white',
    fontSize: 16,
  },
  dropdownArrow: {
    color: '#FFD700',
    fontSize: 14,
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    maxHeight: 240,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  dropdownItemActive: {
    backgroundColor: '#2a2a1a',
  },
  dropdownItemText: {
    color: '#ccc',
    fontSize: 15,
  },
  dropdownItemTextActive: {
    color: '#FFD700',
    fontWeight: '600',
  },

  // Location
  locationSubtitle: {
    fontSize: 16,
    color: '#DDA0DD',
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  locationField: {
    flex: 1,
  },
  inputLabelSmall: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  textInputSmall: {
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    padding: 10,
    color: 'white',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#444',
  },

  // Medium Favorites
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  chip: {
    flexDirection: 'row',
    backgroundColor: '#2a2a1a',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  chipText: {
    color: '#FFD700',
    fontSize: 13,
  },
  chipRemove: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  categoryTitle: {
    fontSize: 17,
    color: '#DDA0DD',
    fontWeight: '600',
  },
  categoryArrow: {
    color: '#FFD700',
    fontSize: 14,
  },
  mediumList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 12,
  },
  mediumItem: {
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  mediumItemActive: {
    borderColor: '#FFD700',
    backgroundColor: '#2a2a1a',
  },
  mediumText: {
    color: '#ccc',
    fontSize: 13,
  },
  mediumTextActive: {
    color: '#FFD700',
    fontWeight: '600',
  },

  // Preferences (existing styles)
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

  // Data & Info
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
