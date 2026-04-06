import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { getUserWins, getMyArtSaves, getUserCourages, getUserCurated, getUserArtworks, patchArtSave } from '../../services/firestoreService';
import { getMemberDayCount } from '../../utils/premiumUtils';
import ThemedBackground from '../../components/ThemedBackground';

const BADGE_DEFS = [
  {
    id: 'first_courage',
    icon: '🎨',
    label: 'First Courage',
    desc: 'Submit your first Courage for ranking',
  },
  {
    id: 'champion',
    icon: '🏆',
    label: 'Daily Champion',
    desc: 'Win the daily ranking',
  },
  {
    id: 'triple_crown',
    icon: '👑',
    label: 'Triple Crown',
    desc: 'Win the daily ranking three times',
  },
  {
    id: 'streak_13',
    icon: '✨',
    label: '13 Nights',
    desc: 'Complete a 13-day art streak',
  },
  {
    id: 'first_candle',
    icon: '🕯️',
    label: 'First Candle',
    desc: 'Have your work saved by another artist',
  },
  {
    id: 'inspiring_five',
    icon: '⭐',
    label: 'Inspiring Five',
    desc: 'Five artists have saved your work',
  },
  {
    id: 'curator',
    icon: '🖼️',
    label: 'Curator',
    desc: 'Add your first work to the Tapestry',
  },
  {
    id: 'full_tapestry',
    icon: '🧵',
    label: 'Full Tapestry',
    desc: 'Fill your Tapestry with 10 works',
  },
  {
    id: 'day_10',
    icon: '🌱',
    label: 'Day 10',
    desc: 'Reach 10 active days in MAGIC',
  },
  {
    id: 'day_100',
    icon: '🌳',
    label: 'Centurion',
    desc: 'Reach 100 active days in MAGIC',
  },
];

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${parseInt(month)}/${parseInt(day)}/${year}`;
};

export default function BookcaseScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wins, setWins] = useState([]);
  const [artSaves, setArtSaves] = useState([]);
  const [courageCount, setCourageCount] = useState(0);
  const [curatedCount, setCuratedCount] = useState(0);
  const [inspiringWorks, setInspiringWorks] = useState([]);
  const [selectedWork, setSelectedWork] = useState(null);

  useEffect(() => {
    if (user?.uid) loadData();
  }, [user?.uid]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch each source independently so one failure can't kill the rest
      const [userWins, saves, courages, curated] = await Promise.all([
        getUserWins(user.uid).catch(e => { console.log('getUserWins err', e); return []; }),
        getMyArtSaves(user.uid).catch(e => { console.log('getMyArtSaves err', e); return []; }),
        getUserCourages(user.uid).catch(e => { console.log('getUserCourages err', e); return []; }),
        getUserCurated(user.uid).catch(e => { console.log('getUserCurated err', e); return []; }),
      ]);
      const ownArtworks = await getUserArtworks(user.uid).catch(e => { console.log('getUserArtworks err', e); return []; });

      setWins(userWins);
      setArtSaves(saves);
      setCourageCount(courages.length);
      setCuratedCount(curated.length);

      // Build "inspiring others" wall: group saves by artworkId
      const grouped = {};
      for (const save of saves) {
        const key = save.artworkId;
        if (!grouped[key]) grouped[key] = { artworkId: key, savers: [], artwork: null, saveDocId: save.id };
        grouped[key].savers.push(save.saverPseudonym || 'Anonymous');
        // Use embedded snapshot if present (new saves); avoids secondary lookup
        if (!grouped[key].artwork && (save.mediaUrl || save.imageUrl)) {
          grouped[key].artwork = {
            id:        key,
            mediaUrl:  save.mediaUrl  || '',
            imageUrl:  save.imageUrl  || '',
            title:     save.title     || 'Untitled',
            mediaType: save.mediaType || 'image',
            text:      save.text      || '',
          };
        }
      }

      // Fallback lookup for old saves that pre-date the snapshot fields
      // On match, backfill the snapshot so this lookup never runs again (read-repair)
      for (const key of Object.keys(grouped)) {
        if (grouped[key].artwork) continue;

        // Try two sources: dailyCourages (by Firestore doc id) and curated (by docId)
        // ownArtworks ids are local timestamp numbers — they won't match artSave artworkIds
        const match =
          courages.find(c => c.id === key) ||
          curated.find(c => c.docId === key);

        if (match) {
          // Normalise: artworks use imageUrl, courages use mediaUrl
          const mediaUrl = match.mediaUrl || '';
          let imageUrl   = match.imageUrl  || '';

          // Bridge: if mediaUrl empty, find an https:// imageUrl from same date
          if (!mediaUrl && !imageUrl && match.date) {
            const dateArtwork = ownArtworks.find(a => a.date === match.date && a.imageUrl?.startsWith('https://'));
            if (dateArtwork) imageUrl = dateArtwork.imageUrl;
          }

          grouped[key].artwork = { ...match, mediaUrl, imageUrl };
          patchArtSave(grouped[key].saveDocId, {
            mediaUrl,
            imageUrl,
            title:     match.title     || '',
            mediaType: match.mediaType || 'image',
            text:      match.text      || '',
          }).catch(() => {});
        }
      }

      const works = Object.values(grouped).sort((a, b) => b.savers.length - a.savers.length);
      setInspiringWorks(works);
    } catch (err) {
      console.log('Bookcase load error:', err);
    }
    setLoading(false);
  };

  const memberDayCount = getMemberDayCount(userProfile);

  // Compute earned status for each badge
  const earnedSet = new Set();
  if (courageCount > 0) earnedSet.add('first_courage');
  if (wins.length >= 1) earnedSet.add('champion');
  if (wins.length >= 3) earnedSet.add('triple_crown');
  if (userProfile?.streak13TrialUsed) earnedSet.add('streak_13');
  if (artSaves.length >= 1) earnedSet.add('first_candle');
  if (artSaves.length >= 5) earnedSet.add('inspiring_five');
  if (curatedCount >= 1) earnedSet.add('curator');
  if (curatedCount >= 10) earnedSet.add('full_tapestry');
  if (memberDayCount >= 10) earnedSet.add('day_10');
  if (memberDayCount >= 100) earnedSet.add('day_100');

  const earnedCount = earnedSet.size;

  return (
    <ThemedBackground style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Menu')}>
        <Text style={styles.menuBtnText}>☰</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>My Bookcase</Text>
        <Text style={styles.subheader}>{earnedCount} of {BADGE_DEFS.length} badges earned</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ── TROPHY SHELF ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 Trophy Shelf</Text>
              <Text style={styles.sectionSubtitle}>
                {wins.length === 0
                  ? 'Win the daily ranking to earn your first trophy.'
                  : `${wins.length} win${wins.length === 1 ? '' : 's'}`}
              </Text>

              {wins.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trophyScroll}>
                  {wins.map((win, i) => (
                    <View key={i} style={styles.trophyCard}>
                      <View style={styles.trophyImageWrap}>
                        {win.mediaUrl ? (
                          <Image source={{ uri: win.mediaUrl }} style={styles.trophyImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.trophyTextBadge}>
                            <Text style={styles.trophyTextIcon}>✍️</Text>
                          </View>
                        )}
                        <View style={styles.trophyBadge}>
                          <Text style={styles.trophyBadgeText}>🥇</Text>
                        </View>
                      </View>
                      <Text style={styles.trophyDate}>{formatDate(win.date)}</Text>
                      <Text style={styles.trophyScore} numberOfLines={1}>
                        avg {win.averageScore?.toFixed(2) ?? '—'}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              {wins.length === 0 && (
                <View style={styles.emptyTrophyCase}>
                  <Text style={styles.emptyTrophyIcon}>🏺</Text>
                  <Text style={styles.emptyTrophyText}>Your trophies will appear here</Text>
                </View>
              )}
            </View>

            {/* ── BADGE WALL ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎖️ Badge Wall</Text>
              <Text style={styles.sectionSubtitle}>Some are earned without realizing it</Text>

              <View style={styles.badgeGrid}>
                {BADGE_DEFS.map(badge => {
                  const earned = earnedSet.has(badge.id);
                  return (
                    <View key={badge.id} style={[styles.badgeCard, earned ? styles.badgeEarned : styles.badgeLocked]}>
                      <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>
                        {badge.icon}
                      </Text>
                      <Text style={[styles.badgeLabel, earned ? styles.badgeLabelEarned : styles.badgeLabelLocked]}>
                        {badge.label}
                      </Text>
                      <Text style={[styles.badgeDesc, earned ? styles.badgeDescEarned : styles.badgeDescLocked]} numberOfLines={2}>
                        {earned ? badge.desc : '???'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── INSPIRATION WALL ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🕯️ Inspired Others</Text>
              <Text style={styles.sectionSubtitle}>
                {inspiringWorks.length === 0
                  ? 'Keep creating — your work will touch someone soon.'
                  : `${artSaves.length} candle${artSaves.length === 1 ? '' : 's'} lit for your work`}
              </Text>

              {inspiringWorks.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.inspiringScroll}>
                  {inspiringWorks.map((item, i) => {
                    const art = item.artwork;
                    const isText = art?.mediaType === 'text' || (!art?.mediaUrl && !art?.imageUrl);
                    return (
                      <TouchableOpacity key={i} style={styles.inspiringCard} onPress={() => setSelectedWork(item)} activeOpacity={0.8}>
                        <View style={styles.inspiringImageWrap}>
                          {art && !isText ? (
                            <Image
                              source={{ uri: art.mediaUrl || art.imageUrl }}
                              style={styles.inspiringImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.inspiringTextBadge}>
                              <Text style={styles.inspiringTextIcon}>✍️</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.inspiringMeta}>
                          <Text style={styles.inspiringCount}>🕯️ ×{item.savers.length}</Text>
                          <Text style={styles.inspiringTitle} numberOfLines={1}>
                            {art?.title || 'Untitled'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {inspiringWorks.length === 0 && (
                <View style={styles.emptyInspiring}>
                  <Text style={styles.emptyInspiringIcon}>🕯️</Text>
                  <Text style={styles.emptyInspiringText}>No candles yet — your work will inspire someone</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Full-screen artwork modal */}
      <Modal visible={!!selectedWork} transparent animationType="fade" onRequestClose={() => setSelectedWork(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setSelectedWork(null)} />
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedWork(null)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            {(() => {
              const art = selectedWork?.artwork;
              const isText = art?.mediaType === 'text' || (!art?.mediaUrl && !art?.imageUrl);
              return (
                <>
                  {art && !isText ? (
                    <Image
                      source={{ uri: art.mediaUrl || art.imageUrl }}
                      style={styles.modalImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.modalTextWrap}>
                      <Text style={styles.modalTextContent}>{art?.text || '✍️'}</Text>
                    </View>
                  )}
                  <View style={styles.modalMeta}>
                    <Text style={styles.modalTitle}>{art?.title || 'Untitled'}</Text>
                    <Text style={styles.modalCandles}>
                      🕯️ {selectedWork?.savers?.length ?? 0} artist{selectedWork?.savers?.length !== 1 ? 's' : ''} saved this
                    </Text>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  content: {
    padding: 20,
    paddingTop: 70,
    paddingBottom: 50,
  },
  closeBtn: {
    position: 'absolute',
    top: 44,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    color: '#4B0082',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuBtn: {
    position: 'absolute',
    top: 44,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  menuBtnText: {
    color: '#4B0082',
    fontSize: 20,
    fontWeight: 'bold',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 4,
  },
  subheader: {
    fontSize: 13,
    color: '#B8860B',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },

  // Section
  section: {
    backgroundColor: 'rgba(255,248,231,0.92)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(184,134,11,0.3)',
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B0082',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B4200',
    fontStyle: 'italic',
    marginBottom: 14,
  },

  // Trophy shelf
  trophyScroll: {
    flexGrow: 0,
  },
  trophyCard: {
    width: 90,
    marginRight: 12,
    alignItems: 'center',
  },
  trophyImageWrap: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFD700',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F5E6FF',
  },
  trophyImage: {
    width: '100%',
    height: '100%',
  },
  trophyTextBadge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(75,0,130,0.08)',
  },
  trophyTextIcon: {
    fontSize: 28,
  },
  trophyBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  trophyBadgeText: {
    fontSize: 18,
  },
  trophyDate: {
    fontSize: 11,
    color: '#4B0082',
    marginTop: 6,
    fontWeight: '600',
  },
  trophyScore: {
    fontSize: 10,
    color: '#B8860B',
    fontStyle: 'italic',
  },
  emptyTrophyCase: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyTrophyIcon: {
    fontSize: 40,
    opacity: 0.3,
  },
  emptyTrophyText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },

  // Badge wall
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  badgeCard: {
    width: '28%',
    minWidth: 90,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  badgeEarned: {
    backgroundColor: 'rgba(184,134,11,0.12)',
    borderColor: '#B8860B',
  },
  badgeLocked: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  badgeIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  badgeIconLocked: {
    opacity: 0.25,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeLabelEarned: {
    color: '#4B0082',
  },
  badgeLabelLocked: {
    color: '#aaa',
  },
  badgeDesc: {
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 13,
  },
  badgeDescEarned: {
    color: '#6B4200',
  },
  badgeDescLocked: {
    color: '#ccc',
  },

  // Inspiring wall
  inspiringScroll: {
    flexGrow: 0,
  },
  inspiringCard: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
  },
  inspiringImageWrap: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(184,134,11,0.4)',
    overflow: 'hidden',
    backgroundColor: '#F5E6FF',
  },
  inspiringImage: {
    width: '100%',
    height: '100%',
  },
  inspiringTextBadge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(75,0,130,0.06)',
  },
  inspiringTextIcon: {
    fontSize: 32,
  },
  inspiringMeta: {
    marginTop: 6,
    alignItems: 'center',
  },
  inspiringCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B8860B',
  },
  inspiringTitle: {
    fontSize: 10,
    color: '#4B0082',
    fontStyle: 'italic',
    textAlign: 'center',
    maxWidth: 90,
  },
  emptyInspiring: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyInspiringIcon: {
    fontSize: 36,
    opacity: 0.3,
  },
  emptyInspiringText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },

  // Artwork modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDismiss: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  modalCard: {
    width: SCREEN_WIDTH * 0.88,
    maxHeight: SCREEN_HEIGHT * 0.8,
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#B8860B',
  },
  modalClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalImage: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.5,
    backgroundColor: '#f0e8ff',
  },
  modalTextWrap: {
    width: '100%',
    minHeight: 180,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f3ff',
  },
  modalTextContent: {
    fontSize: 18,
    color: '#332100',
    textAlign: 'center',
    lineHeight: 28,
  },
  modalMeta: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(184,134,11,0.2)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B0082',
    marginBottom: 4,
  },
  modalCandles: {
    fontSize: 13,
    color: '#B8860B',
    fontStyle: 'italic',
  },
});
