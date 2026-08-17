import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryDrawerModal } from '@/components/CategoryDrawerModal';
import { FerioHeader } from '@/components/FerioHeader';
import { ProductCard } from '@/components/ProductCard';
import { getCategories, getProducts } from '@/lib/catalog';
import { colors, radii } from '@/lib/theme';
import type { CatalogCategory, CatalogProduct } from '@/types/catalog';

export default function ProductsScreen() {
  const params = useLocalSearchParams<{ category?: string; sort?: string; sale?: string }>();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(params.category || '');
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = async (nextSearch = search, nextCategory = active) => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        getCategories(),
        getProducts({
          search: nextSearch,
          category: nextCategory,
          sort: params.sort || 'newest',
          sale: params.sale,
        }),
      ]);
      const catList = Array.isArray(c) ? c : (c as any)?.data || [];
      const prodList = Array.isArray(p?.items) ? p.items : (p as any)?.data?.items || (Array.isArray(p) ? p : []);
      setCategories(catList);
      setProducts(prodList);
    } catch {
      setCategories([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActive(params.category || '');
    void load('', params.category || '');
  }, [params.category, params.sort, params.sale]);

  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Shop all</Text>
            <Text style={styles.count}>{safeProducts.length} products</Text>
          </View>
          <Pressable onPress={() => setDrawerOpen(true)} style={styles.drawerBtn}>
            <Text style={styles.drawerBtnText}>☰ Categories</Text>
          </Pressable>
        </View>

        <View style={styles.filters}>
          <Text style={styles.label}>SEARCH</Text>
          <View style={styles.searchRow}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => load()}
              placeholder="Product, brand, category"
              placeholderTextColor="#9a9a9e"
              style={styles.input}
            />
            <Pressable onPress={() => load()} style={styles.apply}>
              <Text style={styles.applyText}>Apply</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Pressable onPress={() => { setActive(''); void load(search, ''); }} style={[styles.chip, !active && styles.chipActive]}>
            <Text style={[styles.chipText, !active && styles.chipTextActive]}>All</Text>
          </Pressable>
          {safeCategories.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => { setActive(c.slug); void load(search, c.slug); }}
              style={[styles.chip, active === c.slug && styles.chipActive]}
            >
              <Text style={[styles.chipText, active === c.slug && styles.chipTextActive]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            {safeProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </View>
        )}

        {!loading && !safeProducts.length ? (
          <View style={styles.no}>
            <Text style={styles.noTitle}>No matching products</Text>
            <Text style={styles.noCopy}>Clear a filter or try a broader search.</Text>
          </View>
        ) : null}
      </ScrollView>

      <CategoryDrawerModal visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  container: { padding: 18, paddingBottom: 70 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '600', letterSpacing: -0.7, color: colors.ink },
  count: { marginTop: 5, fontSize: 13, color: colors.ink2 },
  drawerBtn: { borderWidth: 1, borderColor: colors.ink, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  drawerBtnText: { fontSize: 12, fontWeight: '600', color: colors.ink },
  filters: { marginTop: 26, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 16 },
  label: { fontSize: 10, letterSpacing: 1.2, color: colors.ink2, fontWeight: '600' },
  searchRow: { marginTop: 8, flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, paddingHorizontal: 13, paddingVertical: 10, fontSize: 13, color: colors.ink },
  apply: { backgroundColor: colors.ink, borderRadius: radii.pill, paddingHorizontal: 18, justifyContent: 'center' },
  applyText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  chips: { gap: 8, paddingVertical: 22, borderBottomWidth: 1, borderBottomColor: colors.line, paddingRight: 18 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.pill, paddingHorizontal: 15, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.ink2, fontSize: 12 },
  chipTextActive: { color: '#fff' },
  grid: { marginTop: 28, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  no: { paddingVertical: 70, alignItems: 'center' },
  noTitle: { fontSize: 15, color: colors.ink },
  noCopy: { marginTop: 6, fontSize: 13, color: colors.ink2 },
});
