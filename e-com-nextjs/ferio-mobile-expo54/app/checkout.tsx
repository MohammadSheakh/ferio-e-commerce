import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Link, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { apiPost, apiRequest } from '@/lib/api';
import { clearServerCartToken, syncCheckoutCart } from '@/lib/server-cart';
import { formatTaka } from '@/lib/catalog';
import { colors, radii } from '@/lib/theme';
import { useCart } from '@/state/cart';

const STORAGE_KEY = 'ferio_mobile_checkout_details_v2';

export interface DeliveryOption {
  id: string;
  name: string;
  deliveryFee?: number;
  freeDeliveryThreshold?: number | null;
  districts: Array<{ id: string; name: string }>;
}

export interface CheckoutPreview {
  pricing: {
    subtotal: number;
    deliveryFee: number;
    total: number;
  };
  paymentMethod: 'COD' | 'PREPAID';
  paymentProvider?: string;
}

export interface CheckoutOrderResult {
  id: string;
  reference: string;
  status: string;
  payment?: {
    redirectUrl?: string;
  };
}

const initialForm = {
  name: '',
  phone: '',
  email: '',
  district: 'Dhaka',
  area: '',
  detailedAddress: '',
  landmark: '',
  customerNote: '',
  marketingConsent: false,
  purchaseActivityConsent: false,
  termsAccepted: false,
  paymentMethod: 'COD' as 'COD' | 'PREPAID',
  paymentProvider: 'SSLCOMMERZ' as 'SSLCOMMERZ' | 'AAMARPAY',
};

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [form, setForm] = useState(initialForm);
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [cartToken, setCartToken] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setForm({ ...initialForm, ...JSON.parse(raw) });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(form)).catch(() => {});
  }, [form]);

  function updateForm<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setPreview(null);
    setError('');
  }

  async function handleCalculatePreview() {
    if (!form.name.trim() || !form.phone.trim() || !form.area.trim() || !form.detailedAddress.trim()) {
      setError('Please fill in all required name, phone, area and detailed address fields.');
      return;
    }
    setPreviewing(true);
    setError('');
    try {
      const nextCartToken = await syncCheckoutCart(items);
      const res = await apiRequest<CheckoutPreview>('/checkout/preview', {
        method: 'POST',
        headers: { 'x-cart-token': nextCartToken },
        body: {
          ...form,
          email: form.email || undefined,
          landmark: form.landmark || undefined,
        },
      });
      setCartToken(nextCartToken);
      setPreview(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to calculate checkout total.');
    } finally {
      setPreviewing(false);
    }
  }

  async function handlePlaceOrder() {
    if (!form.termsAccepted) {
      setError('Please accept terms and conditions.');
      return;
    }
    setPlacing(true);
    setError('');
    if (!preview || !cartToken) {
      setError('Calculate the server total before placing your order.');
      setPlacing(false);
      return;
    }
    const idempotencyKey = `mob_${Crypto.randomUUID()}`;
    try {
      const order = await apiRequest<CheckoutOrderResult>('/checkout/orders', {
        method: 'POST',
        headers: {
          'x-cart-token': cartToken,
          'Idempotency-Key': idempotencyKey,
        },
        body: { paymentMethod: form.paymentMethod },
      });

      let status = order.status;
      if (form.paymentMethod === 'PREPAID') {
        const payment = await apiPost<{ redirectUrl?: string }>('/payments/initiate', {
          orderId: order.id,
          provider: form.paymentProvider,
        });
        if (!payment.redirectUrl) throw new Error('The payment provider did not return a redirect URL.');
        await WebBrowser.openBrowserAsync(payment.redirectUrl);
        status = 'PAYMENT_PENDING';
      }

      await clear();
      await clearServerCartToken();
      await AsyncStorage.removeItem(STORAGE_KEY);

      router.replace({
        pathname: '/order-confirmation',
        params: {
          reference: order.reference,
          status,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to place your order.');
      setPlacing(false);
    }
  }

  const finalTotal = preview ? preview.pricing.total : subtotal;
  const deliveryFeeText = preview
    ? preview.pricing.deliveryFee === 0
      ? 'Free'
      : formatTaka(preview.pricing.deliveryFee)
    : 'Calculated after address validation';

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>CHECKOUT</Text>
        <Text style={styles.title}>Delivery details</Text>
        <Text style={styles.copy}>
          Confirm your address and payment method to calculate final total and place your order.
        </Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Full name *</Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => updateForm('name', v)}
              placeholder="Your full name"
              placeholderTextColor="#9a9a9e"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bangladesh mobile *</Text>
            <TextInput
              value={form.phone}
              onChangeText={(v) => updateForm('phone', v)}
              keyboardType="phone-pad"
              placeholder="01XXXXXXXXX"
              placeholderTextColor="#9a9a9e"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email (optional)</Text>
            <TextInput
              value={form.email}
              onChangeText={(v) => updateForm('email', v)}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#9a9a9e"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>District *</Text>
            <TextInput
              value={form.district}
              onChangeText={(v) => updateForm('district', v)}
              placeholder="Dhaka"
              placeholderTextColor="#9a9a9e"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Area / Thana *</Text>
            <TextInput
              value={form.area}
              onChangeText={(v) => updateForm('area', v)}
              placeholder="Your delivery area"
              placeholderTextColor="#9a9a9e"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Detailed address *</Text>
            <TextInput
              value={form.detailedAddress}
              onChangeText={(v) => updateForm('detailedAddress', v)}
              multiline
              placeholder="House, road, block, floor or village details"
              placeholderTextColor="#9a9a9e"
              style={[styles.input, styles.textarea]}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Landmark (optional)</Text>
            <TextInput
              value={form.landmark}
              onChangeText={(v) => updateForm('landmark', v)}
              placeholder="Nearby mosque, market or landmark"
              placeholderTextColor="#9a9a9e"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Order note (optional)</Text>
            <TextInput
              value={form.customerNote}
              onChangeText={(v) => updateForm('customerNote', v)}
              multiline
              placeholder="Delivery instructions"
              placeholderTextColor="#9a9a9e"
              style={[styles.input, styles.textarea]}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment method</Text>
          <View style={styles.paymentRow}>
            <Pressable
              onPress={() => updateForm('paymentMethod', 'COD')}
              style={[styles.payment, form.paymentMethod === 'COD' && styles.paymentActive]}
            >
              <Text style={[styles.paymentText, form.paymentMethod === 'COD' && styles.paymentTextActive]}>
                Cash on delivery
              </Text>
            </Pressable>
            <Pressable
              onPress={() => updateForm('paymentMethod', 'PREPAID')}
              style={[styles.payment, form.paymentMethod === 'PREPAID' && styles.paymentActive]}
            >
              <Text style={[styles.paymentText, form.paymentMethod === 'PREPAID' && styles.paymentTextActive]}>
                Pay online
              </Text>
            </Pressable>
          </View>
          {form.paymentMethod === 'PREPAID' ? (
            <View style={styles.providerRow}>
              {(['SSLCOMMERZ', 'AAMARPAY'] as const).map((provider) => (
                <Pressable
                  key={provider}
                  onPress={() => updateForm('paymentProvider', provider)}
                  style={[
                    styles.provider,
                    form.paymentProvider === provider && styles.providerActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.providerText,
                      form.paymentProvider === provider && styles.providerTextActive,
                    ]}
                  >
                    {provider === 'SSLCOMMERZ' ? 'SSLCommerz' : 'aamarPay'}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consent & Terms</Text>
          <Toggle
            label="Send me product and offer updates"
            value={form.marketingConsent}
            onValueChange={(v) => updateForm('marketingConsent', v)}
          />
          <Toggle
            label="Allow anonymized purchase activity notice"
            value={form.purchaseActivityConsent}
            onValueChange={(v) => updateForm('purchaseActivityConsent', v)}
          />
          <Toggle
            label="I confirm delivery details & accept store policies *"
            value={form.termsAccepted}
            onValueChange={(v) => updateForm('termsAccepted', v)}
          />
        </View>

        <View style={styles.summary}>
          <Text style={styles.sectionTitle}>Order summary</Text>
          {items.map((item) => (
            <View key={item.variantId} style={styles.summaryRow}>
              <Text style={styles.muted}>
                {item.name} x{item.quantity}
              </Text>
              <Text style={styles.value}>{formatTaka(item.price * item.quantity)}</Text>
            </View>
          ))}
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text style={styles.value}>{formatTaka(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Delivery fee</Text>
            <Text style={styles.value}>{deliveryFeeText}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Final total</Text>
            <Text style={styles.total}>{formatTaka(finalTotal)}</Text>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!preview ? (
          <Pressable
            disabled={previewing || !items.length}
            onPress={handleCalculatePreview}
            style={[styles.calcButton, (!items.length || previewing) && styles.disabled]}
          >
            {previewing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.calcButtonText}>Calculate & Preview Total</Text>
            )}
          </Pressable>
        ) : null}

        <Pressable
          disabled={!items.length || !form.termsAccepted || !preview || placing}
          onPress={handlePlaceOrder}
          style={[styles.place, (!items.length || !form.termsAccepted || !preview || placing) && styles.disabled]}
        >
          {placing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeText}>
              {form.paymentMethod === 'PREPAID' ? 'Continue to online payment' : 'Place cash-on-delivery order'}
            </Text>
          )}
        </Pressable>

        <Link href="/(tabs)/cart">
          <Text style={styles.back}>← Back to cart</Text>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

function Toggle({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleText}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#dedee1', true: '#2b2b2f' }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  container: { padding: 18, paddingBottom: 70 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.ink2, fontWeight: '600' },
  title: { marginTop: 7, fontSize: 30, fontWeight: '600', letterSpacing: -0.8, color: colors.ink },
  copy: { marginTop: 10, maxWidth: 520, fontSize: 13, lineHeight: 20, color: colors.ink2 },
  form: { marginTop: 28, gap: 15 },
  field: { gap: 7 },
  label: { fontSize: 12, color: colors.ink2, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: '#fff',
  },
  textarea: { minHeight: 82, textAlignVertical: 'top' },
  section: { marginTop: 30, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '500', color: colors.ink },
  paymentRow: { marginTop: 14, flexDirection: 'row', gap: 8 },
  payment: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    paddingVertical: 11,
    alignItems: 'center',
  },
  paymentActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  paymentText: { fontSize: 12, color: colors.ink2 },
  paymentTextActive: { color: '#fff' },
  providerRow: { marginTop: 10, flexDirection: 'row', gap: 8 },
  provider: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 10,
    alignItems: 'center',
  },
  providerActive: { borderBottomColor: colors.ink },
  providerText: { fontSize: 12, color: colors.ink2 },
  providerTextActive: { color: colors.ink, fontWeight: '600' },
  toggle: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  toggleText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.ink2 },
  summary: { marginTop: 30, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 17, gap: 11 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  muted: { fontSize: 12, color: colors.ink2, flex: 1 },
  value: { fontSize: 12, color: colors.ink },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, marginTop: 3 },
  totalLabel: { fontSize: 14, fontWeight: '600', color: colors.ink },
  total: { fontSize: 16, fontWeight: '600', color: colors.ink },
  calcButton: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radii.pill,
    paddingVertical: 13,
    alignItems: 'center',
  },
  calcButtonText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  place: { marginTop: 12, backgroundColor: colors.ink, borderRadius: radii.pill, paddingVertical: 14, alignItems: 'center' },
  disabled: { opacity: 0.35 },
  placeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  errorText: { marginTop: 14, color: '#b91c1c', fontSize: 13 },
  back: { marginTop: 18, textAlign: 'center', fontSize: 12, color: colors.ink2 },
});
