import React, { useState } from 'react';
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
} from 'react-native';

const FONT = Platform.OS === 'web' ? 'Montserrat' : 'Montserrat_400Regular';
const FONT_BOLD = Platform.OS === 'web' ? 'Montserrat' : 'Montserrat_600SemiBold';
import { showAlert } from '../../utils/alertUtils';
import { signInWithEmailAndPassword, signInWithCredential, OAuthProvider, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '../../config/firebase';
import { getUserProfile } from '../../services/firestoreService';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      // Check if user has a profile — if not, redirect to complete signup
      const profile = await getUserProfile(result.user.uid);
      if (!profile) {
        navigation.replace('SignUp', {
          uid: result.user.uid,
          email: result.user.email || email.trim(),
          accountMethod: 'email',
          skipCredentials: true,
        });
      }
    } catch (error) {
      let message = 'Could not sign in. Please check your credentials.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      else if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
      else if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Please try again later.';
      showAlert('Sign In Failed', message);
    }
    setLoading(false);
  };

  const handleAppleLogin = async () => {
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

      // If new user OR existing user with no profile, navigate to profile setup
      if (result._tokenResponse?.isNewUser) {
        navigation.replace('SignUp', {
          uid: result.user.uid,
          email: result.user.email || appleCredential.email || '',
          accountMethod: 'apple',
          skipCredentials: true,
        });
      } else {
        const profile = await getUserProfile(result.user.uid);
        if (!profile) {
          navigation.replace('SignUp', {
            uid: result.user.uid,
            email: result.user.email || '',
            accountMethod: 'apple',
            skipCredentials: true,
          });
        }
      }
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') {
        showAlert('Apple Sign In Failed', 'Could not sign in with Apple.');
      }
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    if (Platform.OS !== 'web') {
      showAlert('Web Only', 'Google Sign-In is available on the web version.');
      return;
    }
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // If new user OR existing user with no profile, redirect to profile setup
      if (result._tokenResponse?.isNewUser) {
        navigation.replace('SignUp', {
          uid: result.user.uid,
          email: result.user.email || '',
          accountMethod: 'google',
          skipCredentials: true,
        });
      } else {
        const profile = await getUserProfile(result.user.uid);
        if (!profile) {
          navigation.replace('SignUp', {
            uid: result.user.uid,
            email: result.user.email || '',
            accountMethod: 'google',
            skipCredentials: true,
          });
        }
      }
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        showAlert('Google Sign In Failed', 'Could not sign in with Google.');
      }
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.appTitle}>
            <Text style={{ color: '#78000E' }}>M</Text>
            <Text style={{ color: '#9E4502' }}>A</Text>
            <Text style={{ color: '#c1a900' }}>G</Text>
            <Text style={{ color: '#3c9820' }}>I</Text>
            <Text style={{ color: '#5008a7' }}>C</Text>
          </Text>
          <Text style={styles.appSubtitle}>Daily Creative Practice</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleEmailLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={styles.appleButton}
                onPress={handleAppleLogin}
                disabled={loading}
              >
                <Text style={styles.appleButtonText}> Sign in with Apple</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <Text style={styles.googleButtonText}>G  Sign in with Google</Text>
            </TouchableOpacity>

            <View style={styles.signUpRow}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.signUpLink}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  appTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: FONT_BOLD,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 30,
    fontStyle: 'italic',
    fontFamily: FONT,
  },
  card: {
    borderWidth: 3,
    borderColor: '#4B0082',
    borderRadius: 12,
    padding: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: FONT_BOLD,
  },
  inputLabel: {
    fontSize: 14,
    color: '#4B0082',
    marginBottom: 6,
    fontWeight: '600',
    fontFamily: FONT_BOLD,
  },
  textInput: {
    borderRadius: 8,
    padding: 14,
    color: '#4B0082',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4B0082',
    marginBottom: 16,
    fontFamily: FONT,
  },
  primaryButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#4B0082',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: FONT_BOLD,
  },
  linkText: {
    color: '#4B0082',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: FONT,
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
    fontFamily: FONT,
  },
  appleButton: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#4B0082',
  },
  appleButtonText: {
    color: '#4B0082',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONT_BOLD,
  },
  googleButton: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4B0082',
  },
  googleButtonText: {
    color: '#4B0082',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONT_BOLD,
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signUpText: {
    color: '#4B0082',
    fontSize: 14,
    fontFamily: FONT,
  },
  signUpLink: {
    color: '#4B0082',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT_BOLD,
  },
});
