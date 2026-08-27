import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { apiGet } from '@/lib/api';
import { formatTaka } from '@/lib/catalog';
import { colors, radii } from '@/lib/theme';

export interface CatalogService {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  imageUrl?: string;
  category: { name: string };
}

export default function ServicesScreen() {
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<CatalogService[]>('/services');
        setServices(Array.isArray(res) ? res : []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load services.');
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
        <Text style={styles.eyebrow}>BOOK A SERVICE</Text>
        <Text style={styles.title}>Services</Text>
        <Text style={styles.copy}>
          Elevate your space with Ferio's white-glove assembly, interior design consultation, and custom crafting.
        </Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.stateText}>{error}</Text>
        ) : services.length === 0 ? (
          <Text style={styles.stateText}>No services are available right now.</Text>
        ) : (
          <View style={styles.list}>
            {services.map((s) => (
              <Link key={s.id} href={`/services/${s.slug}` as any} asChild>
                <Pressable style={styles.card}>
                  {s.imageUrl ? <Image source={{ uri: s.imageUrl }} style={styles.image} /> : null}
                  <View style={styles.content}>
                    <Text style={styles.cat}>{s.category?.name || 'Service'}</Text>
                    <Text style={styles.name}>{s.name}</Text>

                    <Text style={styles.desc}>{s.description}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.price}>{formatTaka(s.price)}</Text>
                      <Text style={styles.duration}>⏱ {s.durationMinutes} min</Text>
                    </View>
                  </View>
                </Pressable>
              </Link>
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
  list: { marginTop: 26, gap: 18 },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, overflow: 'hidden', backgroundColor: '#fff' },
  image: { width: '100%', height: 160, backgroundColor: colors.surface, resizeMode: 'cover' },
  content: { padding: 16 },
  cat: { fontSize: 10, letterSpacing: 1, color: colors.ink2, textTransform: 'uppercase' },
  name: { marginTop: 4, fontSize: 18, fontWeight: '600', color: colors.ink },
  desc: { marginTop: 6, fontSize: 13, color: colors.ink2, lineHeight: 19 },
  metaRow: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 15, fontWeight: '600', color: colors.ink },
  duration: { fontSize: 12, color: colors.ink2 },
  stateText: { marginTop: 30, fontSize: 13, lineHeight: 20, color: colors.ink2 },
});
