import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { colors, radii } from '@/lib/theme';
import { useAuth } from '@/state/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleSuccess() {
    router.replace('/(tabs)/account');
  }

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await signUp(name.trim(), email.trim(), password, phone.trim());
      router.replace({
        pathname: '/account/verify',
        params: {
          email: res.email,
          devOtp: res.otp || '',
          message: res.message || '',
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account creation failed. Try a different email address.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>CREATE ACCOUNT</Text>
        <Text style={styles.title}>Keep every purchase connected.</Text>
        <Text style={styles.copy}>
          Registration is optional for checkout. Create an account when you want one secure place for order history, reviews, and warranty claims.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create your Ferio account</Text>
          <Text style={styles.cardSub}>
            Already registered?{' '}
            <Link href="/account/login" style={styles.linkInline}>
              Sign in
            </Link>
          </Text>

          <View style={styles.googleContainer}>
            <GoogleSignInButton onSuccess={handleSuccess} />
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR REGISTER WITH EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Full name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholder="Mohammad Sheakh"
                placeholderTextColor="#9a9a9e"
                style={styles.input}
              />
            </View>

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
              <Text style={styles.label}>Phone number (optional)</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="01XXXXXXXXX"
                placeholderTextColor="#9a9a9e"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password (8+ chars) *</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#9a9a9e"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm password *</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#9a9a9e"
                style={styles.input}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable disabled={loading} onPress={handleRegister} style={[styles.button, loading && styles.disabled]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create account</Text>}
            </Pressable>
          </View>
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
});
