import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/lib/theme';
import { useAuth } from '@/state/auth';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; callback(res: { credential?: string }): void }): void;
          prompt(): void;
        };
      };
    };
  }
}

WebBrowser.maybeCompleteAuthSession();

export function GoogleSignInButton({ onSuccess }: { onSuccess?: () => void }) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

  async function handleGoogleSignIn() {
    setLoading(true);
    setMessage('');
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.google?.accounts?.id && clientId) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: { credential?: string }) => {
              if (response.credential) {
                try {
                  await signInWithGoogle(response.credential);
                  if (onSuccess) onSuccess();
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : 'Google sign-in failed.');
                }
              }
            },
          });
          window.google.accounts.id.prompt();
          setLoading(false);
          return;
        }
      }

      if (!clientId) {
        setMessage('Google Client ID is not configured. Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to .env.');
        setLoading(false);
        return;
      }

      const redirectUri = encodeURIComponent(
        Platform.OS === 'web'
          ? (typeof window !== 'undefined' ? window.location.origin : '')
          : 'https://auth.expo.io/@anonymous/ferio-mobile',
      );
      const targetUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        clientId,
      )}&response_type=id_token&redirect_uri=${redirectUri}&scope=openid%20profile%20email&nonce=${Math.random().toString(36).substring(2)}`;

      const result = await WebBrowser.openAuthSessionAsync(targetUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        const hash = result.url.split('#')[1] || result.url.split('?')[1] || '';
        const params = new URLSearchParams(hash);
        const idToken = params.get('id_token');

        if (idToken) {
          await signInWithGoogle(idToken);
          if (onSuccess) onSuccess();
        } else {
          setMessage('Google sign-in completed but ID token was missing.');
        }
      } else {
        setMessage('Google sign-in was cancelled.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        disabled={loading}
        onPress={handleGoogleSignIn}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          loading && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.ink} size="small" />
        ) : (
          <>
            <View style={styles.googleIconContainer}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
            <Text style={styles.buttonText}>Continue with Google</Text>
          </>
        )}
      </Pressable>
      {message ? <Text style={styles.messageText}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  pressed: { backgroundColor: colors.surface },
  disabled: { opacity: 0.6 },
  googleIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '500',
  },
  messageText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.ink2,
    textAlign: 'center',
  },
});
