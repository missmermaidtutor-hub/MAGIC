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
} from 'react-native';
import { showAlert } from '../../utils/alertUtils';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      showAlert('Missing Email', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim(), {
        url: 'https://magicnestlings.web.app',
        handleCodeInApp: false,
      });
      setSent(true);
    } catch (error) {
      let message = 'Could not send reset email. Please try again.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
      showAlert('Error', message);
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

            {sent ? (
              <>
                <Text style={styles.successText}>
                  A password reset link has been sent to{'\n'}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>
                <Text style={styles.instructionText}>
                  Check your inbox and follow the link to reset your password.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.primaryButtonText}>Back to Sign In</Text>
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
