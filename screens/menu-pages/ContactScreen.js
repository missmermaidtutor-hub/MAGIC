import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { openMailto } from '../../utils/emailUtils';
import ThemedBackground from '../../components/ThemedBackground';
import { useTheme } from '../../context/ThemeContext';

export default function ContactScreen({ navigation }) {
  const { theme } = useTheme();
  const handleEmail = () => {
    openMailto('MAGIC Tracker Feedback', '', 'cecelia@13magicalnights.com');
  };

  return (
    <ThemedBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, theme.isDark && { color: '#ffffff' }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.header, { color: theme.text.heading }]}>Contact</Text>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={[styles.hamburgerText, theme.isDark && { color: '#ffffff' }]}>☰</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={[styles.title, theme.isDark && { color: '#ffffff' }]}>Get in Touch</Text>
          <Text style={[styles.text, theme.isDark && { color: '#ffffff' }]}>We'd love to hear from you!</Text>

          <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
            <Text style={styles.contactIcon}>📧</Text>
            <Text style={[styles.contactText, theme.isDark && { color: '#ffffff' }]}>cecelia@13magicalnights.com</Text>
          </TouchableOpacity>

          <Text style={[styles.subtitle, { color: theme.text.body }]}>Feedback & Support</Text>
          <Text style={[styles.text, theme.isDark && { color: '#ffffff' }]}>
            Have questions, suggestions, or need help? Send us an email and we'll get back to you as soon as possible.
          </Text>
        </View>
      </ScrollView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
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
