import React from 'react';
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import type { VideoItem } from '@/lib/api';

interface Props {
  video: VideoItem;
}

export function VideoCard({ video }: Props) {
  const colors = useColors();

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Shorts need a different deep-link scheme in the YouTube app
    const webUrl = video.isShort
      ? `https://www.youtube.com/shorts/${video.id}`
      : `https://www.youtube.com/watch?v=${video.id}`;
    const appUrl = video.isShort
      ? `youtube://shorts/${video.id}`
      : `youtube://watch?v=${video.id}`;

    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canOpen ? appUrl : webUrl);
    } catch {
      // Fallback to web if anything fails
      await Linking.openURL(webUrl);
    }
  };

  const formattedDate = new Date(video.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Thumbnail */}
      <View style={[styles.thumbContainer, { borderRadius: colors.radius - 2, backgroundColor: colors.muted }]}>
        <Image
          source={{ uri: video.thumbnail }}
          style={styles.thumb}
          resizeMode="cover"
        />
        <View style={styles.playOverlay}>
          <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
            <Ionicons name="play" size={18} color="#FFF" />
          </View>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {video.title}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {formattedDate}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
  },
  thumbContainer: {
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
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
  date: {
    fontSize: 11,
    fontWeight: '500',
  },
});
