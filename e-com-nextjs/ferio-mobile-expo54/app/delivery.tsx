import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { apiGet } from '@/lib/api';
import { formatTaka } from '@/lib/catalog';
import { colors, radii } from '@/lib/theme';
import type { DeliveryOption } from './checkout';

export default function DeliveryScreen() {
  const [zones, setZones] = useState<DeliveryOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<DeliveryOption[]>('/checkout/delivery-options');
        if (Array.isArray(res)) setZones(res);
      } catch {
        // Fallback default zones
        setZones([
          {
            id: 'z1',
            name: 'Dhaka City Zone',
            districts: [
              { id: 'd1', name: 'Dhaka North' },
              { id: 'd2', name: 'Dhaka South' },
            ],
          },
          {
            id: 'z2',
            name: 'Outside Dhaka Zone',
            districts: [
              { id: 'd3', name: 'Chittagong' },
              { id: 'd4', name: 'Sylhet' },
              { id: 'd5', name: 'Rajshahi' },
              { id: 'd6', name: 'Khulna' },
            ],
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>SHIPPING & COVERAGE</Text>
        <Text style={styles.title}>Delivery Areas & Fees</Text>
        <Text style={styles.copy}>
          Ferio delivers across Bangladesh with transparent flat rates and white-glove handling for furniture & objects.
        </Text>

        <View style={styles.summaryGrid}>
          <View style={styles.feeCard}>
            <Text style={styles.feeTitle}>Dhaka City</Text>
            <Text style={styles.feeAmount}>{formatTaka(6000)}</Text>
            <Text style={styles.feeSub}>1 to 2 business days</Text>
          </View>
          <View style={styles.feeCard}>
            <Text style={styles.feeTitle}>Outside Dhaka</Text>
            <Text style={styles.feeAmount}>{formatTaka(12000)}</Text>
            <Text style={styles.feeSub}>3 to 5 business days</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.zoneList}>
            <Text style={styles.zoneListTitle}>Covered Delivery Districts</Text>
            {zones.map((z) => (
              <View key={z.id} style={styles.zoneCard}>
                <Text style={styles.zoneName}>{z.name}</Text>
                <View style={styles.districtChips}>
                  {z.districts.map((d) => (
                    <View key={d.id} style={styles.chip}>
                      <Text style={styles.chipText}>{d.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
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
  summaryGrid: { flexDirection: 'row', gap: 12, marginTop: 24 },
  feeCard: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 16, backgroundColor: '#fff' },
  feeTitle: { fontSize: 13, color: colors.ink2 },
  feeAmount: { marginTop: 6, fontSize: 22, fontWeight: '600', color: colors.ink },
  feeSub: { marginTop: 4, fontSize: 11, color: colors.ink2 },
  zoneList: { marginTop: 32 },
  zoneListTitle: { fontSize: 16, fontWeight: '600', color: colors.ink },
  zoneCard: { marginTop: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 16, backgroundColor: '#fff' },
  zoneName: { fontSize: 14, fontWeight: '600', color: colors.ink },
  districtChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface },
  chipText: { fontSize: 11, color: colors.ink2 },
});
