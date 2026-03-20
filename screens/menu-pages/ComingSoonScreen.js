import React from 'react';
import { StyleSheet, Text, View, ScrollView, ImageBackground } from 'react-native';

export default function ComingSoonScreen({ route }) {
  const featureName = route?.params?.feature || 'This Feature';

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>{featureName}</Text>
        <View style={styles.card}>
          <Text style={styles.starIcon}>&#x2B50;</Text>
          <Text style={styles.title}>Coming Soon</Text>
          <Text style={styles.message}>
            We're working on something magical. Stay tuned!
          </Text>
        </View>
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
    alignItems: 'center',
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  card: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  starIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
  },
});
