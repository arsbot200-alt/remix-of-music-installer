import type { CapacitorConfig } from '@capacitor/cli';

// The app is a TanStack Start web app with server functions (stream API,
// search, etc.) — it MUST point at a real deployed backend, not the local
// dev server. 10.0.2.2 only resolves inside the Android emulator, which is
// why playback fails on a real device.
const config: CapacitorConfig = {
  appId: 'com.arsmusic.app',
  appName: 'ArsMusic',
  webDir: 'dist/client',
  server: {
    url: 'https://kind-code-chum.lovable.app',
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    // Allow <audio> to autoplay/keep playing without a fresh user gesture
    // when navigating between routes inside the WebView.
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0b0b14',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
