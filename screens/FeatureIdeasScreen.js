import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ImageBackground, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../config/admin';
import { getAllFeatureIdeas } from '../services/firestoreService';

export default function FeatureIdeasScreen({ navigation }) {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin(user.uid)) {
      navigation.goBack();
      return;
    }
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      const data = await getAllFeatureIdeas();
      setIdeas(data);
    } catch (e) {
      console.log('Error loading feature ideas:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate?.()
      ? timestamp.toDate()
      : timestamp?.seconds
        ? new Date(timestamp.seconds * 1000)
        : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Feature Ideas</Text>
        <Text style={styles.subtitle}>{ideas.length} idea{ideas.length !== 1 ? 's' : ''} submitted</Text>

        {loading ? (
          <ActivityIndicator color="#FFD700" size="large" style={{ marginTop: 40 }} />
        ) : ideas.length === 0 ? (
          <Text style={styles.emptyText}>No ideas submitted yet.</Text>
        ) : (
          ideas.map((idea) => (
            <View key={idea.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.pseudonym}>{idea.submitterPseudonym || 'Anonymous'}</Text>
                <Text style={styles.date}>{formatDate(idea.createdAt)}</Text>
              </View>
              <Text style={styles.ideaText}>{idea.text}</Text>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
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
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pseudonym: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
  },
  date: {
    color: '#888',
    fontSize: 12,
  },
  ideaText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
});
