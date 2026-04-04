import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { showAlert } from '../../utils/alertUtils';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithCredential, OAuthProvider, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '../../config/firebase';
import { createUserProfile, claimPseudonym, checkPseudonymAvailable, claimUsername, checkUsernameAvailable, applyReferralCode, checkAndConvertInvitation } from '../../services/firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const GENDER_OPTIONS = [
  { key: 'female', label: 'Identify Female' },
  { key: 'male', label: 'Identify Male' },
  { key: 'non-binary', label: 'Non-Binary' },
  { key: 'prefer-not-to-say', label: 'Prefer Not to Say' },
];

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
  const { refreshProfile } = useAuth();

  // If coming from Apple/Google sign-in (via LoginScreen), skip credential step
  const [skipCredentials, setSkipCredentials] = useState(route.params?.skipCredentials || false);
  const [socialUid, setSocialUid] = useState(route.params?.uid || null);
  const [socialMethod, setSocialMethod] = useState(route.params?.accountMethod || 'email');

  const [step, setStep] = useState(skipCredentials ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Step 1: Credentials
  const [email, setEmail] = useState(route.params?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Required profile
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [birthdate, setBirthdate] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [showTimezoneList, setShowTimezoneList] = useState(false);
  const [gender, setGender] = useState('');
  const [showGenderList, setShowGenderList] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');

  // Debounced username availability check
  useEffect(() => {
    if (!username.trim()) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(username);
        setUsernameAvailable(available);
      } catch (error) {
        setUsernameAvailable(null);
      }
      setCheckingUsername(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

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

  const formatBirthdate = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const validateBirthdate = (value) => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    return regex.test(value);
  };

  const handleStep1 = async () => {
    if (!email.trim()) {
      showAlert('Missing Email', 'Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      showAlert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    setStep(2);
  };

  const handleAppleSignUp = async () => {
    try {
      const nonce = Math.random().toString(36).substring(2, 10);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce
      );

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: appleCredential.identityToken,
        rawNonce: nonce,
      });

      setLoading(true);
      const result = await signInWithCredential(auth, credential);

      // New user or existing user with no profile — jump to step 2
      setEmail(result.user.email || appleCredential.email || '');
      setSocialUid(result.user.uid);
      setSocialMethod('apple');
      setSkipCredentials(true);
      setStep(2);
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') {
        console.log('Apple Sign In error:', error.code, error.message);
        showAlert('Apple Sign In Failed', error.message || 'Could not sign in with Apple.');
      }
    }
    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    if (Platform.OS !== 'web') {
      showAlert('Web Only', 'Google Sign-In is available on the web version.');
      return;
    }
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // New user or existing user with no profile — jump to step 2
      setEmail(result.user.email || '');
      setSocialUid(result.user.uid);
      setSocialMethod('google');
      setSkipCredentials(true);
      setStep(2);
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.log('Google Sign In error:', error.code, error.message);
        showAlert('Google Sign In Failed', error.message || 'Could not sign in with Google.');
      }
    }
    setLoading(false);
  };

  const handleStep2 = () => {
    if (!firstName.trim()) {
      showAlert('Missing First Name', 'Please enter your first name.');
      return;
    }
    if (!lastName.trim()) {
      showAlert('Missing Last Name', 'Please enter your last name.');
      return;
    }
    if (!username.trim()) {
      showAlert('Missing Username', 'Please choose a username.');
      return;
    }
    if (!checkingUsername && usernameAvailable === false) {
      showAlert('Username Taken', 'Please choose a different username.');
      return;
    }
    if (!birthdate.trim()) {
      showAlert('Missing Birthdate', 'Please enter your birthdate.');
      return;
    }
    if (!validateBirthdate(birthdate)) {
      showAlert('Invalid Date', 'Please enter a complete birthdate (mm/dd/yyyy).');
      return;
    }
    if (!gender) {
      showAlert('Missing Gender', 'Please select a gender option.');
      return;
    }
    if (!phoneNumber.trim()) {
      showAlert('Missing Phone Number', 'Please enter your phone number.');
      return;
    }
    setStep(3);
  };

  // Auto-generate a memorable pseudonym (no connection to real name)
  const PSEUDONYM_NOUNS = [
    // Birds
    'Finch', 'Wren', 'Sparrow', 'Robin', 'Lark', 'Heron', 'Dove', 'Falcon',
    'Starling', 'Crane', 'Owl', 'Swan', 'Raven', 'Jay', 'Oriole', 'Kingfisher',
    // Flowers
    'Dahlia', 'Jasmine', 'Iris', 'Violet', 'Clover', 'Poppy', 'Aster', 'Lily',
    'Marigold', 'Peony', 'Sage', 'Fern', 'Zinnia', 'Ivy', 'Lotus', 'Azalea',
    // Animals
    'Fox', 'Otter', 'Lynx', 'Hare', 'Badger', 'Fawn', 'Mink', 'Panda',
    'Gazelle', 'Osprey', 'Elk', 'Moth', 'Newt', 'Pike', 'Vole', 'Wolf',
    // Fruits
    'Peach', 'Plum', 'Berry', 'Cherry', 'Mango', 'Quince', 'Fig', 'Olive',
    'Lemon', 'Clementine', 'Melon', 'Apricot', 'Kiwi', 'Tangerine',
    // Literary characters (public domain)
    'Darcy', 'Gatsby', 'Cosette', 'Portia', 'Pip', 'Ariel', 'Eyre', 'Heidi',
    'Oberon', 'Wendy', 'Bronte', 'Frost', 'Bennet', 'Austen', 'Marlowe', 'Eliot',
  ];

  const PSEUDONYM_PREFIXES = [
    // Colors
    'Scarlet', 'Golden', 'Silver', 'Coral', 'Indigo', 'Amber', 'Crimson',
    'Jade', 'Cobalt', 'Ivory', 'Russet', 'Teal', 'Copper', 'Pearl', 'Violet', 'Onyx',
  ];

  const generatePseudonym = async () => {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    for (let attempt = 0; attempt < 8; attempt++) {
      const useNumber = attempt >= 4; // try color prefix first, add number if collisions
      const prefix = pick(PSEUDONYM_PREFIXES);
      const noun = pick(PSEUDONYM_NOUNS);
      const candidate = useNumber
        ? `${prefix}${noun}${Math.floor(Math.random() * 99) + 1}`
        : `${prefix}${noun}`;
      const available = await checkPseudonymAvailable(candidate);
      if (available) return candidate;
    }
    // Fallback: color + noun + timestamp fragment
    return `${pick(PSEUDONYM_PREFIXES)}${pick(PSEUDONYM_NOUNS)}${Date.now() % 1000}`;
  };

  const handleFinish = async () => {
    if (!agreedToTerms) {
      showAlert('Agreement Required', 'Please read and agree to the Terms of Service and Privacy Policy before creating your account.');
      return;
    }
    setLoading(true);
    try {
      let uid = socialUid;
      let userEmail = email.trim();

      // Step 1: Create Firebase Auth account (email sign-up only)
      if (!skipCredentials) {
        if (auth.currentUser) {
          // Already created from a previous partial signup attempt — reuse
          uid = auth.currentUser.uid;
          userEmail = auth.currentUser.email || userEmail;
        } else {
          const result = await createUserWithEmailAndPassword(auth, userEmail, password);
          uid = result.user.uid;
        }
      }

      // Merge any existing AsyncStorage data
      const { settings, profile } = await getExistingData();

      // Step 2: Claim username
      await claimUsername(username.trim(), uid);

      // Step 3: Auto-generate and claim pseudonym
      const autoPseudonym = await generatePseudonym();
      await claimPseudonym(autoPseudonym, uid);

      // Step 4: Create Firestore profile
      await createUserProfile(uid, {
        email: userEmail,
        accountMethod: socialMethod,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        pseudonym: autoPseudonym,
        birthdate,
        timezone,
        currentLocation: settings.currentLocation || { country: '', state: '', city: '' },
        heartLocation: settings.heartLocation || { country: '', state: '', city: '' },
        favoriteMediums: settings.favoriteMediums || [],
        notificationPreference: settings.dailyReminder === false ? 'none' : 'daily',
        allowWorkBoutique: false,
        anonymous: true,
        gender,
        phoneNumber: phoneNumber.trim(),
        bio: profile.bio || '',
        favoritePrompt: profile.favoritePrompt || '',
        pseudonymChangeCount: 0,
      });

      // Update AsyncStorage to stay in sync
      const updatedSettings = {
        ...settings,
        accountMethod: socialMethod,
        email: userEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        pseudonym: autoPseudonym,
        timezone,
        anonymous: true,
      };
      await AsyncStorage.setItem('app_settings', JSON.stringify(updatedSettings));

      const updatedProfile = {
        ...profile,
        username: username.trim(),
        pseudonym: autoPseudonym,
        bio: profile.bio || '',
      };
      await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));

      // Apply referral code if provided
      if (referralCodeInput.trim()) {
        try {
          await applyReferralCode(referralCodeInput.trim(), uid);
        } catch (refErr) {
          console.log('Referral code error:', refErr);
          // Don't block signup for referral errors
        }
      }

      // Check if this email was invited by someone — mark invitation as converted
      // Pass uid so inviter gets premium grant and friend token gifts are applied
      try {
        await checkAndConvertInvitation(userEmail, uid);
      } catch (convErr) {
        console.log('Invitation conversion check error:', convErr);
      }

      // Send email verification (skip for Apple/Google sign-in — already verified)
      if (!skipCredentials) {
        try {
          await sendEmailVerification(auth.currentUser, {
            url: 'https://magicnestlings.web.app',
            handleCodeInApp: false,
          });
        } catch (verifyErr) {
          console.log('Email verification send error:', verifyErr.code, verifyErr.message);
          showAlert('Verification Email', 'Account created! We could not send a verification email right now — you can resend from the home screen.');
        }
      }

      // Reset intro flag so new account sees the slide deck
      await AsyncStorage.removeItem('quick_launch_dismissed');

      // Signal to AuthContext that profile is ready — triggers navigation to MainTabs
      await refreshProfile(uid);
    } catch (error) {
      let message = 'Could not create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') message = 'An account with this email already exists.';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
      else if (error.message?.includes('username') || error.message?.includes('pseudonym')) message = error.message;
      showAlert('Sign Up Failed', message);
    }
    setLoading(false);
  };

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>Create Your Account</Text>
      <Text style={styles.stepIndicator}>Step 1 of 2</Text>

      {Platform.OS !== 'web' && (
        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleAppleSignUp}
          disabled={loading}
        >
          <Text style={styles.socialButtonText}> Sign up with Apple</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.socialButton}
        onPress={handleGoogleSignUp}
        disabled={loading}
      >
        <Text style={styles.socialButtonText}>G  Sign up with Google</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <Text style={styles.inputLabel}>Email</Text>
      <TextInput
        style={styles.textInput}
        value={email}
        onChangeText={setEmail}
        placeholder="your@email.com"
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.inputLabel}>Password</Text>
      <TextInput
        style={styles.textInput}
        value={password}
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        placeholderTextColor="#999"
        secureTextEntry
      />

      <Text style={styles.inputLabel}>Confirm Password</Text>
      <TextInput
        style={styles.textInput}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Re-enter password"
        placeholderTextColor="#999"
        secureTextEntry
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleStep1}>
        <Text style={styles.primaryButtonText}>Continue with Email</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>Your Profile</Text>
      <Text style={styles.stepIndicator}>Step 2 of 2</Text>

      <Text style={styles.inputLabel}>First Name</Text>
      <TextInput
        style={styles.textInput}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Your first name"
        placeholderTextColor="#999"
        autoCapitalize="words"
      />

      <Text style={styles.inputLabel}>Last Name</Text>
      <TextInput
        style={styles.textInput}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Your last name"
        placeholderTextColor="#999"
        autoCapitalize="words"
      />

      <Text style={styles.inputLabel}>Username</Text>
      <Text style={styles.fieldHint}>Your login identity (cannot be changed later)</Text>
      <TextInput
        style={[
          styles.textInput,
          usernameAvailable === true && styles.inputValid,
          usernameAvailable === false && styles.inputInvalid,
        ]}
        value={username}
        onChangeText={setUsername}
        placeholder="Choose a username"
        placeholderTextColor="#999"
        autoCapitalize="none"
      />
      {checkingUsername && <Text style={styles.checkingText}>Checking availability...</Text>}
      {!checkingUsername && usernameAvailable === true && (
        <Text style={styles.availableText}>Available!</Text>
      )}
      {!checkingUsername && usernameAvailable === false && (
        <Text style={styles.takenText}>Already taken</Text>
      )}

      <Text style={styles.fieldHint}>You'll be auto-assigned a pseudonym. You can change it for free after your first login.</Text>

      <Text style={styles.inputLabel}>Birthdate</Text>
      <TextInput
        style={styles.textInput}
        value={birthdate}
        onChangeText={(text) => setBirthdate(formatBirthdate(text))}
        placeholder="mm/dd/yyyy"
        placeholderTextColor="#999"
        keyboardType="numeric"
        maxLength={10}
      />

      <Text style={styles.inputLabel}>Gender</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => { setShowGenderList(!showGenderList); setShowTimezoneList(false); }}
      >
        <Text style={styles.dropdownText}>
          {gender ? GENDER_OPTIONS.find(g => g.key === gender)?.label : 'Select gender...'}
        </Text>
        <Text style={styles.dropdownArrow}>{showGenderList ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showGenderList && (
        <View style={styles.dropdownList}>
          {GENDER_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.dropdownItem, gender === opt.key && styles.dropdownItemActive]}
              onPress={() => {
                setGender(opt.key);
                setShowGenderList(false);
              }}
            >
              <Text style={[
                styles.dropdownItemText,
                gender === opt.key && styles.dropdownItemTextActive,
              ]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.inputLabel}>Phone Number</Text>
      <TextInput
        style={styles.textInput}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        placeholder="555-123-4567"
        placeholderTextColor="#999"
        keyboardType="phone-pad"
      />

      <Text style={styles.inputLabel}>Timezone</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => { setShowTimezoneList(!showTimezoneList); setShowGenderList(false); }}
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

      <Text style={styles.inputLabel}>Referral Code (optional)</Text>
      <Text style={styles.fieldHint}>Were you invited by a friend? Enter their code here.</Text>
      <TextInput
        style={styles.textInput}
        value={referralCodeInput}
        onChangeText={setReferralCodeInput}
        placeholder="e.g. MAGIC-ABC123"
        placeholderTextColor="#999"
        autoCapitalize="characters"
      />

      <View style={styles.buttonRow}>
        {!skipCredentials && (
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.primaryButton} onPress={handleStep2}>
          <Text style={styles.primaryButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>Confirm Your Account</Text>
      <Text style={styles.stepIndicator}>Almost there!</Text>

      <View style={styles.confirmSection}>
        <Text style={styles.confirmLabel}>Name</Text>
        <Text style={styles.confirmValue}>{firstName} {lastName}</Text>

        <Text style={styles.confirmLabel}>Username</Text>
        <Text style={styles.confirmValue}>{username}</Text>

        <Text style={styles.confirmLabel}>Email</Text>
        <Text style={styles.confirmValue}>{email}</Text>

        <Text style={styles.confirmLabel}>Birthdate</Text>
        <Text style={styles.confirmValue}>{birthdate}</Text>

        <Text style={styles.confirmLabel}>Gender</Text>
        <Text style={styles.confirmValue}>{GENDER_OPTIONS.find(g => g.key === gender)?.label || gender}</Text>

        <Text style={styles.confirmLabel}>Timezone</Text>
        <Text style={styles.confirmValue}>{TIMEZONES.find(t => t.key === timezone)?.label || timezone}</Text>
      </View>

      <View style={styles.confirmNote}>
        <Text style={styles.confirmNoteText}>
          You can update your bio, location, and other details anytime from the{' '}
          <Text style={styles.confirmNoteBold}>About You</Text> page in the menu.
        </Text>
      </View>

      <TouchableOpacity style={styles.agreementRow} onPress={() => setAgreedToTerms(!agreedToTerms)} activeOpacity={0.7}>
        <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
          {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.agreementText}>
          I have read and agree to the{' '}
          <Text style={styles.agreementLink} onPress={(e) => { e.stopPropagation?.(); setShowTermsModal(true); }}>
            Terms of Service
          </Text>
          {' '}and{' '}
          <Text style={styles.agreementLink} onPress={(e) => { e.stopPropagation?.(); setShowPrivacyModal(true); }}>
            Privacy Policy
          </Text>
        </Text>
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(2)}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !agreedToTerms && styles.primaryButtonDisabled]}
          onPress={handleFinish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#4B0082" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
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

      {/* Terms of Service Modal */}
      <Modal visible={showTermsModal} transparent animationType="slide" onRequestClose={() => setShowTermsModal(false)}>
        <View style={styles.legalOverlay}>
          <View style={styles.legalCard}>
            <Text style={styles.legalTitle}>Terms of Service</Text>
            <ScrollView style={styles.legalScroll} contentContainerStyle={styles.legalContent}>
              <Text style={styles.legalText}>
                {"Last updated: 2026-04-04\n\n"}
                {"Welcome to MAGIC — 13 Magical Nights of Art.\n\n"}
                {"By creating an account you agree to the following terms:\n\n"}
                {"1. ELIGIBILITY\nYou must be at least 13 years of age to use this app. By registering you confirm that you meet this requirement.\n\n"}
                {"2. YOUR ACCOUNT\nYou are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.\n\n"}
                {"3. CONTENT YOU SUBMIT\nYou retain ownership of artwork and writing you submit. By submitting, you grant MAGIC a non-exclusive license to display your work within the app to other participants.\n\n"}
                {"4. COMMUNITY CONDUCT\nYou agree to treat other artists with respect. Harassment, hate speech, or uploading content that violates the rights of others is grounds for account termination.\n\n"}
                {"5. PREMIUM FEATURES\nCertain features require premium status, earned by completing a 13-day streak. No payment is required. Premium access is time-limited as described in the app.\n\n"}
                {"6. ANONYMITY\nYour real username and pseudonym are kept separate. You agree not to attempt to link or expose other users' identities.\n\n"}
                {"7. TERMINATION\nWe reserve the right to terminate accounts that violate these terms.\n\n"}
                {"8. CHANGES\nWe may update these terms. Continued use of the app after changes constitutes acceptance.\n\n"}
                {"9. CONTACT\nFor questions, contact us through the app or at 13magicalnights.com.\n\n"}
                {"By creating an account you confirm you have read, understood, and agree to these Terms of Service."}
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.legalCloseBtn} onPress={() => setShowTermsModal(false)}>
              <Text style={styles.legalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal visible={showPrivacyModal} transparent animationType="slide" onRequestClose={() => setShowPrivacyModal(false)}>
        <View style={styles.legalOverlay}>
          <View style={styles.legalCard}>
            <Text style={styles.legalTitle}>Privacy Policy</Text>
            <ScrollView style={styles.legalScroll} contentContainerStyle={styles.legalContent}>
              <Text style={styles.legalText}>
                {"Last updated: 2026-04-04\n\n"}
                {"MAGIC — 13 Magical Nights of Art is committed to protecting your privacy.\n\n"}
                {"1. INFORMATION WE COLLECT\nWe collect the information you provide at signup: email address, first and last name, username, birthdate, gender, phone number, and timezone. We also collect artwork and writing you choose to submit.\n\n"}
                {"2. HOW WE USE YOUR INFORMATION\nYour real name and email are used only for account management and, where applicable, email communications. Your pseudonym — not your real name — is displayed to other users.\n\n"}
                {"3. ANONYMITY PROTECTION\nWe maintain a strict separation between your username and your pseudonym. We will never display both to other users simultaneously, and we will never sell or share data that links them.\n\n"}
                {"4. DATA STORAGE\nYour data is stored securely using Google Firebase (Firestore and Firebase Auth). Artwork images are stored in Firebase Storage.\n\n"}
                {"5. DATA SHARING\nWe do not sell your personal data to third parties. Aggregate, anonymized usage data may be used to improve the app.\n\n"}
                {"6. ARTWORK VISIBILITY\nArtwork you submit for community ranking is visible to other logged-in participants during the ranking period. Tapestry items are visible to other participants as curated by you, attributed to your pseudonym.\n\n"}
                {"7. YOUR RIGHTS\nYou may request deletion of your account and associated data at any time by contacting us through the app.\n\n"}
                {"8. CHILDREN'S PRIVACY\nWe do not knowingly collect data from children under 13. If you believe a child under 13 has registered, please contact us immediately.\n\n"}
                {"9. CONTACT\nPrivacy questions: 13magicalnights.com\n\n"}
                {"By creating an account you confirm you have read and understood this Privacy Policy."}
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.legalCloseBtn} onPress={() => setShowPrivacyModal(false)}>
              <Text style={styles.legalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAEBD7',
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
    borderWidth: 3,
    borderColor: '#4B0082',
    borderRadius: 12,
    padding: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 4,
  },
  stepIndicator: {
    fontSize: 13,
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 14,
    color: '#4B0082',
    marginBottom: 6,
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 11,
    color: '#888',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  textInput: {
    borderRadius: 8,
    padding: 14,
    color: '#4B0082',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4B0082',
    marginBottom: 16,
  },
  inputValid: {
    borderColor: '#22C55E',
  },
  inputInvalid: {
    borderColor: '#FF6B6B',
  },
  confirmSection: {
    marginBottom: 16,
  },
  confirmLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
    fontWeight: '600',
  },
  confirmValue: {
    fontSize: 16,
    color: '#4B0082',
    marginBottom: 12,
  },
  confirmNote: {
    backgroundColor: 'rgba(75, 0, 130, 0.08)',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  confirmNoteText: {
    fontSize: 14,
    color: '#4B0082',
    lineHeight: 20,
    textAlign: 'center',
  },
  confirmNoteBold: {
    fontWeight: 'bold',
  },
  checkingText: {
    color: '#4B0082',
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
  dropdownButton: {
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4B0082',
    marginBottom: 16,
  },
  dropdownText: {
    color: '#4B0082',
    fontSize: 16,
  },
  dropdownArrow: {
    color: '#4B0082',
    fontSize: 14,
  },
  dropdownList: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B0082',
    marginBottom: 16,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(75, 0, 130, 0.1)',
  },
  dropdownItemText: {
    color: '#4B0082',
    fontSize: 15,
  },
  dropdownItemTextActive: {
    color: '#4B0082',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flex: 1,
  },
  primaryButtonText: {
    color: '#4B0082',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4B0082',
    marginRight: 10,
  },
  secondaryButtonText: {
    color: '#4B0082',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  socialButton: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#4B0082',
  },
  socialButtonText: {
    color: '#4B0082',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#4B0082',
  },
  dividerText: {
    color: '#4B0082',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#4B0082',
    fontSize: 14,
  },
  loginLink: {
    color: '#4B0082',
    fontSize: 14,
    fontWeight: '600',
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4B0082',
    marginRight: 10,
    marginTop: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#4B0082',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  agreementText: {
    flex: 1,
    fontSize: 13,
    color: '#4B0082',
    lineHeight: 20,
  },
  agreementLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  legalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  legalCard: {
    backgroundColor: '#FFF8E7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 3,
    borderColor: '#4B0082',
    maxHeight: '85%',
    padding: 20,
  },
  legalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 14,
  },
  legalScroll: {
    flex: 1,
  },
  legalContent: {
    paddingBottom: 10,
  },
  legalText: {
    fontSize: 13,
    color: '#332100',
    lineHeight: 21,
  },
  legalCloseBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  legalCloseBtnText: {
    color: '#4B0082',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
