import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { showAlert, showConfirm, showDestructiveConfirm } from '../utils/alertUtils';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../config/admin';
import {
  getAllPods,
  getAllUsers,
  createPod,
  updatePodMembers,
  updatePodName,
  deletePod,
} from '../services/firestoreService';
import UserProfileModal from '../components/admin/UserProfileModal';
import ThemedBackground from '../components/ThemedBackground';

const TIMEZONE_SHORT = {
  'America/New_York': 'EST',
  'America/Chicago': 'CST',
  'America/Denver': 'MST',
  'America/Los_Angeles': 'PST',
  'America/Anchorage': 'AKST',
  'Pacific/Honolulu': 'HST',
  'America/Phoenix': 'AZ',
  'America/Toronto': 'EST',
  'America/Vancouver': 'PST',
  'Europe/London': 'GMT',
  'Europe/Paris': 'CET',
  'Europe/Berlin': 'CET',
  'Asia/Tokyo': 'JST',
  'Asia/Shanghai': 'CST-CN',
  'Asia/Kolkata': 'IST',
  'Australia/Sydney': 'AEST',
};

export default function ManagePodsScreen({ navigation }) {
  const { user } = useAuth();
  const [pods, setPods] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newPodName, setNewPodName] = useState('');
  const [selectedUids, setSelectedUids] = useState(new Set());

  // Edit mode
  const [editingPod, setEditingPod] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSelectedUids, setEditSelectedUids] = useState(new Set());

  // Search & filters
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterTimezone, setFilterTimezone] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterHeartCity, setFilterHeartCity] = useState('');
  const [filterMedium, setFilterMedium] = useState('');
  const [filterReferrer, setFilterReferrer] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterOpenToPods, setFilterOpenToPods] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    if (!user || !isAdmin(user.uid)) {
      navigation.goBack();
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [podsData, usersData] = await Promise.all([
        getAllPods(),
        getAllUsers(),
      ]);
      setPods(podsData);
      setAllUsers(usersData);
    } catch (error) {
      console.log('Error loading manage pods data:', error);
      showAlert('Error', 'Could not load data. Please try again.');
    }
    setLoading(false);
  };

  // Map each user UID → list of pods they belong to
  const userPodMap = useMemo(() => {
    const map = {};
    pods.forEach(pod => {
      (pod.members || []).forEach(uid => {
        if (!map[uid]) map[uid] = [];
        map[uid].push({ id: pod.id, name: pod.name });
      });
    });
    return map;
  }, [pods]);

  // Map referral relationships
  const { referredByMap, referralsMap } = useMemo(() => {
    const byMap = {}; // uid → referrerUid
    const refMap = {}; // referrerUid → [{ uid, username }]
    allUsers.forEach(u => {
      if (u.referredByUid) {
        byMap[u.uid] = u.referredByUid;
        if (!refMap[u.referredByUid]) refMap[u.referredByUid] = [];
        refMap[u.referredByUid].push({ uid: u.uid, username: u.username || u.email || u.uid.slice(0, 8) });
      }
    });
    return { referredByMap: byMap, referralsMap: refMap };
  }, [allUsers]);

  // Extract unique filter options from user data
  const filterOptions = useMemo(() => {
    const timezones = new Set();
    const countries = new Set();
    const states = new Set();
    const heartCities = new Set();
    const mediums = new Set();
    const genders = new Set();
    allUsers.forEach(u => {
      if (u.timezone) timezones.add(u.timezone);
      const loc = u.currentLocation;
      if (loc?.country) countries.add(loc.country);
      if (loc?.state) states.add(loc.state);
      const heart = u.heartLocation;
      if (heart?.city) heartCities.add(heart.city);
      (u.favoriteMediums || []).forEach(m => mediums.add(m));
      if (u.gender) genders.add(u.gender);
    });
    // Build referrer options: users who have referred others
    const referrers = Object.keys(referralsMap).map(uid => {
      const u = allUsers.find(usr => usr.uid === uid);
      return { uid, username: u?.username || u?.email || uid.slice(0, 8) };
    }).sort((a, b) => a.username.localeCompare(b.username));

    return {
      timezones: [...timezones].sort(),
      countries: [...countries].sort(),
      states: [...states].sort(),
      heartCities: [...heartCities].sort(),
      mediums: [...mediums].sort(),
      genders: [...genders].sort(),
      referrers,
    };
  }, [allUsers, referralsMap]);

  // Filter users by search text + dropdown filters
  const filteredUsers = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    return allUsers.filter(u => {
      // Text search (username + pseudonym + referralCode + bio)
      if (q) {
        const username = (u.username || '').toLowerCase();
        const pseudonym = (u.pseudonym || '').toLowerCase();
        const refCode = (u.referralCode || '').toLowerCase();
        const bio = (u.bio || '').toLowerCase();
        if (!username.includes(q) && !pseudonym.includes(q) && !refCode.includes(q) && !bio.includes(q)) {
          return false;
        }
      }
      // Timezone filter
      if (filterTimezone && u.timezone !== filterTimezone) return false;
      // Country filter
      if (filterCountry && u.currentLocation?.country !== filterCountry) return false;
      // State filter
      if (filterState && u.currentLocation?.state !== filterState) return false;
      // Heart city filter
      if (filterHeartCity && u.heartLocation?.city !== filterHeartCity) return false;
      // Medium filter
      if (filterMedium && !(u.favoriteMediums || []).includes(filterMedium)) return false;
      // Referred by filter
      if (filterReferrer && referredByMap[u.uid] !== filterReferrer) return false;
      // Gender filter
      if (filterGender && u.gender !== filterGender) return false;
      // Open to pods filter
      if (filterOpenToPods && !u.openToPods) return false;
      return true;
    });
  }, [allUsers, searchText, filterTimezone, filterCountry, filterState, filterHeartCity, filterMedium, filterReferrer, filterGender, filterOpenToPods, referredByMap]);

  const hasActiveFilters = filterTimezone || filterCountry || filterState || filterHeartCity || filterMedium || filterReferrer || filterGender || filterOpenToPods;

  const clearFilters = () => {
    setFilterTimezone('');
    setFilterCountry('');
    setFilterState('');
    setFilterHeartCity('');
    setFilterMedium('');
    setFilterReferrer('');
    setFilterGender('');
    setFilterOpenToPods(false);
    setOpenDropdown(null);
  };

  const handleCreatePod = async () => {
    const name = newPodName.trim();
    if (!name) {
      showAlert('Name Required', 'Please enter a pod name.');
      return;
    }
    if (selectedUids.size === 0) {
      showAlert('Members Required', 'Please select at least one member.');
      return;
    }

    try {
      const memberUids = Array.from(selectedUids);
      const memberUsernameMap = {};
      for (const uid of memberUids) {
        const u = allUsers.find(usr => usr.uid === uid);
        memberUsernameMap[uid] = u?.username || u?.email || 'Unknown';
      }

      await createPod(name, memberUids, memberUsernameMap, user.uid);
      setNewPodName('');
      setSelectedUids(new Set());
      setShowCreate(false);
      await loadData();
      showAlert('Pod Created', `"${name}" has been created.`);
    } catch (error) {
      console.log('Error creating pod:', error);
      showAlert('Error', 'Could not create pod. Please try again.');
    }
  };

  const handleStartEdit = (pod) => {
    setEditingPod(pod.id);
    setEditName(pod.name);
    setEditSelectedUids(new Set(pod.members || []));
    setShowCreate(false);
  };

  const handleSaveEdit = async () => {
    if (!editingPod) return;
    const name = editName.trim();
    if (!name) {
      showAlert('Name Required', 'Please enter a pod name.');
      return;
    }
    if (editSelectedUids.size === 0) {
      showAlert('Members Required', 'Please select at least one member.');
      return;
    }

    try {
      const memberUids = Array.from(editSelectedUids);
      const memberUsernameMap = {};
      for (const uid of memberUids) {
        const u = allUsers.find(usr => usr.uid === uid);
        memberUsernameMap[uid] = u?.username || u?.email || 'Unknown';
      }

      const pod = pods.find(p => p.id === editingPod);
      if (name !== pod?.name) {
        await updatePodName(editingPod, name);
      }
      await updatePodMembers(editingPod, memberUids, memberUsernameMap);
      setEditingPod(null);
      await loadData();
      showAlert('Pod Updated', `"${name}" has been updated.`);
    } catch (error) {
      console.log('Error updating pod:', error);
      showAlert('Error', 'Could not update pod. Please try again.');
    }
  };

  const handleDeletePod = (pod) => {
    showDestructiveConfirm(
      'Delete Pod',
      `Delete "${pod.name}"? This cannot be undone. Messages will be lost.`,
      async () => {
        try {
          await deletePod(pod.id);
          await loadData();
        } catch (error) {
          console.log('Error deleting pod:', error);
          showAlert('Error', 'Could not delete pod.');
        }
      },
      'Delete',
    );
  };

  const toggleUid = (uid, setFn) => {
    setFn(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const renderDropdown = (label, value, options, filterKey) => {
    const isOpen = openDropdown === filterKey;
    const displayValue = filterKey === 'timezone' && value
      ? (TIMEZONE_SHORT[value] || value)
      : (value || label);

    return (
      <View style={styles.filterDropdownContainer}>
        <TouchableOpacity
          style={[styles.filterDropdown, value ? styles.filterDropdownActive : null]}
          onPress={() => setOpenDropdown(isOpen ? null : filterKey)}
        >
          <Text
            style={[styles.filterDropdownText, value ? styles.filterDropdownTextActive : null]}
            numberOfLines={1}
          >
            {displayValue}
          </Text>
          <Text style={styles.filterDropdownArrow}>{isOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {isOpen && (
          <ScrollView style={styles.filterDropdownList} nestedScrollEnabled>
            {value ? (
              <TouchableOpacity
                style={styles.filterDropdownItem}
                onPress={() => {
                  if (filterKey === 'timezone') setFilterTimezone('');
                  else if (filterKey === 'country') setFilterCountry('');
                  else if (filterKey === 'state') setFilterState('');
                  else if (filterKey === 'heartCity') setFilterHeartCity('');
                  else if (filterKey === 'medium') setFilterMedium('');
                  else if (filterKey === 'referrer') setFilterReferrer('');
                  else if (filterKey === 'gender') setFilterGender('');
                  setOpenDropdown(null);
                }}
              >
                <Text style={[styles.filterDropdownItemText, { fontStyle: 'italic' }]}>Clear</Text>
              </TouchableOpacity>
            ) : null}
            {options.map(opt => {
              const isSelected = opt === value;
              const displayOpt = filterKey === 'timezone'
                ? (TIMEZONE_SHORT[opt] || opt)
                : opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.filterDropdownItem, isSelected && styles.filterDropdownItemActive]}
                  onPress={() => {
                    if (filterKey === 'timezone') setFilterTimezone(opt);
                    else if (filterKey === 'country') setFilterCountry(opt);
                    else if (filterKey === 'state') setFilterState(opt);
                    else if (filterKey === 'heartCity') setFilterHeartCity(opt);
                    else if (filterKey === 'medium') setFilterMedium(opt);
                    else if (filterKey === 'referrer') setFilterReferrer(opt);
                    else if (filterKey === 'gender') setFilterGender(opt);
                    setOpenDropdown(null);
                  }}
                >
                  <Text style={[
                    styles.filterDropdownItemText,
                    isSelected && styles.filterDropdownItemTextActive,
                  ]}>
                    {displayOpt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderUserPicker = (selected, setFn) => {
    const userLocationStr = (u) => {
      const parts = [];
      if (u.timezone) parts.push(TIMEZONE_SHORT[u.timezone] || u.timezone);
      const loc = u.currentLocation;
      if (loc?.city) parts.push(loc.city);
      if (loc?.state) parts.push(loc.state);
      if (loc?.country) parts.push(loc.country);
      return parts.join(' · ');
    };

    const heartLocationStr = (u) => {
      const heart = u.heartLocation;
      if (!heart) return '';
      const parts = [];
      if (heart.city) parts.push(heart.city);
      if (heart.state) parts.push(heart.state);
      if (heart.country) parts.push(heart.country);
      return parts.join(', ');
    };

    return (
      <View style={styles.userPicker}>
        <Text style={styles.pickerLabel}>Select Members:</Text>

        {/* Search bar */}
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search username, pseudonym, referral code, or bio..."
          placeholderTextColor="#999"
        />

        {/* Filter toggle */}
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => { setShowFilters(f => !f); setOpenDropdown(null); }}
        >
          <Text style={styles.filterToggleText}>
            {showFilters ? '▲ Hide Filters' : '▼ Filters'}
            {hasActiveFilters ? ' (active)' : ''}
          </Text>
        </TouchableOpacity>

        {/* Filter row */}
        {showFilters && (
          <View style={styles.filterRow}>
            {filterOptions.timezones.length > 0 &&
              renderDropdown('Timezone', filterTimezone, filterOptions.timezones, 'timezone')}
            {filterOptions.countries.length > 0 &&
              renderDropdown('Country', filterCountry, filterOptions.countries, 'country')}
            {filterOptions.states.length > 0 &&
              renderDropdown('State', filterState, filterOptions.states, 'state')}
            {filterOptions.heartCities.length > 0 &&
              renderDropdown('Heart City', filterHeartCity, filterOptions.heartCities, 'heartCity')}
            {filterOptions.mediums.length > 0 &&
              renderDropdown('Medium', filterMedium, filterOptions.mediums, 'medium')}
            {filterOptions.genders.length > 0 &&
              renderDropdown('Gender', filterGender, filterOptions.genders, 'gender')}
            <TouchableOpacity
              style={[styles.filterDropdown, filterOpenToPods ? styles.filterDropdownActive : null]}
              onPress={() => setFilterOpenToPods(f => !f)}
            >
              <Text style={[styles.filterDropdownText, filterOpenToPods ? styles.filterDropdownTextActive : null]}>
                {filterOpenToPods ? 'Open to Pods ✓' : 'Open to Pods'}
              </Text>
            </TouchableOpacity>
            {filterOptions.referrers.length > 0 && (
              <View style={styles.filterDropdownContainer}>
                <TouchableOpacity
                  style={[styles.filterDropdown, filterReferrer ? styles.filterDropdownActive : null]}
                  onPress={() => setOpenDropdown(openDropdown === 'referrer' ? null : 'referrer')}
                >
                  <Text
                    style={[styles.filterDropdownText, filterReferrer ? styles.filterDropdownTextActive : null]}
                    numberOfLines={1}
                  >
                    {filterReferrer
                      ? (filterOptions.referrers.find(r => r.uid === filterReferrer)?.username || 'Referrer')
                      : 'Referred By'}
                  </Text>
                  <Text style={styles.filterDropdownArrow}>{openDropdown === 'referrer' ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {openDropdown === 'referrer' && (
                  <ScrollView style={styles.filterDropdownList} nestedScrollEnabled>
                    {filterReferrer ? (
                      <TouchableOpacity
                        style={styles.filterDropdownItem}
                        onPress={() => { setFilterReferrer(''); setOpenDropdown(null); }}
                      >
                        <Text style={[styles.filterDropdownItemText, { fontStyle: 'italic' }]}>Clear</Text>
                      </TouchableOpacity>
                    ) : null}
                    {filterOptions.referrers.map(ref => {
                      const isSelected = ref.uid === filterReferrer;
                      return (
                        <TouchableOpacity
                          key={ref.uid}
                          style={[styles.filterDropdownItem, isSelected && styles.filterDropdownItemActive]}
                          onPress={() => { setFilterReferrer(ref.uid); setOpenDropdown(null); }}
                        >
                          <Text style={[
                            styles.filterDropdownItemText,
                            isSelected && styles.filterDropdownItemTextActive,
                          ]}>
                            {ref.username}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}
            {hasActiveFilters && (
              <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
                <Text style={styles.clearFiltersBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Results count */}
        <Text style={styles.resultsCount}>
          Showing {filteredUsers.length} of {allUsers.length} users · {selected.size} selected
        </Text>

        {/* User list */}
        <ScrollView style={styles.userList} nestedScrollEnabled>
          {filteredUsers.map((u) => {
            const isSelected = selected.has(u.uid);
            const displayName = u.username || u.email || u.uid.slice(0, 8);
            const pseudonym = u.pseudonym || '';
            const userPods = userPodMap[u.uid] || [];
            const referralCount = u.referralCount || 0;
            const referrerUid = referredByMap[u.uid];
            const referrerUser = referrerUid ? allUsers.find(usr => usr.uid === referrerUid) : null;
            const invited = referralsMap[u.uid] || [];
            const locationStr = userLocationStr(u);
            const heartStr = heartLocationStr(u);
            const mediums = u.favoriteMediums || [];
            const isExpanded = expandedUser === u.uid;

            return (
              <View key={u.uid}>
                <TouchableOpacity
                  style={[styles.userRow, isSelected && styles.userRowSelected]}
                  onPress={() => toggleUid(u.uid, setFn)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.userInfo}>
                    <View style={styles.userTopRow}>
                      <Text style={styles.userName}>{displayName}</Text>
                      {userPods.length > 0 && (
                        <View style={styles.podBadge}>
                          <Text style={styles.podBadgeText}>
                            In {userPods.length} pod{userPods.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                      {referralCount > 0 && (
                        <View style={styles.referralBadge}>
                          <Text style={styles.referralBadgeText}>
                            {referralCount} referred
                          </Text>
                        </View>
                      )}
                    </View>
                    {pseudonym ? (
                      <Text style={styles.userMeta} numberOfLines={1}>★ {pseudonym}</Text>
                    ) : null}
                    {locationStr ? (
                      <Text style={styles.userMeta} numberOfLines={1}>{locationStr}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={styles.profileBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      setSelectedProfile(u);
                    }}
                  >
                    <Text style={styles.profileBtnText}>👤</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.expandBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      setExpandedUser(isExpanded ? null : u.uid);
                    }}
                  >
                    <Text style={styles.expandBtnText}>{isExpanded ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.userDetails}>
                    {u.bio ? <Text style={styles.detailText}>Bio: {u.bio}</Text> : null}
                    {heartStr ? <Text style={styles.detailText}>Heart City: {heartStr}</Text> : null}
                    {mediums.length > 0 ? (
                      <Text style={styles.detailText}>Mediums: {mediums.join(', ')}</Text>
                    ) : null}
                    {u.email ? <Text style={styles.detailText}>Email: {u.email}</Text> : null}
                    {userPods.length > 0 && (
                      <Text style={styles.detailText}>Pods: {userPods.map(p => p.name).join(', ')}</Text>
                    )}
                    {referrerUser && (
                      <Text style={styles.detailText}>Referred by: {referrerUser.username || referrerUser.email || referrerUid.slice(0, 8)}</Text>
                    )}
                    {invited.length > 0 && (
                      <Text style={styles.detailText}>Invited: {invited.map(r => r.username).join(', ')}</Text>
                    )}
                    {u.referralCode && (
                      <Text style={styles.detailText}>Referral code: {u.referralCode}</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
          {filteredUsers.length === 0 && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No users match your filters</Text>
            </View>
          )}
        </ScrollView>
        <Text style={styles.selectedCount}>
          {selected.size} selected
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedBackground style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Manage Pods</Text>
        <Text style={styles.subtitle}>Create and edit discussion pods</Text>

        {/* Create Pod Button / Form */}
        {!showCreate && !editingPod && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreate(true)}
          >
            <Text style={styles.createButtonText}>+ Create Pod</Text>
          </TouchableOpacity>
        )}

        {showCreate && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Pod</Text>
            <TextInput
              style={styles.nameInput}
              value={newPodName}
              onChangeText={setNewPodName}
              placeholder="Pod name..."
              placeholderTextColor="#888"
              maxLength={50}
            />
            {renderUserPicker(selectedUids, setSelectedUids)}
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowCreate(false); setSelectedUids(new Set()); setNewPodName(''); setSearchText(''); setShowFilters(false); clearFilters(); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreatePod}>
                <Text style={styles.saveBtnText}>Create Pod</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Edit Form */}
        {editingPod && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Edit Pod</Text>
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Pod name..."
              placeholderTextColor="#888"
              maxLength={50}
            />
            {renderUserPicker(editSelectedUids, setEditSelectedUids)}
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setEditingPod(null); setSearchText(''); setShowFilters(false); clearFilters(); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Existing Pods List */}
        <Text style={styles.sectionTitle}>
          Existing Pods ({pods.length})
        </Text>

        {pods.length === 0 ? (
          <Text style={styles.noPods}>No pods created yet.</Text>
        ) : (
          pods.map((pod) => {
            const memberCount = pod.members ? pod.members.length : 0;
            const usernames = pod.memberUsernames
              ? Object.values(pod.memberUsernames).join(', ')
              : '';
            return (
              <View key={pod.id} style={styles.podCard}>
                <View style={styles.podCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.podName}>{pod.name}</Text>
                    <Text style={styles.podMemberCount}>
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.podActions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleStartEdit(pod)}
                    >
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeletePod(pod)}
                    >
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {usernames ? (
                  <Text style={styles.podUsernames} numberOfLines={2}>
                    {usernames}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <UserProfileModal
        visible={!!selectedProfile}
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#050d61',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#050d61',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  createButton: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignSelf: 'center',
    marginBottom: 20,
  },
  createButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formCard: {
    backgroundColor: 'rgba(184, 200, 232, 0.7)',
    borderWidth: 2,
    borderColor: '#050d61',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050d61',
    marginBottom: 12,
  },
  nameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  userPicker: {
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#050d61',
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  filterToggle: {
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  filterToggleText: {
    fontSize: 13,
    color: '#050d61',
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  filterDropdownContainer: {
    position: 'relative',
    minWidth: 90,
    zIndex: 10,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterDropdownActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  filterDropdownText: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
    maxWidth: 80,
  },
  filterDropdownTextActive: {
    color: '#050d61',
    fontWeight: '600',
  },
  filterDropdownArrow: {
    fontSize: 10,
    color: '#999',
  },
  filterDropdownList: {
    maxHeight: 140,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 2,
  },
  filterDropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterDropdownItemActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  filterDropdownItemText: {
    fontSize: 12,
    color: '#333',
  },
  filterDropdownItemTextActive: {
    color: '#050d61',
    fontWeight: '600',
  },
  clearFiltersBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(139, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#8B0000',
    alignSelf: 'center',
  },
  clearFiltersBtnText: {
    fontSize: 12,
    color: '#8B0000',
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 11,
    color: '#050d61',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  userList: {
    maxHeight: 280,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userRowSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#FFD700',
    borderColor: '#B8860B',
  },
  checkmark: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flexShrink: 1,
  },
  podBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  podBadgeText: {
    fontSize: 10,
    color: '#6B5900',
    fontWeight: '600',
  },
  referralBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  referralBadgeText: {
    fontSize: 10,
    color: '#6B5900',
    fontWeight: '600',
  },
  userMeta: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  userPodNames: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 1,
  },
  profileBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginLeft: 6,
    marginTop: 2,
  },
  profileBtnText: {
    fontSize: 14,
  },
  expandBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
    marginTop: 2,
  },
  expandBtnText: {
    fontSize: 12,
    color: '#666',
  },
  userDetails: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginLeft: 32,
  },
  detailText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 3,
    lineHeight: 17,
  },
  noResults: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  selectedCount: {
    fontSize: 12,
    color: '#050d61',
    marginTop: 6,
    textAlign: 'right',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#050d61',
  },
  cancelBtnText: {
    color: '#050d61',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050d61',
    marginBottom: 12,
  },
  noPods: {
    color: '#050d61',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  podCard: {
    backgroundColor: 'rgba(184, 200, 232, 0.6)',
    borderWidth: 2,
    borderColor: '#050d61',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  podCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  podName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#050d61',
  },
  podMemberCount: {
    fontSize: 12,
    color: '#050d61',
    marginTop: 2,
  },
  podActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.8)',
  },
  editBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#8B0000',
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  podUsernames: {
    fontSize: 12,
    color: '#050d61',
    marginTop: 6,
    fontStyle: 'italic',
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignSelf: 'center',
  },
  backButtonText: {
    color: '#050d61',
    fontSize: 15,
    fontWeight: '600',
  },
});
