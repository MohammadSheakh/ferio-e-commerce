import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { apiPost, setAuthToken } from '@/lib/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role?: string;
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

const TOKEN_STORAGE_KEY = 'ferio_mobile_auth_token_v1';
const USER_STORAGE_KEY = 'ferio_mobile_auth_user_v1';

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (storedToken && storedUser) {
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUser));
          setAuthToken(storedToken);
        }
      } catch {
        // Clear corrupted storage
        await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
      } finally {
        setLoading(false);
      }
    }
    void restoreSession();
  }, []);

  async function saveSession(token: string, userObj: UserProfile) {
    setAccessToken(token);
    setUser(userObj);
    setAuthToken(token);
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
  }

  async function signIn(email: string, password: string): Promise<UserProfile> {
    const res = await apiPost<{ user: UserProfile; accessToken: string }>('/auth/login', {
      email,
      password,
    });
    if (!res.accessToken || !res.user) {
      throw new Error('Invalid response from login server.');
    }
    await saveSession(res.accessToken, res.user);
    return res.user;
  }

  async function signUp(
    name: string,
    email: string,
    password: string,
    phoneNumber?: string,
  ): Promise<{ email: string; otp?: string; message?: string }> {
    const res = await apiPost<{ user?: UserProfile; otp?: string; message?: string }>('/auth/register', {
      name,
      email,
      password,
      phoneNumber: phoneNumber || undefined,
    });
    return {
      email: res.user?.email || email,
      otp: res.otp,
      message: res.message || 'Check your email for a 6-digit verification code.',
    };
  }

  async function verifyEmail(email: string, otp: string): Promise<UserProfile> {
    const res = await apiPost<{ user: UserProfile; accessToken: string }>('/auth/verify-email', {
      email,
      otp,
    });
    if (!res.accessToken || !res.user) {
      throw new Error('Email verification succeeded but session token was not returned.');
    }
    await saveSession(res.accessToken, res.user);
    return res.user;
  }

  async function resendVerification(email: string): Promise<void> {
    await apiPost('/auth/resend-verification', { email });
  }

  async function signInWithGoogle(idToken: string): Promise<UserProfile> {
    const res = await apiPost<{ user: UserProfile; accessToken: string }>('/auth/oauth', {
      idToken,
    });
    if (!res.accessToken || !res.user) {
      throw new Error('Google OAuth sign in failed to return a valid session token.');
    }
    await saveSession(res.accessToken, res.user);
    return res.user;
  }

  async function signOut(): Promise<void> {
    try {
      await apiPost('/auth/logout', {});
    } catch {
      // Ignore logout network errors
    } finally {
      setUser(null);
      setAccessToken(null);
      setAuthToken(null);
      await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        signIn,
        signUp,
        verifyEmail,
        resendVerification,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
