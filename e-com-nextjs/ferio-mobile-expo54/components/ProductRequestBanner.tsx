import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radii } from '@/lib/theme';
import { useAuth } from '@/state/auth';
import { apiPost } from '@/lib/api';

export function ProductRequestBanner() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<string[]>(['']);
  const [description, setDescription] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddProduct = () => {
    setProducts((prev) => [...prev, '']);
  };

  const handleRemoveProduct = (index: number) => {
    if (products.length <= 1) return;
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, value: string) => {
    setProducts((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSubmit = async () => {
    const validProducts = products.map((p) => p.trim()).filter(Boolean);
    if (validProducts.length === 0) {
      setErrorMsg('Please enter at least one product name.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    let formattedProductName =
      validProducts.length > 1
        ? validProducts.map((p, idx) => `${idx + 1}. ${p}`).join('\n')
        : validProducts[0];

    if (description.trim()) {
      formattedProductName += `\n\n[Additional Details]:\n${description.trim()}`;
    }

    try {
      await apiPost('/product-requests', {
        productName: formattedProductName,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setIsOpen(false);
        setProducts(['']);
        setDescription('');
      }, 2500);
    } catch {
      setErrorMsg('Failed to submit product request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <View style={styles.wrap}>
        <Text style={styles.eyebrow}>CAN'T FIND IT?</Text>
        <Text style={styles.title}>Request products.</Text>
        <Text style={styles.copy}>
          Tell Ferio what products or model specifications you are looking for.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setIsOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Submit a request →</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Sheet */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Request Products</Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {submitted ? (
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successTitle}>Request Received</Text>
                <Text style={styles.successText}>
                  We will contact you as soon as your requested items become available.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollView} contentContainerStyle={styles.form}>
                {errorMsg ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                ) : null}

                <Text style={styles.label}>PRODUCT NAME(S)</Text>
                {products.map((prod, idx) => (
                  <View key={idx} style={styles.productRow}>
                    <TextInput
                      style={styles.productInput}
                      placeholder={`Product #${idx + 1} Name`}
                      placeholderTextColor="#9CA3AF"
                      value={prod}
                      onChangeText={(val) => handleProductChange(idx, val)}
                    />
                    {products.length > 1 ? (
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleRemoveProduct(idx)}
                      >
                        <Text style={styles.removeBtnText}>✕</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleAddProduct}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addBtnText}>+ Add Another Product</Text>
                </TouchableOpacity>

                <Text style={styles.label}>ADDITIONAL DETAILS (OPTIONAL)</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholder="Provide specifications, brand preference, quantity..."
                  placeholderTextColor="#9CA3AF"
                  value={description}
                  onChangeText={setDescription}
                />

                <View style={styles.labelRow}>
                  <Text style={styles.label}>YOUR NAME</Text>
                  {user ? (
                    <Text style={styles.optionalBadge}>(Auto-filled)</Text>
                  ) : null}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={user ? 'Your Name' : 'Enter your full name'}
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                />

                <View style={styles.labelRow}>
                  <Text style={styles.label}>PHONE NUMBER</Text>
                  {user ? (
                    <Text style={styles.optionalBadge}>(Optional)</Text>
                  ) : null}
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  placeholder={user ? '01700000000 (Optional)' : '01700000000'}
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={setPhone}
                />

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setIsOpen(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      submitting && styles.submitBtnDisabled,
                    ]}
                    disabled={submitting}
                    onPress={handleSubmit}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitBtnText}>Submit Request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </div>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 18,
    padding: 22,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  eyebrow: {
    fontSize: 10,
    color: colors.ink2,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  title: {
    marginTop: 7,
    color: colors.ink,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  copy: {
    marginTop: 8,
    color: colors.ink2,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 430,
  },
  button: {
    marginTop: 18,
    alignSelf: 'flex-start',
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    paddingHorizontal: 17,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#18181B',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#374151',
  },
  form: {
    marginTop: 20,
    gap: 12,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionalBadge: {
    fontSize: 11,
    color: '#10B981',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#18181B',
    minHeight: 100,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: '#18181B',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelBtnText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#18181B',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  submitBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: '#18181B',
  },
  removeBtn: {
    width: 44,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
  },
  addBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  addBtnText: {
    color: '#18181B',
    fontSize: 12,
    fontWeight: '600',
  },
  successBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successIcon: {
    fontSize: 40,
    color: '#10B981',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#18181B',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
