import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { showAlert, showConfirm, showDestructiveConfirm } from '../utils/alertUtils';
import { persistImageUri } from '../utils/imageUtils';
import { openMailto } from '../utils/emailUtils';
import { trackAction } from '../services/analyticsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import {
  saveCuratedWork,
  removeCuratedWork,
  deleteArtwork,
  deleteInspiration,
  recordArtSave,
  removeArtSave,
  getMyArtSaves,
  getAllCuratedGalleriesGrouped,
  getUserCurated,
  getUserCourages,
} from '../services/firestoreService';
import { getESTDate } from '../utils/dateUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Gold Frame component (matches HomeScreen)
const GoldFrame = ({ children, style, containerStyle, onPress, thickness = 4 }) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} activeOpacity={0.8} style={[{
      borderRadius: 6,
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 8,
      alignSelf: 'stretch',
    }, containerStyle]}>
      <LinearGradient
        colors={['#FFF8DC', '#FFD700', '#B8860B', '#FFD700', '#FFFACD', '#DAA520', '#B8860B', '#FFD700', '#FFF8DC']}
        locations={[0, 0.12, 0.25, 0.4, 0.5, 0.6, 0.75, 0.88, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 6, padding: thickness }}
      >
        <View style={{
          borderRadius: 3,
          borderWidth: 0.5,
          borderColor: 'rgba(255, 248, 220, 0.5)',
        }}>
          <View style={[{ borderRadius: 3, overflow: 'hidden' }, style]}>
            {children}
          </View>
        </View>
      </LinearGradient>
    </Wrapper>
  );
};

// Candle component (matches HomeScreen)
const Candle = ({ lit = false, onPress, size = 40 }) => (
  <TouchableOpacity onPress={onPress} style={{ alignItems: 'center' }}>
    {lit && (
      <View style={{
        width: size * 0.3,
        height: size * 0.4,
        borderRadius: size * 0.15,
        backgroundColor: '#FF8C00',
        marginBottom: -4,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 12,
        transform: [{ scaleX: 0.7 }],
      }}>
        <View style={{
          width: size * 0.15,
          height: size * 0.2,
          borderRadius: size * 0.1,
          backgroundColor: '#FFFF00',
          alignSelf: 'center',
          marginTop: size * 0.08,
        }} />
      </View>
    )}
    {!lit && <View style={{ height: size * 0.4 - 4 }} />}
    <View style={{
      width: 2,
      height: size * 0.15,
      backgroundColor: lit ? '#333' : '#666',
      marginBottom: -1,
    }} />
    <View style={{
      width: size * 0.35,
      height: size * 0.5,
      backgroundColor: lit ? '#FFF8DC' : '#8B8682',
      borderRadius: 3,
      borderWidth: 1,
      borderColor: lit ? '#FFD700' : '#555',
      shadowColor: lit ? '#FFD700' : 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: lit ? 0.8 : 0,
      shadowRadius: 8,
    }} />
  </TouchableOpacity>
);

