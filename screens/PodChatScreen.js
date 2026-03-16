import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { subscribeToPodMessages, sendPodMessage } from '../services/firestoreService';
import { trackAction } from '../services/analyticsService';

export default function PodChatScreen({ route, navigation }) {
  const { podId, podName, members, memberUsernames } = route.params;
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!podId) return;

    const unsubscribe = subscribeToPodMessages(podId, (updatedMessages) => {
      setMessages(updatedMessages);
    });

    return () => unsubscribe();
  }, [podId]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !user) return;

    setSending(true);
    try {
      const username = userProfile?.username || user.email || 'Unknown';
      await sendPodMessage(podId, user.uid, username, trimmed);
      trackAction('pod_message_sent');
      setText('');
    } catch (error) {
      console.log('Error sending message:', error);
    }
    setSending(false);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const hours = date.getHours();
    const mins = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${h}:${mins} ${ampm}`;
  };

  const formatDateHeader = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const memberCount = members ? members.length : 0;

  const renderMessage = ({ item, index }) => {
    const isOwn = item.uid === user?.uid;
    // Show date header if first message or different day from previous
    let showDateHeader = false;
    if (index === 0) {
      showDateHeader = true;
    } else {
      const prevItem = messages[index - 1];
      const prevDate = prevItem?.createdAt?.toDate ? prevItem.createdAt.toDate() : new Date(prevItem?.createdAt || 0);
      const curDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt || 0);
      if (prevDate.toDateString() !== curDate.toDateString()) {
        showDateHeader = true;
      }
    }

    return (
      <View>
        {showDateHeader && (
          <Text style={styles.dateHeader}>{formatDateHeader(item.createdAt)}</Text>
        )}
        <View style={[styles.messageBubbleRow, isOwn && styles.messageBubbleRowOwn]}>
          <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
            {!isOwn && (
              <Text style={styles.messageUsername}>{item.username}</Text>
            )}
            <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>{item.text}</Text>
            <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
              {formatTimestamp(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{podName}</Text>
            <Text style={styles.headerSubtitle}>
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>No messages yet. Start the conversation!</Text>
            </View>
          }
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#888"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(5, 13, 97, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: '#FFD700',
  },
  backBtn: {
    width: 60,
  },
  backBtnText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 2,
  },
  messageList: {
    padding: 12,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  dateHeader: {
    textAlign: 'center',
    color: '#050d61',
    fontSize: 12,
    fontWeight: '600',
    marginVertical: 10,
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  messageBubbleRow: {
    flexDirection: 'row',
    marginBottom: 6,
    justifyContent: 'flex-start',
  },
  messageBubbleRowOwn: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  otherBubble: {
    backgroundColor: 'rgba(184, 200, 232, 0.7)',
    borderTopLeftRadius: 4,
  },
  ownBubble: {
    backgroundColor: 'rgba(255, 215, 0, 0.85)',
    borderTopRightRadius: 4,
  },
  messageUsername: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#050d61',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    color: '#050d61',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#1a1a1a',
  },
  messageTime: {
    fontSize: 10,
    color: '#050d61',
    marginTop: 4,
    textAlign: 'right',
  },
  ownMessageTime: {
    color: '#555',
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyChatText: {
    color: '#050d61',
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    backgroundColor: 'rgba(5, 13, 97, 0.85)',
    borderTopWidth: 1,
    borderTopColor: '#FFD700',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1a1a1a',
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
