import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/lib/theme';

export function ProductRequestBanner() {
  return <View style={styles.wrap}><Text style={styles.eyebrow}>CAN'T FIND IT?</Text><Text style={styles.title}>Request a product.</Text><Text style={styles.copy}>Tell Ferio what you are looking for. Keep the request tied to your own customer account and support history.</Text><Link href='/support' asChild><Pressable style={styles.button}><Text style={styles.buttonText}>Contact support</Text></Pressable></Link></View>;
}
const styles = StyleSheet.create({ wrap: { marginHorizontal: 18, padding: 22, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }, eyebrow: { fontSize: 10, color: colors.ink2, letterSpacing: 1.2, fontWeight: '600' }, title: { marginTop: 7, color: colors.ink, fontSize: 24, fontWeight: '600', letterSpacing: -0.6 }, copy: { marginTop: 8, color: colors.ink2, fontSize: 13, lineHeight: 20, maxWidth: 430 }, button: { marginTop: 18, alignSelf: 'flex-start', backgroundColor: colors.ink, borderRadius: radii.pill, paddingHorizontal: 17, paddingVertical: 10 }, buttonText: { color: '#fff', fontSize: 12, fontWeight: '600' } });
