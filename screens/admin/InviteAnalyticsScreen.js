import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../config/admin';
import { getAllInvitations, getAllUsers } from '../../services/firestoreService';
import UserProfileModal from '../../components/admin/UserProfileModal';

const FILTERS = ['All', 'Converted', 'Pending'];

const formatTimestamp = (ts) => {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function InviteAnalyticsScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('All');
  const [expandedInviter, setExpandedInviter] = useState(null);
  const [profileModalUser, setProfileModalUser] = useState(null);

  useEffect(() => {
    if (!user || !isAdmin(user.uid)) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allInvites, allUsers] = await Promise.all([
        getAllInvitations(),
        getAllUsers(),
      ]);
      setInvitations(allInvites);
      setUsers(allUsers);
    } catch (err) {
      console.log('InviteAnalytics load error:', err);
    }
    setLoading(false);
  };

  if (!user || !isAdmin(user.uid)) {
    return (
      <ImageBackground source={require('../../assets/background.png')} style={styles.container} resizeMode="cover">
        <Text style={styles.accessDenied}>Admin access required</Text>
      </ImageBackground>
    );
  }

  // Build user lookup map
  const userMap = {};
  users.forEach(u => { userMap[u.uid] = u; });

  // Summary stats
  const totalSent = invitations.length;
  const totalConverted = invitations.filter(i => i.converted).length;
  const conversionRate = totalSent > 0 ? Math.round((totalConverted / totalSent) * 100) : 0;

  // Group by inviter
  const grouped = {};
  invitations.forEach(inv => {
    const uid = inv.inviterUid;
    if (!grouped[uid]) {
      grouped[uid] = { uid, invites: [] };
    }
    grouped[uid].invites.push(inv);
  });

  // Apply filter
  const filteredGrouped = Object.values(grouped).map(group => {
    let filtered = group.invites;
    if (filter === 'Converted') filtered = filtered.filter(i => i.converted);
    if (filter === 'Pending') filtered = filtered.filter(i => !i.converted);
    return { ...group, invites: filtered };
  }).filter(g => g.invites.length > 0);

  // Sort by sent count descending
  filteredGrouped.sort((a, b) => b.invites.length - a.invites.length);

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Invite Analytics</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
          </View>
        ) : (
          <>
            {/* Summary cards */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{totalSent}</Text>
                <Text style={styles.summaryLabel}>Sent</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, { color: '#22C55E' }]}>{totalConverted}</Text>
                <Text style={styles.summaryLabel}>Converted</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, { color: '#B8860B' }]}>{conversionRate}%</Text>
                <Text style={styles.summaryLabel}>Rate</Text>
              </View>
            </View>

            {/* Filter tabs */}
            <View style={styles.filterRow}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterTab, filter === f && styles.filterTabActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Per-inviter list */}
            {filteredGrouped.length === 0 ? (
              <Text style={styles.emptyText}>No invitations match this filter.</Text>
            ) : (
              filteredGrouped.map(group => {
                const profile = userMap[group.uid];
                const pseudonym = profile?.pseudonym || 'Unknown';
                const username = profile?.username || '—';
                const sentCount = group.invites.length;
                const convCount = group.invites.filter(i => i.converted).length;
                const isExpanded = expandedInviter === group.uid;

                return (
                  <View key={group.uid} style={styles.inviterCard}>
                    <TouchableOpacity
                      style={styles.inviterHeader}
                      onPress={() => setExpandedInviter(isExpanded ? null : group.uid)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inviterName}>{pseudonym}</Text>
                        <Text style={styles.inviterUsername}>@{username}</Text>
                      </View>
                      <View style={styles.inviterStats}>
                        <Text style={styles.inviterStat}>{sentCount} sent</Text>
                        <Text style={[styles.inviterStat, { color: '#22C55E' }]}>{convCount} joined</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.viewProfileBtn}
                        onPress={() => setProfileModalUser(profile)}
                      >
                        <Text style={styles.viewProfileText}>View</Text>
                      </TouchableOpacity>
                      <Text style={styles.expandArrow}>{isExpanded ? '▼' : '▶'}</Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.inviteList}>
                        {group.invites.map((inv, idx) => (
                          <View key={inv.docId || idx} style={styles.inviteRow}>
                            <Text style={styles.inviteEmail} numberOfLines={1}>{inv.email}</Text>
                            {inv.hasFriendToken && <Text style={{ fontSize: 11, marginLeft: 4 }}>🎁</Text>}
                            <View style={[styles.statusBadge, inv.converted ? styles.statusConverted : styles.statusPending]}>
                              <Text style={styles.statusText}>{inv.converted ? 'Joined' : 'Pending'}</Text>
                            </View>
                            <Text style={styles.inviteDate}>{formatTimestamp(inv.sentAt)}</Text>
                            {inv.converted && inv.convertedAt && (
                              <Text style={[styles.inviteDate, { color: '#22C55E' }]}>{formatTimestamp(inv.convertedAt)}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Buttons AFTER ScrollView so they render on top (web z-index fix) */}
      <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Menu')}>
        <Text style={styles.menuBtnText}>{'\u2630'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.closeBtnText}>{'\u2715'}</Text>
      </TouchableOpacity>

      {profileModalUser && (
        <UserProfileModal
          visible={!!profileModalUser}
          user={profileModalUser}
          onClose={() => setProfileModalUser(null)}
        />
      )}
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
  menuBtn: {
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
  menuBtnText: {
    color: '#4B0082',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
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
  closeBtnText: {
    color: '#4B0082',
    fontSize: 18,
    fontWeight: 'bold',
  },
  accessDenied: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4B0082',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#4B0082',
    marginTop: 4,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: 'rgba(75, 0, 130, 0.1)',
  },
  filterTabActive: {
    backgroundColor: '#FFD700',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B0082',
  },
  filterTabTextActive: {
    color: '#4B0082',
  },
  emptyText: {
    color: '#4B0082',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 20,
  },
  inviterCard: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  inviterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  inviterName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4B0082',
  },
  inviterUsername: {
    fontSize: 12,
    color: '#4B0082',
    opacity: 0.7,
  },
  inviterStats: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  inviterStat: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B0082',
  },
  viewProfileBtn: {
    backgroundColor: 'rgba(75, 0, 130, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  viewProfileText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B0082',
  },
  expandArrow: {
    fontSize: 12,
    color: '#4B0082',
  },
  inviteList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(75, 0, 130, 0.15)',
    padding: 10,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 0, 130, 0.08)',
  },
  inviteEmail: {
    flex: 1,
    fontSize: 13,
    color: '#4B0082',
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  statusConverted: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  statusPending: {
    backgroundColor: 'rgba(75, 0, 130, 0.12)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B0082',
  },
  inviteDate: {
    fontSize: 11,
    color: '#4B0082',
    opacity: 0.6,
    marginLeft: 6,
  },
  refreshBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  refreshBtnText: {
    color: '#4B0082',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
