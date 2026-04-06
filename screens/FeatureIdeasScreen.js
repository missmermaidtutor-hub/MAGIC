import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ImageBackground, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../config/admin';
import { getAllFeatureIdeas } from '../services/firestoreService';
import ThemedBackground from '../components/ThemedBackground';

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
    <ThemedBackground style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Menu')}>
        <Text style={styles.menuBtnText}>☰</Text>
      </TouchableOpacity>
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
    color: '#4B0082',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#4B0082',
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: 'rgba(75, 0, 130, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(75, 0, 130, 0.25)',
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
    color: '#4B0082',
    fontSize: 14,
    fontWeight: '700',
  },
  date: {
    color: '#4B0082',
    fontSize: 12,
  },
  ideaText: {
    color: '#4B0082',
    fontSize: 14,
    lineHeight: 20,
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
});
