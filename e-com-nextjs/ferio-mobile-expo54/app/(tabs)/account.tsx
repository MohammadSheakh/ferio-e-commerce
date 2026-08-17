import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { colors, radii } from '@/lib/theme';
import { useAuth } from '@/state/auth';

export default function AccountScreen() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <FerioHeader />
        <ActivityIndicator style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>ACCOUNT</Text>
        <Text style={styles.title}>Your Ferio account</Text>
        <Text style={styles.copy}>
          The native account area follows the same restrained product UI as the web storefront, fully connected to NestJS authentication endpoints.
        </Text>

        {user ? (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{user.name ? user.name.slice(0, 2).toUpperCase() : 'FE'}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>VERIFIED CUSTOMER</Text>
                </View>
              </View>
            </View>

            <View style={styles.list}>
              <Link href="/account/orders" asChild>
                <Pressable style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Your orders</Text>
                    <Text style={styles.rowCopy}>View verified purchase history and status updates.</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </Pressable>
              </Link>

              <Link href="/track" asChild>
                <Pressable style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Track shipment</Text>
                    <Text style={styles.rowCopy}>Check live progress and courier tracking for active parcels.</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </Pressable>
              </Link>

              <Link href="/services" asChild>
                <Pressable style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Services & Customization</Text>
                    <Text style={styles.rowCopy}>Book interior consultation or custom crafting.</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </Pressable>
              </Link>

              <Link href="/support" asChild>
                <Pressable style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Support & Policies</Text>
                    <Text style={styles.rowCopy}>Get help with delivery, cancellation, and returns.</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </Pressable>
              </Link>
            </View>

            <Pressable onPress={() => void signOut()} style={styles.signOutBtn}>
              <Text style={styles.signOutText}>Sign out from this device</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.signinCard}>
              <Text style={styles.signinTitle}>Sign in or create account</Text>
              <Text style={styles.signinCopy}>
                Sign in to view past order history, write product reviews, and request service appointments.
              </Text>
              <View style={styles.authBtnRow}>
                <Link href="/account/login" asChild>
                  <Pressable style={styles.primaryBtn}>
                    <Text style={styles.primaryText}>Sign in</Text>
                  </Pressable>
                </Link>

                <Link href="/account/register" asChild>
                  <Pressable style={styles.outlineBtn}>
                    <Text style={styles.outlineText}>Create account</Text>
                  </Pressable>
                </Link>
              </View>
            </View>

            <View style={styles.list}>
              <Link href="/track" asChild>
                <Pressable style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Track order by reference</Text>
                    <Text style={styles.rowCopy}>Look up delivery progress without signing in.</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </Pressable>
              </Link>

              <Link href="/services" asChild>
                <Pressable style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Services & Customization</Text>
                    <Text style={styles.rowCopy}>Book interior consultation or white-glove setup.</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </Pressable>
              </Link>

              <Link href="/support" asChild>
                <Pressable style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Help & Customer Support</Text>
                    <Text style={styles.rowCopy}>Delivery questions, store policies, and contact channels.</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </Pressable>
              </Link>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  container: { padding: 18, paddingBottom: 70 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.ink2, fontWeight: '600' },
  title: { marginTop: 8, fontSize: 30, fontWeight: '600', letterSpacing: -0.8, color: colors.ink },
  copy: { marginTop: 10, fontSize: 13, lineHeight: 20, color: colors.ink2 },
  profileCard: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 18, backgroundColor: '#fff' },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontSize: 16, fontWeight: '700' },
  profileInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '600', color: colors.ink },
  userEmail: { marginTop: 2, fontSize: 12, color: colors.ink2 },
  verifiedBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, color: colors.ink2 },
  list: { marginTop: 28, borderTopWidth: 1, borderTopColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '500', color: colors.ink },
  rowCopy: { marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.ink2 },
  arrow: { fontSize: 16, color: colors.ink2 },
  signOutBtn: { marginTop: 32, borderWidth: 1, borderColor: colors.line, borderRadius: radii.pill, paddingVertical: 13, alignItems: 'center' },
  signOutText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  signinCard: { marginTop: 24, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 20, backgroundColor: '#fff' },
  signinTitle: { fontSize: 18, fontWeight: '600', color: colors.ink },
  signinCopy: { marginTop: 6, fontSize: 13, lineHeight: 20, color: colors.ink2 },
  authBtnRow: { marginTop: 18, flexDirection: 'row', gap: 10 },
  primaryBtn: { flex: 1, backgroundColor: colors.ink, borderRadius: radii.pill, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  outlineBtn: { flex: 1, borderWidth: 1, borderColor: colors.ink, borderRadius: radii.pill, paddingVertical: 12, alignItems: 'center' },
  outlineText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
});
