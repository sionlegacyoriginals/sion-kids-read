import React from 'react';
import { Text, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';

// Do NOT call SplashScreen.preventAutoHideAsync() here.
// expo-router/entry handles it internally; a second call causes infinite re-renders.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 },
  },
});

// Simple error boundary — shows plain text so the error is always readable.
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('RootErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#1C1028', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#F2A800', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
            App Error
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'monospace' }}>
            {this.state.error.message}
          </Text>
          <Text style={{ color: '#B0A0C8', fontSize: 11, marginTop: 12 }}>
            {this.state.error.stack}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Static layout — no auth redirects on startup.
// Auth checks happen inside individual screens.
function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="story/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="edit-story/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </QueryClientProvider>
    </RootErrorBoundary>
  );
}
