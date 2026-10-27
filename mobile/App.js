import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  const webViewRef = useRef(null);
  const canGoBackRef = useRef(false);
  const [loadError, setLoadError] = useState(null);
  const [useLocalWifi, setUseLocalWifi] = useState(false);

  // Request Android runtime permissions for camera & mic on startup
  useEffect(() => {
    async function requestHardwarePermissions() {
      if (Platform.OS === 'android') {
        try {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);
        } catch (err) {
          console.warn('Hardware permissions error:', err);
        }
      }
    }
    requestHardwarePermissions();
  }, []);

  const CLOUDFLARE_HTTPS_URL = 'https://elevation-shops-superb-arm.trycloudflare.com';
  const LOCAL_LAN_URL = 'http://192.168.1.46:4000';

  const serverUrl = useMemo(() => {
    if (useLocalWifi) return LOCAL_LAN_URL;
    if (CLOUDFLARE_HTTPS_URL) return CLOUDFLARE_HTTPS_URL;
    return LOCAL_LAN_URL;
  }, [useLocalWifi, CLOUDFLARE_HTTPS_URL]);

  // Android hardware back button handling
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (canGoBackRef.current && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, []);

  const handleRetry = () => {
    setLoadError(null);
    webViewRef.current?.reload();
  };

  const toggleConnectionMode = () => {
    setLoadError(null);
    setUseLocalWifi((prev) => !prev);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ExpoStatusBar style="dark" backgroundColor="#ffffff" />

        <View style={styles.webWrap}>
          <WebView
            ref={webViewRef}
            key={serverUrl}
            source={{ uri: serverUrl }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            cacheEnabled={false}
            incognito={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantType="grant"
            originWhitelist={['*']}
            mixedContentMode="always"
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            androidHardwareAccelerationDisabled={false}
            androidLayerType="hardware"
            onPermissionRequest={(event) => {
              if (event.grant) {
                event.grant(event.resources);
              }
            }}
            onNavigationStateChange={(navState) => {
              canGoBackRef.current = navState.canGoBack;
              if (navState.loading === false && !navState.url.includes('trycloudflare.com/cdn-cgi/')) {
                setLoadError(null);
              }
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              setLoadError(`Connection error: ${nativeEvent.description || 'Host unreachable'}`);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              if (nativeEvent.statusCode >= 500) {
                setLoadError(`Server error (${nativeEvent.statusCode}) from host.`);
              }
            }}
          />

          {loadError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorEmoji}>⚠️</Text>
              <Text style={styles.errorTitle}>Cannot Connect to Server</Text>
              <Text style={styles.errorSubtitle}>
                {loadError}
              </Text>
              <Text style={styles.urlLabel}>Current URL: {serverUrl}</Text>

              <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                <Text style={styles.retryBtnText}>Retry Connection</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.switchBtn} onPress={toggleConnectionMode}>
                <Text style={styles.switchBtnText}>
                  {useLocalWifi
                    ? 'Switch to Cloudflare Tunnel'
                    : 'Switch to Local Wi-Fi (192.168.1.46)'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webWrap: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 9999,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111728',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#ff2a6d',
    textAlign: 'center',
    marginBottom: 8,
  },
  urlLabel: {
    fontSize: 12,
    color: '#8892a6',
    textAlign: 'center',
    marginBottom: 24,
    backgroundColor: '#f6f7fb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryBtn: {
    backgroundColor: '#ff2a6d',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  switchBtn: {
    backgroundColor: '#f0f3fa',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
  },
  switchBtnText: {
    color: '#111728',
    fontWeight: '600',
    fontSize: 14,
  },
});
