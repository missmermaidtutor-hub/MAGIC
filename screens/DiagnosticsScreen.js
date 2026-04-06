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
import ThemedBackground from '../components/ThemedBackground';
import {
  getAllUsersOrdered,
  getAllPseudonymClaims,
  getAllUsernameClaims,
  getAllPods,
} from '../services/firestoreService';

export default function DiagnosticsScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState([]);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!user || !isAdmin(user.uid)) {
      navigation.goBack();
      return;
    }
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const [users, pseudonyms, usernames, pods] = await Promise.all([
        getAllUsersOrdered(),
        getAllPseudonymClaims(),
        getAllUsernameClaims(),
        getAllPods(),
      ]);

      const userUidSet = new Set(users.map(u => u.uid));
      const results = [];

      // 1. Incomplete Profiles
      const incomplete = users.filter(
        u => !u.pseudonym || !u.birthdate || !u.timezone
      );
      results.push({
        id: 'incomplete',
        title: 'Incomplete Profiles',
        count: incomplete.length,
        items: incomplete.map(u => {
          const missing = [];
          if (!u.pseudonym) missing.push('pseudonym');
          if (!u.birthdate) missing.push('birthdate');
          if (!u.timezone) missing.push('timezone');
          return `${u.email || u.uid} — missing: ${missing.join(', ')}`;
        }),
      });

      // 2. Orphaned Pseudonym Claims
      const orphanedPseudonyms = pseudonyms.filter(
        p => !p.released && p.uid && !userUidSet.has(p.uid)
      );
      results.push({
        id: 'orphanedPseudonyms',
        title: 'Orphaned Pseudonym Claims',
        count: orphanedPseudonyms.length,
        items: orphanedPseudonyms.map(
          p => `"${p.pseudonym || p.key}" claimed by UID ${p.uid}`
        ),
      });

      // 3. Orphaned Username Claims
      const orphanedUsernames = usernames.filter(
        u => !u.released && u.uid && !userUidSet.has(u.uid)
      );
      results.push({
        id: 'orphanedUsernames',
        title: 'Orphaned Username Claims',
        count: orphanedUsernames.length,
        items: orphanedUsernames.map(
          u => `"${u.username || u.key}" claimed by UID ${u.uid}`
        ),
      });

      // 4. Empty Discussion Pods
      const emptyPods = pods.filter(
        p => !p.members || p.members.length === 0
      );
      results.push({
        id: 'emptyPods',
        title: 'Empty Discussion Pods',
        count: emptyPods.length,
        items: emptyPods.map(p => `"${p.name}" (${p.id})`),
      });

      // 5. Premium Anomalies
      const now = new Date();
      const premiumAnomalies = users.filter(u => {
        if (!u.isPremium) return false;
        if (u.premiumExpiry) {
          const expiry = u.premiumExpiry.toDate
            ? u.premiumExpiry.toDate()
            : new Date(u.premiumExpiry);
          if (expiry < now) return true;
        }
        if (u.premiumTrialExpiry) {
          const trialExpiry = u.premiumTrialExpiry.toDate
            ? u.premiumTrialExpiry.toDate()
            : new Date(u.premiumTrialExpiry);
          if (trialExpiry < now && !u.premiumExpiry) return true;
        }
        return false;
      });
      results.push({
        id: 'premiumAnomalies',
        title: 'Premium Anomalies',
        count: premiumAnomalies.length,
        items: premiumAnomalies.map(
          u => `${u.email || u.uid} — isPremium but expired`
        ),
      });

      // 6. Stale Pod Members
      const stalePodMembers = [];
      for (const pod of pods) {
        if (!pod.members) continue;
        const stale = pod.members.filter(uid => !userUidSet.has(uid));
        if (stale.length > 0) {
          stalePodMembers.push(
            `"${pod.name}": ${stale.length} stale member(s) — ${stale.join(', ')}`
          );
        }
      }
      results.push({
        id: 'stalePodMembers',
        title: 'Stale Pod Members',
        count: stalePodMembers.length,
        items: stalePodMembers,
      });

      setChecks(results);
    } catch (error) {
      console.log('Diagnostics error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeColor = (count) => {
    if (count === 0) return '#22C55E';
    if (count <= 3) return '#F59E0B';
    return '#EF4444';
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <ThemedBackground style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Menu')}>
        <Text style={styles.menuBtnText}>☰</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Bug Check</Text>
        <Text style={styles.subtitle}>Firestore Diagnostics</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Running checks...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.refreshBtn} onPress={runDiagnostics}>
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>

            {checks.map(check => (
              <TouchableOpacity
                key={check.id}
                style={styles.checkCard}
                onPress={() => toggleExpand(check.id)}
                activeOpacity={0.7}
              >
                <View style={styles.checkHeader}>
                  <Text style={styles.checkTitle}>{check.title}</Text>
                  <View
                    style={[
                      styles.countBadge,
                      { backgroundColor: getBadgeColor(check.count) },
                    ]}
                  >
                    <Text style={styles.countBadgeText}>{check.count}</Text>
                  </View>
                </View>

                {expanded[check.id] && check.items.length > 0 && (
                  <View style={styles.detailList}>
                    {check.items.map((item, i) => (
                      <Text key={i} style={styles.detailItem}>
                        {item}
                      </Text>
                    ))}
                  </View>
                )}

                {expanded[check.id] && check.items.length === 0 && (
                  <Text style={styles.allClearText}>All clear!</Text>
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
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
    paddingTop: 70,
    paddingBottom: 50,
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#4B0082',
    fontSize: 14,
    marginTop: 12,
  },
  refreshBtn: {
    alignSelf: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginBottom: 20,
  },
  refreshBtnText: {
    color: '#0a0e27',
    fontSize: 14,
    fontWeight: '700',
  },
  checkCard: {
    backgroundColor: 'rgba(75, 0, 130, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(75, 0, 130, 0.25)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  checkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B0082',
    flex: 1,
  },
  countBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  detailList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(75, 0, 130, 0.15)',
    paddingTop: 10,
  },
  detailItem: {
    fontSize: 12,
    color: '#4B0082',
    lineHeight: 18,
    paddingVertical: 3,
  },
  allClearText: {
    fontSize: 13,
    color: '#22C55E',
    fontStyle: 'italic',
    marginTop: 10,
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
});
