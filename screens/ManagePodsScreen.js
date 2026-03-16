import React, { useState, useEffect } from 'react';
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

  const renderUserPicker = (selected, setFn) => (
    <View style={styles.userPicker}>
      <Text style={styles.pickerLabel}>Select Members:</Text>
      <ScrollView style={styles.userList} nestedScrollEnabled>
        {allUsers.map((u) => {
          const isSelected = selected.has(u.uid);
          const displayName = u.username || u.email || u.uid.slice(0, 8);
          const pseudonym = u.pseudonym || '';
          return (
            <TouchableOpacity
              key={u.uid}
              style={[styles.userRow, isSelected && styles.userRowSelected]}
              onPress={() => toggleUid(u.uid, setFn)}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{displayName}</Text>
                {pseudonym ? (
                  <Text style={styles.userPseudonym}>{pseudonym}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text style={styles.selectedCount}>
        {selected.size} selected
      </Text>
    </View>
  );

  if (loading) {
    return (
      <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
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
                onPress={() => { setShowCreate(false); setSelectedUids(new Set()); setNewPodName(''); }}
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
                onPress={() => setEditingPod(null)}
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
  userList: {
    maxHeight: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  userPseudonym: {
    fontSize: 12,
    color: '#666',
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
