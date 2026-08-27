import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { colors, radii } from '@/lib/theme';
import { useAuth } from '@/state/auth';

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; devOtp?: string; message?: string }>();
  const { verifyEmail, resendVerification } = useAuth();

  const [email, setEmail] = useState(params.email || '');
  const [otp, setOtp] = useState(params.devOtp || '');

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState(params.message || '');

  async function handleVerify() {
    if (!email.trim() || !/^\d{6}$/.test(otp.trim())) {
      setError('Please enter your email and a valid 6-digit verification code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyEmail(email.trim(), otp.trim());
      router.replace('/(tabs)/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email.trim()) {
      setError('Please enter your email address to resend the code.');
      return;
    }
    setResending(true);
    setError('');
    try {
      await resendVerification(email.trim());
      setInfoMessage('A new 6-digit verification code has been sent to your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend verification code.');
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>VERIFY ACCOUNT</Text>
        <Text style={styles.title}>Enter verification code</Text>
        <Text style={styles.copy}>
          We sent a 6-digit verification code to your email. Enter it below to activate your Ferio customer account.
        </Text>

        {params.devOtp ? (
          <View style={styles.devBanner}>
            <Text style={styles.devBannerTitle}>⚡ DEVELOPMENT OTP CODE</Text>
            <Text style={styles.devOtpText}>{params.devOtp}</Text>
            <Text style={styles.devSub}>Use this code to verify in development environment.</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verify Email Address</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email address *</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@example.com"
                placeholderTextColor="#9a9a9e"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>6-Digit Verification Code *</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="123456"
                placeholderTextColor="#9a9a9e"
                style={[styles.input, styles.otpInput]}
              />
            </View>

            {infoMessage ? <Text style={styles.infoText}>{infoMessage}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable disabled={loading} onPress={handleVerify} style={[styles.button, loading && styles.disabled]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify & Sign In</Text>}
            </Pressable>

            <Pressable disabled={resending} onPress={handleResend} style={styles.resendBtn}>
              <Text style={styles.resendText}>
                {resending ? 'Resending code…' : "Didn't receive code? Resend email"}
              </Text>
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
  devBanner: { marginTop: 20, borderWidth: 1, borderColor: '#fef08a', backgroundColor: '#fefce8', borderRadius: radii.card, padding: 16, alignItems: 'center' },
  devBannerTitle: { fontSize: 11, fontWeight: '700', color: '#854d0e', letterSpacing: 1 },
  devOtpText: { marginTop: 6, fontSize: 32, fontWeight: '700', letterSpacing: 6, color: '#713f12' },
  devSub: { marginTop: 4, fontSize: 11, color: '#a16207' },
  card: { marginTop: 24, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 20, backgroundColor: '#fff' },
  cardTitle: { fontSize: 20, fontWeight: '600', color: colors.ink },
  form: { marginTop: 22, gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 12, color: colors.ink2, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.ink, backgroundColor: '#fff' },
  otpInput: { fontSize: 22, letterSpacing: 6, textAlign: 'center', fontWeight: '600' },
  button: { marginTop: 8, backgroundColor: colors.ink, borderRadius: radii.pill, paddingVertical: 14, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  infoText: { color: colors.ink, fontSize: 12, lineHeight: 18 },
  errorText: { color: '#b91c1c', fontSize: 12 },
  resendBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
  resendText: { fontSize: 12, color: colors.ink2, textDecorationLine: 'underline' },
});
