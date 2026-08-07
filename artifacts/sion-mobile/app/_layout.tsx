import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Redirect, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// expo-router/entry already calls SplashScreen.preventAutoHideAsync() internally.
// Do NOT call it here — a second call throws in Expo SDK 52+ before React mounts.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 },
  },
});

function hideSplash() {
  try {
    const result = (SplashScreen as any).hide?.() ?? (SplashScreen as any).hideAsync?.();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch (_) {}
}

function Loader() {
  return (
    <View style={{ flex: 1, backgroundColor: '#7B26B8', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#F2A800" size="large" />
    </View>
  );
}

function RootLayoutNav() {
  const { token, isLoading } = useAuth();

  if (isLoading) return <Loader />;
  if (!token) return <Redirect href="/sign-in" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="story/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="edit-story/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}

// Inner app — ErrorBoundary in the parent catches any crash here.
function AppInner() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // No font loading — use system fonts to eliminate that crash source.
    // Fonts can be added back once the app is stable.
    setReady(true);
    hideSplash();
  }, []);

  if (!ready) return <Loader />;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

// ErrorBoundary is the OUTERMOST wrapper so it catches crashes anywhere below,
// including inside AppInner's hooks and effects.
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
