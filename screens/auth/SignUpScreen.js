import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  ImageBackground,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { createUserProfile, claimPseudonym, checkPseudonymAvailable } from '../../services/firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TIMEZONES = [
  { key: 'America/New_York', label: 'Eastern (EST/EDT)' },
  { key: 'America/Chicago', label: 'Central (CST/CDT)' },
  { key: 'America/Denver', label: 'Mountain (MST/MDT)' },
  { key: 'America/Los_Angeles', label: 'Pacific (PST/PDT)' },
  { key: 'America/Anchorage', label: 'Alaska (AKST/AKDT)' },
  { key: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { key: 'America/Phoenix', label: 'Arizona (MST)' },
  { key: 'Europe/London', label: 'London (GMT/BST)' },
  { key: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { key: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { key: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

export default function SignUpScreen({ navigation, route }) {
  // If coming from Apple/Google sign-in, skip credential step
  const skipCredentials = route.params?.skipCredentials || false;
  const existingUid = route.params?.uid || null;
  const existingEmail = route.params?.email || '';
  const existingMethod = route.params?.accountMethod || 'email';

  const [step, setStep] = useState(skipCredentials ? 2 : 1);
  const [loading, setLoading] = useState(false);

  // Step 1: Credentials
  const [email, setEmail] = useState(existingEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Required profile
  const [pseudonym, setPseudonym] = useState('');
  const [pseudonymAvailable, setPseudonymAvailable] = useState(null);
  const [checkingPseudonym, setCheckingPseudonym] = useState(false);
  const [birthdate, setBirthdate] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [showTimezoneList, setShowTimezoneList] = useState(false);

  // Step 3: Optional
  const [currentLocation, setCurrentLocation] = useState({ country: '', state: '', city: '' });
  const [heartLocation, setHeartLocation] = useState({ country: '', state: '', city: '' });
  const [bio, setBio] = useState('');
  const [anonymous, setAnonymous] = useState(true);

  // Debounced pseudonym availability check
  useEffect(() => {
    if (!pseudonym.trim()) {
      setPseudonymAvailable(null);
      return;
    }
    setCheckingPseudonym(true);
    const timer = setTimeout(async () => {
      try {
        const available = await checkPseudonymAvailable(pseudonym);
        setPseudonymAvailable(available);
      } catch (error) {
        setPseudonymAvailable(null);
      }
      setCheckingPseudonym(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [pseudonym]);

  // Migrate existing AsyncStorage data into profile
  const getExistingData = async () => {
    try {
      const settingsRaw = await AsyncStorage.getItem('app_settings');
      const profileRaw = await AsyncStorage.getItem('user_profile');
      const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
      const profile = profileRaw ? JSON.parse(profileRaw) : {};
      return { settings, profile };
    } catch {
      return { settings: {}, profile: {} };
    }
  };

  const validateBirthdate = (value) => {
    const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
    return regex.test(value);
  };

  const handleStep1 = async () => {
    if (!email.trim()) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    setStep(2);
  };

  const handleStep2 = async () => {
    if (!pseudonym.trim()) {
      Alert.alert('Missing Pseudonym', 'Please choose a pseudonym.');
      return;
    }
    if (pseudonymAvailable === false) {
      Alert.alert('Pseudonym Taken', 'Please choose a different pseudonym.');
      return;
    }
    if (!birthdate.trim()) {
      Alert.alert('Missing Birthdate', 'Please enter your birthdate.');
      return;
    }
    if (!validateBirthdate(birthdate)) {
      Alert.alert('Invalid Date', 'Please enter birthdate as mm/dd/yyyy.');
      return;
    }
    setStep(3);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      let uid = existingUid;
      let userEmail = email.trim();

      // Step 1: Create Firebase Auth account (email sign-up only)
      if (!skipCredentials) {
        const result = await createUserWithEmailAndPassword(auth, userEmail, password);
        uid = result.user.uid;
      }

      // Merge any existing AsyncStorage data
      const { settings, profile } = await getExistingData();

      // Step 2: Claim pseudonym
      await claimPseudonym(pseudonym.trim(), uid);

      // Step 3: Create Firestore profile
      await createUserProfile(uid, {
        email: userEmail,
        accountMethod: existingMethod,
        pseudonym: pseudonym.trim(),
        birthdate,
        timezone,
        currentLocation: currentLocation.country ? currentLocation : (settings.currentLocation || { country: '', state: '', city: '' }),
        heartLocation: heartLocation.country ? heartLocation : (settings.heartLocation || { country: '', state: '', city: '' }),
        favoriteMediums: settings.favoriteMediums || [],
        notificationPreference: settings.dailyReminder === false ? 'none' : 'daily',
        allowWorkBoutique: false,
        anonymous,
        bio: bio || profile.bio || '',
        favoritePrompt: profile.favoritePrompt || '',
      });

      // Update AsyncStorage to stay in sync
      const updatedSettings = {
        ...settings,
        accountMethod: existingMethod,
        email: userEmail,
        username: pseudonym.trim(),
        timezone,
        anonymous,
      };
      await AsyncStorage.setItem('app_settings', JSON.stringify(updatedSettings));

      const updatedProfile = {
        ...profile,
        username: pseudonym.trim(),
        bio: bio || profile.bio || '',
      };
      await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));

      // Auth listener in AuthContext will automatically redirect to main app
    } catch (error) {
      let message = 'Could not create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') message = 'An account with this email already exists.';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
      else if (error.message?.includes('pseudonym')) message = error.message;
      Alert.alert('Sign Up Failed', message);
    }
    setLoading(false);
  };

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>Create Your Account</Text>
      <Text style={styles.stepIndicator}>Step 1 of 3</Text>

      <Text style={styles.inputLabel}>Email</Text>
      <TextInput
        style={styles.textInput}
        value={email}
        onChangeText={setEmail}
        placeholder="your@email.com"
        placeholderTextColor="#555"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.inputLabel}>Password</Text>
      <TextInput
        style={styles.textInput}
        value={password}
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        placeholderTextColor="#555"
        secureTextEntry
      />

      <Text style={styles.inputLabel}>Confirm Password</Text>
      <TextInput
        style={styles.textInput}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Re-enter password"
        placeholderTextColor="#555"
        secureTextEntry
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleStep1}>
        <Text style={styles.primaryButtonText}>Next</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>Your Profile</Text>
      <Text style={styles.stepIndicator}>Step 2 of 3 — Required</Text>

      <Text style={styles.inputLabel}>Pseudonym</Text>
      <TextInput
        style={[
          styles.textInput,
          pseudonymAvailable === true && styles.inputValid,
          pseudonymAvailable === false && styles.inputInvalid,
        ]}
        value={pseudonym}
        onChangeText={setPseudonym}
        placeholder="Your creative name"
        placeholderTextColor="#555"
        autoCapitalize="none"
      />
      {checkingPseudonym && <Text style={styles.checkingText}>Checking availability...</Text>}
      {!checkingPseudonym && pseudonymAvailable === true && (
        <Text style={styles.availableText}>Available!</Text>
      )}
      {!checkingPseudonym && pseudonymAvailable === false && (
        <Text style={styles.takenText}>Already taken</Text>
      )}

      <Text style={styles.inputLabel}>Birthdate (mm/dd/yyyy)</Text>
      <TextInput
        style={styles.textInput}
        value={birthdate}
        onChangeText={setBirthdate}
        placeholder="01/15/1990"
        placeholderTextColor="#555"
        keyboardType="numeric"
        maxLength={10}
      />

      <Text style={styles.inputLabel}>Timezone</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setShowTimezoneList(!showTimezoneList)}
      >
        <Text style={styles.dropdownText}>
          {TIMEZONES.find(t => t.key === timezone)?.label || timezone}
        </Text>
        <Text style={styles.dropdownArrow}>{showTimezoneList ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showTimezoneList && (
        <View style={styles.dropdownList}>
          {TIMEZONES.map(tz => (
            <TouchableOpacity
              key={tz.key}
              style={[styles.dropdownItem, timezone === tz.key && styles.dropdownItemActive]}
              onPress={() => {
                setTimezone(tz.key);
                setShowTimezoneList(false);
              }}
            >
              <Text style={[
                styles.dropdownItemText,
                timezone === tz.key && styles.dropdownItemTextActive,
              ]}>{tz.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleStep2}>
          <Text style={styles.primaryButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>Optional Details</Text>
      <Text style={styles.stepIndicator}>Step 3 of 3 — Optional</Text>

      <Text style={styles.inputLabel}>Bio</Text>
      <TextInput
        style={[styles.textInput, styles.textArea]}
        value={bio}
        onChangeText={setBio}
        placeholder="Tell us about yourself..."
        placeholderTextColor="#555"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.inputLabel}>Current Location</Text>
      <View style={styles.locationRow}>
        <TextInput
          style={[styles.textInput, styles.locationInput]}
          value={currentLocation.country}
          onChangeText={v => setCurrentLocation(p => ({ ...p, country: v }))}
          placeholder="Country"
          placeholderTextColor="#555"
        />
        <TextInput
          style={[styles.textInput, styles.locationInput]}
          value={currentLocation.state}
          onChangeText={v => setCurrentLocation(p => ({ ...p, state: v }))}
          placeholder="State"
          placeholderTextColor="#555"
        />
        <TextInput
          style={[styles.textInput, styles.locationInput]}
          value={currentLocation.city}
          onChangeText={v => setCurrentLocation(p => ({ ...p, city: v }))}
          placeholder="City"
          placeholderTextColor="#555"
        />
      </View>

      <Text style={styles.inputLabel}>Heart Location</Text>
      <View style={styles.locationRow}>
        <TextInput
          style={[styles.textInput, styles.locationInput]}
          value={heartLocation.country}
          onChangeText={v => setHeartLocation(p => ({ ...p, country: v }))}
          placeholder="Country"
          placeholderTextColor="#555"
        />
        <TextInput
          style={[styles.textInput, styles.locationInput]}
          value={heartLocation.state}
          onChangeText={v => setHeartLocation(p => ({ ...p, state: v }))}
          placeholder="State"
          placeholderTextColor="#555"
        />
        <TextInput
          style={[styles.textInput, styles.locationInput]}
          value={heartLocation.city}
          onChangeText={v => setHeartLocation(p => ({ ...p, city: v }))}
          placeholder="City"
          placeholderTextColor="#555"
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Post Anonymously</Text>
          <Text style={styles.settingDescription}>Hide your name on public posts</Text>
        </View>
        <Switch
          value={anonymous}
          onValueChange={setAnonymous}
          trackColor={{ false: '#333', true: '#9C27B0' }}
          thumbColor={anonymous ? '#FFD700' : '#666'}
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(2)}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleFinish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <ImageBackground
      source={require('../../assets/background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {step === 1 && (
              <View style={styles.loginRow}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 4,
  },
  stepIndicator: {
    fontSize: 13,
    color: '#87CEEB',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 14,
    color: '#DDA0DD',
    marginBottom: 6,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    padding: 14,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 16,
  },
  inputValid: {
    borderColor: '#22C55E',
  },
  inputInvalid: {
    borderColor: '#FF6B6B',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  checkingText: {
    color: '#87CEEB',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
  },
  availableText: {
    color: '#22C55E',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    fontWeight: '600',
  },
  takenText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  locationInput: {
    flex: 1,
  },
  dropdownButton: {
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 16,
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
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 16,
    maxHeight: 200,
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    color: '#DDA0DD',
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flex: 1,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    marginRight: 10,
  },
  secondaryButtonText: {
    color: '#87CEEB',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#888',
    fontSize: 14,
  },
  loginLink: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
});
