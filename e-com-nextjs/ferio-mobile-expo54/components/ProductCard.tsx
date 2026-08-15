import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatTaka } from '@/lib/catalog';
import type { CatalogProduct } from '@/types/catalog';
import { colors, radii } from '@/lib/theme';

export function ProductCard({ product }: { product: CatalogProduct }) {
  const outOfStock = product.availableStock === 0;
  const discount = product.compareAtPrice ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : null;
  return <Link href={{ pathname: '/products/[slug]', params: { slug: product.slug } }} asChild>
    <Pressable style={styles.card}>
      <View style={styles.imageWrap}>
        {product.image ? <Image source={{ uri: product.image }} style={[styles.image, outOfStock && styles.outImage]} /> : <Text style={styles.placeholder}>Product image coming soon</Text>}
        {discount && !outOfStock ? <View style={styles.darkBadge}><Text style={styles.darkBadgeText}>−{discount}%</Text></View> : null}
        {outOfStock ? <View style={styles.lightBadge}><Text style={styles.lightBadgeText}>Out of stock</Text></View> : null}
        {product.condition === 'SECOND_HAND' && !outOfStock ? <View style={styles.conditionBadge}><Text style={styles.conditionText}>Second-hand</Text></View> : null}
      </View>
      <Text numberOfLines={1} style={styles.category}>{product.category?.name}</Text>
      <Text numberOfLines={2} style={styles.name}>{product.name}</Text>
      <View style={styles.priceRow}><Text style={styles.price}>{formatTaka(product.price)}</Text>{product.compareAtPrice ? <Text style={styles.compare}>{formatTaka(product.compareAtPrice)}</Text> : null}</View>
    </Pressable>
  </Link>;
}

const styles = StyleSheet.create({
  card: { width: '48%', marginBottom: 30 },
  imageWrap: { position: 'relative', aspectRatio: 0.8, borderRadius: radii.card, backgroundColor: colors.surface, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' }, outImage: { opacity: 0.5 }, placeholder: { paddingHorizontal: 12, textAlign: 'center', color: colors.ink2, fontSize: 11 },
  darkBadge: { position: 'absolute', left: 10, top: 10, borderRadius: radii.pill, backgroundColor: colors.ink, paddingHorizontal: 9, paddingVertical: 5 }, darkBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  lightBadge: { position: 'absolute', left: 10, top: 10, borderRadius: radii.pill, backgroundColor: '#fff', paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: colors.line }, lightBadgeText: { color: colors.ink2, fontSize: 10, fontWeight: '600' },
  conditionBadge: { position: 'absolute', left: 10, bottom: 10, borderRadius: radii.pill, backgroundColor: '#fff', paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: colors.line }, conditionText: { color: colors.ink, fontSize: 10, fontWeight: '600' },
  category: { color: colors.ink2, fontSize: 12, marginTop: 11 }, name: { color: colors.ink, fontSize: 14, fontWeight: '500', marginTop: 2, lineHeight: 19, minHeight: 38 },
  priceRow: { flexDirection: 'row', gap: 8, alignItems: 'baseline', marginTop: 4, flexWrap: 'wrap' }, price: { color: colors.ink, fontSize: 14, fontWeight: '600' }, compare: { color: colors.ink2, textDecorationLine: 'line-through', fontSize: 12 },
});
