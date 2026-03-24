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
import { showAlert } from '../../utils/alertUtils';
import { openMailto } from '../../utils/emailUtils';
import {
  getUserInvitations,
  saveInvitation,
  grantInviteWeek,
  getInviteTemplate,
} from '../../services/firestoreService';

const MAX_INVITES = 6;

const DEFAULT_SUBJECT = "You're Invited to Make art. Grow. Inspire. Connect.";
const DEFAULT_BODY = `Hi there!

{inviterName} has invited you to Make art. Grow. Inspire. Connect. for a 13 day trial — a daily creative practice for mental health and artistic growth.

Join at: 13magicalnights.com

When you sign up, use referral code: {referralCode}

See you on the creative side!`;

export default function InviteFriendsScreen({ navigation }) {
  const { user, userProfile, refreshProfile } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [emails, setEmails] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(true);
  const [sendingIndex, setSendingIndex] = useState(null);
  const [template, setTemplate] = useState({ subject: DEFAULT_SUBJECT, body: DEFAULT_BODY });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load existing invitations
      if (user) {
        const existing = await getUserInvitations(user.uid);
        setInvitations(existing);
      }
      // Load email template
      const tmpl = await getInviteTemplate();
      if (tmpl && tmpl.subject && tmpl.body) {
        setTemplate({ subject: tmpl.subject, body: tmpl.body });
      }
    } catch (error) {
      console.log('Error loading invite data:', error);
    }
    setLoading(false);
  };

  const sentCount = invitations.length;
  const convertedCount = invitations.filter(i => i.converted).length;

  const isEmailSent = (email) => {
    if (!email.trim()) return false;
    return invitations.some(i => i.email === email.toLowerCase().trim());
  };

  const isEmailConverted = (email) => {
    if (!email.trim()) return false;
    return invitations.some(i => i.email === email.toLowerCase().trim() && i.converted);
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const handleSend = async (index) => {
    const email = emails[index].trim();

    if (!email) {
      showAlert('Missing Email', 'Please enter an email address.');
      return;
    }
    if (!validateEmail(email)) {
      showAlert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (isEmailSent(email)) {
      showAlert('Already Sent', 'You already sent an invitation to this email.');
      return;
    }
    if (sentCount >= MAX_INVITES) {
      showAlert('Limit Reached', 'You have already sent all 6 invitations.');
      return;
    }

    setSendingIndex(index);
    try {
      // Build email from template
      const inviterName = userProfile?.pseudonym || userProfile?.firstName || 'A friend';
      const referralCode = userProfile?.referralCode || '';

      const subject = template.subject
        .replace(/{inviterName}/g, inviterName)
        .replace(/{referralCode}/g, referralCode);
      const body = template.body
        .replace(/{inviterName}/g, inviterName)
        .replace(/{referralCode}/g, referralCode);

      // Open mailto
      openMailto(subject, body, email);

      // Save invitation to Firestore
      await saveInvitation(user.uid, email);

      // Grant +7 days premium
      await grantInviteWeek(user.uid);

      // Refresh profile to pick up new premiumTrialExpiry
      await refreshProfile();

      // Reload invitations
      const updated = await getUserInvitations(user.uid);
      setInvitations(updated);

      showAlert('Invitation Sent!', 'You earned a free week of Premium!');
    } catch (error) {
      console.log('Error sending invitation:', error);
      showAlert('Error', 'Could not save invitation. Please try again.');
    }
    setSendingIndex(null);
  };

  const renderSlot = (index) => {
    // Check if this slot is already filled by a sent invitation
    const sentInvite = invitations[index];
    const slotEmail = sentInvite ? sentInvite.email : emails[index];
    const isSent = !!sentInvite;
    const isConverted = sentInvite?.converted;
    const allSent = sentCount >= MAX_INVITES;

    return (
      <View key={index} style={styles.slotRow}>
        <Text style={styles.slotNumber}>{index + 1}.</Text>
        {isSent ? (
          <View style={styles.sentRow}>
            <Text style={styles.sentEmail} numberOfLines={1}>{slotEmail}</Text>
            <View style={[styles.badge, isConverted ? styles.badgeConverted : styles.badgeSent]}>
              <Text style={styles.badgeText}>{isConverted ? 'Joined!' : 'Sent'}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.emailInput}
              value={emails[index]}
              onChangeText={(text) => {
                const updated = [...emails];
                updated[index] = text;
                setEmails(updated);
              }}
              placeholder="friend@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!allSent}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (allSent || sendingIndex !== null) && styles.sendBtnDisabled]}
              onPress={() => handleSend(index)}
              disabled={allSent || sendingIndex !== null}
            >
              {sendingIndex === index ? (
                <ActivityIndicator size="small" color="#4B0082" />
              ) : (
                <Text style={styles.sendBtnText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.container} resizeMode="cover">
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>{'<'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Menu')}>
        <Text style={styles.menuBtnText}>{'\u2630'}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Invite Friends</Text>

        <View style={styles.introBox}>
          <Text style={styles.introText}>
            Invite friends to MAGIC! Each invitation earns you a free week of Premium.
          </Text>
          <Text style={styles.introText}>
            You can invite up to {MAX_INVITES} friends.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
          </View>
        ) : (
          <>
            {/* Summary */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                {sentCount} invitation{sentCount !== 1 ? 's' : ''} sent — {sentCount} week{sentCount !== 1 ? 's' : ''} earned
              </Text>
              {convertedCount > 0 && (
                <Text style={styles.convertedText}>
                  {convertedCount} friend{convertedCount !== 1 ? 's' : ''} joined!
                </Text>
              )}
            </View>

            {/* 6 Email Slots */}
            <View style={styles.slotsContainer}>
              {Array.from({ length: MAX_INVITES }).map((_, i) => renderSlot(i))}
            </View>
          </>
        )}
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
    paddingBottom: 40,
  },
  header: {
    fontSize: 32,
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
  introBox: {
    backgroundColor: 'rgba(75, 0, 130, 0.08)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  introText: {
    fontSize: 14,
    color: '#4B0082',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  summaryBox: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B0082',
  },
  convertedText: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '600',
    marginTop: 4,
  },
  slotsContainer: {
    marginBottom: 20,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  slotNumber: {
    width: 24,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B0082',
  },
  sentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(75, 0, 130, 0.06)',
    borderRadius: 8,
    padding: 12,
  },
  sentEmail: {
    flex: 1,
    fontSize: 14,
    color: '#4B0082',
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  badgeSent: {
    backgroundColor: 'rgba(75, 0, 130, 0.15)',
  },
  badgeConverted: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B0082',
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#4B0082',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#4B0082',
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: '#4B0082',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
});
