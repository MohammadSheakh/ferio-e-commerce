import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createContext, useContext, useEffect, useState } from 'react';
import { apiPost, setAuthRefreshHandler, setAuthToken } from '@/lib/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role?: string;
}

interface SessionResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  signUp: (name: string, email: string, password: string, phoneNumber?: string) => Promise<{ email: string; otp?: string; message?: string }>;
  verifyEmail: (email: string, otp: string) => Promise<UserProfile>;
  resendVerification: (email: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<UserProfile>;
  signOut: () => Promise<void>;
}

const ACCESS_TOKEN_KEY = 'ferio_mobile_access_token_v2';
const REFRESH_TOKEN_KEY = 'ferio_mobile_refresh_token_v2';
const LEGACY_TOKEN_KEY = 'ferio_mobile_auth_token_v1';
const USER_STORAGE_KEY = 'ferio_mobile_auth_user_v1';

const AuthContext = createContext<AuthState | null>(null);

async function secureGet(key: string) {
  return Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string) {
  if (Platform.OS === 'web') await AsyncStorage.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string) {
  if (Platform.OS === 'web') await AsyncStorage.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function clearSession() {
    setUser(null);
    setAccessToken(null);
    setAuthToken(null);
    await Promise.all([
      secureDelete(ACCESS_TOKEN_KEY),
      secureDelete(REFRESH_TOKEN_KEY),
      AsyncStorage.multiRemove([LEGACY_TOKEN_KEY, USER_STORAGE_KEY]),
    ]);
  }

  async function saveSession(session: SessionResponse) {
    if (!session.accessToken || !session.refreshToken || !session.user) {
      throw new Error('The authentication server returned an incomplete session.');
    }
    setAccessToken(session.accessToken);
    setUser(session.user);
    setAuthToken(session.accessToken);
    await Promise.all([
      secureSet(ACCESS_TOKEN_KEY, session.accessToken),
      secureSet(REFRESH_TOKEN_KEY, session.refreshToken),
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user)),
      AsyncStorage.removeItem(LEGACY_TOKEN_KEY),
    ]);
  }

  useEffect(() => {
    async function refreshSession() {
      const refreshToken = await secureGet(REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;
      try {
        const session = await apiPost<Pick<SessionResponse, 'accessToken' | 'refreshToken'>>(
          '/auth/refresh',
          { refreshToken },
        );
        await secureSet(ACCESS_TOKEN_KEY, session.accessToken);
        await secureSet(REFRESH_TOKEN_KEY, session.refreshToken);
        setAccessToken(session.accessToken);
        setAuthToken(session.accessToken);
        return session.accessToken;
      } catch {
        await clearSession();
        return null;
      }
    }

    setAuthRefreshHandler(refreshSession);
    return () => setAuthRefreshHandler(null);
  }, []);

  useEffect(() => {
    async function restoreSession() {
      try {
        const [storedToken, storedRefreshToken, storedUser] = await Promise.all([
          secureGet(ACCESS_TOKEN_KEY),
          secureGet(REFRESH_TOKEN_KEY),
          AsyncStorage.getItem(USER_STORAGE_KEY),
        ]);
        if (storedToken && storedRefreshToken && storedUser) {
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUser));
          setAuthToken(storedToken);
        } else {
          await clearSession();
        }
      } catch {
        await clearSession();
      } finally {
        setLoading(false);
      }
    }
    void restoreSession();
  }, []);

  async function signIn(email: string, password: string): Promise<UserProfile> {
    const session = await apiPost<SessionResponse>('/auth/login', { email, password });
    await saveSession(session);
    return session.user;
  }

  async function signUp(name: string, email: string, password: string, phoneNumber?: string) {
    const response = await apiPost<{ user?: UserProfile; otp?: string; message?: string }>('/auth/register', {
      name,
      email,
      password,
      phoneNumber: phoneNumber || undefined,
    });
    return {
      email: response.user?.email || email,
      otp: response.otp,
      message: response.message || 'Check your email for a 6-digit verification code.',
    };
  }

  async function verifyEmail(email: string, otp: string): Promise<UserProfile> {
    const session = await apiPost<SessionResponse>('/auth/verify-email', { email, otp });
    await saveSession(session);
    return session.user;
  }

  async function resendVerification(email: string): Promise<void> {
    await apiPost('/auth/resend-verification', { email });
  }

  async function signInWithGoogle(idToken: string): Promise<UserProfile> {
    const session = await apiPost<SessionResponse>('/auth/oauth', {
      provider: 'google',
      idToken,
    });
    await saveSession(session);
    return session.user;
  }

  async function signOut(): Promise<void> {
    const refreshToken = await secureGet(REFRESH_TOKEN_KEY);
    try {
      await apiPost('/auth/logout', { refreshToken: refreshToken || undefined });
    } catch {
      // Local revocation still completes when the network is unavailable.
    } finally {
      await clearSession();
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      loading,
      signIn,
      signUp,
      verifyEmail,
      resendVerification,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
