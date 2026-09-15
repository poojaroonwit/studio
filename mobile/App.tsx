import React from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import {
  ESS_HOME_ROUTE,
  ESS_OVERFLOW_ROUTES,
  ESS_PRIMARY_ROUTES,
  isEssRouteActive,
  type EssRoute,
} from './src/essRoutes';
import {
  NATIVE_APP_MARKER_SCRIPT,
  toHriveUrl,
} from './src/config';
import {
  normalizeAppPath,
  pathFromIncomingUrl,
  shouldStayInsideNativeWebView,
} from './src/nativeNavigation';

const APP_USER_AGENT_TOKEN = 'HriveNative/1.0';

function NativeEssShell() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const webViewRef = React.useRef<WebView>(null);

  const [currentPath, setCurrentPath] = React.useState(ESS_HOME_ROUTE.path);
  const [sourceUrl, setSourceUrl] = React.useState(() => toHriveUrl(ESS_HOME_ROUTE.path));
  const [canGoBack, setCanGoBack] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [moreOpen, setMoreOpen] = React.useState(false);

  const palette = React.useMemo(() => ({
    background: isDark ? '#0b0f14' : '#ffffff',
    surface: isDark ? '#111827' : '#ffffff',
    elevated: isDark ? '#18202b' : '#f5f6f8',
    border: isDark ? '#273244' : '#e5e7eb',
    text: isDark ? '#f8fafc' : '#111827',
    muted: isDark ? '#94a3b8' : '#667085',
    active: isDark ? '#f8fafc' : '#111827',
    activeSurface: isDark ? '#253041' : '#eef0f3',
    danger: isDark ? '#fecaca' : '#991b1b',
  }), [isDark]);

  const navigateToPath = React.useCallback((path: string) => {
    const normalized = normalizeAppPath(path);
    if (!normalized) return;

    setLoadError(null);
    setMoreOpen(false);
    setCurrentPath(normalized);
    setSourceUrl(toHriveUrl(normalized));
  }, []);

  const handleIncomingUrl = React.useCallback((url: string | null) => {
    if (!url) return;
    const route = pathFromIncomingUrl(url);
    if (route) navigateToPath(route);
  }, [navigateToPath]);

  React.useEffect(() => {
    Linking.getInitialURL().then(handleIncomingUrl).catch(() => undefined);
    const subscription = Linking.addEventListener('url', ({ url }) => handleIncomingUrl(url));
    return () => subscription.remove();
  }, [handleIncomingUrl]);

  React.useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (moreOpen) {
        setMoreOpen(false);
        return true;
      }

      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [canGoBack, moreOpen]);

  const openExternalUrl = React.useCallback((url: string) => {
    Linking.openURL(url).catch(() => undefined);
  }, []);

  const selectRoute = React.useCallback((route: EssRoute) => {
    navigateToPath(route.path);
  }, [navigateToPath]);

  const retry = React.useCallback(() => {
    setLoadError(null);
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: palette.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={styles.webContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: sourceUrl }}
          style={[styles.webView, { backgroundColor: palette.background }]}
          applicationNameForUserAgent={APP_USER_AGENT_TOKEN}
          injectedJavaScriptBeforeContentLoaded={NATIVE_APP_MARKER_SCRIPT}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled={Platform.OS === 'ios'}
          setSupportMultipleWindows={false}
          onLoadStart={() => {
            setIsLoading(true);
            setLoadError(null);
          }}
          onLoadEnd={() => setIsLoading(false)}
          onError={(event) => {
            setIsLoading(false);
            setLoadError(event.nativeEvent.description || 'Unable to load Hrive ESS.');
          }}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode >= 500) {
              setLoadError(`Hrive ESS returned ${event.nativeEvent.statusCode}.`);
            }
          }}
          onNavigationStateChange={(state) => {
            setCanGoBack(state.canGoBack);
            try {
              const parsed = new URL(state.url);
              const normalized = normalizeAppPath(parsed.pathname);
              if (normalized) setCurrentPath(normalized);
            } catch {
              // Ignore transient or browser-internal navigation states.
            }
          }}
          onShouldStartLoadWithRequest={(request) => {
            const incomingRoute = pathFromIncomingUrl(request.url);
            if (request.url.startsWith('hrive:') && incomingRoute) {
              navigateToPath(incomingRoute);
              return false;
            }

            if (/^(mailto|tel|sms):/i.test(request.url)) {
              openExternalUrl(request.url);
              return false;
            }

            if (shouldStayInsideNativeWebView(request.url)) {
              return true;
            }

            openExternalUrl(request.url);
            return false;
          }}
        />

        {isLoading ? (
          <View style={[styles.loadingOverlay, { backgroundColor: palette.background }]} pointerEvents="none">
            <ActivityIndicator size="small" />
            <Text style={[styles.loadingText, { color: palette.muted }]}>Loading Hrive ESS…</Text>
          </View>
        ) : null}

        {loadError ? (
          <View style={[styles.errorOverlay, { backgroundColor: palette.background }]}>
            <Text style={[styles.errorTitle, { color: palette.text }]}>Unable to load Hrive ESS</Text>
            <Text style={[styles.errorMessage, { color: palette.muted }]}>{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={retry}
              style={[styles.retryButton, { backgroundColor: palette.active, borderColor: palette.border }]}
            >
              <Text style={[styles.retryButtonText, { color: palette.background }]}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: palette.surface,
            borderTopColor: palette.border,
          },
        ]}
        accessibilityRole="tablist"
      >
        {ESS_PRIMARY_ROUTES.map((route) => {
          const active = isEssRouteActive(currentPath, route.path);
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={route.label}
              onPress={() => selectRoute(route)}
              style={styles.tabButton}
            >
              <View
                style={[
                  styles.tabIndicator,
                  { backgroundColor: active ? palette.activeSurface : 'transparent' },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tabText,
                    { color: active ? palette.active : palette.muted },
                    active && styles.tabTextActive,
                  ]}
                >
                  {route.label}
                </Text>
              </View>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: ESS_OVERFLOW_ROUTES.some((route) => isEssRouteActive(currentPath, route.path)) }}
          accessibilityLabel="More self-service"
          onPress={() => setMoreOpen(true)}
          style={styles.tabButton}
        >
          <View
            style={[
              styles.tabIndicator,
              {
                backgroundColor: ESS_OVERFLOW_ROUTES.some((route) => isEssRouteActive(currentPath, route.path))
                  ? palette.activeSurface
                  : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: ESS_OVERFLOW_ROUTES.some((route) => isEssRouteActive(currentPath, route.path))
                    ? palette.active
                    : palette.muted,
                },
              ]}
            >
              More
            </Text>
          </View>
        </Pressable>
      </View>

      <Modal
        visible={moreOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMoreOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: palette.border }]} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: palette.text }]}>More self-service</Text>
                <Text style={[styles.sheetSubtitle, { color: palette.muted }]}>Employee services and work tools</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setMoreOpen(false)}
                hitSlop={12}
              >
                <Text style={[styles.closeText, { color: palette.muted }]}>Close</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.routeList} showsVerticalScrollIndicator={false}>
              {ESS_OVERFLOW_ROUTES.map((route) => {
                const active = isEssRouteActive(currentPath, route.path);
                return (
                  <Pressable
                    key={route.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => selectRoute(route)}
                    style={[
                      styles.routeRow,
                      {
                        backgroundColor: active ? palette.activeSurface : 'transparent',
                        borderBottomColor: palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.routeText,
                        { color: active ? palette.active : palette.text },
                        active && styles.routeTextActive,
                      ]}
                    >
                      {route.label}
                    </Text>
                    <Text style={[styles.routeChevron, { color: palette.muted }]}>›</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NativeEssShell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  webContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomBar: {
    minHeight: 62,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 4,
    paddingTop: 5,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  tabIndicator: {
    minHeight: 40,
    minWidth: 56,
    maxWidth: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '74%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSubtitle: {
    fontSize: 13,
    marginTop: 3,
  },
  closeText: {
    fontSize: 13,
    fontWeight: '600',
    paddingTop: 2,
  },
  routeList: {
    paddingBottom: 10,
  },
  routeRow: {
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeText: {
    fontSize: 15,
    fontWeight: '500',
  },
  routeTextActive: {
    fontWeight: '700',
  },
  routeChevron: {
    fontSize: 24,
    lineHeight: 26,
  },
});
