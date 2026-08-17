import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { apiGet } from '@/lib/api';
import { colors, radii } from '@/lib/theme';

export default function Support() {
  const [storeConfig, setStoreConfig] = useState<{ supportPhone?: string; supportEmail?: string }>({});

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await apiGet<{ supportPhone?: string; supportEmail?: string }>('/store/config');
        if (res) setStoreConfig(res);
      } catch {
        setStoreConfig({
          supportPhone: '+880 1712-345678',
          supportEmail: 'support@ferio.com.bd',
        });
      }
    }
    void loadConfig();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>SUPPORT & HELP</Text>
        <Text style={styles.title}>How can we help?</Text>
        <Text style={styles.copy}>
          Track an existing order first. For address, delivery, cancellation, or return questions, include your order reference when contacting support.
        </Text>

        <View style={styles.panel}>
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Track an order</Text>
            <Text style={styles.blockCopy}>Use the order reference and phone number entered during checkout.</Text>
            <Link href="/track" asChild>
              <Pressable style={styles.primary}>
                <Text style={styles.primaryText}>Track order</Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Contact support team</Text>
            <Text style={styles.blockCopy}>Direct support channels for order and white-glove assembly assistance.</Text>
            <Text style={styles.contact}>Phone: {storeConfig.supportPhone || '+880 1712-345678'}</Text>
            <Text style={styles.contact}>Email: {storeConfig.supportEmail || 'support@ferio.com.bd'}</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Services & Customization</Text>
            <Text style={styles.blockCopy}>Interior design planning, white-glove setup, and custom dimension crafting.</Text>
            <Link href="/services" asChild>
              <Pressable style={styles.outlineBtn}>
                <Text style={styles.outlineBtnText}>Browse services</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={styles.links}>
          <Link href="/delivery" asChild>
            <Pressable>
              <Text style={styles.link}>📍 Delivery areas and flat fees</Text>
            </Pressable>
          </Link>
          <Link href="/policies" asChild>
            <Pressable>
              <Text style={styles.link}>📜 Terms, privacy, and return policy</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  container: { padding: 18, paddingBottom: 70 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.ink2, fontWeight: '600' },
  title: { marginTop: 9, fontSize: 38, fontWeight: '600', letterSpacing: -1.1, color: colors.ink },
  copy: { marginTop: 12, fontSize: 15, lineHeight: 24, color: colors.ink2 },
  panel: { marginTop: 34, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 26, gap: 30 },
  blockTitle: { fontSize: 16, fontWeight: '500', color: colors.ink },
  blockCopy: { marginTop: 7, fontSize: 13, lineHeight: 20, color: colors.ink2 },
  primary: { marginTop: 16, alignSelf: 'flex-start', backgroundColor: colors.ink, borderRadius: radii.pill, paddingHorizontal: 18, paddingVertical: 10 },
  primaryText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  outlineBtn: { marginTop: 14, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.ink, borderRadius: radii.pill, paddingHorizontal: 18, paddingVertical: 9 },
  outlineBtnText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  block: {},
  contact: { marginTop: 8, fontSize: 13, color: colors.ink },
  links: { marginTop: 24, gap: 14 },
  link: { fontSize: 13, color: colors.ink2, textDecorationLine: 'underline' },
});
