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
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../config/admin';
import { getAnalyticsForDate, getAllUsers, getAllInvitations } from '../services/firestoreService';
import { getESTDate } from '../utils/dateUtils';
import { setAdminPremiumOverride, getAdminPremiumOverride } from '../utils/premiumUtils';
import UserProfileModal from '../components/admin/UserProfileModal';

const ACTION_LABELS = {
  courage_uploaded_write: 'Courage (Write)',
  courage_uploaded_sketch: 'Courage (Sketch)',
  courage_uploaded_capture: 'Courage (Capture)',
  sketch_started: 'Sketch Started',
  sketch_saved: 'Sketch Saved',
  art_timer_started: 'Art Timer Started',
  art_timer_stopped: 'Art Timer Stopped',
  goal_set: 'Goal Set',
  goal_completed: 'Goal Completed',
  goal_carried_forward: 'Goal Carried Forward',
  manifest_saved: 'Manifest Saved',
  vote_submitted: 'Vote Submitted',
  artwork_curated: 'Artwork Curated',
  artwork_uncurated: 'Artwork Uncurated',
  pod_message_sent: 'Pod Message Sent',
  profile_updated: 'Profile Updated',
  pseudonym_changed: 'Pseudonym Changed',
  quote_hearted: 'Quote Hearted',
  quote_unhearted: 'Quote Unhearted',
};

