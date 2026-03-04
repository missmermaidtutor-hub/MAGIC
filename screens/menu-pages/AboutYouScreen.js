import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ImageBackground,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  updateUserProfile,
  checkPseudonymAvailable,
  claimPseudonym,
  releasePseudonym,
} from '../../services/firestoreService';
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

const NOTIFICATION_OPTIONS = [
  { key: 'daily', label: 'Daily Reminder' },
  { key: 'weekly', label: 'Weekly Reminder' },
  { key: 'none', label: 'No Notifications' },
];

const MEDIUM_CATEGORIES = Object.keys(mediumsData);

export default function AboutYouScreen({ navigation }) {
  const { user, userProfile, refreshProfile } = useAuth();

  // Account / Profile
  const [accountMethod, setAccountMethod] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [pseudonymAvailable, setPseudonymAvailable] = useState(null);
  const [checkingPseudonym, setCheckingPseudonym] = useState(false);
  const [birthdate, setBirthdate] = useState('');
  const [bio, setBio] = useState('');
  const [favoritePrompt, setFavoritePrompt] = useState('');

  // Preferences
  const [notificationPreference, setNotificationPreference] = useState('daily');
  const [showNotificationList, setShowNotificationList] = useState(false);
  const [anonymous, setAnonymous] = useState(true);
  const [allowWorkBoutique, setAllowWorkBoutique] = useState(false);

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

  // Sync from userProfile context when it changes
  useEffect(() => {
    if (userProfile) {
      setAccountMethod(userProfile.accountMethod || '');
      setEmail(userProfile.email || user?.email || '');
      setUsername(userProfile.pseudonym || '');
      setOriginalUsername(userProfile.pseudonym || '');
      setBirthdate(userProfile.birthdate || '');
      setBio(userProfile.bio || '');
      setFavoritePrompt(userProfile.favoritePrompt || '');
      setTimezone(userProfile.timezone || 'America/New_York');
      setCurrentLocation(userProfile.currentLocation || { country: '', state: '', city: '' });
      setHeartLocation(userProfile.heartLocation || { country: '', state: '', city: '' });
      setFavoriteMediums(userProfile.favoriteMediums || []);
      setNotificationPreference(userProfile.notificationPreference || 'daily');
      setAllowWorkBoutique(userProfile.allowWorkBoutique ?? false);
      setAnonymous(userProfile.anonymous ?? true);
    }
  }, [userProfile]);

  const loadSettings = async () => {
    try {
      const raw = await AsyncStorage.getItem('app_settings');
      if (raw) {
        const data = JSON.parse(raw);
        if (!userProfile) {
          setNotificationPreference(
            data.dailyReminder === false ? 'none' :
            data.notifications === false ? 'none' : 'daily'
          );
          setAnonymous(data.anonymous ?? true);
          setAccountMethod(data.accountMethod ?? '');
          setEmail(data.email ?? '');
          setUsername(data.username ?? '');
          setOriginalUsername(data.username ?? '');
          setTimezone(data.timezone ?? 'America/New_York');
          setCurrentLocation(data.currentLocation ?? { country: '', state: '', city: '' });
          setHeartLocation(data.heartLocation ?? { country: '', state: '', city: '' });
          setFavoriteMediums(data.favoriteMediums ?? []);
        }
      }
      // Also load bio/favoritePrompt from user_profile storage
      const profileRaw = await AsyncStorage.getItem('user_profile');
      if (profileRaw && !userProfile) {
        const profile = JSON.parse(profileRaw);
        setBio(profile.bio || '');
        setFavoritePrompt(profile.favoritePrompt || '');
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  // Dual save: AsyncStorage + Firestore
  const saveSettings = async (key, value) => {
    try {
      const current = await AsyncStorage.getItem('app_settings');
      const settings = current ? JSON.parse(current) : {};
      settings[key] = value;
      await AsyncStorage.setItem('app_settings', JSON.stringify(settings));

      if (user) {
        await updateUserProfile(user.uid, { [key]: value });
        await refreshProfile();
      }
    } catch (error) {
      console.log('Error saving settings:', error);
    }
  };

  // Debounced pseudonym check
  useEffect(() => {
    if (!username.trim() || username.trim() === originalUsername) {
      setPseudonymAvailable(null);
      return;
    }
    setCheckingPseudonym(true);
    const timer = setTimeout(async () => {
      try {
        const available = await checkPseudonymAvailable(username);
        setPseudonymAvailable(available);
      } catch {
        setPseudonymAvailable(null);
      }
      setCheckingPseudonym(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleSavePseudonym = async () => {
    const newName = username.trim();
    if (!newName) return;
    if (newName === originalUsername) return;
    if (pseudonymAvailable === false) {
      Alert.alert('Unavailable', 'This pseudonym is already taken.');
      return;
    }

    try {
      if (originalUsername) {
        await releasePseudonym(originalUsername);
      }
      await claimPseudonym(newName, user.uid);
      await updateUserProfile(user.uid, { pseudonym: newName });

      // Update AsyncStorage
      const current = await AsyncStorage.getItem('app_settings');
      const settings = current ? JSON.parse(current) : {};
      settings.username = newName;
      await AsyncStorage.setItem('app_settings', JSON.stringify(settings));

      const profileRaw = await AsyncStorage.getItem('user_profile');
      const profile = profileRaw ? JSON.parse(profileRaw) : {};
      profile.username = newName;
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));

      setOriginalUsername(newName);
      setPseudonymAvailable(null);
      await refreshProfile();
      Alert.alert('Saved', 'Pseudonym updated successfully.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not update pseudonym.');
    }
  };

  const handleSaveBio = () => {
    saveSettings('bio', bio);
    // Also save to user_profile in AsyncStorage
    AsyncStorage.getItem('user_profile').then(raw => {
      const profile = raw ? JSON.parse(raw) : {};
      profile.bio = bio;
      AsyncStorage.setItem('user_profile', JSON.stringify(profile));
    });
  };

  const handleSaveFavoritePrompt = () => {
    saveSettings('favoritePrompt', favoritePrompt);
    AsyncStorage.getItem('user_profile').then(raw => {
      const profile = raw ? JSON.parse(raw) : {};
      profile.favoritePrompt = favoritePrompt;
      AsyncStorage.setItem('user_profile', JSON.stringify(profile));
    });
  };

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('No Email', 'No email address associated with this account.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Email Sent', `A password reset link has been sent to ${email}.`);
    } catch (error) {
      Alert.alert('Error', 'Could not send password reset email.');
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

  const getAccountMethodLabel = () => {
    switch (accountMethod) {
      case 'apple': return 'Apple ID';
      case 'google': return 'Google';
      case 'email': return 'Email';
      default: return accountMethod || 'Not set';
    }
  };

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with Back Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.header}>About You</Text>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
        </View>

        {/* ===== A. ACCOUNT ===== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Text style={styles.settingLabel}>Sign-in Method</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{getAccountMethodLabel()}</Text>
          </View>

          <Text style={styles.inputLabel}>Email</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{email || 'Not set'}</Text>
          </View>

          <Text style={styles.inputLabel}>Pseudonym</Text>
          <TextInput
            style={[
              styles.textInput,
              pseudonymAvailable === true && styles.inputValid,
              pseudonymAvailable === false && styles.inputInvalid,
            ]}
            value={username}
            onChangeText={setUsername}
            placeholder="Your creative name"
            placeholderTextColor="#555"
          />
          {checkingPseudonym && <Text style={styles.checkingText}>Checking availability...</Text>}
          {!checkingPseudonym && pseudonymAvailable === true && (
            <Text style={styles.availableText}>Available!</Text>
          )}
          {!checkingPseudonym && pseudonymAvailable === false && (
            <Text style={styles.takenText}>Already taken</Text>
          )}
          {username.trim() !== originalUsername && pseudonymAvailable === true && (
            <TouchableOpacity style={styles.saveNameButton} onPress={handleSavePseudonym}>
              <Text style={styles.saveNameButtonText}>Save Pseudonym</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.inputLabel}>Birthdate (mm/dd/yyyy)</Text>
          <TextInput
            style={styles.textInput}
            value={birthdate}
            onChangeText={(v) => setBirthdate(v)}
            onEndEditing={() => saveSettings('birthdate', birthdate)}
            placeholder="01/15/1990"
            placeholderTextColor="#555"
            keyboardType="numeric"
            maxLength={10}
          />

          {accountMethod === 'email' && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handlePasswordReset}
            >
              <Text style={styles.secondaryButtonText}>Password Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ===== B. ABOUT YOU ===== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Your Profile</Text>

          <Text style={styles.inputLabel}>Bio</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            onEndEditing={handleSaveBio}
            placeholder="Tell us about yourself..."
            placeholderTextColor="#555"
            multiline
            numberOfLines={4}
          />

          <Text style={styles.inputLabel}>Favorite Art Prompt</Text>
          <TextInput
            style={styles.textInput}
            value={favoritePrompt}
            onChangeText={setFavoritePrompt}
            onEndEditing={handleSaveFavoritePrompt}
            placeholder="Which prompt inspires you most?"
            placeholderTextColor="#555"
          />
        </View>

        {/* ===== C. TIMEZONE ===== */}
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

        {/* ===== D. LOCATION ===== */}
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

        {/* ===== E. MEDIUM FAVORITES ===== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Medium Favorites</Text>

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

        {/* ===== F. PREFERENCES ===== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <Text style={styles.settingLabel}>Notification Preference</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowNotificationList(!showNotificationList)}
          >
            <Text style={styles.dropdownText}>
              {NOTIFICATION_OPTIONS.find(o => o.key === notificationPreference)?.label || 'Daily Reminder'}
            </Text>
            <Text style={styles.dropdownArrow}>{showNotificationList ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showNotificationList && (
            <View style={styles.dropdownList}>
              {NOTIFICATION_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.dropdownItem,
                    notificationPreference === opt.key && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setNotificationPreference(opt.key);
                    saveSettings('notificationPreference', opt.key);
                    setShowNotificationList(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    notificationPreference === opt.key && styles.dropdownItemTextActive,
                  ]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

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
              thumbColor={anonymous ? '#8E0DD3' : '#666'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Allow Work Boutique</Text>
              <Text style={styles.settingDescription}>Enable boutique features for your work</Text>
            </View>
            <Switch
              value={allowWorkBoutique}
              onValueChange={(value) => {
                setAllowWorkBoutique(value);
                saveSettings('allowWorkBoutique', value);
              }}
              trackColor={{ false: '#333', true: '#9C27B0' }}
              thumbColor={allowWorkBoutique ? '#8E0DD3' : '#666'}
            />
          </View>
        </View>

        {/* ===== G. YOUR JOURNEY ===== */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Journey</Text>
          <Text style={styles.statsSubtext}>Stats coming soon!</Text>
        </View>

        {/* ===== H. DATA & INFO ===== */}
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
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#8E0DD3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#8E0DD3',
    fontWeight: 'bold',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8E0DD3',
    textAlign: 'center',
    flex: 1,
  },
  sectionCard: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderWidth: 3,
    borderColor: '#8E0DD3',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#061679',
    marginBottom: 15,
  },

  // Account section
  readOnlyField: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  readOnlyText: {
    color: '#999',
    fontSize: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#061679',
    marginBottom: 6,
    marginTop: 12,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputValid: {
    borderColor: '#22C55E',
  },
  inputInvalid: {
    borderColor: '#FF6B6B',
  },
  checkingText: {
    color: '#061679',
    fontSize: 12,
    marginTop: 4,
  },
  availableText: {
    color: '#22C55E',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  takenText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  saveNameButton: {
    backgroundColor: '#22C55E',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  saveNameButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#061679',
  },
  secondaryButtonText: {
    color: '#061679',
    fontSize: 14,
    fontWeight: '600',
  },

  // Timezone
  dropdownButton: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
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
    color: '#1226A1',
    fontSize: 14,
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
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
    backgroundColor: 'rgba(24, 112, 162, 0.7)',
  },
  dropdownItemText: {
    color: '#ccc',
    fontSize: 15,
  },
  dropdownItemTextActive: {
    color: '#1226A1',
    fontWeight: '600',
  },

  // Location
  locationSubtitle: {
    fontSize: 16,
    color: '#061679',
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
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
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
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#8E0DD3',
  },
  chipText: {
    color: '#1226A1',
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
    color: '#061679',
    fontWeight: '600',
  },
  categoryArrow: {
    color: '#1226A1',
    fontSize: 14,
  },
  mediumList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 12,
  },
  mediumItem: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  mediumItemActive: {
    borderColor: '#1226A1',
    backgroundColor: 'rgba(24, 112, 162, 0.7)',
  },
  mediumText: {
    color: '#ccc',
    fontSize: 13,
  },
  mediumTextActive: {
    color: '#1226A1',
    fontWeight: '600',
  },

  // Preferences
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
    color: '#061679',
    marginBottom: 4,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },

  // Stats
  statsCard: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderWidth: 3,
    borderColor: '#4FC3F7',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f2990a',
    marginBottom: 10,
  },
  statsSubtext: {
    fontSize: 16,
    color: '#ffffff',
    fontStyle: 'italic',
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
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderWidth: 2,
    borderColor: '#444',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#061679',
    marginBottom: 5,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
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
  },
  hamburgerText: {
    fontSize: 24,
    color: '#8E0DD3',
    fontWeight: 'bold',
  },
});
