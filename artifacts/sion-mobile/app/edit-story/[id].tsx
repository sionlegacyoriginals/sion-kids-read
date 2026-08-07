import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { fetchStory, updateStory } from '@/lib/api';

export default function EditStoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: story, isLoading, isError } = useQuery({
    queryKey: ['story', id],
    queryFn: () => fetchStory(Number(id)),
    enabled: !!id,
  });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Populate fields once the story loads
  useEffect(() => {
    if (story) {
      setTitle(story.title);
      setContent(story.content);
    }
  }, [story]);

  function handleTitleChange(val: string) {
    setTitle(val);
    setIsDirty(true);
  }

  function handleContentChange(val: string) {
    setContent(val);
    setIsDirty(true);
  }

  async function handleSave() {
    if (!isDirty) { router.back(); return; }
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for the story.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Content required', 'The story content cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await updateStory(Number(id), { title: title.trim(), content: content.trim() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Invalidate so the reader and library both get fresh data
      await queryClient.invalidateQueries({ queryKey: ['story', id] });
      await queryClient.invalidateQueries({ queryKey: ['stories'] });
      router.back();
    } catch (e: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Save failed', e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    if (isDirty) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved edits. Are you sure you want to leave?',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ],
      );
    } else {
      router.back();
    }
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !story) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>Story not found</Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.primary, borderRadius: colors.radius / 2 }]}
        >
          <Text style={{ color: colors.primaryForeground, fontWeight: '700' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.circleBtn,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>

        <Text style={[styles.topTitle, { color: colors.foreground }]} numberOfLines={1}>
          Edit Story
        </Text>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: saving ? colors.muted : colors.primary,
              borderRadius: colors.radius / 2,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title field */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Title</Text>
          <TextInput
            style={[
              styles.titleInput,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius / 2,
                color: colors.foreground,
              },
            ]}
            value={title}
            onChangeText={handleTitleChange}
            placeholder="Story title…"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
          />
        </View>

        {/* Content field */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.foreground }]}>Story</Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              {content.trim().split(/\s+/).filter(Boolean).length} words
            </Text>
          </View>
          <TextInput
            style={[
              styles.contentInput,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius / 2,
                color: colors.foreground,
              },
            ]}
            value={content}
            onChangeText={handleContentChange}
            placeholder="Story content…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </View>

        {isDirty && (
          <View style={[styles.dirtyBanner, { backgroundColor: colors.accent + '22', borderColor: colors.accent + '55', borderRadius: colors.radius / 2 }]}>
            <Ionicons name="pencil-outline" size={14} color={colors.accent} />
            <Text style={[styles.dirtyText, { color: colors.accentForeground }]}>
              You have unsaved changes
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 18, fontWeight: '800' },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '800' },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 24 },
  fieldGroup: { gap: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '700' },
  hint: { fontSize: 12, fontWeight: '600' },

  titleInput: {
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  contentInput: {
    minHeight: 400,
    padding: 14,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 26,
  },

  dirtyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
  },
  dirtyText: { fontSize: 13, fontWeight: '600' },
});
