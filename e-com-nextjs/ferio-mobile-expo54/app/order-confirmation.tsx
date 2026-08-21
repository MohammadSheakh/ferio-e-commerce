import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { colors, radii } from '@/lib/theme';

export default function OrderConfirmation() {
  const params = useLocalSearchParams<{ reference?: string; status?: string }>();
  const confirmed = params.status === 'CONFIRMED';
  const paymentPending = params.status === 'PAYMENT_PENDING';
  const message = paymentPending
    ? 'Your order was created. Payment confirmation may take a moment after the provider completes verification.'
    : confirmed
      ? 'Your order is confirmed and stock is reserved for fulfillment.'
      : 'We will verify your order and delivery details before fulfillment.';

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <View style={styles.container}>
        <Text style={styles.eyebrow}>{paymentPending ? 'PAYMENT PROCESSING' : 'ORDER RECEIVED'}</Text>
        <Text style={styles.title}>
          {paymentPending ? 'Check your payment status.' : 'Thank you for your order.'}
        </Text>
        {params.reference ? (
          <>
            <Text style={styles.ref}>
              Your reference is <Text style={styles.bold}>{params.reference}</Text>.
            </Text>
            <Text style={styles.copy}>{message}</Text>
          </>
        ) : (
          <Text style={styles.copy}>The order reference is unavailable in this app session.</Text>
        )}
        <View style={styles.buttons}>
          {params.reference ? (
            <Link href={{ pathname: '/track', params: { reference: params.reference } }} asChild>
              <Pressable style={styles.primary}>
                <Text style={styles.primaryText}>Track this order</Text>
              </Pressable>
            </Link>
          ) : null}
          <Link href="/(tabs)/products" asChild>
            <Pressable style={styles.secondary}>
              <Text style={styles.secondaryText}>Continue shopping</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.ink2, fontWeight: '600' },
  title: { marginTop: 10, fontSize: 32, lineHeight: 38, textAlign: 'center', fontWeight: '600', letterSpacing: -0.9, color: colors.ink },
  ref: { marginTop: 20, fontSize: 15, color: colors.ink },
  bold: { fontWeight: '600' },
  copy: { marginTop: 10, maxWidth: 470, textAlign: 'center', fontSize: 14, lineHeight: 22, color: colors.ink2 },
  buttons: { marginTop: 28, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  primary: { backgroundColor: colors.ink, borderRadius: radii.pill, paddingHorizontal: 18, paddingVertical: 11 },
  primaryText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  secondary: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.pill, paddingHorizontal: 18, paddingVertical: 11 },
  secondaryText: { color: colors.ink2, fontSize: 12 },
});
