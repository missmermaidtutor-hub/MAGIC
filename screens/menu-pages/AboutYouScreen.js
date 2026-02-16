import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AboutYouScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [favoritePrompt, setFavoritePrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await AsyncStorage.getItem('user_profile');
      if (profile) {
        const data = JSON.parse(profile);
        setUsername(data.username || '');
        setBio(data.bio || '');
        setFavoritePrompt(data.favoritePrompt || '');
      }
    } catch (error) {
      console.log('Error loading profile:', error);
    }
  };

  const saveProfile = async () => {
    try {
      const profile = {
        username,
        bio,
        favoritePrompt,
        updatedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
      setIsEditing(false);
      Alert.alert('Saved!', 'Your profile has been updated.');
    } catch (error) {
      Alert.alert('Error', 'Could not save profile.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with Back Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.header}>About You</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Your Profile</Text>
          
          {!isEditing ? (
            <>
              <View style={styles.profileSection}>
                <Text style={styles.label}>Username</Text>
                <Text style={styles.value}>{username || 'Not set'}</Text>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.label}>Bio</Text>
                <Text style={styles.value}>{bio || 'Tell us about yourself...'}</Text>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.label}>Favorite Art Prompt</Text>
                <Text style={styles.value}>{favoritePrompt || 'Not set'}</Text>
              </View>

              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your creative name..."
                  placeholderTextColor="#666"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor="#666"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Favorite Art Prompt</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Which prompt inspires you most?"
                  placeholderTextColor="#666"
                  value={favoritePrompt}
                  onChangeText={setFavoritePrompt}
                />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    loadProfile();
                    setIsEditing(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={saveProfile}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Journey</Text>
          <Text style={styles.statsSubtext}>Stats coming soon!</Text>
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 40,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1a1a1a',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  backButtonPlaceholder: {
    width: 44,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    flex: 1,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
  },
  profileSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#87CEEB',
    marginBottom: 5,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: '#DDA0DD',
    lineHeight: 22,
  },
  editButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  editButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#87CEEB',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#666',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#4FC3F7',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4FC3F7',
    marginBottom: 10,
  },
  statsSubtext: {
    fontSize: 16,
    color: '#87CEEB',
    fontStyle: 'italic',
  },
});
