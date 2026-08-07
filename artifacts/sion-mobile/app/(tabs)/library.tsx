import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { StoryCard } from '@/components/StoryCard';
import { fetchStories, type Story } from '@/lib/api';

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data: stories, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['stories'],
    queryFn: fetchStories,
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Story Library</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {stories ? `${stories.length} ${stories.length === 1 ? 'story' : 'stories'}` : 'All your stories'}
        </Text>
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading library…</Text>
        </View>
      )}

      {/* Error */}
      {isError && (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Couldn't load stories</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius / 2 }]}>
            <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 14 }}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {/* Empty */}
      {!isLoading && !isError && stories?.length === 0 && (
        <View style={styles.centered}>
          <Ionicons name="book-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No stories yet</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            Create your first AI story
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/create')}
            style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius / 2 }]}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 14 }}>Create Story</Text>
          </Pressable>
        </View>
      )}

      {/* Grid */}
      {!isLoading && stories && stories.length > 0 && (
        <FlatList
          data={stories}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!stories.length}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <StoryCard
                story={item}
                onPress={() => router.push(`/story/${item.id}` as any)}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 2,
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 13, fontWeight: '500' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  loadingText: { fontSize: 14, fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyBody: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  listContent: { padding: 12, gap: 12 },
  row: { gap: 12 },
  cardWrap: { flex: 1 },
});
