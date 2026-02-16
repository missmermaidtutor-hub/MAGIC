import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';

export default function ContactScreen({ navigation }) {
  const handleEmail = () => {
    Linking.openURL('mailto:support@magictracker.app');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Contact</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Get in Touch</Text>
          <Text style={styles.text}>We'd love to hear from you!</Text>
          
          <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
            <Text style={styles.contactIcon}>📧</Text>
            <Text style={styles.contactText}>support@magictracker.app</Text>
          </TouchableOpacity>
          
          <Text style={styles.subtitle}>Feedback & Support</Text>
          <Text style={styles.text}>
            Have questions, suggestions, or need help? Send us an email and we'll get back to you as soon as possible.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  content: { padding: 20 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, marginBottom: 20 },
  backButton: { width: 44, height: 44, backgroundColor: '#1a1a1a', borderRadius: 22, borderWidth: 2, borderColor: '#FFD700', justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: '#FFD700', fontWeight: 'bold' },
  backButtonPlaceholder: { width: 44 },
  header: { fontSize: 32, fontWeight: 'bold', color: '#FFD700', textAlign: 'center', flex: 1 },
  card: { backgroundColor: '#1a1a1a', borderWidth: 3, borderColor: '#FFD700', borderRadius: 12, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFD700', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 18, fontWeight: 'bold', color: '#87CEEB', marginTop: 20, marginBottom: 10 },
  text: { fontSize: 16, color: '#DDA0DD', lineHeight: 24, marginBottom: 15 },
  contactButton: { backgroundColor: '#4A148C', borderRadius: 8, padding: 20, alignItems: 'center', marginVertical: 20, borderWidth: 2, borderColor: '#9C27B0' },
  contactIcon: { fontSize: 32, marginBottom: 10 },
  contactText: { fontSize: 16, color: '#DDA0DD', fontWeight: 'bold' },
});
