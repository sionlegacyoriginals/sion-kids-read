import React from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { fetchStory } from '@/lib/api';
import * as Haptics from 'expo-haptics';

export default function StoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: story, isLoading, isError } = useQuery({
    queryKey: ['story', id],
    queryFn: () => fetchStory(Number(id)),
    enabled: !!id,
  });

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading story…</Text>
      </View>
    );
  }

  if (isError || !story) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Story not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primary, borderRadius: colors.radius / 2 }]}>
          <Text style={{ color: colors.primaryForeground, fontWeight: '700' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const paragraphs = story.content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar: back + edit */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.topCircle,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>

        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/edit-story/${story.id}` as any);
          }}
          style={({ pressed }) => [
            styles.editBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius / 2,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit</Text>
        </Pressable>
      </View>

      {/* Cover image */}
      {story.coverImageUrl && (
        <View style={[styles.coverWrap, { borderRadius: colors.radius }]}>
          <Image
            source={{ uri: story.coverImageUrl }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Meta */}
      <View style={styles.meta}>
        {/* Theme badge */}
        <View style={[styles.themeBadge, { backgroundColor: colors.primary + '22' }]}>
          <Text style={[styles.themeText, { color: colors.primary }]}>{story.theme}</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.foreground }]}>{story.title}</Text>

        {/* Child info */}
        <Text style={[styles.childInfo, { color: colors.mutedForeground }]}>
          A story for {story.childName}, age {story.childAge}
        </Text>

        {/* Bible verse if present */}
        {story.bibleVerse && (
          <View style={[styles.verseBox, { backgroundColor: colors.accent + '22', borderColor: colors.accent + '55', borderRadius: colors.radius / 2 }]}>
            <Ionicons name="book-outline" size={14} color={colors.accent} style={{ marginTop: 1 }} />
            <Text style={[styles.verseText, { color: colors.accentForeground }]}>{story.bibleVerse}</Text>
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Story content */}
      <View style={styles.body}>
        {paragraphs.map((para, i) => (
          <Text key={i} style={[styles.paragraph, { color: colors.foreground }]}>
            {para}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '600' },
  errorTitle: { fontSize: 18, fontWeight: '800' },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  content: { paddingHorizontal: 20, gap: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 14, fontWeight: '700' },
  coverWrap: {
    height: 220,
    overflow: 'hidden',
  },
  coverImage: { width: '100%', height: '100%' },
  meta: { gap: 10 },
  themeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  themeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 30, letterSpacing: -0.3 },
  childInfo: { fontSize: 13, fontWeight: '600' },
  verseBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  verseText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19, fontStyle: 'italic' },
  divider: { height: 1 },
  body: { gap: 18 },
  paragraph: { fontSize: 16, lineHeight: 26, fontWeight: '400' },
});
