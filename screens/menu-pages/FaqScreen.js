import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../config/admin';
import { getFaqItems, saveFaqItems } from '../../services/firestoreService';
import { showAlert, showConfirm } from '../../utils/alertUtils';

const DEFAULT_FAQS = [
  { question: 'What is MAGIC?', answer: 'MAGIC stands for Manifest, Art, Goals, Inspire, and Courage \u2014 the five daily creative practices that make up your streak. Each day, completing all five lights up your star!' },
  { question: 'How do streaks work?', answer: 'Complete all five MAGIC tasks in a single day to earn a streak day. Your streak calendar on the Grow page tracks consecutive and total days. Keep the momentum going!' },
  { question: 'What is a daily courage?', answer: 'Your daily courage is a creative work you share anonymously with the community. It takes courage to put your art out there \u2014 that\'s why we celebrate it!' },
  { question: 'How does voting work?', answer: 'Each day, yesterday\'s courages appear on the Inspire page for community voting. The most-voted courage is crowned the daily winner the following day.' },
  { question: 'What is the Tapestry?', answer: 'Your Tapestry is your curated public gallery \u2014 up to 25 of your best works that other artists can browse and save. Think of it as your personal exhibition.' },
  { question: 'What is the Vault?', answer: 'The Vault is your private collection of all the art you\'ve created in the app. Only you can see it. Use it as your creative archive.' },
  { question: 'What are Inspirations?', answer: 'Inspirations are works by other artists that you\'ve saved (candlelit) from their Tapestries. They live in your Inspiring tab as a personal mood board.' },
  { question: 'How does premium work?', answer: 'Premium unlocks advanced stats, expanded gallery slots, past diary entries, goal history, and more. You can earn a free trial by completing your first 13-day streak!' },
  { question: 'What are discussion pods?', answer: 'Discussion pods are small group chats where MAGIC artists connect, share ideas, and support each other. You can opt in on your About You page.' },
  { question: 'How do I change my pseudonym?', answer: 'Your pseudonym is your public artist name. You get one free change after signup. After that, pseudonym changes are a premium feature.' },
  { question: 'How do I invite friends?', answer: 'Use the Invite Friends page in the menu to send email invitations. When a friend signs up through your invite, you both get rewards!' },
  { question: 'How do I contact support?', answer: 'Email us at cecelia@13magicalnights.com \u2014 we\'d love to hear from you! You can also submit feature ideas on the Coming Soon page.' },
];

