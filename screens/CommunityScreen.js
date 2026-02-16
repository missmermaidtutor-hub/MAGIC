import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Image,
  Alert,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CommunityScreen() {
  const [publicArtworks, setPublicArtworks] = useState([]);
  const [privateCount, setPrivateCount] = useState(0);

  useEffect(() => {
    loadGalleries();
  }, []);

  const loadGalleries = async () => {
    try {
      // Load public artworks
      const publicData = await AsyncStorage.getItem('public_artworks');
      if (publicData) {
        setPublicArtworks(JSON.parse(publicData));
      }

      // Count private artworks
      const privateData = await AsyncStorage.getItem('private_artworks');
      if (privateData) {
        setPrivateCount(JSON.parse(privateData).length);
      }
    } catch (error) {
      console.log('Error loading galleries:', error);
    }
  };

  const handleResearchArticle = (url, title) => {
    Alert.alert(
      title,
      'Open this article in your browser?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open', 
          onPress: () => Linking.openURL(url)
        }
      ]
    );
  };

  const handleBoutique = () => {
    Alert.alert(
      'Boutique Coming Soon!',
      'Turn your favorite artworks into:\n• Prints\n• Mugs\n• T-shirts\n• Phone cases\n• And more!\n\nThis feature is in development.'
    );
  };

  const handleViewPrivate = () => {
    Alert.alert(
      'Private Gallery',
      `You have ${privateCount} artworks in your private gallery.\n\nFull gallery view coming soon!`
    );
  };

  const researchArticles = [
    {
      title: '120 Minutes of Art Per Week',
      description: 'Study shows creative activities improve mental health',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4937104/'
    },
    {
      title: 'The Psychology of Creativity',
      description: 'How creative expression affects wellbeing',
      url: 'https://www.psychologytoday.com/us/basics/creativity'
    },
    {
      title: 'Art Therapy Research',
      description: 'Benefits of regular artistic practice',
      url: 'https://www.arttherapy.org/research/'
    }
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Connect</Text>
        <Text style={styles.subtitle}>Community & Resources</Text>

        {/* Public Gallery Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🎨</Text>
            <Text style={styles.sectionTitle}>Public Gallery</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Browse artwork from the community
          </Text>
          
          {publicArtworks.length > 0 ? (
            <>
              <View style={styles.galleryGrid}>
                {publicArtworks.slice(0, 4).map((artwork, index) => (
                  <View key={index} style={styles.galleryItem}>
                    <Image 
                      source={{ uri: artwork.imageUrl }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.sectionButton}>
                <Text style={styles.sectionButtonText}>
                  View All ({publicArtworks.length} artworks)
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No public artworks yet. Upload with COURAGE from Art Studio!
              </Text>
            </View>
          )}
        </View>

        {/* Private Gallery Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔒</Text>
            <Text style={styles.sectionTitle}>My Private Gallery</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Your personal collection ({privateCount} artworks)
          </Text>
          
          <TouchableOpacity 
            style={styles.sectionButton}
            onPress={handleViewPrivate}
          >
            <Text style={styles.sectionButtonText}>View My Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Research & Articles Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📚</Text>
            <Text style={styles.sectionTitle}>Research & Articles</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Science behind creativity and mental health
          </Text>
          
          {researchArticles.map((article, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.articleCard}
              onPress={() => handleResearchArticle(article.url, article.title)}
            >
              <Text style={styles.articleTitle}>{article.title}</Text>
              <Text style={styles.articleDescription}>{article.description}</Text>
              <Text style={styles.articleLink}>Read More →</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Boutique Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🛍️</Text>
            <Text style={styles.sectionTitle}>Boutique</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Turn your art into physical products
          </Text>
          
          <View style={styles.boutiqueItems}>
            <View style={styles.boutiqueItem}>
              <Text style={styles.boutiqueEmoji}>🖼️</Text>
              <Text style={styles.boutiqueLabel}>Prints</Text>
            </View>
            <View style={styles.boutiqueItem}>
              <Text style={styles.boutiqueEmoji}>☕</Text>
              <Text style={styles.boutiqueLabel}>Mugs</Text>
            </View>
            <View style={styles.boutiqueItem}>
              <Text style={styles.boutiqueEmoji}>👕</Text>
              <Text style={styles.boutiqueLabel}>Apparel</Text>
            </View>
            <View style={styles.boutiqueItem}>
              <Text style={styles.boutiqueEmoji}>📱</Text>
              <Text style={styles.boutiqueLabel}>Cases</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.boutiqueButton}
            onPress={handleBoutique}
          >
            <Text style={styles.boutiqueButtonText}>Browse Boutique</Text>
          </TouchableOpacity>
        </View>

        {/* Community Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Community Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{publicArtworks.length}</Text>
              <Text style={styles.statLabel}>Public Artworks</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>∞</Text>
              <Text style={styles.statLabel}>Inspiration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>🎨</Text>
              <Text style={styles.statLabel}>Daily</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
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
  sectionCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#DDA0DD',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIcon: {
    fontSize: 32,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#DDA0DD',
    marginBottom: 15,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  galleryItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  sectionButton: {
    backgroundColor: '#4A148C',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#9C27B0',
  },
  sectionButtonText: {
    color: '#DDA0DD',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  articleCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#444',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 5,
  },
  articleDescription: {
    fontSize: 14,
    color: '#DDA0DD',
    marginBottom: 8,
  },
  articleLink: {
    fontSize: 14,
    color: '#87CEEB',
    fontWeight: '600',
  },
  boutiqueItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  boutiqueItem: {
    alignItems: 'center',
  },
  boutiqueEmoji: {
    fontSize: 40,
    marginBottom: 5,
  },
  boutiqueLabel: {
    fontSize: 12,
    color: '#DDA0DD',
  },
  boutiqueButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  boutiqueButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#DDA0DD',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#87CEEB',
  },
});
