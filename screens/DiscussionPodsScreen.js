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
import { subscribeToUserPods } from '../services/firestoreService';
import ThemedBackground from '../components/ThemedBackground';

export default function DiscussionPodsScreen({ navigation }) {
  const { user } = useAuth();
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToUserPods(
      user.uid,
      (updatedPods) => {
        setPods(updatedPods);
        setLoading(false);
      },
      (error) => {
        console.log('Pods subscription error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <ThemedBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Discussion Pods</Text>
        <Text style={styles.subtitle}>Group Conversations</Text>

        {user && isAdmin(user.uid) && (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => navigation.navigate('ManagePods')}
          >
            <Text style={styles.manageButtonText}>Manage Pods</Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
          </View>
        ) : pods.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>
              You haven't been assigned to any pods yet.
            </Text>
            <Text style={styles.emptySubtext}>
              An admin will add you to a discussion pod soon!
            </Text>
          </View>
        ) : (
          pods.map((pod) => {
            const memberCount = pod.members ? pod.members.length : 0;
            return (
              <TouchableOpacity
                key={pod.id}
                style={styles.podCard}
                onPress={() => navigation.navigate('PodChat', {
                  podId: pod.id,
                  podName: pod.name,
                  members: pod.members,
                  memberUsernames: pod.memberUsernames,
                })}
              >
                <View style={styles.podHeader}>
                  <Text style={styles.podName}>{pod.name}</Text>
                  <Text style={styles.podMembers}>
                    {memberCount} member{memberCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={styles.podUpdated}>
                  {pod.updatedAt ? `Updated ${formatTime(pod.updatedAt)}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Connect')}
        >
          <Text style={styles.backButtonText}>Back to Connect</Text>
        </TouchableOpacity>

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
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#050d61',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#050d61',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  manageButton: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignSelf: 'center',
    marginBottom: 20,
  },
  manageButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#050d61',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#050d61',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#050d61',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  podCard: {
    backgroundColor: 'rgba(184, 200, 232, 0.6)',
    borderWidth: 2,
    borderColor: '#050d61',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  podHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  podName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#050d61',
    flex: 1,
  },
  podMembers: {
    fontSize: 13,
    color: '#050d61',
    marginLeft: 10,
  },
  podUpdated: {
    fontSize: 12,
    color: '#050d61',
    fontStyle: 'italic',
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignSelf: 'center',
  },
  backButtonText: {
    color: '#050d61',
    fontSize: 15,
    fontWeight: '600',
  },
});
