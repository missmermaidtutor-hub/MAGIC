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
  Linking,
} from 'react-native';
import { showAlert } from '../../utils/alertUtils';

const RESET_LINK_URL = 'https://us-east1-magicnestlings.cloudfunctions.net/getPasswordResetLink';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState(null);

  const handleReset = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      showAlert('Missing Email', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${RESET_LINK_URL}?email=${encodeURIComponent(trimmed)}`);
      const data = await resp.json();
      if (data.reason === 'not_found') {
        showAlert('Not Found', 'No account found with that email address.');
      } else if (data.link) {
        setResetLink(data.link);
      } else {
        showAlert('Error', 'Could not generate a reset link. Please try again.');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      showAlert('Error', 'Could not reach the server. Please check your connection.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reset Password</Text>

            {resetLink ? (
              <>
                <Text style={styles.successText}>
                  Your reset link is ready.
                </Text>
                <Text style={styles.instructionText}>
                  Tap below to open the password reset page. After resetting, come back and sign in.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => Linking.openURL(resetLink)}
                >
                  <Text style={styles.primaryButtonText}>Reset My Password</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.linkText}>Back to Sign In</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.instructionText}>
                  Enter your email address and we'll send you a link to reset your password.
                </Text>

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

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleReset}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#4B0082" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.linkText}>Back to Sign In</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
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
    flex: 1,
    justifyContent: 'center',
    padding: 20,
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
    marginBottom: 16,
  },
  instructionText: {
    color: '#4B0082',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  successText: {
    color: '#22C55E',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  emailHighlight: {
    color: '#4B0082',
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    color: '#4B0082',
    marginBottom: 6,
    fontWeight: '600',
  },
  textInput: {
    borderRadius: 8,
    padding: 14,
    color: '#4B0082',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4B0082',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#4B0082',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#4B0082',
    fontSize: 14,
    textAlign: 'center',
  },
});
