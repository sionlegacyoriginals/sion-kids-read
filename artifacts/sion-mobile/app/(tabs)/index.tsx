import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { StoryCard } from '@/components/StoryCard';
import { fetchRecentStories, type Story } from '@/lib/api';

const WEB_BASE = 'https://sionkidsread.com';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const {
    data: recent,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['stories', 'recent'],
    queryFn: fetchRecentStories,
  });

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {getGreeting()} 👋
          </Text>
          <Text style={[styles.headline, { color: colors.foreground }]}>
            Sion Kids Read
          </Text>
        </View>
        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await signOut();
          }}
          style={({ pressed }) => [
            styles.avatarBtn,
            { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Create CTA */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/(tabs)/create');
        }}
        style={({ pressed }) => [
          styles.ctaCard,
          {
            backgroundColor: colors.primary,
            borderRadius: colors.radius,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <View style={styles.ctaContent}>
          <View>
            <Text style={[styles.ctaTitle, { color: '#FFF' }]}>
              Create a New Story
            </Text>
            <Text style={[styles.ctaSub, { color: 'rgba(255,255,255,0.75)' }]}>
              AI-personalized for any child
            </Text>
          </View>
          <View style={[styles.ctaIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="sparkles" size={26} color="#F2A800" />
          </View>
        </View>
      </Pressable>

      {/* Recent stories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent Stories
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/library')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        </View>

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {isError && (
          <View style={[styles.emptyBox, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Couldn't load stories
            </Text>
            <Pressable onPress={() => refetch()}>
              <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !isError && (!recent || recent.length === 0) && (
          <View style={[styles.emptyBox, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
            <Ionicons name="book-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No stories yet — create your first!
            </Text>
          </View>
        )}

        {!isLoading && recent && recent.length > 0 && (
          <FlatList
            data={recent}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={recent.length > 1}
            renderItem={({ item }) => (
              <StoryCard
                story={item}
                compact
                onPress={() => router.push(`/story/${item.id}` as any)}
              />
            )}
            contentContainerStyle={{ paddingRight: 8 }}
          />
        )}
      </View>

      {/* Quick links — in-app navigation */}
      <View style={styles.quickGrid}>
        {[
          { label: 'Library', icon: 'library-outline' as const, route: '/(tabs)/library' as const },
          { label: 'Music', icon: 'musical-notes-outline' as const, route: '/(tabs)/music' as const },
        ].map((item) => (
          <Pressable
            key={item.label}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(item.route);
            }}
            style={({ pressed }) => [
              styles.quickCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name={item.icon} size={26} color={colors.primary} />
            <Text style={[styles.quickLabel, { color: colors.foreground }]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Hubs & extras — open in-app browser */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Explore</Text>
        <View style={styles.hubGrid}>
          {[
            { label: 'Games', icon: '🎮', path: '/games' },
            { label: 'Classroom Hub', icon: '🏫', path: '/classroom' },
            { label: 'Homeschool Hub', icon: '🏠', path: '/family-hub' },
            { label: 'Parent Portal', icon: '👨‍👩‍👧', path: '/parent' },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await WebBrowser.openBrowserAsync(`${WEB_BASE}${item.path}`, {
                  presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                  toolbarColor: colors.background,
                  controlsColor: colors.primary,
                });
              }}
              style={({ pressed }) => [
                styles.hubCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={styles.hubIcon}>{item.icon}</Text>
              <Text style={[styles.hubLabel, { color: colors.foreground }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 24 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: 13, fontWeight: '600' },
  headline: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCard: { padding: 20 },
  ctaContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ctaTitle: { fontSize: 18, fontWeight: '800' },
  ctaSub: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  ctaIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  seeAll: { fontSize: 13, fontWeight: '700' },
  loadingRow: { paddingVertical: 24, alignItems: 'center' },
  emptyBox: { padding: 24, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  retryText: { fontSize: 14, fontWeight: '700' },
  quickGrid: { flexDirection: 'row', gap: 12 },
  quickCard: {
    flex: 1,
    borderWidth: 1,
    padding: 18,
    gap: 10,
    alignItems: 'flex-start',
  },
  quickLabel: { fontSize: 15, fontWeight: '700' },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  hubCard: {
    width: '47%',
    borderWidth: 1,
    padding: 16,
    gap: 8,
    alignItems: 'flex-start',
  },
  hubIcon: { fontSize: 26 },
  hubLabel: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
});
