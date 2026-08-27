import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';
import { useCart } from '@/state/cart';

export function FerioHeader({ title = 'ferio' }: { title?: string }) {
  const { count } = useCart();
  return (
    <View style={styles.wrap}>
      <Link href='/(tabs)' asChild><Pressable hitSlop={8}><Text style={styles.brand}>{title}</Text></Pressable></Link>
      <View style={styles.actions}>
        <Link href='/track' asChild><Pressable hitSlop={8}><Text style={styles.action}>Track</Text></Pressable></Link>
        <Link href='/support' asChild><Pressable hitSlop={8}><Text style={styles.action}>Support</Text></Pressable></Link>
        <Link href='/(tabs)/cart' asChild><Pressable hitSlop={8} style={styles.cart}><Text style={styles.cartIcon}>⌑</Text><Text style={styles.action}>Cart{count ? ` (${count})` : ''}</Text></Pressable></Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minHeight: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.97)', borderBottomWidth: 1, borderBottomColor: colors.line },
  brand: { color: colors.ink, fontSize: 19, fontWeight: '600', letterSpacing: -0.4, textTransform: 'lowercase' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  action: { color: colors.ink2, fontSize: 12 },
  cart: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cartIcon: { color: colors.ink, fontSize: 16 },
});
