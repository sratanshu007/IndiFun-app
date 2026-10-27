import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  Platform,
  PermissionsAndroid,
  TextInput,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const DEFAULT_SERVER_URL = 'https://indifun-app.onrender.com';
const CHROME_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

export default function App() {
  const webViewRef = useRef(null);
  const canGoBackRef = useRef(false);
  const [loadError, setLoadError] = useState(null);
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [editUrlModal, setEditUrlModal] = useState(false);
  const [tempUrl, setTempUrl] = useState(DEFAULT_SERVER_URL);

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

  const handleSaveUrl = () => {
    let clean = tempUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    setServerUrl(clean);
    setEditUrlModal(false);
    setLoadError(null);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ExpoStatusBar style="light" backgroundColor="#0f111a" />

        <View style={styles.webWrap}>
          <WebView
            ref={webViewRef}
            key={serverUrl}
            source={{ uri: serverUrl }}
            style={styles.webview}
            userAgent={CHROME_USER_AGENT}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            cacheEnabled={true}
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
              <Text style={styles.errorEmoji}>📡</Text>
              <Text style={styles.errorTitle}>Connecting to Indi Fun Live</Text>
              <Text style={styles.errorSubtitle}>{loadError}</Text>
              <Text style={styles.urlLabel}>{serverUrl}</Text>

              <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                <Text style={styles.retryBtnText}>Retry Connection</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchBtn}
                onPress={() => {
                  setTempUrl(serverUrl);
                  setEditUrlModal(true);
                }}
              >
                <Text style={styles.switchBtnText}>Change Server URL</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Modal to change URL if ever needed */}
          <Modal visible={editUrlModal} transparent={true} animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Configure Server URL</Text>
                <Text style={styles.modalHint}>Enter backend server URL:</Text>
                <TextInput
                  style={styles.input}
                  value={tempUrl}
                  onChangeText={setTempUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="https://indifun-app.onrender.com"
                  placeholderTextColor="#8892a6"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.cancelBtn]}
                    onPress={() => setEditUrlModal(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.saveBtn]}
                    onPress={handleSaveUrl}
                  >
                    <Text style={styles.saveBtnText}>Save & Connect</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f111a',
  },
  webWrap: {
    flex: 1,
    backgroundColor: '#0f111a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f111a',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f111a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 9999,
  },
  errorEmoji: {
    fontSize: 52,
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#ff4d88',
    textAlign: 'center',
    marginBottom: 10,
  },
  urlLabel: {
    fontSize: 12,
    color: '#8b949e',
    textAlign: 'center',
    marginBottom: 24,
    backgroundColor: '#1b1f2e',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    maxWidth: '90%',
  },
  retryBtn: {
    backgroundColor: '#ff2a6d',
    paddingHorizontal: 28,
    paddingVertical: 14,
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
    backgroundColor: '#1e2438',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
  },
  switchBtnText: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#1b1f2e',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 13,
    color: '#8b949e',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#0f111a',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  cancelBtn: {
    backgroundColor: '#2d3348',
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#ff2a6d',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
