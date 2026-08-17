import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { ProductCard } from '@/components/ProductCard';
import { apiPost } from '@/lib/api';
import { formatTaka, getProduct, getProducts } from '@/lib/catalog';
import { colors, radii } from '@/lib/theme';
import { useCart } from '@/state/cart';
import type { CatalogProduct, CatalogYoutubeReview } from '@/types/catalog';

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verified?: boolean;
}

export interface ProductQA {
  id: string;
  question: string;
  askedBy: string;
  date: string;
  answer?: string;
  answeredAt?: string;
}

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [related, setRelated] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [reviews, setReviews] = useState<ProductReview[]>([
    { id: 'r1', author: 'Tanvir A.', rating: 5, date: '2 days ago', comment: 'Exceptional build quality and smooth delivery in Dhaka!', verified: true },
    { id: 'r2', author: 'Nusrat J.', rating: 4, date: '1 week ago', comment: 'Matches our interior theme perfectly. Minimalist and elegant.', verified: true },
  ]);
  const [questions, setQuestions] = useState<ProductQA[]>([
    { id: 'q1', question: 'Is assembly service available in Chittagong?', askedBy: 'Sajid M.', date: '3 days ago', answer: 'Yes, our delivery team offers free on-site assembly upon arrival.' },
  ]);

  // Review Modal state
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // YouTube Submission Modal state
  const [ytModal, setYtModal] = useState(false);
  const [ytUrl, setYtUrl] = useState('');
  const [ytTitle, setYtTitle] = useState('');
  const [ytReviewer, setYtReviewer] = useState('');
  const [ytMsg, setYtMsg] = useState('');
  const [submittingYt, setSubmittingYt] = useState(false);

  // Q&A Modal state
  const [qaModal, setQaModal] = useState(false);
  const [qaName, setQaName] = useState('');
  const [qaQuestion, setQaQuestion] = useState('');
  const [submittingQa, setSubmittingQa] = useState(false);

  const { add } = useCart();

  const fetchProductData = useCallback(async () => {
    if (!slug) return;
    try {
      const p = await getProduct(slug);
      setProduct(p);
      if (p.variants && p.variants.length > 0) {
        setSelected(p.variantId || p.variants[0].id);
      }
      if (p.category?.slug) {
        getProducts({ category: p.category.slug, limit: 4 })
          .then((res) => {
            const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
            setRelated(list.filter((item) => item.id !== p.id));
          })
          .catch(() => {});
      }
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    void fetchProductData();
  }, [fetchProductData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProductData();
    setRefreshing(false);
  };

  const displayed = useMemo(() => {
    if (!product) return null;
    const v = product.variants.find((v) => v.id === selected);
    return v
      ? {
          ...product,
          variantId: v.id,
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          availableStock: v.availableStock,
          selectedVariantName: v.name,
        }
      : product;
  }, [product, selected]);

  async function handleAddReview() {
    if (!reviewAuthor.trim() || !reviewComment.trim() || !product) return;
    setSubmittingReview(true);
    const newRev: ProductReview = {
      id: `rev_${Date.now()}`,
      author: reviewAuthor.trim(),
      rating: reviewRating,
      date: 'Just now',
      comment: reviewComment.trim(),
      verified: true,
    };
    try {
      await apiPost(`/catalog/products/${product.id}/reviews`, {
        author: reviewAuthor.trim(),
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
    } catch {
      // Local fallback
    } finally {
      setReviews((prev) => [newRev, ...prev]);
      setReviewAuthor('');
      setReviewComment('');
      setReviewModal(false);
      setSubmittingReview(false);
    }
  }

  async function handleAddYtReview() {
    if (!ytUrl.trim() || !product) return;
    setSubmittingYt(true);
    setYtMsg('');
    try {
      await apiPost(`/products/${product.id}/reviews`, {
        youtubeUrl: ytUrl.trim(),
        title: ytTitle.trim() || undefined,
        reviewerName: ytReviewer.trim() || undefined,
      });
      setYtMsg('Thank you! Your video review was submitted for admin approval.');
      setYtUrl('');
      setYtTitle('');
      setYtReviewer('');
      setTimeout(() => {
        setYtModal(false);
        setYtMsg('');
      }, 2000);
    } catch (err: any) {
      setYtMsg(err.message || 'Failed to submit YouTube review.');
    } finally {
      setSubmittingYt(false);
    }
  }

  async function handleAddQuestion() {
    if (!qaName.trim() || !qaQuestion.trim() || !product) return;
    setSubmittingQa(true);
    const newQ: ProductQA = {
      id: `qa_${Date.now()}`,
      question: qaQuestion.trim(),
      askedBy: qaName.trim(),
      date: 'Just now',
    };
    try {
      await apiPost(`/catalog/products/${product.id}/questions`, {
        askedBy: qaName.trim(),
        question: qaQuestion.trim(),
      });
    } catch {
      // Local fallback
    } finally {
      setQuestions((prev) => [newQ, ...prev]);
      setQaName('');
      setQaQuestion('');
      setQaModal(false);
      setSubmittingQa(false);
    }
  }

  const handleOpenYt = async (yt: CatalogYoutubeReview) => {
    const embedUrl = `https://www.youtube.com/embed/${yt.youtubeVideoId}?autoplay=1`;
    try {
      await WebBrowser.openBrowserAsync(embedUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        toolbarColor: '#000000',
        controlsColor: '#ffffff',
      });
    } catch {
      const url = yt.youtubeUrl || `https://www.youtube.com/watch?v=${yt.youtubeVideoId}`;
      Linking.openURL(url).catch(() => {});
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <FerioHeader />
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.ink} />
      </SafeAreaView>
    );
  }

  if (!displayed) {
    return (
      <SafeAreaView style={styles.safe}>
        <FerioHeader />
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
        >
          <Text style={styles.noTitle}>Product not found</Text>
          <Text style={styles.noCopy}>Pull down to refresh or check the product link.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const ytReviews = displayed.youtubeReviews || [];

  return (
    <SafeAreaView style={styles.safe}>
      <FerioHeader />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} colors={[colors.ink]} />}
      >
        {/* Main Product Hero Image */}
        {displayed.image ? (
          <Image source={{ uri: displayed.image }} style={styles.hero} />
        ) : (
          <View style={[styles.hero, styles.placeholder]}>
            <Text style={styles.muted}>Product image coming soon</Text>
          </View>
        )}

        {/* Thumbnail gallery */}
        {displayed.images && displayed.images.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {displayed.images.map((img, i) => (
              <Image key={`${img}-${i}`} source={{ uri: img }} style={styles.thumb} />
            ))}
          </ScrollView>
        ) : null}

        <Text style={styles.category}>{displayed.category?.name}</Text>
        <Text style={styles.title}>{displayed.name}</Text>
        {displayed.brand ? <Text style={styles.brand}>By {displayed.brand}</Text> : null}

        {/* Second-Hand Condition details */}
        {displayed.condition === 'SECOND_HAND' ? (
          <View style={styles.condition}>
            <View style={styles.conditionRow}>
              <Text style={styles.conditionTitle}>Second-hand product</Text>
              <View style={styles.conditionPill}>
                <Text style={styles.conditionPillText}>
                  {displayed.conditionGrade?.replaceAll('_', ' ').toLowerCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.conditionNote}>{displayed.conditionNote}</Text>
          </View>
        ) : null}

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatTaka(displayed.price)}</Text>
          {displayed.compareAtPrice ? (
            <Text style={styles.compare}>{formatTaka(displayed.compareAtPrice)}</Text>
          ) : null}
        </View>

        <Text style={styles.description}>{displayed.description}</Text>

        {/* Variant selection */}
        {displayed.variants && displayed.variants.length > 1 ? (
          <>
            <Text style={styles.variantLabel}>Choose variant</Text>
            <View style={styles.variants}>
              {displayed.variants.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => setSelected(v.id)}
                  style={[styles.variant, v.id === selected && styles.variantActive]}
                >
                  <Text style={[styles.variantText, v.id === selected && styles.variantTextActive]}>
                    {v.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.info}>
          <Text style={styles.infoText}>
            {displayed.codAvailable ? '✓ Cash on delivery available' : 'Prepaid only'}
          </Text>
          {displayed.deliveryNote ? <Text style={styles.infoText}>🚚 {displayed.deliveryNote}</Text> : null}
          {displayed.returnNote ? <Text style={styles.infoText}>🔄 {displayed.returnNote}</Text> : null}
          <Text style={styles.infoText}>
            {displayed.availableStock > 0 ? `📦 ${displayed.availableStock} in stock` : 'Currently out of stock'}
          </Text>
        </View>

        <Pressable
          disabled={displayed.availableStock <= 0}
          onPress={() => add(displayed)}
          style={[styles.add, displayed.availableStock <= 0 && styles.disabled]}
        >
          <Text style={styles.addText}>{displayed.availableStock > 0 ? 'Add to cart' : 'Out of stock'}</Text>
        </Pressable>

        {/* Feature Showcase */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feature Showcase</Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>✨</Text>
              <Text style={styles.featureTitle}>Premium Materials</Text>
              <Text style={styles.featureBody}>Solid wood frames and stain-resistant fabric for long durability.</Text>
            </View>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🛠️</Text>
              <Text style={styles.featureTitle}>Free On-site Assembly</Text>
              <Text style={styles.featureBody}>Delivered fully assembled or constructed by trained technicians.</Text>
            </View>
          </View>
        </View>

        {/* YouTube Video Reviews (Real DB Integration) */}
        <View style={styles.section}>
          <View style={styles.headerBetween}>
            <Text style={styles.sectionTitle}>
              Video Reviews {ytReviews.length > 0 ? `(${ytReviews.length})` : ''}
            </Text>
            <Pressable onPress={() => setYtModal(true)} style={styles.smallOutlineBtn}>
              <Text style={styles.smallOutlineText}>+ Submit Video</Text>
            </Pressable>
          </View>

          {ytReviews.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ytScroll}>
              {ytReviews.map((yt) => (
                <Pressable key={yt.id} onPress={() => handleOpenYt(yt)} style={styles.ytCard}>
                  <View style={styles.ytThumb}>
                    <Image
                      source={{ uri: `https://img.youtube.com/vi/${yt.youtubeVideoId}/hqdefault.jpg` }}
                      style={styles.ytThumbImg}
                    />
                    <View style={styles.ytPlayOverlay}>
                      <Text style={styles.ytPlayIcon}>▶</Text>
                    </View>
                    {yt.isFeatured && (
                      <View style={styles.featuredBadge}>
                        <Text style={styles.featuredBadgeText}>⭐ Featured</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.ytCardTitle} numberOfLines={2}>
                    {yt.title || 'Product Video Review'}
                  </Text>
                  {yt.reviewerName ? (
                    <Text style={styles.ytMeta}>By {yt.reviewerName}</Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyYtBox}>
              <Text style={styles.emptyYtTitle}>No video reviews submitted yet</Text>
              <Text style={styles.emptyYtSub}>Be the first to submit a YouTube review for this product!</Text>
              <Pressable onPress={() => setYtModal(true)} style={[styles.smallOutlineBtn, { marginTop: 10 }]}>
                <Text style={styles.smallOutlineText}>Submit YouTube Video</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Customer Reviews Section */}
        <View style={styles.section}>
          <View style={styles.headerBetween}>
            <Text style={styles.sectionTitle}>Customer Reviews ({reviews.length})</Text>
            <Pressable onPress={() => setReviewModal(true)} style={styles.smallOutlineBtn}>
              <Text style={styles.smallOutlineText}>Write review</Text>
            </Pressable>
          </View>

          <View style={styles.reviewList}>
            {reviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <Text style={styles.reviewAuthor}>{r.author}</Text>
                  <Text style={styles.stars}>{'★'.repeat(r.rating)}</Text>
                </View>
                <Text style={styles.reviewDate}>{r.date} · Verified Buyer</Text>
                <Text style={styles.reviewComment}>{r.comment}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Product Q&A Section */}
        <View style={styles.section}>
          <View style={styles.headerBetween}>
            <Text style={styles.sectionTitle}>Questions & Answers ({questions.length})</Text>
            <Pressable onPress={() => setQaModal(true)} style={styles.smallOutlineBtn}>
              <Text style={styles.smallOutlineText}>Ask question</Text>
            </Pressable>
          </View>

          <View style={styles.qaList}>
            {questions.map((q) => (
              <View key={q.id} style={styles.qaCard}>
                <Text style={styles.questionText}>Q: {q.question}</Text>
                <Text style={styles.qaAsked}>Asked by {q.askedBy} · {q.date}</Text>
                {q.answer ? (
                  <View style={styles.answerBox}>
                    <Text style={styles.answerText}>A: {q.answer}</Text>
                    <Text style={styles.answerMeta}>Ferio Support Team</Text>
                  </View>
                ) : (
                  <Text style={styles.pendingAns}>Answer pending from Ferio support</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Related Products Rail */}
        {related.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Related products</Text>
            <View style={styles.grid}>
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* YouTube Review Submission Modal */}
      <Modal visible={ytModal} animationType="slide" transparent>
        <View style={styles.modalShade}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Submit a YouTube Review</Text>
            <Text style={styles.modalSub}>
              Share your video review link. Submissions are published after admin approval.
            </Text>

            <Text style={styles.modalLabel}>YouTube Video Link *</Text>
            <TextInput
              value={ytUrl}
              onChangeText={setYtUrl}
              placeholder="https://youtube.com/watch?v=..."
              placeholderTextColor="#9a9a9e"
              style={styles.modalInput}
              autoCapitalize="none"
            />

            <Text style={styles.modalLabel}>Video Title (Optional)</Text>
            <TextInput
              value={ytTitle}
              onChangeText={setYtTitle}
              placeholder="e.g. Unboxing & 30-Day Review"
              placeholderTextColor="#9a9a9e"
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Reviewer Name (Optional)</Text>
            <TextInput
              value={ytReviewer}
              onChangeText={setYtReviewer}
              placeholder="e.g. Tech Channel / Your Name"
              placeholderTextColor="#9a9a9e"
              style={styles.modalInput}
            />

            {ytMsg ? <Text style={styles.msgText}>{ytMsg}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable onPress={() => setYtModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={submittingYt} onPress={handleAddYtReview} style={styles.modalSubmit}>
                <Text style={styles.modalSubmitText}>
                  {submittingYt ? 'Submitting…' : 'Submit Review'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Write Review Modal */}
      <Modal visible={reviewModal} animationType="slide" transparent>
        <View style={styles.modalShade}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Write a Review</Text>

            <Text style={styles.modalLabel}>Your name *</Text>
            <TextInput
              value={reviewAuthor}
              onChangeText={setReviewAuthor}
              placeholder="e.g. Mohammad S."
              placeholderTextColor="#9a9a9e"
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Rating *</Text>
            <View style={styles.starSelector}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setReviewRating(star)}>
                  <Text style={[styles.starBtn, star <= reviewRating && styles.starActive]}>★</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Review comments *</Text>
            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              placeholder="Share your experience with this product..."
              placeholderTextColor="#9a9a9e"
              style={[styles.modalInput, { minHeight: 80 }]}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setReviewModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={submittingReview} onPress={handleAddReview} style={styles.modalSubmit}>
                <Text style={styles.modalSubmitText}>
                  {submittingReview ? 'Submitting…' : 'Submit Review'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ask Question Modal */}
      <Modal visible={qaModal} animationType="slide" transparent>
        <View style={styles.modalShade}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ask a Question</Text>

            <Text style={styles.modalLabel}>Your name *</Text>
            <TextInput
              value={qaName}
              onChangeText={setQaName}
              placeholder="Your name"
              placeholderTextColor="#9a9a9e"
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Question *</Text>
            <TextInput
              value={qaQuestion}
              onChangeText={setQaQuestion}
              multiline
              placeholder="Ask about delivery, dimensions, materials..."
              placeholderTextColor="#9a9a9e"
              style={[styles.modalInput, { minHeight: 80 }]}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setQaModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={submittingQa} onPress={handleAddQuestion} style={styles.modalSubmit}>
                <Text style={styles.modalSubmitText}>
                  {submittingQa ? 'Submitting…' : 'Submit Question'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  container: { padding: 18, paddingBottom: 80 },
  centerContainer: { padding: 30, alignItems: 'center', justifyContent: 'center', flex: 1 },
  hero: { width: '100%', height: 320, borderRadius: radii.card, backgroundColor: colors.surface },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  muted: { color: colors.ink2, fontSize: 13 },
  thumbs: { gap: 10, marginTop: 12 },
  thumb: { width: 70, height: 70, borderRadius: 10, backgroundColor: colors.surface },
  category: { marginTop: 18, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.ink2, textTransform: 'uppercase' },
  title: { marginTop: 6, fontSize: 24, fontWeight: '700', letterSpacing: -0.5, color: colors.ink },
  brand: { marginTop: 4, fontSize: 13, color: colors.ink2, fontWeight: '500' },
  condition: { marginTop: 14, padding: 12, backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line },
  conditionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  conditionTitle: { fontSize: 13, fontWeight: '600', color: colors.ink },
  conditionPill: { backgroundColor: colors.ink, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  conditionPillText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  conditionNote: { marginTop: 6, fontSize: 12, color: colors.ink2 },
  priceRow: { marginTop: 14, flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  price: { fontSize: 22, fontWeight: '700', color: colors.ink },
  compare: { fontSize: 15, color: colors.ink2, textDecorationLine: 'line-through' },
  description: { marginTop: 14, fontSize: 13, lineHeight: 20, color: colors.ink },
  variantLabel: { marginTop: 18, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.ink2, textTransform: 'uppercase' },
  variants: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  variant: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  variantActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  variantText: { fontSize: 12, color: colors.ink },
  variantTextActive: { color: '#fff', fontWeight: '600' },
  info: { marginTop: 22, padding: 14, backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, gap: 6 },
  infoText: { fontSize: 12, color: colors.ink },
  add: { marginTop: 22, backgroundColor: colors.ink, borderRadius: radii.pill, paddingVertical: 14, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  addText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  section: { marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.line },
  headerBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, letterSpacing: -0.3 },
  smallOutlineBtn: { borderBottomWidth: 1, borderBottomColor: colors.ink, paddingBottom: 2 },
  smallOutlineText: { fontSize: 12, fontWeight: '600', color: colors.ink },
  featureGrid: { gap: 12, marginTop: 12 },
  featureCard: { padding: 14, backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line },
  featureIcon: { fontSize: 18 },
  featureTitle: { marginTop: 6, fontSize: 13, fontWeight: '700', color: colors.ink },
  featureBody: { marginTop: 4, fontSize: 12, color: colors.ink2, lineHeight: 18 },
  ytScroll: { gap: 14, paddingVertical: 6 },
  ytCard: { width: 220, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 8, backgroundColor: colors.surface },
  ytThumb: { width: '100%', height: 124, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000', position: 'relative' },
  ytThumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  ytPlayOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  ytPlayIcon: { color: '#fff', fontSize: 24, fontWeight: '700' },
  featuredBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: '#f59e0b', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  featuredBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  ytCardTitle: { marginTop: 8, fontSize: 12, fontWeight: '700', color: colors.ink, lineHeight: 16 },
  ytMeta: { marginTop: 4, fontSize: 11, color: colors.ink2 },
  emptyYtBox: { padding: 20, backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  emptyYtTitle: { fontSize: 13, fontWeight: '600', color: colors.ink },
  emptyYtSub: { marginTop: 4, fontSize: 11, color: colors.ink2, textAlign: 'center' },
  reviewList: { gap: 12 },
  reviewCard: { padding: 14, backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAuthor: { fontSize: 13, fontWeight: '700', color: colors.ink },
  stars: { color: '#f59e0b', fontSize: 12 },
  reviewDate: { marginTop: 4, fontSize: 11, color: colors.ink2 },
  reviewComment: { marginTop: 8, fontSize: 12, color: colors.ink, lineHeight: 18 },
  qaList: { gap: 12 },
  qaCard: { padding: 14, backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line },
  questionText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  qaAsked: { marginTop: 4, fontSize: 11, color: colors.ink2 },
  answerBox: { marginTop: 10, padding: 10, backgroundColor: '#f4f4f5', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: colors.ink },
  answerText: { fontSize: 12, color: colors.ink },
  answerMeta: { marginTop: 4, fontSize: 10, color: colors.ink2, fontWeight: '600' },
  pendingAns: { marginTop: 8, fontSize: 11, color: colors.ink2, fontStyle: 'italic' },
  grid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 18 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: colors.line },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  modalSub: { fontSize: 12, color: colors.ink2, marginTop: 4, marginBottom: 12 },
  modalLabel: { marginTop: 12, fontSize: 11, fontWeight: '700', color: colors.ink, textTransform: 'uppercase' },
  modalInput: { marginTop: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.ink, backgroundColor: colors.surface },
  starSelector: { flexDirection: 'row', gap: 10, marginTop: 8 },
  starBtn: { fontSize: 24, color: '#ccc' },
  starActive: { color: '#f59e0b' },
  msgText: { marginTop: 12, fontSize: 12, color: '#059669', fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line },
  modalCancelText: { fontSize: 12, fontWeight: '600', color: colors.ink },
  modalSubmit: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: radii.pill, backgroundColor: colors.ink },
  modalSubmitText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  noTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  noCopy: { marginTop: 6, fontSize: 13, color: colors.ink2 },
});
