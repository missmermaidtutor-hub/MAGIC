import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function LegalScreen({ navigation }) {
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
          <Text style={styles.header}>Legal</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.text}>Terms and conditions coming soon.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.text}>Privacy policy coming soon.</Text>
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
  card: { backgroundColor: '#1a1a1a', borderWidth: 3, borderColor: '#FFD700', borderRadius: 12, padding: 20, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#87CEEB', marginBottom: 10 },
  text: { fontSize: 16, color: '#DDA0DD', lineHeight: 24 },
});
