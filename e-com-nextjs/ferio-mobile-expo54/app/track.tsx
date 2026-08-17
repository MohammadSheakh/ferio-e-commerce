import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { apiPost } from '@/lib/api';
import { formatTaka } from '@/lib/catalog';
import { colors, radii } from '@/lib/theme';

export interface TimelineEntry {
  code: string;
  label: string;
  occurredAt: string;
  meta?: Record<string, unknown>;
}

export interface OrderTracking {
  id: string;
  reference: string;
  status: string;
  statusLabel: string;
  total: number;
  createdAt: string;
  shipment?: {
    status: string;
    statusLabel: string;
    provider: string;
    trackingNumber: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
  timeline: TimelineEntry[];
}

function getOrderStages(tracking: OrderTracking) {
  const isCancelled = tracking.status === "CANCELLED";

  const findEvent = (codes: string[]) =>
    tracking.timeline?.find((t) => codes.includes(t.code.toUpperCase()));

  const confirmedEvent = findEvent(["CONFIRMED"]);
  const processingEvent = findEvent([
    "READY_FOR_FULFILLMENT",
    "PICKING",
    "PACKED",
    "HANDED_OVER",
    "READY",
  ]);
  const shippedEvent = findEvent(["IN_TRANSIT", "OUT_FOR_DELIVERY"]);
  const deliveredEvent = findEvent(["DELIVERED"]);

  const isConfirmed =
    !!confirmedEvent ||
    tracking.status === "CONFIRMED" ||
    !!processingEvent ||
    !!shippedEvent ||
    !!deliveredEvent;
  const isProcessing =
    !!processingEvent ||
    !!tracking.shipment ||
    !!shippedEvent ||
    !!deliveredEvent;
  const isShipped =
    !!shippedEvent ||
    tracking.shipment?.status === "IN_TRANSIT" ||
    tracking.shipment?.status === "OUT_FOR_DELIVERY" ||
    !!deliveredEvent;
  const isDelivered =
    !!deliveredEvent ||
    tracking.status === "DELIVERED" ||
    tracking.shipment?.status === "DELIVERED";

  if (isCancelled) {
    const cancelEvent = findEvent(["CANCELLED"]);
    return [
      {
        key: "received",
        label: "Order received",
        isCompleted: true,
        isCancelled: false,
        occurredAt: tracking.createdAt,
      },
      {
        key: "cancelled",
        label: "Order cancelled",
        isCompleted: true,
        isCancelled: true,
        occurredAt: cancelEvent?.occurredAt || tracking.createdAt,
      },
      {
        key: "confirmed",
        label: "Order confirmed",
        isCompleted: false,
        isCancelled: false,
      },
      {
        key: "shipped",
        label: "Out for delivery",
        isCompleted: false,
        isCancelled: false,
      },
      {
        key: "delivered",
        label: "Delivered",
        isCompleted: false,
        isCancelled: false,
      },
    ];
  }

  return [
    {
      key: "received",
      label: "Order received",
      isCompleted: true,
      isCancelled: false,
      occurredAt: tracking.createdAt,
    },
    {
      key: "confirmed",
      label: "Order confirmed",
      isCompleted: isConfirmed,
      isCancelled: false,
      occurredAt:
        confirmedEvent?.occurredAt ||
        (isConfirmed ? tracking.createdAt : undefined),
    },
    {
      key: "processing",
      label: "Processing",
      isCompleted: isProcessing,
      isCancelled: false,
      occurredAt: processingEvent?.occurredAt,
    },
    {
      key: "shipped",
      label: "Out for delivery",
      isCompleted: isShipped,
      isCancelled: false,
      occurredAt: shippedEvent?.occurredAt,
    },
    {
      key: "delivered",
      label: "Delivered",
      isCompleted: isDelivered,
      isCancelled: false,
      occurredAt: deliveredEvent?.occurredAt,
    },
  ];
}

export default function TrackScreen() {
  const p = useLocalSearchParams<{ reference?: string }>();
  const [reference, setReference] = useState(p.reference || '');
  const [phone, setPhone] = useState('');
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleTrack() {
    if (!reference.trim() || !phone.trim()) {
      setError('Please enter both order reference and phone number.');
      return;
    }
    setLoading(true);
    setError('');
    setTracking(null);
    try {
      const res = await apiPost<OrderTracking>('/orders/track', {
        reference: reference.trim().toUpperCase(),
        phone: phone.trim(),
      });
      setTracking(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order details could not be verified.');
    } finally {
      setLoading(false);
    }
  }

  const stages = tracking ? getOrderStages(tracking) : [];

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>DELIVERY STATUS</Text>
        <Text style={styles.title}>Track your order</Text>
        <Text style={styles.copy}>
          Enter the order reference from your confirmation and the same phone number used at checkout.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Order reference</Text>
          <TextInput
            value={reference}
            onChangeText={setReference}
            autoCapitalize="characters"
            placeholder="FER-260806-ABC123"
            placeholderTextColor="#9a9a9e"
            style={styles.input}
          />
          <Text style={styles.label}>Checkout phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="01XXXXXXXXX"
            placeholderTextColor="#9a9a9e"
            style={styles.input}
          />
          <Pressable disabled={loading} onPress={handleTrack} style={[styles.button, loading && styles.disabled]}>
            <Text style={styles.buttonText}>{loading ? 'Checking order…' : 'Track order'}</Text>
          </Pressable>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.result}>
          {loading ? (
            <ActivityIndicator style={{ marginVertical: 40 }} />
          ) : tracking ? (
            <>
              <View style={styles.resultTop}>
                <View>
                  <Text style={styles.ref}>{tracking.reference}</Text>
                  <Text style={styles.status}>{tracking.shipment?.statusLabel ?? tracking.statusLabel}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.meta}>{formatTaka(tracking.total)} · Cash on delivery</Text>
                  <Text style={[styles.meta, { marginTop: 4 }]}>
                    Placed {new Date(tracking.createdAt).toLocaleDateString('en-BD')}
                  </Text>
                </View>
              </View>

              {tracking.shipment ? (
                <View style={styles.courier}>
                  <View>
                    <Text style={styles.smallMuted}>Courier</Text>
                    <Text style={styles.small}>{tracking.shipment.provider}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.smallMuted}>Tracking number</Text>
                    <Text style={styles.small}>{tracking.shipment.trackingNumber || 'Being assigned'}</Text>
                  </View>
                </View>
              ) : null}

              {/* Horizontal Order Status Timeline (X-Axis) */}
              <Text style={styles.timelineTitle}>PROGRESS TIMELINE (X-AXIS)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalTrack}>
                {stages.map((stage, idx) => {
                  const isSolid = stage.isCompleted;
                  return (
                    <View key={stage.key} style={styles.stageCol}>
                      {/* Node & Line Connector */}
                      <View style={styles.nodeRow}>
                        {idx > 0 ? (
                          <View style={[styles.connectorLine, isSolid && styles.connectorActive]} />
                        ) : (
                          <View style={[styles.connectorLine, { backgroundColor: 'transparent' }]} />
                        )}
                        <View
                          style={[
                            styles.dot,
                            stage.isCancelled
                              ? styles.dotCancelled
                              : isSolid
                              ? styles.dotDone
                              : styles.dotPending,
                          ]}
                        />
                        {idx < stages.length - 1 ? (
                          <View
                            style={[
                              styles.connectorLine,
                              stages[idx + 1]?.isCompleted && styles.connectorActive,
                            ]}
                          />
                        ) : (
                          <View style={[styles.connectorLine, { backgroundColor: 'transparent' }]} />
                        )}
                      </View>

                      {/* Stage Card */}
                      <View
                        style={[
                          styles.stageCard,
                          stage.isCancelled
                            ? styles.cardCancelled
                            : isSolid
                            ? styles.cardSolid
                            : styles.cardDimmed,
                        ]}
                      >
                        <Text style={[styles.stageText, isSolid ? styles.solidText : styles.pendingText]}>
                          {stage.label}
                        </Text>
                        <View style={{ marginTop: 8 }}>
                          {stage.occurredAt ? (
                            <Text style={styles.when}>
                              {new Date(stage.occurredAt).toLocaleString('en-BD', {
                                month: 'numeric',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </Text>
                          ) : (
                            <Text style={[styles.when, { fontStyle: 'italic', opacity: 0.5 }]}>Pending</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </>
          ) : (
            <View style={styles.emptyResult}>
              <Text style={styles.emptyText}>
                Verified tracking updates will appear here. Ferio never exposes order details from a reference alone.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  container: { padding: 18, paddingBottom: 70 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.ink2, fontWeight: '600' },
  title: { marginTop: 8, fontSize: 34, fontWeight: '600', letterSpacing: -1, color: colors.ink },
  copy: { marginTop: 10, maxWidth: 480, fontSize: 14, lineHeight: 22, color: colors.ink2 },
  form: { marginTop: 26, gap: 8 },
  label: { marginTop: 7, fontSize: 12, color: colors.ink2 },
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
  button: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  errorText: { marginTop: 8, color: '#b91c1c', fontSize: 12 },
  result: { marginTop: 32, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 17, minHeight: 290 },
  emptyResult: { flex: 1, minHeight: 250, alignItems: 'center', justifyContent: 'center' },
  emptyText: { maxWidth: 360, textAlign: 'center', fontSize: 13, lineHeight: 21, color: colors.ink2 },
  resultTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  ref: { fontSize: 10, letterSpacing: 1.1, color: colors.ink2, textTransform: 'uppercase' },
  status: { marginTop: 6, fontSize: 22, fontWeight: '600', color: colors.ink },
  meta: { fontSize: 11, color: colors.ink2 },
  courier: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f7f7f7', padding: 13, borderRadius: radii.card },
  smallMuted: { fontSize: 10, color: colors.ink2 },
  small: { marginTop: 4, fontSize: 12, color: colors.ink },
  timelineTitle: { marginTop: 24, fontSize: 10, letterSpacing: 1.1, color: colors.ink2, fontWeight: '600' },
  horizontalTrack: { marginTop: 14, paddingBottom: 10, gap: 12 },
  stageCol: { width: 140, alignItems: 'center' },
  nodeRow: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 24 },
  connectorLine: { flex: 1, height: 2, backgroundColor: colors.line },
  connectorActive: { backgroundColor: colors.ink },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotDone: { backgroundColor: colors.ink, borderWidth: 2, borderColor: '#fff' },
  dotPending: { backgroundColor: '#fff', borderWidth: 2, borderColor: colors.line },
  dotCancelled: { backgroundColor: '#b91c1c', borderWidth: 2, borderColor: '#fff' },
  stageCard: { marginTop: 12, width: '100%', borderRadius: radii.card, borderWidth: 1, padding: 12, minHeight: 90, justifyContent: 'space-between' },
  cardSolid: { backgroundColor: '#fff', borderColor: colors.line },
  cardDimmed: { backgroundColor: colors.surface, borderColor: 'rgba(0,0,0,0.06)', opacity: 0.4 },
  cardCancelled: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  stageText: { fontSize: 12, lineHeight: 16 },
  solidText: { color: colors.ink, fontWeight: '600' },
  pendingText: { color: colors.ink2 },
  when: { fontSize: 10, color: colors.ink2 },
});
