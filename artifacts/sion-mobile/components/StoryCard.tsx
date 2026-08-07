import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { Story } from '@/lib/api';

interface Props {
  story: Story;
  onPress: () => void;
  compact?: boolean;
}

export function StoryCard({ story, onPress, compact = false }: Props) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
          width: compact ? 160 : undefined,
          marginRight: compact ? 12 : 0,
        },
      ]}
    >
      {/* Cover image */}
      <View
        style={[
          styles.coverContainer,
          {
            backgroundColor: colors.muted,
            borderRadius: colors.radius - 2,
            height: compact ? 100 : 140,
          },
        ]}
      >
        {story.coverImageUrl ? (
          <Image
            source={{ uri: story.coverImageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderCover}>
            <Text style={[styles.placeholderEmoji]}>📖</Text>
          </View>
        )}
        {/* Theme badge */}
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.primary + 'EE' },
          ]}
        >
          <Text style={[styles.badgeText, { color: colors.primaryForeground }]} numberOfLines={1}>
            {story.theme}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text
          style={[styles.title, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {story.title}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {story.childName}, age {story.childAge}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 4,
  },
  coverContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  placeholderCover: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 36,
  },
  badge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    maxWidth: '80%',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  info: {
    padding: 10,
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  meta: {
    fontSize: 11,
    fontWeight: '500',
  },
});
