import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Modal,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function CommunityScreen() {
  const [publicArtworks, setPublicArtworks] = useState([]);
  const [personalArtworks, setPersonalArtworks] = useState([]);
  const [inspirationArtworks, setInspirationArtworks] = useState([]);
  const [activeGallery, setActiveGallery] = useState('public');
  const [fullViewImage, setFullViewImage] = useState(null);

  useEffect(() => {
    loadAllGalleries();
  }, []);

  const loadAllGalleries = async () => {
    try {
      // Load public artworks
      const publicData = await AsyncStorage.getItem('public_artworks');
      if (publicData) {
        setPublicArtworks(JSON.parse(publicData));
      }

      // Load personal artworks (user's own uploads)
      const personalData = await AsyncStorage.getItem('personal_artworks');
      if (personalData) {
        setPersonalArtworks(JSON.parse(personalData));
      }

      // Load inspiration artworks (saved from Inspire/Home via candle)
      const favData = await AsyncStorage.getItem('favorite_artworks');
      if (favData) {
        setInspirationArtworks(JSON.parse(favData));
      }
    } catch (error) {
      console.log('Error loading galleries:', error);
    }
  };

  const handleUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        const newArtwork = {
          id: `personal_${Date.now()}`,
          imageUrl: uri,
          title: `My Art ${personalArtworks.length + 1}`,
          date: new Date().toISOString().split('T')[0],
          savedAt: new Date().toISOString(),
          source: 'upload',
        };

        const updated = [...personalArtworks, newArtwork];
        setPersonalArtworks(updated);
        await AsyncStorage.setItem('personal_artworks', JSON.stringify(updated));
        Alert.alert('Uploaded!', 'Your artwork has been added to your Personal Gallery.');
      }
    } catch (error) {
      console.log('Error uploading image:', error);
      Alert.alert('Error', 'Could not upload image. Please try again.');
    }
  };

  const handleTogglePublic = async (artwork, fromGallery) => {
    try {
      if (fromGallery === 'personal') {
        // Move from personal to public
        const updatedPersonal = personalArtworks.filter(a => a.id !== artwork.id);
        const publicArt = { ...artwork, madePublic: true, publicDate: new Date().toISOString() };
        const updatedPublic = [...publicArtworks, publicArt];

        setPersonalArtworks(updatedPersonal);
        setPublicArtworks(updatedPublic);
        await AsyncStorage.setItem('personal_artworks', JSON.stringify(updatedPersonal));
        await AsyncStorage.setItem('public_artworks', JSON.stringify(updatedPublic));
      } else if (fromGallery === 'public') {
        // Move from public back to personal
        const updatedPublic = publicArtworks.filter(a => a.id !== artwork.id);
        const privateArt = { ...artwork, madePublic: false };
        delete privateArt.publicDate;
        const updatedPersonal = [...personalArtworks, privateArt];

        setPublicArtworks(updatedPublic);
        setPersonalArtworks(updatedPersonal);
        await AsyncStorage.setItem('public_artworks', JSON.stringify(updatedPublic));
        await AsyncStorage.setItem('personal_artworks', JSON.stringify(updatedPersonal));
      } else if (fromGallery === 'inspiration') {
        // Toggle inspiration artwork public visibility
        const updatedInspiration = inspirationArtworks.map(a =>
          a.id === artwork.id ? { ...a, isPublic: !a.isPublic } : a
        );
        setInspirationArtworks(updatedInspiration);
        await AsyncStorage.setItem('favorite_artworks', JSON.stringify(updatedInspiration));

        if (!artwork.isPublic) {
          // Add to public gallery
          const publicArt = { ...artwork, isPublic: true, publicDate: new Date().toISOString() };
          const updatedPublic = [...publicArtworks, publicArt];
          setPublicArtworks(updatedPublic);
          await AsyncStorage.setItem('public_artworks', JSON.stringify(updatedPublic));
        } else {
          // Remove from public gallery
          const updatedPublic = publicArtworks.filter(a => a.id !== artwork.id);
          setPublicArtworks(updatedPublic);
          await AsyncStorage.setItem('public_artworks', JSON.stringify(updatedPublic));
        }
      }
    } catch (error) {
      console.log('Error toggling public:', error);
    }
  };

  const handleDeleteArtwork = (artwork, fromGallery) => {
    Alert.alert(
      'Remove Artwork',
      'Are you sure you want to remove this from your gallery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (fromGallery === 'personal') {
                const updated = personalArtworks.filter(a => a.id !== artwork.id);
                setPersonalArtworks(updated);
                await AsyncStorage.setItem('personal_artworks', JSON.stringify(updated));
              } else if (fromGallery === 'inspiration') {
                const updated = inspirationArtworks.filter(a => a.id !== artwork.id);
                setInspirationArtworks(updated);
                await AsyncStorage.setItem('favorite_artworks', JSON.stringify(updated));
              } else if (fromGallery === 'public') {
                const updated = publicArtworks.filter(a => a.id !== artwork.id);
                setPublicArtworks(updated);
                await AsyncStorage.setItem('public_artworks', JSON.stringify(updated));
              }
            } catch (error) {
              console.log('Error deleting artwork:', error);
            }
          }
        }
      ]
    );
  };

  const handleResearchArticle = (url, title) => {
    Alert.alert(
      title,
      'Open this article in your browser?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => Linking.openURL(url) }
      ]
    );
  };

  const handleBoutique = () => {
    Alert.alert(
      'Boutique Coming Soon!',
      'Turn your favorite artworks into:\n• Prints\n• Mugs\n• T-shirts\n• Phone cases\n• And more!\n\nThis feature is in development.'
    );
  };

  // Sample images for inspiration artworks that only have an index (from HomeScreen candle)
  const getSampleImageUrl = (index) => {
    const sampleImages = [
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1549887534-1541e9326642?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1545551816-c691d80f8e31?w=400&h=400&fit=crop',
    ];
    if (index >= 0 && index < sampleImages.length) return sampleImages[index];
    return null;
  };

  const getArtworkImageSource = (artwork) => {
    if (artwork.imageUrl) return { uri: artwork.imageUrl };
    if (artwork.index !== undefined) {
      const url = getSampleImageUrl(artwork.index);
      if (url) return { uri: url };
    }
    return null;
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

  const renderGalleryItem = (artwork, fromGallery) => {
    const imageSource = getArtworkImageSource(artwork);
    const isOwned = fromGallery === 'personal' || fromGallery === 'inspiration';

    return (
      <View key={artwork.id} style={styles.galleryItemContainer}>
        <TouchableOpacity
          style={styles.galleryItem}
          onPress={() => imageSource && setFullViewImage(imageSource)}
        >
          {imageSource ? (
            <Image source={imageSource} style={styles.galleryImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderArt}>
              <Text style={styles.placeholderEmoji}>🎨</Text>
              <Text style={styles.placeholderLabel}>{artwork.title || 'Artwork'}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Action buttons below each artwork */}
        {isOwned && (
          <View style={styles.artworkActions}>
            <TouchableOpacity
              style={[styles.actionBtn, artwork.isPublic || artwork.madePublic ? styles.actionBtnActive : null]}
              onPress={() => handleTogglePublic(artwork, fromGallery)}
            >
              <Text style={styles.actionBtnText}>
                {(artwork.isPublic || artwork.madePublic) ? '🌐 Public' : '🔒 Private'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteArtwork(artwork, fromGallery)}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Date label */}
        {artwork.date && (
          <Text style={styles.artworkDate}>{artwork.date}</Text>
        )}
      </View>
    );
  };

  const renderGalleryContent = () => {
    switch (activeGallery) {
      case 'public':
        return publicArtworks.length > 0 ? (
          <View style={styles.galleryGrid}>
            {publicArtworks.map(artwork => renderGalleryItem(artwork, 'public'))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌐</Text>
            <Text style={styles.emptyText}>
              No public artworks yet.{'\n'}Make your personal artworks public to share!
            </Text>
          </View>
        );

      case 'personal':
        return (
          <>
            <TouchableOpacity style={styles.uploadButton} onPress={handleUploadImage}>
              <Text style={styles.uploadButtonText}>+ Upload Image</Text>
            </TouchableOpacity>
            {personalArtworks.length > 0 ? (
              <View style={styles.galleryGrid}>
                {personalArtworks.map(artwork => renderGalleryItem(artwork, 'personal'))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📷</Text>
                <Text style={styles.emptyText}>
                  Your personal gallery is empty.{'\n'}Upload your own art and inspiration!
                </Text>
              </View>
            )}
          </>
        );

      case 'inspiration':
        return inspirationArtworks.length > 0 ? (
          <View style={styles.galleryGrid}>
            {inspirationArtworks.map(artwork => renderGalleryItem(artwork, 'inspiration'))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🕯️</Text>
            <Text style={styles.emptyText}>
              No saved inspirations yet.{'\n'}Light the candle on artworks you love!
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Connect</Text>
        <Text style={styles.subtitle}>Galleries & Community</Text>

        {/* Gallery Tab Selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeGallery === 'public' && styles.tabActive]}
            onPress={() => setActiveGallery('public')}
          >
            <Text style={styles.tabIcon}>🌐</Text>
            <Text style={[styles.tabLabel, activeGallery === 'public' && styles.tabLabelActive]}>
              Public
            </Text>
            {publicArtworks.length > 0 && (
              <Text style={styles.tabCount}>{publicArtworks.length}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeGallery === 'personal' && styles.tabActive]}
            onPress={() => setActiveGallery('personal')}
          >
            <Text style={styles.tabIcon}>🔒</Text>
            <Text style={[styles.tabLabel, activeGallery === 'personal' && styles.tabLabelActive]}>
              Personal
            </Text>
            {personalArtworks.length > 0 && (
              <Text style={styles.tabCount}>{personalArtworks.length}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeGallery === 'inspiration' && styles.tabActive]}
            onPress={() => setActiveGallery('inspiration')}
          >
            <Text style={styles.tabIcon}>🕯️</Text>
            <Text style={[styles.tabLabel, activeGallery === 'inspiration' && styles.tabLabelActive]}>
              Inspiration
            </Text>
            {inspirationArtworks.length > 0 && (
              <Text style={styles.tabCount}>{inspirationArtworks.length}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Gallery Description */}
        <Text style={styles.galleryDescription}>
          {activeGallery === 'public' && 'Artworks visible to the community'}
          {activeGallery === 'personal' && 'Your private uploads — only you can see these'}
          {activeGallery === 'inspiration' && 'Saved works from others — only you can see these'}
        </Text>

        {/* Gallery Content */}
        <View style={styles.gallerySection}>
          {renderGalleryContent()}
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
              <Text style={styles.statLabel}>Public</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{personalArtworks.length}</Text>
              <Text style={styles.statLabel}>Personal</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{inspirationArtworks.length}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Full-screen image viewer */}
      <Modal
        visible={fullViewImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullViewImage(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFullViewImage(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <ScrollView
            contentContainerStyle={styles.modalImageContainer}
            maximumZoomScale={5}
            minimumZoomScale={1}
            bouncesZoom={true}
          >
            {fullViewImage && (
              <Image
                source={fullViewImage}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </ScrollView>
        </View>
      </Modal>
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
    marginBottom: 20,
    fontStyle: 'italic',
  },

  // Gallery Tabs
  tabRow: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  tabActive: {
    backgroundColor: '#2a1a0a',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#FFD700',
  },
  tabCount: {
    fontSize: 10,
    color: '#FFD700',
    marginTop: 2,
    fontWeight: 'bold',
  },
  galleryDescription: {
    fontSize: 13,
    color: '#DDA0DD',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },

  // Gallery Section
  gallerySection: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    minHeight: 200,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  galleryItemContainer: {
    width: '48%',
    marginBottom: 15,
  },
  galleryItem: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#2a2a2a',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  placeholderArt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  placeholderEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  placeholderLabel: {
    fontSize: 12,
    color: '#888',
  },

  // Artwork Actions
  artworkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: '#2a2a2a',
  },
  actionBtnActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a3a1a',
  },
  actionBtnText: {
    fontSize: 11,
    color: '#DDA0DD',
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#3a1a1a',
    borderWidth: 1,
    borderColor: '#662222',
  },
  deleteBtnText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  artworkDate: {
    fontSize: 10,
    color: '#666',
    marginTop: 3,
  },

  // Upload
  uploadButton: {
    backgroundColor: '#2a1a0a',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    marginBottom: 15,
  },
  uploadButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Empty State
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Section Cards (Research, Boutique)
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

  // Stats
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

  // Full-screen modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
});
