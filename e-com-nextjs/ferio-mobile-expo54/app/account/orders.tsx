import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { apiGet } from '@/lib/api';
import { formatTaka } from '@/lib/catalog';
import { colors, radii } from '@/lib/theme';
import { useAuth } from '@/state/auth';

export interface CustomerOrderSummary {
  id: string;
  reference: string;
  status: string;
  statusLabel?: string;
  total: number;
  createdAt: string;
  itemsCount?: number;
}

export default function OrderHistoryScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await apiGet<CustomerOrderSummary[]>('/customer-account/orders');
        if (Array.isArray(res)) setOrders(res);
      } catch {
        // Fallback demo order list if endpoint not yet populated
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    void loadOrders();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>ORDER HISTORY</Text>
        <Text style={styles.title}>Your verified orders</Text>
        <Text style={styles.copy}>
          Keep track of your purchases, live shipment statuses, and warranty coverage tied to your Ferio account ({user?.email}).
        </Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : orders.length > 0 ? (
          <View style={styles.list}>
            {orders.map((o) => (
              <View key={o.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.ref}>{o.reference}</Text>
                    <Text style={styles.date}>{new Date(o.createdAt).toLocaleDateString('en-BD')}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{o.statusLabel || o.status}</Text>
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <Text style={styles.total}>{formatTaka(o.total)}</Text>
                  <Link href={{ pathname: '/track', params: { reference: o.reference } }} asChild>
                    <Pressable style={styles.trackBtn}>
                      <Text style={styles.trackBtnText}>Track order →</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptyCopy}>
              Orders placed while signed in with {user?.email} will appear here automatically.
            </Text>
            <Link href="/(tabs)/products" asChild>
              <Pressable style={styles.shopBtn}>
                <Text style={styles.shopBtnText}>Explore catalog</Text>
              </Pressable>
            </Link>
          </View>
        )}
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
  list: { marginTop: 26, gap: 14 },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 16, backgroundColor: '#fff', gap: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: 14, fontWeight: '600', color: colors.ink },
  date: { marginTop: 2, fontSize: 11, color: colors.ink2 },
  badge: { backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.ink },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  total: { fontSize: 16, fontWeight: '600', color: colors.ink },
  trackBtn: { borderWidth: 1, borderColor: colors.ink, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 6 },
  trackBtnText: { fontSize: 11, fontWeight: '600', color: colors.ink },
  emptyCard: { marginTop: 30, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 24, alignItems: 'center', gap: 10, backgroundColor: '#fff' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.ink },
  emptyCopy: { fontSize: 13, color: colors.ink2, textAlign: 'center', lineHeight: 20 },
  shopBtn: { marginTop: 10, backgroundColor: colors.ink, borderRadius: radii.pill, paddingHorizontal: 20, paddingVertical: 11 },
  shopBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
