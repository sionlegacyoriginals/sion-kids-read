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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { VideoCard } from '@/components/VideoCard';
import { fetchMusicVideos, type VideoItem } from '@/lib/api';

export default function MusicScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const queryClient = useQueryClient();

  const { data: videos, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['music', 'videos'],
    queryFn: () => fetchMusicVideos(false),
    staleTime: 1000 * 60 * 5, // 5 minutes — pick up new uploads quickly
  });

  // Pull-to-refresh busts the server-side cache too so deleted/new videos
  // appear immediately rather than waiting up to 10 minutes
  async function handleRefresh() {
    await queryClient.fetchQuery({
      queryKey: ['music', 'videos'],
      queryFn: () => fetchMusicVideos(true),
      staleTime: 0,
    });
  }

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
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.foreground }]}>Music</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Songs from @sionkidslife — tap to play
          </Text>
        </View>
        <View style={[styles.noteIcon, { backgroundColor: colors.muted }]}>
          <Ionicons name="musical-notes" size={22} color={colors.primary} />
        </View>
      </View>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading music…</Text>
        </View>
      )}

      {isError && (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Couldn't load music</Text>
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius / 2 }]}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 14 }}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && videos?.length === 0 && (
        <View style={styles.centered}>
          <Ionicons name="musical-note-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No videos yet</Text>
        </View>
      )}

      {!isLoading && videos && videos.length > 0 && (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.rowGap}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!videos.length}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.videoWrap}>
              <VideoCard video={item} />
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: { gap: 2 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 13, fontWeight: '500' },
  noteIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  listContent: { padding: 12, gap: 12 },
  rowGap: { gap: 12 },
  videoWrap: { flex: 1 },
});
