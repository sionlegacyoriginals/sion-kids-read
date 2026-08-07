import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// expo-router/entry already calls SplashScreen.preventAutoHideAsync() internally.
// Do NOT call it again here — second call throws in Expo SDK 52+.

const CRASH_KEY = '@sion_last_crash';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 },
  },
});

function hideSplash() {
  try {
    const r = (SplashScreen as any).hide?.() ?? (SplashScreen as any).hideAsync?.();
    if (r && typeof r.catch === 'function') r.catch(() => {});
  } catch (_) {}
}

function Loader() {
  return (
    <View style={{ flex: 1, backgroundColor: '#7B26B8', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#F2A800" size="large" />
    </View>
  );
}

// Persistent crash screen — shown if a previous crash was saved.
// No Try Again button so it doesn't loop. User takes screenshot and reports error.
function CrashScreen({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#1C1028' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#F2A800', textAlign: 'center' }}>
          ⚠ App Error — Please Screenshot
        </Text>
        <Text style={{ fontSize: 13, color: '#FFFFFF', textAlign: 'center' }}>
          Send this screenshot to support so the error can be fixed:
        </Text>
        <Text style={{ fontSize: 12, color: '#B0A0C8', fontFamily: 'monospace', lineHeight: 18 }}>
          {message}
        </Text>
        <Pressable
          onPress={onDismiss}
          style={{ marginTop: 16, paddingVertical: 14, paddingHorizontal: 32,
            backgroundColor: '#7B26B8', borderRadius: 12, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Clear & Retry</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// Class-based error boundary that persists the crash to AsyncStorage
// so the next launch can display it even if the flash was too fast to read.
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    const message = `${error?.message}\n\nStack:${error?.stack ?? ''}\n\nComponent:${info?.componentStack ?? ''}`;
    AsyncStorage.setItem(CRASH_KEY, message).catch(() => {});
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error.message + '\n\n' + (this.state.error.stack ?? '');
      return (
        <CrashScreen
          message={msg}
          onDismiss={() => {
            AsyncStorage.removeItem(CRASH_KEY).catch(() => {});
            this.setState({ error: null });
          }}
        />
      );
    }
    return this.props.children;
  }
}

function RootLayoutNav() {
  const { token, isLoading } = useAuth();

  // Use router.replace in effect instead of <Redirect> to avoid navigation loops
  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/sign-in');
    }
  }, [isLoading, token]);

  if (isLoading) return <Loader />;
  if (!token) return <Loader />; // show loader while redirect fires

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="story/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="edit-story/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}

function AppInner() {
  const [ready, setReady] = useState(false);
  const [savedCrash, setSavedCrash] = useState<string | null>(null);

  useEffect(() => {
    // Check for a crash saved from a previous session
    AsyncStorage.getItem(CRASH_KEY)
      .then((val) => {
        if (val) setSavedCrash(val);
        setReady(true);
        hideSplash();
      })
      .catch(() => {
        setReady(true);
        hideSplash();
      });
  }, []);

  if (!ready) return <Loader />;

  // Show saved crash from a previous launch — lets user screenshot it
  if (savedCrash) {
    return (
      <CrashScreen
        message={savedCrash}
        onDismiss={() => {
          AsyncStorage.removeItem(CRASH_KEY).catch(() => {});
          setSavedCrash(null);
        }}
      />
    );
  }

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

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <AppInner />
    </RootErrorBoundary>
  );
}
