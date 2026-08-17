import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { CatalogCategory } from '@/types/catalog';
import { colors, radii } from '@/lib/theme';

export function CategoryRail({ categories }: { categories: CatalogCategory[] }) {
  const safeCategories = Array.isArray(categories) ? categories : [];
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
    {safeCategories.map(category => <Link key={category.id} href={{ pathname: '/(tabs)/products', params: { category: category.slug } }} asChild>
      <Pressable style={styles.item}><Text style={styles.text}>{category.name}</Text></Pressable>
    </Link>)}
  </ScrollView>;
}
const styles = StyleSheet.create({ content: { gap: 8, paddingRight: 18 }, item: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.pill, paddingHorizontal: 15, paddingVertical: 8, backgroundColor: colors.paper }, text: { color: colors.ink2, fontSize: 12 } });
