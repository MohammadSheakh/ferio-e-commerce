import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { colors, radii } from '@/lib/theme';

export default function PoliciesScreen() {
  const [activeTab, setActiveTab] = useState<'terms' | 'returns' | 'privacy'>('terms');

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>STORE POLICIES</Text>
        <Text style={styles.title}>Policies & Conditions</Text>
        <Text style={styles.copy}>
          Ferio operates with clear terms for ordering, verification, white-glove delivery, and returns.
        </Text>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setActiveTab('terms')}
            style={[styles.tab, activeTab === 'terms' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === 'terms' && styles.tabTextActive]}>Order Terms</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('returns')}
            style={[styles.tab, activeTab === 'returns' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === 'returns' && styles.tabTextActive]}>Returns & Refunds</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('privacy')}
            style={[styles.tab, activeTab === 'privacy' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === 'privacy' && styles.tabTextActive]}>Privacy Notice</Text>
          </Pressable>
        </View>

        <View style={styles.contentBox}>
          {activeTab === 'terms' ? (
            <>
              <Text style={styles.sectionHeading}>1. Order Revalidation & Pricing</Text>
              <Text style={styles.paragraph}>
                All prices and stock availability displayed on Ferio mobile are verified in real time before checkout.
                In the event of a stock discrepancy or price update, you will be notified prior to order fulfillment.
              </Text>

              <Text style={styles.sectionHeading}>2. Cash on Delivery (COD)</Text>
              <Text style={styles.paragraph}>
                Cash on delivery is available for covered districts in Bangladesh. Customers must inspect parcel contents upon
                delivery before completing payment to the courier representative.
              </Text>

              <Text style={styles.sectionHeading}>3. Idempotency & Order Recovery</Text>
              <Text style={styles.paragraph}>
                Mobile order submissions utilize cryptographic idempotency keys to ensure network retries never generate
                duplicate orders or accidental charges.
              </Text>
            </>
          ) : activeTab === 'returns' ? (
            <>
              <Text style={styles.sectionHeading}>1. 7-Day Inspection & Return Window</Text>
              <Text style={styles.paragraph}>
                Products with manufacturing defects or damage incurred during transit are eligible for return or exchange within
                7 days of delivery.
              </Text>

              <Text style={styles.sectionHeading}>2. Second-Hand & Refurbished Condition</Text>
              <Text style={styles.paragraph}>
                Second-hand items are inspected and graded prior to listing. Condition notes explicitly detail any aesthetic wear;
                returns for second-hand items are accepted for functional defects not mentioned in listing notes.
              </Text>

              <Text style={styles.sectionHeading}>3. Refund Processing</Text>
              <Text style={styles.paragraph}>
                Approved refunds are processed back to the original mobile banking or bank account within 3 to 5 business days.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.sectionHeading}>1. Personal Information Protection</Text>
              <Text style={styles.paragraph}>
                Ferio collects names, phone numbers, and delivery addresses solely for order fulfillment, courier routing, and tracking.
              </Text>

              <Text style={styles.sectionHeading}>2. Anonymized Activity Notice</Text>
              <Text style={styles.paragraph}>
                If marketing or activity consent is granted during checkout, recent purchases may display masked buyer initials
                and district names without exposing phone numbers or detailed street addresses.
              </Text>
            </>
          )}
        </View>
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
  tabs: { flexDirection: 'row', gap: 8, marginTop: 24, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 12 },
  tab: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8 },
  tabActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  tabText: { fontSize: 12, color: colors.ink2 },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  contentBox: { marginTop: 22, gap: 14 },
  sectionHeading: { fontSize: 16, fontWeight: '600', color: colors.ink, marginTop: 10 },
  paragraph: { fontSize: 13, lineHeight: 21, color: colors.ink2 },
});
