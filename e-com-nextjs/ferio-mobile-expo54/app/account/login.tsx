import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { colors, radii } from '@/lib/theme';
import { useAuth } from '@/state/auth';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleSuccess() {
    if (params.next === 'checkout') {
      router.replace('/checkout');
    } else {
      router.replace('/(tabs)/account');
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Please enter both email address and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email.trim(), password);
      handleSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>CUSTOMER ACCOUNT</Text>
        <Text style={styles.title}>Welcome back.</Text>
        <Text style={styles.copy}>
          See verified purchase history, submit product reviews, and keep warranty claims connected to the right order.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in to your account</Text>
          <Text style={styles.cardSub}>
            New to Ferio?{' '}
            <Link href="/account/register" style={styles.linkInline}>
              Create an account
            </Link>
          </Text>

          <View style={styles.googleContainer}>
            <GoogleSignInButton onSuccess={handleSuccess} />
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR USE EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email address *</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="you@example.com"
                placeholderTextColor="#9a9a9e"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#9a9a9e"
                style={styles.input}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable disabled={loading} onPress={handleLogin} style={[styles.button, loading && styles.disabled]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
            </Pressable>
          </View>
        </View>

        <View style={styles.footerLinks}>
          <Link href="/account/verify" asChild>
            <Pressable>
              <Text style={styles.footerLinkText}>Verify an account with OTP →</Text>
            </Pressable>
          </Link>
          <Link href="/support" asChild>
            <Pressable>
              <Text style={styles.footerLinkText}>Need help with sign in? →</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  container: { padding: 18, paddingBottom: 70 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.ink2, fontWeight: '600' },
  title: { marginTop: 8, fontSize: 32, fontWeight: '600', letterSpacing: -0.9, color: colors.ink },
  copy: { marginTop: 8, fontSize: 14, lineHeight: 22, color: colors.ink2 },
  card: { marginTop: 28, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 20, backgroundColor: '#fff' },
  cardTitle: { fontSize: 20, fontWeight: '600', color: colors.ink },
  cardSub: { marginTop: 4, fontSize: 13, color: colors.ink2 },
  linkInline: { color: colors.ink, textDecorationLine: 'underline' },
  googleContainer: { marginTop: 20 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { fontSize: 10, letterSpacing: 1.2, color: colors.ink2, fontWeight: '600' },
  form: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 12, color: colors.ink2, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.ink, backgroundColor: '#fff' },
  button: { marginTop: 8, backgroundColor: colors.ink, borderRadius: radii.pill, paddingVertical: 14, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  errorText: { color: '#b91c1c', fontSize: 12 },
  footerLinks: { marginTop: 28, gap: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 20 },
  footerLinkText: { fontSize: 13, color: colors.ink2, textDecorationLine: 'underline' },
});
