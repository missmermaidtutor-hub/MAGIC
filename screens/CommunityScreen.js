import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export default function CommunityScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Community</Text>
        <Text style={styles.subtitle}>Connect & Share</Text>
        
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>👥</Text>
          <Text style={styles.placeholderSubtext}>
            This is where you'll:
            {'\n'}• View public galleries
            {'\n'}• See research & articles
            {'\n'}• Access the boutique
            {'\n'}• Connect with other artists
          </Text>
        </View>
      </ScrollView>
    </View>
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
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#DDA0DD',
    textAlign: 'center',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  placeholder: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
  },
  placeholderText: {
    fontSize: 80,
    marginBottom: 20,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#DDA0DD',
    textAlign: 'center',
    lineHeight: 24,
  },
});
