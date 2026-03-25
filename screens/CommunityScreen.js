import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  uploadMediaToStorage,
} from '../services/firestoreService';
import { getESTDate } from '../utils/dateUtils';
import { getMemberDayCount as getMemberDayCountUtil, getCuratedLimit, canAccessFeature } from '../utils/premiumUtils';
import PremiumPaywall from '../components/premium/PremiumPaywall';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

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
  const [savedNewsfeedArt, setSavedNewsfeedArt] = useState(new Set());
  // Carousel modal: { feedUser, currentIndex }
  const [carouselModal, setCarouselModal] = useState(null);
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

  // Private tab side-by-side scroll refs
  const privateScrollRef = useRef(null);
  const inspirationScrollRef = useRef(null);
  const privateScrollOffset = useRef(0);
  const inspirationScrollOffset = useRef(0);
  const SCROLL_STEP = 200;

  const scrollColumn = (ref, offsetRef, direction) => {
    const newOffset = Math.max(0, offsetRef.current + direction * SCROLL_STEP);
    offsetRef.current = newOffset;
    ref.current?.scrollTo({ y: newOffset, animated: true });
  };

  const scrollBothColumns = (direction) => {
    scrollColumn(privateScrollRef, privateScrollOffset, direction);
    scrollColumn(inspirationScrollRef, inspirationScrollOffset, direction);
  };

  // 13-day membership check (premium users get early access)
  const memberDays = getMemberDayCountUtil(userProfile);
  const canCurate = memberDays >= 13 || canAccessFeature('earlyCuratedAccess', userProfile);

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
          text: artwork.text || '',
          title: artwork.title || 'Untitled',
          source: 'candle_save',
          date: artwork.date,
          savedAt: new Date().toISOString(),
          ...(artwork.textStyle && { textStyle: artwork.textStyle }),
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

  const openCarousel = (feedUser, startIndex = 0) => {
    // Mark as connected for today's Connect (C) star point
    const today = getESTDate();
    AsyncStorage.setItem(`connected_${today}`, 'true');
    setCarouselModal({ feedUser, currentIndex: startIndex });
  };

  const navigateCarousel = (direction) => {
    if (!carouselModal) return;
    const maxIndex = carouselModal.feedUser.artworks.length - 1;
    let newIndex = carouselModal.currentIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex > maxIndex) newIndex = maxIndex;
    setCarouselModal(prev => ({ ...prev, currentIndex: newIndex }));
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
        // Check curated limit (10 free, 25 premium)
        const curatedMax = getCuratedLimit(userProfile);
        if (curatedArtworks.length >= curatedMax) {
          const msg = curatedMax < 25
            ? `Free accounts can curate up to ${curatedMax} works. Upgrade to premium for 25 slots!`
            : 'You can only have 25 works in your curated gallery. Remove one first.';
          showAlert('Curated Limit', msg);
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
        // Sync to Firestore curated — upload image to Storage so other users can see it
        if (user) {
          (async () => {
            try {
              let remoteImageUrl = curatedArt.imageUrl || '';
              // Upload to Firebase Storage if image is a local/data URI (not already a remote URL)
              if (remoteImageUrl && !remoteImageUrl.startsWith('https://')) {
                const storagePath = `curated/${user.uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
                remoteImageUrl = await uploadMediaToStorage(remoteImageUrl, storagePath);
              }
              await saveCuratedWork(user.uid, {
                ...curatedArt,
                imageUrl: remoteImageUrl,
                pseudonym: userProfile?.pseudonym || '',
              });
            } catch (err) {
              console.log('Firestore save curated error:', err);
            }
          })();
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
        setFullViewImage({ source: imageSource, artwork });
      } else if (hasText) {
        setFullViewText({ text: artwork.text, title: artwork.title, textStyle: artwork.textStyle });
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
                <Text style={[
                  styles.textArtContent,
                  artwork.textStyle && {
                    fontFamily: artwork.textStyle.fontFamily,
                    fontWeight: artwork.textStyle.fontWeight,
                    fontStyle: artwork.textStyle.fontStyle,
                    textDecorationLine: artwork.textStyle.textDecorationLine,
                    textAlign: artwork.textStyle.textAlign,
                    color: artwork.textStyle.color,
                  },
                ]} numberOfLines={12}>{artwork.text}</Text>
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
        setFullViewImage({ source: imageSource, artwork });
      } else if (hasText) {
        setFullViewText({ text: artwork.text, title: artwork.title, textStyle: artwork.textStyle });
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

  // ─── Render a single thumbnail in the horizontal strip ───
  const renderThumbnail = (artwork, index, feedUser) => {
    const imageSource = getArtworkImageSource(artwork);
    const hasText = artwork.text && artwork.text.trim().length > 0;

    return (
      <TouchableOpacity
        key={artwork.docId || artwork.id || index}
        style={styles.thumbWrapper}
        onPress={() => openCarousel(feedUser, index)}
        activeOpacity={0.8}
      >
        <GoldFrame thickness={3} style={styles.thumbFrameInner}>
          {imageSource ? (
            <View style={styles.thumbImageBg}>
              <Image source={imageSource} style={styles.thumbImage} resizeMode="cover" />
            </View>
          ) : hasText ? (
            <View style={[styles.thumbImageBg, styles.textArtBg]}>
              <Text style={[
                styles.thumbTextContent,
                artwork.textStyle && {
                  fontFamily: artwork.textStyle.fontFamily,
                  color: artwork.textStyle.color,
                },
              ]} numberOfLines={4}>{artwork.text}</Text>
            </View>
          ) : (
            <View style={[styles.thumbImageBg, styles.placeholderArt]}>
              <Text style={{ fontSize: 24 }}>🎨</Text>
            </View>
          )}
        </GoldFrame>
      </TouchableOpacity>
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
      const isFollowed = followedUsers.includes(feedUser.uid);
      const firstLetter = (feedUser.pseudonym || 'A').charAt(0).toUpperCase();

      return (
        <View key={feedUser.uid} style={styles.newsfeedCard}>
          {/* Header: avatar + pseudonym + follow */}
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

          {/* Horizontal thumbnail strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbStrip}
          >
            {feedUser.artworks.map((artwork, i) => renderThumbnail(artwork, i, feedUser))}
          </ScrollView>

          <Text style={styles.thumbHint}>Tap to view full size</Text>
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
                onPress={() => imageSource && setFullViewImage({ source: imageSource, artwork: item.artwork })}
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

  // ─── Single-column gallery item for side-by-side private tab ───
  const renderColumnItem = (artwork, fromGallery) => {
    const imageSource = getArtworkImageSource(artwork);
    const hasText = artwork.text && artwork.text.trim().length > 0;
    const isCurated = curatedArtworks.some(a => a.id === artwork.id);
    const isPrivateGallery = fromGallery === 'personal' || fromGallery === 'inspiration';

    const handleFramePress = () => {
      if (imageSource) {
        setFullViewImage({ source: imageSource, artwork });
      } else if (hasText) {
        setFullViewText({ text: artwork.text, title: artwork.title, textStyle: artwork.textStyle });
      }
    };

    return (
      <View key={artwork.id} style={styles.columnItem}>
        <GoldFrame
          onPress={handleFramePress}
          thickness={3}
        >
          {imageSource ? (
            <View style={styles.columnImageBg}>
              <Image source={imageSource} style={styles.galleryImage} resizeMode="contain" />
            </View>
          ) : hasText ? (
            <View style={[styles.columnImageBg, styles.textArtBg]}>
              <ScrollView contentContainerStyle={styles.textArtScroll} showsVerticalScrollIndicator={false}>
                <Text style={[
                  styles.textArtContent,
                  artwork.textStyle && {
                    fontFamily: artwork.textStyle.fontFamily,
                    fontWeight: artwork.textStyle.fontWeight,
                    fontStyle: artwork.textStyle.fontStyle,
                    textDecorationLine: artwork.textStyle.textDecorationLine,
                    textAlign: artwork.textStyle.textAlign,
                    color: artwork.textStyle.color,
                  },
                ]} numberOfLines={8}>{artwork.text}</Text>
              </ScrollView>
              {artwork.title ? (
                <Text style={styles.textArtTitle}>{artwork.title}</Text>
              ) : null}
            </View>
          ) : (
            <View style={[styles.columnImageBg, styles.placeholderArt]}>
              <Text style={styles.placeholderEmoji}>🎨</Text>
              <Text style={styles.placeholderLabel}>{artwork.title || 'Artwork'}</Text>
            </View>
          )}
        </GoldFrame>

        {/* Actions row: right-aligned */}
        <View style={styles.artworkActions}>
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

          <Candle
            lit={savedNewsfeedArt.has(artwork.id)}
            onPress={() => handleCandleSave(artwork)}
            size={24}
          />

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
        if (!canAccessFeature('inspiringOthers', userProfile)) {
          return (
            <PremiumPaywall feature="inspiringOthers" />
          );
        }
        return renderInspiringWorks();

      case 'private': {
        // Sort newest first
        const sortedPersonal = [...personalArtworks].sort((a, b) => {
          const aTime = a.savedAt?.toMillis?.() || a.savedAt || a.date || 0;
          const bTime = b.savedAt?.toMillis?.() || b.savedAt || b.date || 0;
          return bTime - aTime;
        });
        const sortedInspirations = [...inspirationArtworks].sort((a, b) => {
          const aTime = a.savedAt?.toMillis?.() || a.savedAt || a.date || 0;
          const bTime = b.savedAt?.toMillis?.() || b.savedAt || b.date || 0;
          return bTime - aTime;
        });

        return (
          <>
            {/* Link to Art Studio */}
            <Text style={styles.studioHint}>
              To add more of your art to this album, do so in the{' '}
              <Text
                style={styles.studioLink}
                onPress={() => navigation.navigate('Art')}
              >
                Art Studio
              </Text>
            </Text>

            {/* Column headers */}
            <View style={styles.columnHeaderRow}>
              <Text style={styles.columnHeader}>My Private Gallery</Text>
              <Text style={styles.columnHeader}>My Inspirations</Text>
            </View>

            {/* Scroll arrows row */}
            <View style={styles.scrollArrowRow}>
              {/* Left column arrows */}
              <View style={styles.scrollArrowGroup}>
                <TouchableOpacity
                  style={styles.scrollArrowBtn}
                  onPress={() => scrollColumn(privateScrollRef, privateScrollOffset, -1)}
                >
                  <Text style={styles.scrollArrowText}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.scrollArrowBtn}
                  onPress={() => scrollColumn(privateScrollRef, privateScrollOffset, 1)}
                >
                  <Text style={styles.scrollArrowText}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Center (both) arrows */}
              <View style={styles.scrollArrowGroup}>
                <TouchableOpacity
                  style={[styles.scrollArrowBtn, styles.scrollArrowBtnCenter]}
                  onPress={() => scrollBothColumns(-1)}
                >
                  <Text style={styles.scrollArrowTextCenter}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scrollArrowBtn, styles.scrollArrowBtnCenter]}
                  onPress={() => scrollBothColumns(1)}
                >
                  <Text style={styles.scrollArrowTextCenter}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Right column arrows */}
              <View style={styles.scrollArrowGroup}>
                <TouchableOpacity
                  style={styles.scrollArrowBtn}
                  onPress={() => scrollColumn(inspirationScrollRef, inspirationScrollOffset, -1)}
                >
                  <Text style={styles.scrollArrowText}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.scrollArrowBtn}
                  onPress={() => scrollColumn(inspirationScrollRef, inspirationScrollOffset, 1)}
                >
                  <Text style={styles.scrollArrowText}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Side-by-side columns */}
            <View style={styles.sideBySideContainer}>
              {/* Left column: Private Gallery */}
              <View style={styles.column}>
                <ScrollView
                  ref={privateScrollRef}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  onScroll={(e) => { privateScrollOffset.current = e.nativeEvent.contentOffset.y; }}
                  scrollEventThrottle={16}
                  style={styles.columnScroll}
                >
                  {sortedPersonal.length > 0 ? (
                    sortedPersonal.map(artwork => renderColumnItem(artwork, 'personal'))
                  ) : (
                    <View style={styles.emptyStateSmall}>
                      <Text style={styles.emptyText}>
                        No art yet. Create something in the Art Studio!
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>

              {/* Vertical divider */}
              <View style={styles.columnDivider} />

              {/* Right column: Inspirations */}
              <View style={styles.column}>
                <ScrollView
                  ref={inspirationScrollRef}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  onScroll={(e) => { inspirationScrollOffset.current = e.nativeEvent.contentOffset.y; }}
                  scrollEventThrottle={16}
                  style={styles.columnScroll}
                >
                  {sortedInspirations.length > 0 ? (
                    sortedInspirations.map(artwork => renderColumnItem(artwork, 'inspiration'))
                  ) : (
                    <View style={styles.emptyStateSmall}>
                      <Text style={styles.emptyText}>
                        No saved inspirations yet. Light the candle on artworks you love!
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </>
        );
      }

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
                source={fullViewImage.source}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </ScrollView>
          {fullViewImage?.curatorUid && (
            <View style={styles.fullViewCandleRow}>
              <Candle
                lit={savedNewsfeedArt.has(fullViewImage.artwork?.docId || fullViewImage.artwork?.id)}
                onPress={() => handleCandleSave(fullViewImage.artwork, fullViewImage.curatorUid)}
                size={44}
              />
            </View>
          )}
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
            <Text style={[
              styles.fullTextContent,
              fullViewText?.textStyle && {
                fontFamily: fullViewText.textStyle.fontFamily,
                fontSize: fullViewText.textStyle.fontSize,
                color: fullViewText.textStyle.color,
                fontWeight: fullViewText.textStyle.fontWeight,
                fontStyle: fullViewText.textStyle.fontStyle,
                textDecorationLine: fullViewText.textStyle.textDecorationLine,
                textAlign: fullViewText.textStyle.textAlign,
              },
            ]}>{fullViewText?.text}</Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Carousel modal — full-screen viewer for community curations */}
      <Modal
        visible={carouselModal !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCarouselModal(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setCarouselModal(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {carouselModal && (() => {
            const artwork = carouselModal.feedUser.artworks[carouselModal.currentIndex];
            if (!artwork) return null;
            const imageSource = getArtworkImageSource(artwork);
            const hasText = artwork.text && artwork.text.trim().length > 0;
            const atStart = carouselModal.currentIndex === 0;
            const atEnd = carouselModal.currentIndex >= carouselModal.feedUser.artworks.length - 1;

            return (
              <View style={styles.carouselContent}>
                {/* Pseudonym header */}
                <Text style={styles.carouselPseudonym}>{carouselModal.feedUser.pseudonym}</Text>

                {/* Main artwork display */}
                <View style={styles.carouselArtRow}>
                  <TouchableOpacity
                    style={[styles.carouselArrow, atStart && styles.navArrowDisabled]}
                    onPress={() => navigateCarousel(-1)}
                    disabled={atStart}
                  >
                    <Text style={[styles.carouselArrowText, atStart && { color: '#555' }]}>‹</Text>
                  </TouchableOpacity>

                  <View style={styles.carouselFrameArea}>
                    {imageSource ? (
                      <ScrollView
                        contentContainerStyle={styles.carouselImageScroll}
                        maximumZoomScale={5}
                        minimumZoomScale={1}
                        bouncesZoom={true}
                      >
                        <Image source={imageSource} style={styles.carouselImage} resizeMode="contain" />
                      </ScrollView>
                    ) : hasText ? (
                      <ScrollView style={styles.carouselTextScroll} contentContainerStyle={styles.carouselTextContainer}>
                        {artwork.title ? (
                          <Text style={styles.carouselTextTitle}>{artwork.title}</Text>
                        ) : null}
                        <Text style={[
                          styles.carouselTextContent,
                          artwork.textStyle && {
                            fontFamily: artwork.textStyle.fontFamily,
                            fontWeight: artwork.textStyle.fontWeight,
                            fontStyle: artwork.textStyle.fontStyle,
                            textDecorationLine: artwork.textStyle.textDecorationLine,
                            textAlign: artwork.textStyle.textAlign,
                            color: artwork.textStyle.color || '#fff',
                          },
                        ]}>{artwork.text}</Text>
                      </ScrollView>
                    ) : (
                      <View style={styles.carouselPlaceholder}>
                        <Text style={{ fontSize: 60 }}>🎨</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.carouselArrow, atEnd && styles.navArrowDisabled]}
                    onPress={() => navigateCarousel(1)}
                    disabled={atEnd}
                  >
                    <Text style={[styles.carouselArrowText, atEnd && { color: '#555' }]}>›</Text>
                  </TouchableOpacity>
                </View>

                {/* Title + actions */}
                <Text style={styles.carouselTitle}>{artwork.title || 'Untitled'}</Text>
                <Text style={styles.carouselCounter}>
                  {carouselModal.currentIndex + 1} of {carouselModal.feedUser.artworks.length}
                </Text>

                <View style={styles.carouselActions}>
                  <TouchableOpacity onPress={() => handleEmailShare(artwork)}>
                    <Text style={{ fontSize: 30 }}>✉️</Text>
                  </TouchableOpacity>
                  <Candle
                    lit={savedNewsfeedArt.has(artwork.docId || artwork.id)}
                    onPress={() => handleCandleSave(artwork, carouselModal.feedUser.uid)}
                    size={44}
                  />
                </View>

                {/* Dot indicators */}
                {carouselModal.feedUser.artworks.length > 1 && (
                  <View style={styles.carouselDots}>
                    {carouselModal.feedUser.artworks.map((_, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setCarouselModal(prev => ({ ...prev, currentIndex: i }))}
                      >
                        <View style={[styles.dot, i === carouselModal.currentIndex && styles.dotActive, { width: 9, height: 9 }]} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })()}
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
    color: '#5008a7',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#5008a7',
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
    color: '#5008a7',
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
    justifyContent: 'flex-end',
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

  // Side-by-side private tab
  columnHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  columnHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#050d61',
    textAlign: 'center',
    flex: 1,
  },
  scrollArrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 8,
  },
  scrollArrowGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  scrollArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(5, 13, 97, 0.3)',
    borderWidth: 1,
    borderColor: '#050d61',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArrowBtnCenter: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderColor: '#FFD700',
  },
  scrollArrowText: {
    fontSize: 14,
    color: '#050d61',
    fontWeight: 'bold',
  },
  scrollArrowTextCenter: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  sideBySideContainer: {
    flexDirection: 'row',
    minHeight: 400,
    maxHeight: 600,
  },
  column: {
    flex: 1,
  },
  columnScroll: {
    flex: 1,
  },
  columnDivider: {
    width: 1,
    backgroundColor: '#FFD700',
    opacity: 0.4,
    marginHorizontal: 4,
  },
  columnItem: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  columnImageBg: {
    alignSelf: 'stretch',
    aspectRatio: 1,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
    height: Math.min(SCREEN_WIDTH, SCREEN_HEIGHT - 180),
  },
  fullViewCandleRow: {
    position: 'absolute',
    bottom: 40,
    right: 20,
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
  // Thumbnail strip
  thumbStrip: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  thumbWrapper: {
    width: 100,
    height: 100,
  },
  thumbFrameInner: {
    alignSelf: 'stretch',
  },
  thumbImageBg: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbTextContent: {
    fontSize: 8,
    color: '#332100',
    lineHeight: 11,
    textAlign: 'center',
    padding: 2,
  },
  thumbHint: {
    fontSize: 11,
    color: '#777',
    textAlign: 'center',
    paddingBottom: 10,
    fontStyle: 'italic',
  },
  navArrowDisabled: {
    opacity: 0.2,
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
  // Carousel modal
  carouselContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  carouselPseudonym: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
  },
  carouselArtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  carouselArrow: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  carouselArrowText: {
    fontSize: 44,
    color: '#fff',
    fontWeight: 'bold',
  },
  carouselFrameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImageScroll: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImage: {
    width: SCREEN_WIDTH - 120,
    height: SCREEN_HEIGHT * 0.5,
  },
  carouselTextScroll: {
    maxHeight: SCREEN_HEIGHT * 0.5,
    width: SCREEN_WIDTH - 120,
  },
  carouselTextContainer: {
    backgroundColor: '#fdf6e3',
    borderRadius: 8,
    padding: 20,
    minHeight: 200,
  },
  carouselTextTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#332100',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  carouselTextContent: {
    fontSize: 16,
    color: '#332100',
    lineHeight: 24,
  },
  carouselPlaceholder: {
    width: SCREEN_WIDTH - 120,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  carouselCounter: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  carouselActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
    marginTop: 16,
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
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
