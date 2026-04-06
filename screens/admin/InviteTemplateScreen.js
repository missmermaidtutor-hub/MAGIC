import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../config/admin';
import { showAlert, showConfirm } from '../../utils/alertUtils';
import { openMailto } from '../../utils/emailUtils';
import { getInviteTemplate, saveInviteTemplate } from '../../services/firestoreService';
import ThemedBackground from '../../components/ThemedBackground';

const DEFAULT_SUBJECT = "You're Invited to Make art. Grow. Inspire. Connect.";
const DEFAULT_BODY = `Hi there!

{inviterName} has invited you to Make art. Grow. Inspire. Connect. — a daily creative practice for mental health and artistic growth.

Join at: 13magicalnights.com

When you sign up, use referral code: {referralCode}

See you on the creative side!`;

export default function InviteTemplateScreen({ navigation }) {
  const { user } = useAuth();
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !isAdmin(user.uid)) {
      navigation.goBack();
      return;
    }
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const tmpl = await getInviteTemplate();
      if (tmpl) {
        setSubject(tmpl.subject || DEFAULT_SUBJECT);
        setBody(tmpl.body || DEFAULT_BODY);
      }
    } catch (error) {
      console.log('Error loading invite template:', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!subject.trim() || !body.trim()) {
      showAlert('Missing Fields', 'Both subject and body are required.');
      return;
    }
    setSaving(true);
    try {
      await saveInviteTemplate(subject.trim(), body.trim());
      showAlert('Saved', 'Invite email template updated successfully.');
    } catch (error) {
      console.log('Error saving template:', error);
      showAlert('Error', 'Could not save template. Please try again.');
    }
    setSaving(false);
  };

  const handlePreview = () => {
    const previewSubject = subject
      .replace(/{inviterName}/g, 'SampleUser')
      .replace(/{referralCode}/g, 'MAGIC-ABC123');
    const previewBody = body
      .replace(/{inviterName}/g, 'SampleUser')
      .replace(/{referralCode}/g, 'MAGIC-ABC123');
    openMailto(previewSubject, previewBody, 'preview@example.com');
  };

  const handleReset = () => {
    showConfirm(
      'Reset Template',
      'Reset to the default template? Your current changes will be lost.',
      () => {
        setSubject(DEFAULT_SUBJECT);
        setBody(DEFAULT_BODY);
      },
    );
  };

  return (
    <ThemedBackground style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>{'<'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Menu')}>
        <Text style={styles.menuBtnText}>{'\u2630'}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Invite Email Template</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
          </View>
        ) : (
          <>
            <View style={styles.tokenBox}>
              <Text style={styles.tokenTitle}>Available tokens:</Text>
              <Text style={styles.tokenText}>{'{inviterName}'} — Inviter's first name</Text>
              <Text style={styles.tokenText}>{'{referralCode}'} — Inviter's referral code</Text>
            </View>

            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.subjectInput}
              value={subject}
              onChangeText={setSubject}
              placeholder="Email subject line"
              placeholderTextColor="#999"
              multiline
            />

            <Text style={styles.label}>Body</Text>
            <TextInput
              style={styles.bodyInput}
              value={body}
              onChangeText={setBody}
              placeholder="Email body text"
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#4B0082" />
              ) : (
                <Text style={styles.primaryBtnText}>Save Template</Text>
              )}
            </TouchableOpacity>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handlePreview}>
                <Text style={styles.secondaryBtnText}>Preview</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleReset}>
                <Text style={styles.secondaryBtnText}>Reset to Default</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 16,
  },
  backBtn: {
    position: 'absolute',
    top: 44,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backBtnText: {
    color: '#4B0082',
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuBtn: {
    position: 'absolute',
    top: 44,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  menuBtnText: {
    color: '#4B0082',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tokenBox: {
    backgroundColor: 'rgba(75, 0, 130, 0.08)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  tokenTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B0082',
    marginBottom: 6,
  },
  tokenText: {
    fontSize: 13,
    color: '#4B0082',
    marginBottom: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B0082',
    marginBottom: 6,
  },
  subjectInput: {
    borderWidth: 1,
    borderColor: '#4B0082',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#4B0082',
    marginBottom: 16,
    minHeight: 48,
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: '#4B0082',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#4B0082',
    marginBottom: 20,
    minHeight: 200,
  },
  primaryBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#4B0082',
    fontSize: 16,
    fontWeight: 'bold',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#4B0082',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#4B0082',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
});