const formatSeconds = (s) => {
  if (!s || s < 1) return '0s';
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.round(s % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const shiftDate = (dateStr, days) => {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function AnalyticsScreen({ navigation }) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getESTDate());
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [profileMap, setProfileMap] = useState({});
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [inviteData, setInviteData] = useState({ total: 0, converted: 0, perUser: [] });
  const [adminOverride, setAdminOverride] = useState(getAdminPremiumOverride());

  const today = getESTDate();

  useEffect(() => {
    if (!user || !isAdmin(user.uid)) {
      navigation.goBack();
      return;
    }
    loadProfiles();
    loadData(selectedDate);
    loadInviteData();
  }, [selectedDate]);

  const loadProfiles = async () => {
    try {
      const users = await getAllUsers();
      const map = {};
      users.forEach(u => { map[u.uid] = u; });
      setProfileMap(map);
    } catch (error) {
      console.log('Error loading profiles:', error);
    }
  };

  const loadData = async (date) => {
    setLoading(true);
    try {
      const data = await getAnalyticsForDate(date);
      setUserData(data);
    } catch (error) {
      console.log('Error loading analytics:', error);
      setUserData([]);
    }
    setLoading(false);
  };

  const loadInviteData = async () => {
    try {
      const allInvites = await getAllInvitations();
      const total = allInvites.length;
      const converted = allInvites.filter(i => i.converted).length;

      // Group by inviter
      const byUser = {};
      for (const inv of allInvites) {
        if (!byUser[inv.inviterUid]) {
          byUser[inv.inviterUid] = { sent: 0, converted: 0 };
        }
        byUser[inv.inviterUid].sent++;
        if (inv.converted) byUser[inv.inviterUid].converted++;
      }

      const perUser = Object.entries(byUser)
        .map(([uid, stats]) => ({ uid, ...stats }))
        .sort((a, b) => b.sent - a.sent);

      setInviteData({ total, converted, perUser });
    } catch (error) {
      console.log('Error loading invite data:', error);
    }
  };

  const goBack = () => {
    const prev = shiftDate(selectedDate, -1);
    setSelectedDate(prev);
  };

  const goForward = () => {
    if (selectedDate >= today) return;
    const next = shiftDate(selectedDate, 1);
    setSelectedDate(next);
  };

  // Aggregate data across all users
  const aggregate = () => {
    const totalScreenTime = {};
    const totalActions = {};
    let totalSeconds = 0;
    let totalActionCount = 0;

    for (const u of userData) {
      if (u.screenTime) {
        for (const [screen, secs] of Object.entries(u.screenTime)) {
          totalScreenTime[screen] = (totalScreenTime[screen] || 0) + secs;
          totalSeconds += secs;
        }
      }
      if (u.actions) {
        for (const [action, count] of Object.entries(u.actions)) {
          totalActions[action] = (totalActions[action] || 0) + count;
          totalActionCount += count;
        }
      }
    }

    // Sort screens by time descending
    const sortedScreens = Object.entries(totalScreenTime)
      .sort(([, a], [, b]) => b - a);

    // Sort actions by count descending
    const sortedActions = Object.entries(totalActions)
      .sort(([, a], [, b]) => b - a);

    return {
      dau: userData.length,
      totalSeconds,
      totalActionCount,
      sortedScreens,
      sortedActions,
    };
  };

  const { dau, totalSeconds, totalActionCount, sortedScreens, sortedActions } = aggregate();

  const maxScreenTime = sortedScreens.length > 0 ? sortedScreens[0][1] : 1;
  const maxActionCount = sortedActions.length > 0 ? sortedActions[0][1] : 1;

  // Per-user data
  const getUserTotal = (u) => {
    let secs = 0;
    let acts = 0;
    if (u.screenTime) Object.values(u.screenTime).forEach(s => secs += s);
    if (u.actions) Object.values(u.actions).forEach(c => acts += c);
    return { secs, acts };
  };

  const sortedUsers = [...userData].sort((a, b) => {
    const aT = getUserTotal(a);
    const bT = getUserTotal(b);
    return bT.secs - aT.secs;
  });

  return (
    <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
      <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Menu')}>
        <Text style={styles.menuBtnText}>{'\u2630'}</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Analytics</Text>

        {/* Date Picker */}
        <View style={styles.datePicker}>
          <TouchableOpacity onPress={goBack} style={styles.dateArrow}>
            <Text style={styles.dateArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>{selectedDate}</Text>
          <TouchableOpacity
            onPress={goForward}
            style={[styles.dateArrow, selectedDate >= today && styles.dateArrowDisabled]}
            disabled={selectedDate >= today}
          >
            <Text style={[styles.dateArrowText, selectedDate >= today && styles.dateArrowTextDisabled]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Admin Premium Preview Toggle */}
        <View style={styles.adminToggleContainer}>
          <Text style={styles.adminToggleLabel}>Premium Preview</Text>
          <View style={styles.adminToggleRow}>
            {[
              { key: null, label: 'Normal' },
              { key: 'full', label: 'Full' },
              { key: 'limited', label: 'Limited' },
              { key: 'free', label: 'Free' },
            ].map(opt => {
              const isActive = adminOverride === opt.key;
              return (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.adminToggleBtn, isActive && styles.adminToggleBtnActive]}
                  onPress={() => {
                    setAdminOverride(opt.key);
                    setAdminPremiumOverride(opt.key);
                  }}
                >
                  <Text style={[styles.adminToggleBtnText, isActive && styles.adminToggleBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{Object.keys(profileMap).length}</Text>
                <Text style={styles.summaryLabel}>Registered</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{dau}</Text>
                <Text style={styles.summaryLabel}>Active Today</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{formatSeconds(totalSeconds)}</Text>
                <Text style={styles.summaryLabel}>Total Time</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{totalActionCount}</Text>
                <Text style={styles.summaryLabel}>Actions</Text>
              </View>
            </View>

            {/* Screen Time Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Screen Time</Text>
              {sortedScreens.length === 0 ? (
                <Text style={styles.emptyText}>No screen data for this day</Text>
              ) : (
                sortedScreens.map(([screen, secs]) => {
                  const pct = Math.max((secs / maxScreenTime) * 100, 2);
                  const timePct = totalSeconds > 0 ? Math.round((secs / totalSeconds) * 100) : 0;
                  return (
                    <View key={screen} style={styles.barRow}>
                      <Text style={styles.barLabel}>{screen}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.barValue}>{formatSeconds(secs)}</Text>
                      <Text style={styles.barPct}>{timePct}%</Text>
                    </View>
                  );
                })
              )}
            </View>

            {/* Feature Usage */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Feature Usage</Text>
              {sortedActions.length === 0 ? (
                <Text style={styles.emptyText}>No actions recorded for this day</Text>
              ) : (
                sortedActions.map(([action, count]) => {
                  const pct = Math.max((count / maxActionCount) * 100, 2);
                  const label = ACTION_LABELS[action] || action;
                  return (
                    <View key={action} style={styles.barRow}>
                      <Text style={styles.barLabel}>{label}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, styles.barFillAction, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.barValue}>{count}</Text>
                    </View>
                  );
                })
              )}
            </View>

            {/* Per-User Activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Per-User Activity</Text>
              {sortedUsers.length === 0 ? (
                <Text style={styles.emptyText}>No users active this day</Text>
              ) : (
                sortedUsers.map((u) => {
                  const { secs, acts } = getUserTotal(u);
                  const isExpanded = expandedUser === u.uid;
                  const profile = profileMap[u.uid];
                  const displayName = profile?.pseudonym || profile?.username || u.uid.slice(0, 12) + '...';
                  const userScreens = u.screenTime
                    ? Object.entries(u.screenTime).sort(([, a], [, b]) => b - a)
                    : [];
                  const userActions = u.actions
                    ? Object.entries(u.actions).sort(([, a], [, b]) => b - a)
                    : [];

                  return (
                    <View key={u.uid}>
                      <TouchableOpacity
                        style={styles.userRow}
                        onPress={() => setExpandedUser(isExpanded ? null : u.uid)}
                      >
                        <Text style={styles.userUid} numberOfLines={1}>
                          {displayName}
                        </Text>
                        <Text style={styles.userStat}>{formatSeconds(secs)}</Text>
                        <Text style={styles.userStat}>{acts} actions</Text>
                        <Text style={styles.expandArrow}>{isExpanded ? '▼' : '▶'}</Text>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.userDetail}>
                          {profile && (
                            <TouchableOpacity
                              style={styles.viewProfileBtn}
                              onPress={() => setSelectedProfile(profile)}
                            >
                              <Text style={styles.viewProfileBtnText}>View Profile</Text>
                            </TouchableOpacity>
                          )}
                          {userScreens.length > 0 && (
                            <>
                              <Text style={styles.detailHeader}>Screens:</Text>
                              {userScreens.map(([screen, s]) => (
                                <Text key={screen} style={styles.detailLine}>
                                  {screen}: {formatSeconds(s)}
                                </Text>
                              ))}
                            </>
                          )}
                          {userActions.length > 0 && (
                            <>
                              <Text style={styles.detailHeader}>Actions:</Text>
                              {userActions.map(([action, c]) => (
                                <Text key={action} style={styles.detailLine}>
                                  {ACTION_LABELS[action] || action}: {c}
                                </Text>
                              ))}
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        {/* Invitations (all-time, not date-filtered) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invitations (All Time)</Text>
          <View style={styles.inviteSummaryRow}>
            <View style={styles.inviteStat}>
              <Text style={styles.inviteStatNumber}>{inviteData.total}</Text>
              <Text style={styles.inviteStatLabel}>Sent</Text>
            </View>
            <View style={styles.inviteStat}>
              <Text style={styles.inviteStatNumber}>{inviteData.converted}</Text>
              <Text style={styles.inviteStatLabel}>Converted</Text>
            </View>
            <View style={styles.inviteStat}>
              <Text style={styles.inviteStatNumber}>
                {inviteData.total > 0 ? Math.round((inviteData.converted / inviteData.total) * 100) : 0}%
              </Text>
              <Text style={styles.inviteStatLabel}>Rate</Text>
            </View>
          </View>
          {inviteData.perUser.length === 0 ? (
            <Text style={styles.emptyText}>No invitations sent yet</Text>
          ) : (
            inviteData.perUser.map((u) => {
              const profile = profileMap[u.uid];
              const name = profile?.pseudonym || profile?.username || u.uid.slice(0, 12) + '...';
              return (
                <View key={u.uid} style={styles.inviteUserRow}>
                  <Text style={styles.inviteUserName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.inviteUserStat}>{u.sent} sent</Text>
                  <Text style={styles.inviteUserStat}>{u.converted} joined</Text>
                </View>
              );
            })
          )}
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Buttons AFTER ScrollView so they render on top (web z-index fix) */}
      <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Menu')}>
        <Text style={styles.menuBtnText}>☰</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      <UserProfileModal
        visible={!!selectedProfile}
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />
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
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#050d61',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 10,
  },
  datePicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateArrow: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dateArrowDisabled: {
    opacity: 0.3,
  },
  dateArrowText: {
    fontSize: 32,
    color: '#050d61',
    fontWeight: 'bold',
  },
  dateArrowTextDisabled: {
    color: '#888',
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050d61',
    minWidth: 140,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(184, 200, 232, 0.6)',
    borderWidth: 2,
    borderColor: '#050d61',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#050d61',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#050d61',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
    borderWidth: 2,
    borderColor: '#050d61',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050d61',
    marginBottom: 12,
  },
  emptyText: {
    color: '#050d61',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabel: {
    width: 90,
    fontSize: 12,
    color: '#050d61',
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 8,
  },
  barFillAction: {
    backgroundColor: '#6366F1',
  },
  barValue: {
    width: 55,
    fontSize: 12,
    color: '#050d61',
    fontWeight: '600',
    textAlign: 'right',
  },
  barPct: {
    width: 35,
    fontSize: 11,
    color: '#050d61',
    textAlign: 'right',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(5, 13, 97, 0.2)',
  },
  userUid: {
    flex: 1,
    fontSize: 12,
    color: '#050d61',
    fontWeight: '600',
  },
  userStat: {
    fontSize: 12,
    color: '#050d61',
    marginLeft: 10,
  },
  expandArrow: {
    fontSize: 12,
    color: '#050d61',
    marginLeft: 8,
  },
  userDetail: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  viewProfileBtn: {
    backgroundColor: 'rgba(255, 215, 0, 0.8)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  viewProfileBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  detailHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#050d61',
    marginTop: 6,
    marginBottom: 4,
  },
  detailLine: {
    fontSize: 12,
    color: '#050d61',
    marginLeft: 10,
    marginBottom: 2,
  },
  backButton: {
    marginTop: 10,
    paddingVertical: 12,
    alignSelf: 'center',
  },
  backButtonText: {
    color: '#050d61',
    fontSize: 15,
    fontWeight: '600',
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
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  inviteSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  inviteStat: {
    alignItems: 'center',
  },
  inviteStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050d61',
  },
  inviteStatLabel: {
    fontSize: 11,
    color: '#050d61',
    marginTop: 2,
  },
  inviteUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(5, 13, 97, 0.15)',
  },
  inviteUserName: {
    flex: 1,
    fontSize: 13,
    color: '#050d61',
    fontWeight: '600',
  },
  inviteUserStat: {
    fontSize: 12,
    color: '#050d61',
    marginLeft: 12,
  },
  // Admin premium toggle
  adminToggleContainer: {
    backgroundColor: 'rgba(200, 50, 50, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200, 50, 50, 0.4)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  adminToggleLabel: {
    fontSize: 11,
    color: '#c33',
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  adminToggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  adminToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(200, 50, 50, 0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  adminToggleBtnActive: {
    backgroundColor: '#c33',
    borderColor: '#c33',
  },
  adminToggleBtnText: {
    fontSize: 12,
    color: '#050d61',
    fontWeight: '600',
  },
  adminToggleBtnTextActive: {
    color: '#fff',
  },
});
