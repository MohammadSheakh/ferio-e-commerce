import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { HeroShowcase } from '@/components/HeroShowcase';
import { CategoryRail } from '@/components/CategoryRail';
import { SectionHeader } from '@/components/SectionHeader';
import { ProductCard } from '@/components/ProductCard';
import { ProductRequestBanner } from '@/components/ProductRequestBanner';
import { FerioFooter } from '@/components/FerioFooter';
import { getCategories, getProducts } from '@/lib/catalog';
import { colors, radii } from '@/lib/theme';
import type { CatalogCategory, CatalogProduct } from '@/types/catalog';

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 32, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 24, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <View style={styles.countdownBox}>
      <Text style={styles.flashLabel}>ENDS IN</Text>
      <View style={styles.timerRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeNum}>{pad(timeLeft.hours)}</Text>
          <Text style={styles.timeLabel}>HRS</Text>
        </View>
        <Text style={styles.colon}>:</Text>
        <View style={styles.timeBlock}>
          <Text style={styles.timeNum}>{pad(timeLeft.minutes)}</Text>
          <Text style={styles.timeLabel}>MIN</Text>
        </View>
        <Text style={styles.colon}>:</Text>
        <View style={styles.timeBlock}>
          <Text style={styles.timeNum}>{pad(timeLeft.seconds)}</Text>
          <Text style={styles.timeLabel}>SEC</Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    return Promise.all([getCategories(), getProducts({ limit: 6 })])
      .then(([c, p]) => {
        const catList = Array.isArray(c) ? c : (c as any)?.data || [];
        const prodList = Array.isArray(p?.items) ? p.items : (p as any)?.data?.items || (Array.isArray(p) ? p : []);
        setCategories(catList);
        setProducts(prodList);
      })
      .catch(() => {
        setCategories([]);
        setProducts([]);
      });
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const dealProducts = safeProducts.slice(0, 4);

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink}
            colors={[colors.ink]}
          />
        }
      >
        <HeroShowcase />

        {/* Shop by category */}
        <View style={styles.section}>
          <SectionHeader title="Shop by category" href="/(tabs)/categories" />
          <View style={styles.rail}>
            <CategoryRail categories={safeCategories} />
          </View>
          {!safeCategories.length && !loading ? (
            <Text style={styles.empty}>Categories will appear after the catalog is published.</Text>
          ) : null}
        </View>

        {/* Featured products */}
        <View style={styles.section}>
          <SectionHeader title="Featured products" href="/(tabs)/products" />
          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <View style={styles.grid}>
              {safeProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </View>
          )}
          {!safeProducts.length && !loading ? (
            <Text style={styles.empty}>Products will appear after an administrator publishes them.</Text>
          ) : null}
        </View>

        {/* Flash sale section with interactive countdown */}
        <View style={[styles.section, styles.divided, styles.flashSection]}>
          <View style={styles.flashHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.flashEyebrow}>LIMITED TIME</Text>
              <Text style={styles.flashTitle}>Flash Sale</Text>
            </View>
            <CountdownTimer />
          </View>
          <View style={styles.grid}>
            {dealProducts.map((p) => (
              <ProductCard key={`flash-${p.id}`} product={p} />
            ))}
          </View>
        </View>

        <ProductRequestBanner />

        {/* Exclusive deals */}
        <View style={[styles.section, styles.divided]}>
          <SectionHeader title="Exclusive deals" href={{ pathname: '/(tabs)/products', params: { sale: 'true' } }} />
          <View style={styles.grid}>
            {dealProducts.map((p) => (
              <ProductCard key={`deal-${p.id}`} product={p} />
            ))}
          </View>
        </View>

        {/* Latest products */}
        <View style={[styles.section, styles.divided]}>
          <SectionHeader title="Latest products" href={{ pathname: '/(tabs)/products', params: { sort: 'newest' } }} />
          <View style={styles.grid}>
            {safeProducts.slice(0, 4).map((p) => (
              <ProductCard key={`latest-${p.id}`} product={p} />
            ))}
          </View>
        </View>

        {/* Best sellers */}
        <View style={[styles.section, styles.divided]}>
          <SectionHeader title="Best sellers" href="/(tabs)/products" />
          <View style={styles.grid}>
            {safeProducts.slice(0, 4).map((p) => (
              <ProductCard key={`best-${p.id}`} product={p} />
            ))}
          </View>
        </View>

        <FerioFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingBottom: 0 },
  section: { paddingHorizontal: 18, paddingTop: 42 },
  rail: { marginTop: 18 },
  grid: { marginTop: 22, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  loader: { marginTop: 30 },
  empty: { marginTop: 18, color: colors.ink2, fontSize: 13, lineHeight: 19 },
  divided: { marginTop: 4, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 34 },
  flashSection: { backgroundColor: '#fafafa', borderRadius: radii.card, paddingBottom: 24, marginHorizontal: 10 },
  flashHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  flashEyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.ink2, fontWeight: '600' },
  flashTitle: { marginTop: 4, fontSize: 26, fontWeight: '600', letterSpacing: -0.7, color: colors.ink },
  countdownBox: { alignItems: 'flex-end' },
  flashLabel: { fontSize: 9, letterSpacing: 1, color: colors.ink2, fontWeight: '700' },
  timerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  timeBlock: { backgroundColor: colors.ink, borderRadius: radii.pill, paddingHorizontal: 7, paddingVertical: 4, alignItems: 'center' },
  timeNum: { color: '#fff', fontSize: 12, fontWeight: '700' },
  timeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 7, fontWeight: '600' },
  colon: { fontSize: 14, fontWeight: '700', color: colors.ink },
});