export default function FaqScreen({ navigation }) {
  const { user } = useAuth();
  const admin = user && isAdmin(user.uid);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editFaqs, setEditFaqs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    loadFaqs();
  }, []);

  const loadFaqs = async () => {
    try {
      const items = await getFaqItems();
      setFaqs(items.length > 0 ? items : DEFAULT_FAQS);
    } catch (e) {
      console.log('Error loading FAQs:', e);
      setFaqs(DEFAULT_FAQS);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    setEditFaqs(faqs.map(f => ({ ...f })));
    setEditing(true);
    setExpandedIndex(null);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditFaqs([]);
  };

  const updateEditFaq = (index, field, value) => {
    setEditFaqs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addFaq = () => {
    setEditFaqs(prev => [...prev, { question: '', answer: '' }]);
  };

  const deleteFaq = (index) => {
    showConfirm('Delete FAQ', 'Remove this question?', () => {
      setEditFaqs(prev => prev.filter((_, i) => i !== index));
    });
  };

  const moveFaq = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= editFaqs.length) return;
    setEditFaqs(prev => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  };

  const handleSave = async () => {
    const valid = editFaqs.filter(f => f.question.trim() && f.answer.trim());
    if (valid.length === 0) {
      showAlert('No FAQs', 'Add at least one question and answer before saving.');
      return;
    }
    setSaving(true);
    try {
      await saveFaqItems(valid);
      setFaqs(valid);
      setEditing(false);
      setEditFaqs([]);
      showAlert('Saved', 'FAQ updated successfully.');
    } catch (e) {
      console.log('Error saving FAQs:', e);
      showAlert('Error', 'Could not save FAQs. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (index) => {
    setExpandedIndex(prev => (prev === index ? null : index));
  };

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.container} resizeMode="cover">
      <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Menu')}>
        <Text style={styles.menuBtnText}>{'\u2630'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.closeBtnText}>{'\u2715'}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>FAQ</Text>

        {admin && !editing && (
          <TouchableOpacity style={styles.editButton} onPress={startEditing}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <ActivityIndicator color="#FFD700" size="large" style={{ marginTop: 40 }} />
        ) : editing ? (
          /* ---- ADMIN EDIT MODE ---- */
          <View style={styles.editContainer}>
            {editFaqs.map((faq, index) => (
              <View key={index} style={styles.editCard}>
                <View style={styles.editCardHeader}>
                  <Text style={styles.editCardNumber}>Q{index + 1}</Text>
                  <View style={styles.editCardActions}>
                    <TouchableOpacity onPress={() => moveFaq(index, -1)} disabled={index === 0}>
                      <Text style={[styles.editActionText, index === 0 && styles.editActionDisabled]}>{'\u25B2'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveFaq(index, 1)} disabled={index === editFaqs.length - 1}>
                      <Text style={[styles.editActionText, index === editFaqs.length - 1 && styles.editActionDisabled]}>{'\u25BC'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteFaq(index)}>
                      <Text style={[styles.editActionText, { color: '#DC143C' }]}>{'\u2715'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TextInput
                  style={styles.editInput}
                  value={faq.question}
                  onChangeText={(val) => updateEditFaq(index, 'question', val)}
                  placeholder="Question..."
                  placeholderTextColor="#999"
                  multiline
                />
                <TextInput
                  style={[styles.editInput, styles.editInputAnswer]}
                  value={faq.answer}
                  onChangeText={(val) => updateEditFaq(index, 'answer', val)}
                  placeholder="Answer..."
                  placeholderTextColor="#999"
                  multiline
                />
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={addFaq}>
              <Text style={styles.addButtonText}>+ Add Question</Text>
            </TouchableOpacity>

            <View style={styles.editButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ---- ACCORDION VIEW ---- */
          <View style={styles.accordionContainer}>
            {faqs.map((faq, index) => (
              <TouchableOpacity
                key={index}
                style={styles.accordionItem}
                onPress={() => toggleExpand(index)}
                activeOpacity={0.7}
              >
                <View style={styles.questionRow}>
                  <Text style={styles.questionText}>{faq.question}</Text>
                  <Text style={styles.expandIcon}>{expandedIndex === index ? '\u25B2' : '\u25BC'}</Text>
                </View>
                {expandedIndex === index && (
                  <Text style={styles.answerText}>{faq.answer}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

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
    alignItems: 'center',
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginTop: 55,
    marginBottom: 20,
  },
  menuBtn: {
    position: 'absolute',
    top: 44,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#4B0082',
    backgroundColor: 'rgba(250,235,215,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  menuBtnText: {
    color: '#4B0082',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    position: 'absolute',
    top: 44,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#4B0082',
    backgroundColor: 'rgba(250,235,215,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    color: '#4B0082',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Edit button
  editButton: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginBottom: 16,
  },
  editButtonText: {
    color: '#4B0082',
    fontSize: 15,
    fontWeight: '700',
  },

  // Accordion
  accordionContainer: {
    width: '100%',
    maxWidth: 500,
  },
  accordionItem: {
    backgroundColor: 'rgba(250,235,215,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 0, 130, 0.25)',
    padding: 16,
    marginBottom: 10,
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#4B0082',
    marginRight: 8,
  },
  expandIcon: {
    fontSize: 12,
    color: '#4B0082',
  },
  answerText: {
    fontSize: 14,
    color: '#4B0082',
    lineHeight: 21,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(75, 0, 130, 0.15)',
  },

  // Edit mode
  editContainer: {
    width: '100%',
    maxWidth: 500,
  },
  editCard: {
    backgroundColor: 'rgba(250,235,215,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 0, 130, 0.25)',
    padding: 14,
    marginBottom: 12,
  },
  editCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editCardNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B0082',
  },
  editCardActions: {
    flexDirection: 'row',
    gap: 14,
  },
  editActionText: {
    fontSize: 16,
    color: '#4B0082',
    fontWeight: 'bold',
  },
  editActionDisabled: {
    opacity: 0.3,
  },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(75, 0, 130, 0.2)',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#4B0082',
    marginBottom: 6,
  },
  editInputAnswer: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: 'rgba(75, 0, 130, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(75, 0, 130, 0.25)',
    borderRadius: 10,
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#4B0082',
    fontSize: 15,
    fontWeight: '600',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    backgroundColor: 'rgba(250,235,215,0.9)',
    borderWidth: 2,
    borderColor: '#4B0082',
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#4B0082',
    fontSize: 15,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  saveButtonText: {
    color: '#4B0082',
    fontSize: 15,
    fontWeight: '700',
  },
});
