import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { apiGet, apiPost } from '@/lib/api';
import { formatTaka } from '@/lib/catalog';
import { colors, radii } from '@/lib/theme';
import type { CatalogService } from './index';

export default function ServiceDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [service, setService] = useState<CatalogService | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Booking Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookedRef, setBookedRef] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await apiGet<CatalogService>(`/services/${slug}`);
        if (res) setService(res);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load this service.');
      } finally {
        setLoading(false);
      }
    }
    if (slug) void load();
  }, [slug]);

  async function handleBookService() {
    if (!name.trim() || !phone.trim() || !address.trim() || !date.trim()) {
      setError('Please fill in your name, phone, preferred date, and address.');
      return;
    }
    const preferredAt = new Date(date.trim());
    if (Number.isNaN(preferredAt.getTime())) {
      setError('Enter a valid date and time, for example 2026-08-25 14:30.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await apiPost<{ reference: string }>('/services/bookings/request', {
        serviceId: service?.id,
        customerName: name.trim(),
        phone: phone.trim(),
        preferredAt: preferredAt.toISOString(),
        address: address.trim(),
        customerNote: note.trim() || undefined,
      });
      setBookedRef(res.reference);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to request this service.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <FerioHeader />
        <ActivityIndicator style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={styles.safe}>
        <FerioHeader />
        <View style={styles.container}>
          <Text style={styles.title}>{loadError || 'Service not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {service.imageUrl ? <Image source={{ uri: service.imageUrl }} style={styles.hero} /> : null}

        <Text style={styles.cat}>{service.category?.name || 'SERVICE'}</Text>
        <Text style={styles.title}>{service.name}</Text>
        <Text style={styles.priceRow}>
          {formatTaka(service.price)} · {service.durationMinutes} minutes
        </Text>
        <Text style={styles.desc}>{service.description}</Text>

        <View style={styles.bookingBox}>
          {bookedRef ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Service Appointment Requested!</Text>
              <Text style={styles.successRef}>
                Booking Reference: <Text style={{ fontWeight: '700' }}>{bookedRef}</Text>
              </Text>
              <Text style={styles.successCopy}>
                Our team will call your phone ({phone}) to confirm time slot and specialist availability.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.bookingTitle}>Request an Appointment</Text>
              <Text style={styles.bookingSub}>
                Fill in your contact info. Ferio specialists will confirm scheduling over mobile.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Your full name *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                  placeholderTextColor="#9a9a9e"
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Mobile phone *</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="01XXXXXXXXX"
                  placeholderTextColor="#9a9a9e"
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Preferred date & time *</Text>
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="2026-08-25 14:30"
                  placeholderTextColor="#9a9a9e"
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Service location / address *</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  placeholder="Street, area & district"
                  placeholderTextColor="#9a9a9e"
                  style={[styles.input, { minHeight: 70 }]}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Special notes (optional)</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  multiline
                  placeholder="Room dimensions, custom requests, etc."
                  placeholderTextColor="#9a9a9e"
                  style={[styles.input, { minHeight: 70 }]}
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                disabled={submitting}
                onPress={handleBookService}
                style={[styles.bookBtn, submitting && { opacity: 0.5 }]}
              >
                <Text style={styles.bookBtnText}>
                  {submitting ? 'Submitting request…' : 'Submit appointment request'}
                </Text>
              </Pressable>
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
  hero: { width: '100%', height: 220, borderRadius: radii.card, backgroundColor: colors.surface, resizeMode: 'cover' },
  cat: { marginTop: 22, fontSize: 11, letterSpacing: 1.1, color: colors.ink2, textTransform: 'uppercase' },
  title: { marginTop: 4, fontSize: 28, fontWeight: '600', letterSpacing: -0.7, color: colors.ink },
  priceRow: { marginTop: 8, fontSize: 16, fontWeight: '600', color: colors.ink },
  desc: { marginTop: 12, fontSize: 14, lineHeight: 22, color: colors.ink2 },
  bookingBox: { marginTop: 30, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 18, backgroundColor: '#fff', gap: 14 },
  bookingTitle: { fontSize: 18, fontWeight: '600', color: colors.ink },
  bookingSub: { fontSize: 13, color: colors.ink2, lineHeight: 19 },
  field: { gap: 6 },
  label: { fontSize: 12, color: colors.ink2, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13, color: colors.ink, backgroundColor: '#fff' },
  bookBtn: { marginTop: 8, backgroundColor: colors.ink, borderRadius: radii.pill, paddingVertical: 13, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  errorText: { color: '#b91c1c', fontSize: 12 },
  successBox: { paddingVertical: 20, alignItems: 'center', gap: 10 },
  successTitle: { fontSize: 18, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  successRef: { fontSize: 14, color: colors.ink },
  successCopy: { fontSize: 13, color: colors.ink2, textAlign: 'center', lineHeight: 20 },
});
