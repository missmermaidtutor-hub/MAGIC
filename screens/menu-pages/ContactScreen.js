import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Alert, ImageBackground } from 'react-native';

export default function ContactScreen({ navigation }) {
  const handleEmail = () => {
    Linking.openURL('mailto:missmermaidtutor@gmail.com');
  };

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Contact</Text>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Get in Touch</Text>
          <Text style={styles.text}>We'd love to hear from you!</Text>

          <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
            <Text style={styles.contactIcon}>📧</Text>
            <Text style={styles.contactText}>missmermaidtutor@gmail.com</Text>
          </TouchableOpacity>

          <Text style={styles.subtitle}>Feedback & Support</Text>
          <Text style={styles.text}>
            Have questions, suggestions, or need help? Send us an email and we'll get back to you as soon as possible.
          </Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  content: { padding: 20 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, marginBottom: 20 },
  backButton: { width: 44, height: 44, backgroundColor: 'rgba(24, 112, 162, 0.5)', borderRadius: 22, borderWidth: 2, borderColor: '#8E0DD3', justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: '#8E0DD3', fontWeight: 'bold' },
  backButtonPlaceholder: { width: 44 },
  header: { fontSize: 32, fontWeight: 'bold', color: '#8E0DD3', textAlign: 'center', flex: 1 },
  card: { backgroundColor: 'rgba(24, 112, 162, 0.5)', borderWidth: 3, borderColor: '#8E0DD3', borderRadius: 12, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#8E0DD3', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 18, fontWeight: 'bold', color: '#061679', marginTop: 20, marginBottom: 10 },
  text: { fontSize: 16, color: '#061679', lineHeight: 24, marginBottom: 15 },
  contactButton: { backgroundColor: 'rgba(24, 112, 162, 0.5)', borderRadius: 8, padding: 20, alignItems: 'center', marginVertical: 20, borderWidth: 2, borderColor: '#9C27B0' },
  contactIcon: { fontSize: 32, marginBottom: 10 },
  contactText: { fontSize: 16, color: '#061679', fontWeight: 'bold' },
  hamburgerButton: { width: 44, height: 44, backgroundColor: '#050d61', borderRadius: 22, borderWidth: 2, borderColor: '#B8860B', justifyContent: 'center', alignItems: 'center' },
  hamburgerText: { fontSize: 24, color: '#8E0DD3', fontWeight: 'bold' },
});