export default function CommunityScreen({ navigation, route }) {
  const { user, userProfile } = useAuth();
  const [curatedArtworks, setCuratedArtworks] = useState([]);
  const [personalArtworks, setPersonalArtworks] = useState([]);
  const [inspirationArtworks, setInspirationArtworks] = useState([]);
  const [activeGallery, setActiveGallery] = useState(route?.params?.gallery || 'newsfeed');
  const [fullViewImage, setFullViewImage] = useState(null);
  const [fullViewText, setFullViewText] = useState(null);
  const [followedUsers, setFollowedUsers] = useState([]);
  const [newsfeedImageIndex, setNewsfeedImageIndex] = useState({});
  const [savedNewsfeedArt, setSavedNewsfeedArt] = useState(new Set());
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [userPseudonym, setUserPseudonym] = useState('');

  // Real newsfeed state
  const [newsfeedUsers, setNewsfeedUsers] = useState([]);
  const [newsfeedLoading, setNewsfeedLoading] = useState(false);

  // My Inspiring Works state
  const [myInspiringWorks, setMyInspiringWorks] = useState([]);
  const [inspiringWorksLoading, setInspiringWorksLoading] = useState(false);
  const [expandedSaveCounts, setExpandedSaveCounts] = useState({});

  // Day 13 popup
  const [showDay13Popup, setShowDay13Popup] = useState(false);

  // 13-day membership check
  const getMemberDayCount = () => {
    if (!userProfile?.createdAt) return 0;
    const createdDate = userProfile.createdAt?.toDate?.()
      ?? (userProfile.createdAt?.seconds
        ? new Date(userProfile.createdAt.seconds * 1000)
        : new Date(userProfile.createdAt));
    return Math.floor((Date.now() - createdDate.getTime()) / 86400000) + 1;
  };
  const canCurate = getMemberDayCount() >= 13;

  // Sync from auth context
  useEffect(() => {
    if (userProfile) {
      setUserPseudonym(userProfile.pseudonym || '');
      setIsAnonymous(userProfile.anonymous ?? false);
    }
  }, [userProfile]);

  useEffect(() => {
    loadAllGalleries();
    loadFollowedUsers();
    loadSavedArt();
    promotePendingVotingArtworks();
    loadUserIdentity();
    loadNewsfeed();
  }, []);

  // Day 13 popup (one-time)
  useEffect(() => {
    if (canCurate) {
      AsyncStorage.getItem('day13_popup_shown').then(shown => {
        if (!shown) {
          setShowDay13Popup(true);
          AsyncStorage.setItem('day13_popup_shown', 'true');
          trackAction('day_13_popup_shown');
        }
      });
    }
  }, [canCurate]);

  // Reload galleries when screen comes into focus & mark as browsed for Connect star
  useFocusEffect(
    useCallback(() => {
      loadAllGalleries();
      loadSavedArt();
      promotePendingVotingArtworks();
      loadNewsfeed();
      // Mark browsed for today's Connect (C) star point
      const today = getESTDate();
      AsyncStorage.setItem(`browsed_${today}`, 'true');
      // Switch to gallery tab if navigated with param
      if (route?.params?.gallery) {
        setActiveGallery(route.params.gallery);
      }
    }, [route?.params?.gallery])
  );

  const loadFollowedUsers = async () => {
    try {
      const data = await AsyncStorage.getItem('followed_users');
      if (data) setFollowedUsers(JSON.parse(data));
    } catch (error) {
      console.log('Error loading followed users:', error);
    }
  };

  const loadUserIdentity = async () => {
    try {
      // Context is primary source (set via useEffect above)
      // AsyncStorage as fallback for offline
      if (!userProfile) {
        const settingsRaw = await AsyncStorage.getItem('app_settings');
        const profileRaw = await AsyncStorage.getItem('user_profile');
        if (settingsRaw) {
          const settings = JSON.parse(settingsRaw);
          setIsAnonymous(settings.anonymous ?? false);
          if (settings.username) setUserPseudonym(settings.username);
        }
        if (profileRaw) {
          const profile = JSON.parse(profileRaw);
          if (profile.username && !userPseudonym) setUserPseudonym(profile.username);
        }
      }
    } catch (error) {
      console.log('Error loading user identity:', error);
    }
  };

  const loadSavedArt = async () => {
    try {
      const data = await AsyncStorage.getItem('favorite_artworks');
      if (data) {
        const favs = JSON.parse(data);
        setSavedNewsfeedArt(new Set(favs.map(a => a.id)));
      }
    } catch (error) {
      console.log('Error loading saved art:', error);
    }
  };

  // Load real community newsfeed from Firestore
  const loadNewsfeed = async () => {
    if (!user) return;
    setNewsfeedLoading(true);
    try {
      const grouped = await getAllCuratedGalleriesGrouped(user.uid);
      setNewsfeedUsers(grouped);
      trackAction('newsfeed_loaded');
    } catch (error) {
      console.log('Error loading newsfeed:', error);
    } finally {
      setNewsfeedLoading(false);
    }
  };

  // Load artworks of mine that others have saved (curated + courages)
  const loadMyInspiringWorks = async () => {
    if (!user) return;
    setInspiringWorksLoading(true);
    try {
      const [saves, myCurated, myCourages] = await Promise.all([
        getMyArtSaves(user.uid),
        getUserCurated(user.uid),
        getUserCourages(user.uid),
      ]);

      // Group saves by artworkId
      const grouped = {};
      for (const save of saves) {
        if (!grouped[save.artworkId]) {
          grouped[save.artworkId] = { artworkId: save.artworkId, savers: [] };
        }
        grouped[save.artworkId].savers.push(save.saverPseudonym || 'Anonymous');
      }

      // Match with curated artworks OR courages
      const works = Object.values(grouped).map(g => {
        const curated = myCurated.find(a => a.id === g.artworkId);
        const courage = myCourages.find(a => a.id === g.artworkId);
        const source = curated || courage;
        return {
          ...g,
          artwork: source ? {
            id: source.id,
            title: source.title || 'Untitled',
            imageUrl: source.imageUrl || source.mediaUrl || null,
          } : null,
          sourceType: curated ? 'curated' : 'courage',
          saveCount: g.savers.length,
        };
      }).filter(w => w.artwork); // only show works that still exist

      setMyInspiringWorks(works);
      trackAction('inspiring_works_loaded');
    } catch (error) {
      console.log('Error loading inspiring works:', error);
    } finally {
      setInspiringWorksLoading(false);
    }
  };

  // Move pending voting artworks to curated gallery after voting day passes
  const promotePendingVotingArtworks = async () => {
    try {
      const pendingData = await AsyncStorage.getItem('pending_voting_artworks');
      if (!pendingData) return;
      const pending = JSON.parse(pendingData);
      if (pending.length === 0) return;

      const today = getESTDate();
      const ready = pending.filter(a => a.votingSubmitDate < today);
      const stillPending = pending.filter(a => a.votingSubmitDate >= today);

      if (ready.length > 0) {
        // Move ready artworks to curated gallery
        const curatedData = await AsyncStorage.getItem('public_artworks');
        const curated = curatedData ? JSON.parse(curatedData) : [];
        const promoted = ready.map(a => ({
          ...a,
          pendingVoting: false,
          isPublic: true,
          madePublic: true,
          publicDate: new Date().toISOString(),
        }));
        const updatedCurated = [...curated, ...promoted];
        await AsyncStorage.setItem('public_artworks', JSON.stringify(updatedCurated));

        // Update personal artworks to clear pending flag
        const personalData = await AsyncStorage.getItem('personal_artworks');
        if (personalData) {
          const personal = JSON.parse(personalData);
          const readyIds = new Set(ready.map(a => a.id));
          const updatedPersonal = personal.map(a =>
            readyIds.has(a.id) ? { ...a, pendingVoting: false } : a
          );
          await AsyncStorage.setItem('personal_artworks', JSON.stringify(updatedPersonal));
        }

        await AsyncStorage.setItem('pending_voting_artworks', JSON.stringify(stillPending));
      }
    } catch (error) {
      console.log('Error promoting pending artworks:', error);
    }
  };

  const handleCandleSave = async (artwork, curatorUid) => {
    try {
      const existing = await AsyncStorage.getItem('favorite_artworks');
      let favorites = existing ? JSON.parse(existing) : [];
      const artId = artwork.docId || artwork.id;
      const alreadySaved = favorites.some(a => a.id === artId);

      if (alreadySaved) {
        favorites = favorites.filter(a => a.id !== artId);
        setSavedNewsfeedArt(prev => {
          const next = new Set(prev);
          next.delete(artId);
          return next;
        });
        // Remove Firestore art save record
        if (user && curatorUid) {
          removeArtSave(artId, user.uid).catch(err =>
            console.log('removeArtSave error:', err)
          );
          trackAction('art_save_removed');
        }
      } else {
        favorites.push({
          id: artId,
          imageUrl: artwork.imageUrl,
          title: artwork.title || 'Untitled',
          source: 'candle_save',
          date: artwork.date,
          savedAt: new Date().toISOString(),
        });
        setSavedNewsfeedArt(prev => new Set(prev).add(artId));
        const today = getESTDate();
        await AsyncStorage.setItem(`inspiration_saved_${today}`, 'true');
        // Record Firestore art save
        if (user && curatorUid) {
          recordArtSave(curatorUid, artId, user.uid, userPseudonym || 'Anonymous').catch(err =>
            console.log('recordArtSave error:', err)
          );
          trackAction('art_save_recorded');
        }
      }
      await AsyncStorage.setItem('favorite_artworks', JSON.stringify(favorites));
      setInspirationArtworks(favorites);
    } catch (error) {
      console.log('Error toggling candle:', error);
    }
  };

  const handleEmailShare = async (artwork) => {
    openMailto(
      'Something that inspired me',
      'This inspired me to send to you!\n\n' +
      (artwork.title ? `"${artwork.title}"\n\n` : '') +
      '[Add your message here]\n\n— Sent from MAGIC Tracker'
    );
    const today = getESTDate();
    await AsyncStorage.setItem(`email_sent_${today}`, 'true');
  };

  const toggleFollow = async (userId) => {
    const updated = followedUsers.includes(userId)
      ? followedUsers.filter(id => id !== userId)
      : [...followedUsers, userId];
    setFollowedUsers(updated);
    await AsyncStorage.setItem('followed_users', JSON.stringify(updated));
  };

  const navigateNewsfeed = (userId, direction) => {
    // Mark as connected for today's Connect (C) star point
    const today = getESTDate();
    AsyncStorage.setItem(`connected_${today}`, 'true');
    setNewsfeedImageIndex(prev => {
      const currentIndex = prev[userId] || 0;
      const feedUser = newsfeedUsers.find(u => u.uid === userId);
      if (!feedUser) return prev;
      const maxIndex = feedUser.artworks.length - 1;
      let newIndex = currentIndex + direction;
      if (newIndex < 0) newIndex = 0;
      if (newIndex > maxIndex) newIndex = maxIndex;
      return { ...prev, [userId]: newIndex };
    });
  };

  const loadAllGalleries = async () => {
    try {
      const publicData = await AsyncStorage.getItem('public_artworks');
      if (publicData) setCuratedArtworks(JSON.parse(publicData));
      else setCuratedArtworks([]);

      const personalData = await AsyncStorage.getItem('personal_artworks');
      if (personalData) setPersonalArtworks(JSON.parse(personalData));
      else setPersonalArtworks([]);

      const favData = await AsyncStorage.getItem('favorite_artworks');
      if (favData) setInspirationArtworks(JSON.parse(favData));
      else setInspirationArtworks([]);
    } catch (error) {
      console.log('Error loading galleries:', error);
    }
  };

  const handleUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission needed', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = await persistImageUri(result.assets[0].uri, user?.uid);
        const newArtwork = {
          id: `personal_${Date.now()}`,
          imageUrl: uri,
          title: `My Art ${personalArtworks.length + 1}`,
          date: getESTDate(),
          savedAt: new Date().toISOString(),
          source: 'upload',
        };

        const updated = [...personalArtworks, newArtwork];
        setPersonalArtworks(updated);
        await AsyncStorage.setItem('personal_artworks', JSON.stringify(updated));
        showAlert('Uploaded!', 'Your artwork has been added to your Private Gallery.');
      }
    } catch (error) {
      console.log('Error uploading image:', error);
      showAlert('Error', 'Could not upload image. Please try again.');
    }
  };

  // Toggle artwork in/out of curated gallery
  const handleToggleCurate = async (artwork, fromGallery) => {
    try {
      const isCurated = curatedArtworks.some(a => a.id === artwork.id);

      if (isCurated) {
        // Remove from curated
        const updatedCurated = curatedArtworks.filter(a => a.id !== artwork.id);
        setCuratedArtworks(updatedCurated);
        await AsyncStorage.setItem('public_artworks', JSON.stringify(updatedCurated));
        trackAction('artwork_uncurated');
        // Remove from Firestore curated
        if (user) {
          removeCuratedWork(user.uid, String(artwork.id)).catch(err =>
            console.log('Firestore remove curated error:', err)
          );
        }

        // Update flags in source gallery
        if (fromGallery === 'personal') {
          const updated = personalArtworks.map(a =>
            a.id === artwork.id ? { ...a, madePublic: false } : a
          );
          setPersonalArtworks(updated);
          await AsyncStorage.setItem('personal_artworks', JSON.stringify(updated));
        } else if (fromGallery === 'inspiration') {
          const updated = inspirationArtworks.map(a =>
            a.id === artwork.id ? { ...a, isPublic: false } : a
          );
          setInspirationArtworks(updated);
          await AsyncStorage.setItem('favorite_artworks', JSON.stringify(updated));
        }
      } else {
        // Check curated limit (max 25)
        if (curatedArtworks.length >= 25) {
          showAlert('Curated Limit', 'You can only have 25 works in your curated gallery. Remove one first.');
          return;
        }
        // Add to curated
        const curatedArt = {
          ...artwork,
          madePublic: true,
          isPublic: true,
          publicDate: new Date().toISOString(),
        };
        const updatedCurated = [...curatedArtworks, curatedArt];
        setCuratedArtworks(updatedCurated);
        await AsyncStorage.setItem('public_artworks', JSON.stringify(updatedCurated));
        trackAction('artwork_curated');
        // Sync to Firestore curated
        if (user) {
          saveCuratedWork(user.uid, curatedArt).catch(err =>
            console.log('Firestore save curated error:', err)
          );
        }

        // Update flags in source gallery
        if (fromGallery === 'personal') {
          const updated = personalArtworks.map(a =>
            a.id === artwork.id ? { ...a, madePublic: true } : a
          );
          setPersonalArtworks(updated);
          await AsyncStorage.setItem('personal_artworks', JSON.stringify(updated));
        } else if (fromGallery === 'inspiration') {
          const updated = inspirationArtworks.map(a =>
            a.id === artwork.id ? { ...a, isPublic: true } : a
          );
          setInspirationArtworks(updated);
          await AsyncStorage.setItem('favorite_artworks', JSON.stringify(updated));
        }
      }
    } catch (error) {
      console.log('Error toggling curate:', error);
    }
  };

  const handleDeleteArtwork = (artwork, fromGallery) => {
    showDestructiveConfirm(
      'Remove Artwork',
      'Are you sure you want to remove this from your gallery?',
      async () => {
        try {
          if (fromGallery === 'personal') {
            const updated = personalArtworks.filter(a => a.id !== artwork.id);
            setPersonalArtworks(updated);
            await AsyncStorage.setItem('personal_artworks', JSON.stringify(updated));
            if (user) {
              deleteArtwork(user.uid, String(artwork.id)).catch(err =>
                console.log('Firestore delete artwork error:', err)
              );
            }
          } else if (fromGallery === 'inspiration') {
            const updated = inspirationArtworks.filter(a => a.id !== artwork.id);
            setInspirationArtworks(updated);
            await AsyncStorage.setItem('favorite_artworks', JSON.stringify(updated));
            setSavedNewsfeedArt(prev => {
              const next = new Set(prev);
              next.delete(artwork.id);
              return next;
            });
            if (user) {
              deleteInspiration(user.uid, String(artwork.id)).catch(err =>
                console.log('Firestore delete inspiration error:', err)
              );
            }
          } else if (fromGallery === 'curated') {
            const updated = curatedArtworks.filter(a => a.id !== artwork.id);
            setCuratedArtworks(updated);
            await AsyncStorage.setItem('public_artworks', JSON.stringify(updated));
            if (user) {
              removeCuratedWork(user.uid, String(artwork.id)).catch(err =>
                console.log('Firestore delete curated error:', err)
              );
            }
          }
          // Also remove from curated if it was there
          if (fromGallery !== 'curated') {
            const updatedCurated = curatedArtworks.filter(a => a.id !== artwork.id);
            if (updatedCurated.length !== curatedArtworks.length) {
              setCuratedArtworks(updatedCurated);
              await AsyncStorage.setItem('public_artworks', JSON.stringify(updatedCurated));
              if (user) {
                removeCuratedWork(user.uid, String(artwork.id)).catch(err =>
                  console.log('Firestore remove curated error:', err)
                );
              }
            }
          }
        } catch (error) {
          console.log('Error deleting artwork:', error);
        }
      },
      'Remove'
    );
  };

  const handleResearchArticle = (url, title) => {
    showConfirm(
      title,
      'Open this article in your browser?',
      () => Linking.openURL(url),
      'Open'
    );
  };

  const handleBoutique = () => {
    showAlert(
      'Boutique Coming Soon!',
      'Turn your favorite artworks into:\n• Prints\n• Mugs\n• T-shirts\n• Phone cases\n• And more!\n\nThis feature is in development.'
    );
  };

  const getArtworkImageSource = (artwork) => {
    if (artwork.imageUrl) return { uri: artwork.imageUrl };
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

  // ─── Gallery Item with candle + curate toggle ───
  const renderGalleryItem = (artwork, fromGallery) => {
    const imageSource = getArtworkImageSource(artwork);
    const hasText = artwork.text && artwork.text.trim().length > 0;
    const isCurated = curatedArtworks.some(a => a.id === artwork.id);
    const isPrivateGallery = fromGallery === 'personal' || fromGallery === 'inspiration';

    const handleFramePress = () => {
      if (imageSource) {
        setFullViewImage(imageSource);
      } else if (hasText) {
        setFullViewText({ text: artwork.text, title: artwork.title });
      }
    };

    return (
      <View key={artwork.id} style={styles.galleryItemContainer}>
        <GoldFrame
          onPress={handleFramePress}
          thickness={3}
        >
          {imageSource ? (
            <View style={styles.galleryImageBg}>
              <Image source={imageSource} style={styles.galleryImage} resizeMode="contain" />
            </View>
          ) : hasText ? (
            <View style={[styles.galleryImageBg, styles.textArtBg]}>
              <ScrollView contentContainerStyle={styles.textArtScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.textArtContent} numberOfLines={12}>{artwork.text}</Text>
              </ScrollView>
              {artwork.title ? (
                <Text style={styles.textArtTitle}>{artwork.title}</Text>
              ) : null}
            </View>
          ) : (
            <View style={[styles.galleryImageBg, styles.placeholderArt]}>
              <Text style={styles.placeholderEmoji}>🎨</Text>
              <Text style={styles.placeholderLabel}>{artwork.title || 'Artwork'}</Text>
            </View>
          )}
        </GoldFrame>

        {/* Actions row: candle + curate toggle + delete */}
        <View style={styles.artworkActions}>
          <Candle
            lit={savedNewsfeedArt.has(artwork.id)}
            onPress={() => handleCandleSave(artwork)}
            size={28}
          />

          {isPrivateGallery && (
            <TouchableOpacity
              style={[styles.curateBtn, isCurated && styles.curateBtnActive, !canCurate && styles.curateBtnDisabled]}
              onPress={() => {
                if (!canCurate) {
                  showAlert('Gallery Locked', `Curating unlocks on Day 13. You are on Day ${getMemberDayCount()}.`);
                  trackAction('curate_blocked_day_gate');
                  return;
                }
                handleToggleCurate(artwork, fromGallery);
              }}
            >
              <Text style={styles.curateBtnText}>
                {!canCurate ? '🔒 Day 13' : (isCurated ? '🖼️ Public' : '🖼️ Private')}
              </Text>
            </TouchableOpacity>
          )}

          {artwork.pendingVoting && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Voting</Text>
            </View>
          )}

          {isPrivateGallery && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteArtwork(artwork, fromGallery)}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {artwork.date && (
          <Text style={styles.artworkDate}>{artwork.title || artwork.date}</Text>
        )}
      </View>
    );
  };

  // ─── Curated gallery item (with candle, no curate toggle) ───
  const renderCuratedItem = (artwork) => {
    const imageSource = getArtworkImageSource(artwork);
    const hasText = artwork.text && artwork.text.trim().length > 0;

    const handleFramePress = () => {
      if (imageSource) {
        setFullViewImage(imageSource);
      } else if (hasText) {
        setFullViewText({ text: artwork.text, title: artwork.title });
      }
    };

    return (
      <View key={artwork.id} style={styles.galleryItemContainer}>
        <GoldFrame
          onPress={handleFramePress}
          thickness={3}
        >
          {imageSource ? (
            <View style={styles.galleryImageBg}>
              <Image source={imageSource} style={styles.galleryImage} resizeMode="contain" />
            </View>
          ) : hasText ? (
            <View style={[styles.galleryImageBg, styles.textArtBg]}>
              <ScrollView contentContainerStyle={styles.textArtScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.textArtContent} numberOfLines={12}>{artwork.text}</Text>
              </ScrollView>
            </View>
          ) : (
            <View style={[styles.galleryImageBg, styles.placeholderArt]}>
              <Text style={styles.placeholderEmoji}>🎨</Text>
            </View>
          )}
        </GoldFrame>

        <Text style={styles.curatedTitle}>{artwork.title || 'Untitled'}</Text>
        <Text style={styles.curatedArtist}>
          {isAnonymous ? 'Anonymous' : (userPseudonym || 'Anonymous')}
        </Text>

        <View style={styles.artworkActions}>
          <Candle
            lit={savedNewsfeedArt.has(artwork.id)}
            onPress={() => handleCandleSave(artwork)}
            size={28}
          />
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteArtwork(artwork, 'curated')}
          >
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Newsfeed (Visit Curations) ───
  const renderNewsfeed = () => {
    if (newsfeedLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading community curations...</Text>
        </View>
      );
    }

    if (newsfeedUsers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🖼️</Text>
          <Text style={styles.emptyText}>
            No curations to visit yet.{'\n'}Community members' curated galleries will appear here!
          </Text>
        </View>
      );
    }

    return newsfeedUsers.map((feedUser) => {
      const currentIndex = newsfeedImageIndex[feedUser.uid] || 0;
      const artwork = feedUser.artworks[currentIndex];
      if (!artwork) return null;
      const imageSource = getArtworkImageSource(artwork);
      const isFollowed = followedUsers.includes(feedUser.uid);
      const firstLetter = (feedUser.pseudonym || 'A').charAt(0).toUpperCase();

      return (
        <View key={feedUser.uid} style={styles.newsfeedCard}>
          <View style={styles.newsfeedHeader}>
            <View style={styles.newsfeedUserInfo}>
              <View style={styles.newsfeedAvatarCircle}>
                <Text style={styles.newsfeedAvatarLetter}>{firstLetter}</Text>
              </View>
              <View>
                <Text style={styles.newsfeedUsername}>{feedUser.pseudonym}</Text>
                <Text style={styles.newsfeedArtCount}>
                  {feedUser.artworks.length} artwork{feedUser.artworks.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.followBtn, isFollowed && styles.followBtnActive]}
              onPress={() => toggleFollow(feedUser.uid)}
            >
              <Text style={[styles.followBtnText, isFollowed && styles.followBtnTextActive]}>
                {isFollowed ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.newsfeedArtContainer}>
            <TouchableOpacity
              style={[styles.navArrow, currentIndex === 0 && styles.navArrowDisabled]}
              onPress={() => navigateNewsfeed(feedUser.uid, -1)}
              disabled={currentIndex === 0}
            >
              <Text style={[styles.navArrowText, currentIndex === 0 && styles.navArrowTextDisabled]}>‹</Text>
            </TouchableOpacity>

            <View style={styles.newsfeedFrameArea}>
              <GoldFrame
                style={styles.newsfeedFrameInner}
                onPress={() => {
                  if (imageSource) setFullViewImage(imageSource);
                  else if (artwork.text) setFullViewText({ text: artwork.text, title: artwork.title });
                }}
                thickness={6}
              >
                {imageSource ? (
                  <View style={styles.newsfeedImageBg}>
                    <Image source={imageSource} style={styles.newsfeedImage} resizeMode="contain" />
                  </View>
                ) : artwork.text ? (
                  <View style={[styles.newsfeedImageBg, styles.textArtBg]}>
                    <Text style={styles.textArtContent} numberOfLines={8}>{artwork.text}</Text>
                  </View>
                ) : (
                  <View style={[styles.newsfeedImageBg, styles.placeholderArt]}>
                    <Text style={styles.placeholderEmoji}>🎨</Text>
                  </View>
                )}
              </GoldFrame>
            </View>

            <TouchableOpacity
              style={[styles.navArrow, currentIndex >= feedUser.artworks.length - 1 && styles.navArrowDisabled]}
              onPress={() => navigateNewsfeed(feedUser.uid, 1)}
              disabled={currentIndex >= feedUser.artworks.length - 1}
            >
              <Text style={[styles.navArrowText, currentIndex >= feedUser.artworks.length - 1 && styles.navArrowTextDisabled]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Email + info + Candle */}
          <View style={styles.newsfeedArtInfo}>
            <TouchableOpacity onPress={() => handleEmailShare(artwork)}>
              <Text style={styles.newsfeedEnvelope}>✉️</Text>
            </TouchableOpacity>
            <View style={styles.newsfeedArtInfoCenter}>
              <Text style={styles.newsfeedArtTitle}>{artwork.title || 'Untitled'}</Text>
            </View>
            <Candle
              lit={savedNewsfeedArt.has(artwork.docId || artwork.id)}
              onPress={() => handleCandleSave(artwork, feedUser.uid)}
              size={36}
            />
          </View>

          {feedUser.artworks.length > 1 && (
            <View style={styles.dotRow}>
              {feedUser.artworks.map((_, i) => (
                <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
      );
    });
  };

  // ─── Render "My Inspiring Works" tab ───
  const renderInspiringWorks = () => {
    if (inspiringWorksLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading...</Text>
        </View>
      );
    }

    if (myInspiringWorks.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💫</Text>
          <Text style={styles.emptyText}>
            None of your curated works have been saved yet.{'\n'}Keep creating and sharing!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.galleryGrid}>
        {myInspiringWorks.map(item => {
          const imageSource = getArtworkImageSource(item.artwork);
          const isExpanded = expandedSaveCounts[item.artworkId];
          return (
            <View key={item.artworkId} style={styles.galleryItemContainer}>
              <GoldFrame
                onPress={() => imageSource && setFullViewImage(imageSource)}
                thickness={3}
              >
                {imageSource ? (
                  <View style={styles.galleryImageBg}>
                    <Image source={imageSource} style={styles.galleryImage} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={[styles.galleryImageBg, styles.placeholderArt]}>
                    <Text style={styles.placeholderEmoji}>🎨</Text>
                  </View>
                )}
              </GoldFrame>
              <Text style={styles.curatedTitle}>{item.artwork.title || 'Untitled'}</Text>
              <TouchableOpacity
                style={styles.saveCountBadge}
                onPress={() => {
                  setExpandedSaveCounts(prev => ({
                    ...prev,
                    [item.artworkId]: !prev[item.artworkId],
                  }));
                  trackAction('save_count_tapped');
                }}
              >
                <Text style={styles.saveCountText}>
                  {item.saveCount} save{item.saveCount !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.saversList}>
                  {item.savers.map((name, i) => (
                    <Text key={i} style={styles.saverName}>{name}</Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // ─── Gallery content switcher ───
  const renderGalleryContent = () => {
    switch (activeGallery) {
      case 'newsfeed':
        return renderNewsfeed();

      case 'curated':
        if (!canCurate) {
          const dayCount = getMemberDayCount();
          return (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔒</Text>
              <Text style={styles.emptyText}>
                Your curated gallery unlocks on Day 13.{'\n'}You are on Day {dayCount} — keep going!
              </Text>
            </View>
          );
        }
        return curatedArtworks.length > 0 ? (
          <View style={styles.galleryGrid}>
            {curatedArtworks.map(artwork => renderCuratedItem(artwork))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🖼️</Text>
            <Text style={styles.emptyText}>
              Your curated gallery is empty.{'\n'}Go to My Private Galleries and tap the curate button to add artworks!
            </Text>
          </View>
        );

      case 'inspiring':
        return renderInspiringWorks();

      case 'private':
        return (
          <>
            {/* Link to Art Studio */}
            <Text style={styles.studioHint}>
              To add to this album, do so in the{' '}
              <Text
                style={styles.studioLink}
                onPress={() => navigation.navigate('Art')}
              >
                Art Studio
              </Text>
            </Text>

            {/* My Uploads section */}
            <Text style={styles.privateSubheader}>My Gallery</Text>
            {personalArtworks.length > 0 ? (
              <View style={styles.galleryGrid}>
                {personalArtworks.map(artwork => renderGalleryItem(artwork, 'personal'))}
              </View>
            ) : (
              <View style={styles.emptyStateSmall}>
                <Text style={styles.emptyText}>
                  No art yet. Create something in the Art Studio!
                </Text>
              </View>
            )}

            {/* Divider */}
            <View style={styles.sectionDivider} />

            {/* My Inspirations section */}
            <Text style={styles.privateSubheader}>My Inspirations</Text>
            {inspirationArtworks.length > 0 ? (
              <View style={styles.galleryGrid}>
                {inspirationArtworks.map(artwork => renderGalleryItem(artwork, 'inspiration'))}
              </View>
            ) : (
              <View style={styles.emptyStateSmall}>
                <Text style={styles.emptyText}>
                  No saved inspirations yet. Light the candle on artworks you love!
                </Text>
              </View>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Connect</Text>
        <Text style={styles.subtitle}>Galleries & Community</Text>

        {/* 4-Tab Selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeGallery === 'newsfeed' && styles.tabActive]}
            onPress={() => setActiveGallery('newsfeed')}
          >
            <Text style={styles.tabIcon}>🖼️</Text>
            <Text style={[styles.tabLabel, activeGallery === 'newsfeed' && styles.tabLabelActive]}>
              Community
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeGallery === 'curated' && styles.tabActive]}
            onPress={() => {
              if (!canCurate) {
                showAlert('Gallery Locked', `Your curated gallery unlocks on Day 13. You are on Day ${getMemberDayCount()}.`);
                trackAction('curate_blocked_day_gate');
                return;
              }
              setActiveGallery('curated');
            }}
          >
            <Text style={styles.tabIcon}>{canCurate ? '⭐' : '🔒'}</Text>
            <Text style={[styles.tabLabel, activeGallery === 'curated' && styles.tabLabelActive]}>
              Curated
            </Text>
            {canCurate && curatedArtworks.length > 0 && (
              <Text style={styles.tabCount}>{curatedArtworks.length}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeGallery === 'inspiring' && styles.tabActive]}
            onPress={() => {
              setActiveGallery('inspiring');
              loadMyInspiringWorks();
            }}
          >
            <Text style={styles.tabIcon}>💫</Text>
            <Text style={[styles.tabLabel, activeGallery === 'inspiring' && styles.tabLabelActive]}>
              Inspiring
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeGallery === 'private' && styles.tabActive]}
            onPress={() => setActiveGallery('private')}
          >
            <Text style={styles.tabIcon}>🔒</Text>
            <Text style={[styles.tabLabel, activeGallery === 'private' && styles.tabLabelActive]}>
              Private
            </Text>
            {(personalArtworks.length + inspirationArtworks.length) > 0 && (
              <Text style={styles.tabCount}>{personalArtworks.length + inspirationArtworks.length}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Discussion Pods */}
        <TouchableOpacity
          style={styles.podsCard}
          onPress={() => navigation.navigate('DiscussionPods')}
        >
          <Text style={styles.podsCardEmoji}>💬</Text>
          <View style={styles.podsCardText}>
            <Text style={styles.podsCardTitle}>Discussion Pods</Text>
            <Text style={styles.podsCardSubtitle}>Join the conversation</Text>
          </View>
          <Text style={styles.podsCardArrow}>›</Text>
        </TouchableOpacity>

        {/* Gallery Description */}
        <Text style={styles.galleryDescription}>
          {activeGallery === 'newsfeed' && 'Browse curated galleries from the community'}
          {activeGallery === 'curated' && 'Artworks you chose to share publicly'}
          {activeGallery === 'inspiring' && 'Your art that others have saved'}
          {activeGallery === 'private' && 'Your uploads and inspirations — only you can see these'}
        </Text>

        {/* Gallery Content */}
        <View style={styles.gallerySection}>
          {renderGalleryContent()}
        </View>

        {/* Boutique */}
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
          <TouchableOpacity style={styles.boutiqueButton} onPress={handleBoutique}>
            <Text style={styles.boutiqueButtonText}>Coming Soon</Text>
          </TouchableOpacity>
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

      {/* Full view text modal */}
      <Modal
        visible={fullViewText !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullViewText(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFullViewText(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <ScrollView style={styles.fullTextScroll} contentContainerStyle={styles.fullTextContainer}>
            {fullViewText?.title ? (
              <Text style={styles.fullTextTitle}>{fullViewText.title}</Text>
            ) : null}
            <Text style={styles.fullTextContent}>{fullViewText?.text}</Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Day 13 Congratulations Popup */}
      <Modal
        visible={showDay13Popup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDay13Popup(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.day13Popup}>
            <Text style={styles.day13Emoji}>🎉</Text>
            <Text style={styles.day13Title}>Congratulations!</Text>
            <Text style={styles.day13Text}>
              You've reached Day 13!{'\n'}Your curated gallery is now unlocked.{'\n'}Share your best work with the community!
            </Text>
            <TouchableOpacity
              style={styles.day13Button}
              onPress={() => {
                setShowDay13Popup(false);
                setActiveGallery('curated');
                trackAction('day_13_open_gallery');
              }}
            >
              <Text style={styles.day13ButtonText}>Open My Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.day13DismissBtn}
              onPress={() => setShowDay13Popup(false)}
            >
              <Text style={styles.day13DismissText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  header: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#050d61',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#050d61',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#050d61',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
  },
  tabActive: {
    backgroundColor: 'rgba(184, 200, 232, 0.75)',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: '#050d61',
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#050d61',
  },
  tabCount: {
    fontSize: 10,
    color: '#050d61',
    marginTop: 2,
    fontWeight: 'bold',
  },
  galleryDescription: {
    fontSize: 13,
    color: '#050d61',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },

  // Gallery Section
  gallerySection: {
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
    borderWidth: 2,
    borderColor: '#050d61',
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
  galleryImageBg: {
    alignSelf: 'stretch',
    aspectRatio: 1,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  placeholderArt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
  },
  placeholderEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  placeholderLabel: {
    fontSize: 12,
    color: '#050d61',
  },

  // Text artwork in gallery frame
  textArtBg: {
    backgroundColor: '#fdf6e3',
    padding: 8,
  },
  textArtScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  textArtContent: {
    fontSize: 11,
    color: '#332100',
    lineHeight: 16,
    textAlign: 'center',
  },
  textArtTitle: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },

  // Full view text modal
  fullTextScroll: {
    flex: 1,
    marginTop: 60,
  },
  fullTextContainer: {
    padding: 24,
  },
  fullTextTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 16,
  },
  fullTextContent: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 28,
  },

  // Artwork Actions
  artworkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  curateBtn: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
    alignItems: 'center',
  },
  curateBtnActive: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(184, 200, 232, 0.75)',
  },
  curateBtnText: {
    fontSize: 10,
    color: '#050d61',
  },
  pendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#4A148C',
    borderWidth: 1,
    borderColor: '#9C27B0',
  },
  pendingBadgeText: {
    fontSize: 9,
    color: '#050d61',
    fontWeight: 'bold',
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
  curatedTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#050d61',
    textAlign: 'center',
    marginTop: 6,
  },
  curatedArtist: {
    fontSize: 11,
    color: '#050d61',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  artworkDate: {
    fontSize: 10,
    color: '#050d61',
    marginTop: 3,
  },

  // Private galleries
  privateSubheader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#050d61',
    marginBottom: 12,
    marginTop: 5,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#FFD700',
    marginVertical: 18,
    opacity: 0.4,
  },
  emptyStateSmall: {
    padding: 20,
    alignItems: 'center',
  },

  // Art Studio link hint
  studioHint: {
    fontSize: 14,
    color: '#050d61',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  studioLink: {
    color: '#B8860B',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    fontStyle: 'normal',
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
    color: '#050d61',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Discussion Pods card
  podsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(184, 200, 232, 0.6)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  podsCardEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  podsCardText: {
    flex: 1,
  },
  podsCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#050d61',
  },
  podsCardSubtitle: {
    fontSize: 13,
    color: '#050d61',
    fontStyle: 'italic',
    marginTop: 2,
  },
  podsCardArrow: {
    fontSize: 28,
    color: '#050d61',
    fontWeight: 'bold',
  },

  // Section Cards
  sectionCard: {
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
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
    color: '#050d61',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#050d61',
    marginBottom: 15,
  },
  articleCard: {
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#050d61',
    marginBottom: 5,
  },
  articleDescription: {
    fontSize: 14,
    color: '#050d61',
    marginBottom: 8,
  },
  articleLink: {
    fontSize: 14,
    color: '#050d61',
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
    color: '#050d61',
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

  // Newsfeed Styles
  newsfeedCard: {
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
    borderWidth: 2,
    borderColor: '#050d61',
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  newsfeedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  newsfeedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsfeedAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  newsfeedAvatarLetter: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  newsfeedUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#050d61',
  },
  newsfeedArtCount: {
    fontSize: 11,
    color: '#050d61',
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#93a0b9',
    backgroundColor: 'transparent',
  },
  followBtnActive: {
    backgroundColor: '#93a0b9',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#050d61',
  },
  followBtnTextActive: {
    color: '#0a0e27',
  },
  newsfeedArtContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
    paddingVertical: 8,
  },
  navArrow: {
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    zIndex: 2,
  },
  navArrowDisabled: {
    opacity: 0.2,
  },
  navArrowText: {
    fontSize: 36,
    color: '#050d61',
    fontWeight: 'bold',
  },
  navArrowTextDisabled: {
    color: '#555',
  },
  newsfeedFrameArea: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  newsfeedFrameInner: {
    alignSelf: 'stretch',
  },
  newsfeedImageBg: {
    alignSelf: 'stretch',
    aspectRatio: 1,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsfeedImage: {
    width: '100%',
    height: '100%',
  },
  newsfeedArtInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 14,
  },
  newsfeedArtInfoCenter: {
    flex: 1,
    alignItems: 'center',
  },
  newsfeedArtTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#050d61',
  },
  newsfeedArtDate: {
    fontSize: 12,
    color: '#050d61',
    marginTop: 2,
  },
  newsfeedEnvelope: {
    fontSize: 28,
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 10,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#444',
  },
  dotActive: {
    backgroundColor: '#FFD700',
  },

  // Curate button disabled
  curateBtnDisabled: {
    opacity: 0.5,
    borderColor: '#444',
  },

  // Save count badge (Inspiring Works tab)
  saveCountBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'center',
    marginTop: 6,
  },
  saveCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  saversList: {
    backgroundColor: 'rgba(184, 200, 232, 0.6)',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  saverName: {
    fontSize: 12,
    color: '#050d61',
    paddingVertical: 2,
  },

  // Day 13 popup
  day13Popup: {
    backgroundColor: '#1a1e47',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    padding: 30,
    marginHorizontal: 30,
    alignItems: 'center',
  },
  day13Emoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  day13Title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
  },
  day13Text: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  day13Button: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 30,
    paddingVertical: 14,
    marginBottom: 12,
  },
  day13ButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  day13DismissBtn: {
    padding: 8,
  },
  day13DismissText: {
    fontSize: 14,
    color: '#999',
  },
});
