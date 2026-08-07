import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Redirect, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// KeyboardProvider from react-native-keyboard-controller is removed —
// it requires extra native setup and can crash silently on some Android versions.

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 },
  },
});

function hideSplash() {
  SplashScreen.hideAsync().catch(() => {});
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

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setAppIsReady(true);
      hideSplash();
    }
  }, [fontsLoaded, fontError]);

  // Hard timeout — always mount within 2s
  useEffect(() => {
    const t = setTimeout(() => {
      setAppIsReady(true);
      hideSplash();
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  if (!appIsReady) return <Loader />;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
              <RootLayoutNav />
              {!fontsLoaded && !!fontError && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 60, left: 16, right: 16,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    borderRadius: 8,
                    padding: 12,
                    zIndex: 9999,
                  }}
                >
                  <Text style={{ color: '#F2A800', fontWeight: '700', fontSize: 13 }}>
                    ⚠ Font error: {fontError?.message}
                  </Text>
                </View>
              )}
            </AuthProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
