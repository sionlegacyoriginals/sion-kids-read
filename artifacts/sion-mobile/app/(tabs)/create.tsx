import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { createStory } from '@/lib/api';

const THEMES = [
  'Courage', 'Kindness', 'Faith', 'Friendship', 'Honesty', 'Perseverance',
  'Gratitude', 'Forgiveness', 'Compassion', 'Patience', 'Joy', 'Hope', 'Love',
  'Bravery', 'Wisdom', 'Creativity', 'Curiosity', 'Adventure', 'Teamwork',
  'Respect', 'Empathy', 'Sharing', 'Responsibility', 'Diligence', 'Wonder',
  'Overcoming Fear', 'Generosity', 'Humility', 'Loyalty', 'Self-Control',
  'Trustworthiness', 'Contentment', 'Acceptance', 'Service', 'Peacemaking',
  'Integrity', 'Helpfulness',
];

const AGES = Array.from({ length: 12 }, (_, i) => i + 1);

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState<number>(5);
  const [childGender, setChildGender] = useState<'boy' | 'girl'>('girl');
  const [theme, setTheme] = useState('Kindness');
  const [customPrompt, setCustomPrompt] = useState('');
  const [bibleVerse, setBibleVerse] = useState('auto');
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleCreate = async () => {
    if (!childName.trim()) {
      Alert.alert('Missing name', 'Please enter the child\'s name.');
      return;
    }
    setLoading(true);
    try {
      const story = await createStory({
        childName: childName.trim(),
        childAge,
        childGender,
        theme,
        ...(customPrompt.trim() ? { customPrompt: customPrompt.trim() } : {}),
        ...(bibleVerse.trim() ? { bibleVerse: bibleVerse.trim() } : {}),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      router.push(`/story/${story.id}` as any);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create story. Please try again.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPad + 16,
            paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Create a Story</Text>
          <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
            Personalized AI storybook in minutes
          </Text>
        </View>

        {/* Child name */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Child's name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius / 2,
                color: colors.foreground,
              },
            ]}
            placeholder="e.g. Amara"
            placeholderTextColor={colors.mutedForeground}
            value={childName}
            onChangeText={setChildName}
            autoCapitalize="words"
          />
        </View>

        {/* Gender */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Gender</Text>
          <View style={styles.row}>
            {(['girl', 'boy'] as const).map((g) => (
              <Pressable
                key={g}
                onPress={() => setChildGender(g)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: childGender === g ? colors.primary : colors.card,
                    borderColor: childGender === g ? colors.primary : colors.border,
                    borderRadius: 24,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: childGender === g ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {g === 'girl' ? '👧 Girl' : '👦 Boy'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Age */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Age</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ageRow}>
            {AGES.map((a) => (
              <Pressable
                key={a}
                onPress={() => setChildAge(a)}
                style={[
                  styles.ageChip,
                  {
                    backgroundColor: childAge === a ? colors.primary : colors.card,
                    borderColor: childAge === a ? colors.primary : colors.border,
                    borderRadius: 8,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.ageChipText,
                    { color: childAge === a ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {a}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Theme */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Theme</Text>
          <View style={styles.themeGrid}>
            {THEMES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTheme(t)}
                style={[
                  styles.themeChip,
                  {
                    backgroundColor: theme === t ? colors.primary : colors.card,
                    borderColor: theme === t ? colors.primary : colors.border,
                    borderRadius: 20,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.themeChipText,
                    { color: theme === t ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Custom prompt (optional) */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Custom details{' '}
            <Text style={{ color: colors.mutedForeground, fontWeight: '500' }}>(optional)</Text>
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius / 2,
                color: colors.foreground,
              },
            ]}
            placeholder="Favorite toys, pets, a recent trip — anything to make it personal"
            placeholderTextColor={colors.mutedForeground}
            value={customPrompt}
            onChangeText={setCustomPrompt}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Bible verse */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Bible verse</Text>
          <View style={styles.row}>
            {[
              { label: 'AI picks one', value: 'auto' },
              { label: 'None', value: '' },
            ].map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => setBibleVerse(opt.value)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: bibleVerse === opt.value ? colors.accent : colors.card,
                    borderColor: bibleVerse === opt.value ? colors.accent : colors.border,
                    borderRadius: 24,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: bibleVerse === opt.value ? colors.accentForeground : colors.foreground },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky generate button */}
      <View
        style={[
          styles.stickyFooter,
          {
            paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 16,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handleCreate}
          disabled={loading}
          style={({ pressed }) => [
            styles.generateBtn,
            {
              backgroundColor: loading ? colors.muted : colors.primary,
              borderRadius: colors.radius,
              opacity: pressed ? 0.87 : 1,
            },
          ]}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primaryForeground} size="small" />
              <Text style={[styles.generateText, { color: colors.primaryForeground }]}>
                Generating your story…
              </Text>
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <Ionicons name="sparkles" size={20} color="#F2A800" />
              <Text style={[styles.generateText, { color: colors.primaryForeground }]}>
                Generate Story
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  pageHeader: { gap: 4 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pageSub: { fontSize: 14, fontWeight: '500' },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700' },
  input: {
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    fontSize: 15,
  },
  textArea: {
    padding: 14,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 80,
  },
  row: { flexDirection: 'row', gap: 10 },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
  },
  pillText: { fontSize: 14, fontWeight: '700' },
  ageRow: { marginHorizontal: -4 },
  ageChip: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginHorizontal: 4,
  },
  ageChipText: { fontSize: 14, fontWeight: '700' },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  themeChipText: { fontSize: 13, fontWeight: '600' },
  stickyFooter: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  generateBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  generateText: { fontSize: 17, fontWeight: '800' },
});
