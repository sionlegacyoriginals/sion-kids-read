import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

/**
 * Hook-free error fallback — safe to render even if context providers have not
 * mounted yet. Shows the full error message and stack in both dev and production
 * so crashes are visible rather than silently blank.
 */
export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>{error?.message ?? 'Unknown error'}</Text>
        {!!error?.stack && (
          <Text style={styles.stack}>{error.stack}</Text>
        )}
        <Pressable
          onPress={resetError}
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1028',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F2A800',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
  },
  stack: {
    fontSize: 11,
    color: '#B0A0C8',
    fontFamily: 'monospace',
    lineHeight: 17,
    width: '100%',
  },
  button: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#7B26B8',
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
