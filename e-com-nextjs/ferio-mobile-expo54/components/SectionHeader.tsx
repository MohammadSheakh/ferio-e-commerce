import { Link, Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

export function SectionHeader({ title, href, label = 'View all →' }: { title: string; href?: Href; label?: string }) {
  return <View style={styles.row}><Text style={styles.title}>{title}</Text>{href ? <Link href={href}><Text style={styles.link}>{label}</Text></Link> : null}</View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }, title: { color: colors.ink, fontSize: 22, fontWeight: '600', letterSpacing: -0.45 }, link: { color: colors.ink2, fontSize: 13 } });
