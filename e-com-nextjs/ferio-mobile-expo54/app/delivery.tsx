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
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<DeliveryOption[]>('/checkout/delivery-options');
        if (Array.isArray(res)) setZones(res);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load delivery coverage.');
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

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.zoneList}>
            <Text style={styles.zoneListTitle}>Covered Delivery Districts</Text>
            {zones.map((z) => (
              <View key={z.id} style={styles.zoneCard}>
                <Text style={styles.zoneName}>{z.name}</Text>
                <Text style={styles.zoneFee}>
                  {typeof z.deliveryFee === 'number' ? formatTaka(z.deliveryFee) : 'Fee calculated at checkout'}
                </Text>
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
  errorText: { marginTop: 28, fontSize: 13, lineHeight: 20, color: '#b91c1c' },
  zoneList: { marginTop: 32 },
  zoneListTitle: { fontSize: 16, fontWeight: '600', color: colors.ink },
  zoneCard: { marginTop: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 16, backgroundColor: '#fff' },
  zoneName: { fontSize: 14, fontWeight: '600', color: colors.ink },
  zoneFee: { marginTop: 5, fontSize: 12, color: colors.ink2 },
  districtChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface },
  chipText: { fontSize: 11, color: colors.ink2 },
});
