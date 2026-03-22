import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

const formatTimestamp = (ts) => {
  if (!ts) return 'N/A';
  if (ts.toDate) return ts.toDate().toLocaleDateString();
  if (ts instanceof Date) return ts.toLocaleDateString();
  if (typeof ts === 'string') return ts;
  return 'N/A';
};

export default function UserProfileModal({ visible, profile, onClose }) {
  if (!profile) return null;

  const loc = profile.currentLocation || {};
  const heart = profile.heartLocation || {};
  const locationStr = [loc.city, loc.state, loc.country].filter(Boolean).join(', ');
  const heartStr = [heart.city, heart.state, heart.country].filter(Boolean).join(', ');
  const mediums = profile.favoriteMediums || [];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Header */}
            <Text style={styles.pseudonym}>{profile.pseudonym || 'No Pseudonym'}</Text>
            <Text style={styles.username}>@{profile.username || 'unknown'}</Text>
            {profile.email ? <Text style={styles.email}>{profile.email}</Text> : null}

            {/* Identity */}
            <Text style={styles.sectionTitle}>Identity</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Name</Text>
              <Text style={styles.fieldValue}>{profile.firstName || ''} {profile.lastName || ''}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <Text style={styles.fieldValue}>{profile.gender || 'Not set'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <Text style={styles.fieldValue}>{profile.phoneNumber || 'Not set'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Birthdate</Text>
              <Text style={styles.fieldValue}>{profile.birthdate || 'Not set'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Sign-in</Text>
              <Text style={styles.fieldValue}>{profile.accountMethod || 'email'}</Text>
            </View>

            {/* Location */}
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Timezone</Text>
              <Text style={styles.fieldValue}>{profile.timezone || 'Not set'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Current</Text>
              <Text style={styles.fieldValue}>{locationStr || 'Not set'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Heart</Text>
              <Text style={styles.fieldValue}>{heartStr || 'Not set'}</Text>
            </View>

            {/* Profile */}
            <Text style={styles.sectionTitle}>Profile</Text>
            {profile.bio ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Bio</Text>
                <Text style={styles.fieldValueBlock}>{profile.bio}</Text>
              </View>
            ) : null}
            {profile.favoritePrompt ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Favorite Prompt</Text>
                <Text style={styles.fieldValueBlock}>{profile.favoritePrompt}</Text>
              </View>
            ) : null}
            {mediums.length > 0 && (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Mediums</Text>
                <View style={styles.chipRow}>
                  {mediums.map(m => (
                    <View key={m} style={styles.chip}>
                      <Text style={styles.chipText}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Status */}
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Premium</Text>
              <Text style={styles.fieldValue}>{profile.isPremium ? 'Yes' : 'No'}</Text>
            </View>
            {profile.premiumExpiry && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Premium Expiry</Text>
                <Text style={styles.fieldValue}>{formatTimestamp(profile.premiumExpiry)}</Text>
              </View>
            )}
            {profile.premiumTrialExpiry && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Trial Expiry</Text>
                <Text style={styles.fieldValue}>{formatTimestamp(profile.premiumTrialExpiry)}</Text>
              </View>
            )}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Referral Code</Text>
              <Text style={styles.fieldValue}>{profile.referralCode || 'N/A'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Referrals</Text>
              <Text style={styles.fieldValue}>{profile.referralCount || 0}</Text>
            </View>
            {profile.referredBy && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Referred By</Text>
                <Text style={styles.fieldValue}>{profile.referredBy}</Text>
              </View>
            )}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Joined</Text>
              <Text style={styles.fieldValue}>{formatTimestamp(profile.createdAt)}</Text>
            </View>

            {/* Flags */}
            <Text style={styles.sectionTitle}>Flags</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Anonymous</Text>
              <Text style={styles.fieldValue}>{profile.anonymous ? 'Yes' : 'No'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Open to Pods</Text>
              <Text style={styles.fieldValue}>{profile.openToPods ? 'Yes' : 'No'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Boutique</Text>
              <Text style={styles.fieldValue}>{profile.allowWorkBoutique ? 'Yes' : 'No'}</Text>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#0a0e27',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    paddingTop: 16,
  },
  pseudonym: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#87CEEB',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  email: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,215,0,0.3)',
    paddingBottom: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#999',
    width: 110,
  },
  fieldValue: {
    fontSize: 13,
    color: '#E0E0E0',
    flex: 1,
    textAlign: 'right',
  },
  fieldBlock: {
    marginBottom: 8,
  },
  fieldValueBlock: {
    fontSize: 13,
    color: '#E0E0E0',
    marginTop: 2,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  chipText: {
    fontSize: 11,
    color: '#FFD700',
  },
});
