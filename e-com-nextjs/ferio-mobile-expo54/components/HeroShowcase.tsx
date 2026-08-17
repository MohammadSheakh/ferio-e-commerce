import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { apiGet } from '@/lib/api';
import { colors, radii } from '@/lib/theme';

export interface HeroSlide {
  id?: string;
  image: string;
  kicker: string;
  title: string;
  body: string;
  href?: string | object;
  ctaText?: string;
}

const defaultCards: HeroSlide[] = [
  {
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=85',
    kicker: 'CURATED FOR FERIO',
    title: 'Furniture and objects for a modern interior',
    body: 'Explore clean forms, practical pieces, and clear delivery options.',
    href: '/(tabs)/products',
    ctaText: 'Explore collection',
  },
  {
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=85',
    kicker: 'SELECTED DEALS',
    title: 'Up to 30% off selected pieces',
    body: 'Current pricing and availability are verified before checkout.',
    href: { pathname: '/(tabs)/products', params: { sale: 'true' } },
    ctaText: 'View deals',
  },
  {
    image: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1000&q=85',
    kicker: 'NEW ARRIVALS',
    title: 'New pieces, added regularly',
    body: 'Product-first discovery without decorative clutter.',
    href: { pathname: '/(tabs)/products', params: { sort: 'newest' } },
    ctaText: 'Shop new in',
  },
];

export function HeroShowcase() {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 36, 410);
  const [slides, setSlides] = useState<HeroSlide[]>(defaultCards);

  useEffect(() => {
    async function loadSlides() {
      try {
        const res = await apiGet<HeroSlide[]>('/hero-showcase');
        if (Array.isArray(res) && res.length > 0) {
          setSlides(res);
        }
      } catch {
        // Fallback to default cards if API endpoint is not populated
      }
    }
    void loadSlides();
  }, []);

  const safeSlides = Array.isArray(slides) && slides.length > 0 ? slides : defaultCards;

  return (
    <View style={styles.section}>
      <ScrollView
        horizontal
        pagingEnabled={false}
        snapToInterval={cardWidth + 10}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {safeSlides.map((card, index) => {
          const hrefTarget = card.href || '/(tabs)/products';
          return (
            <Link href={hrefTarget as any} key={card.id || index} asChild>
              <Pressable style={[styles.card, { width: cardWidth }]}>
                <ImageBackground source={{ uri: card.image }} style={styles.image} imageStyle={styles.imageRadius}>
                  <View style={styles.shade} />
                  <View style={styles.watermark}>
                    <Text style={styles.watermarkText}>
                      {index === 0 ? 'FERIO' : index === 1 ? 'SALE' : 'NEW'}
                    </Text>
                  </View>
                  <View style={styles.content}>
                    <Text style={styles.kicker}>{card.kicker}</Text>
                    <Text style={styles.title}>{card.title}</Text>
                    <Text style={styles.body}>{card.body}</Text>
                    <View style={styles.cta}>
                      <Text style={styles.ctaText}>{card.ctaText || 'Explore collection'}</Text>
                    </View>
                  </View>
                </ImageBackground>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: 10 },
  row: { gap: 10, paddingHorizontal: 18 },
  card: { height: 470, overflow: 'hidden', borderRadius: radii.card, backgroundColor: colors.surface },
  image: { flex: 1, justifyContent: 'flex-end' },
  imageRadius: { borderRadius: radii.card },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.20)' },
  watermark: { position: 'absolute', top: 14, left: 16, right: 16 },
  watermarkText: { color: 'rgba(255,255,255,0.58)', fontSize: 58, fontWeight: '700', letterSpacing: -3 },
  content: { padding: 22, paddingTop: 100 },
  kicker: { color: 'rgba(255,255,255,0.82)', fontSize: 10, fontWeight: '600', letterSpacing: 1.2 },
  title: { marginTop: 8, maxWidth: 320, color: '#fff', fontSize: 31, lineHeight: 34, fontWeight: '600', letterSpacing: -1.1 },
  body: { marginTop: 10, maxWidth: 300, color: 'rgba(255,255,255,0.86)', fontSize: 13, lineHeight: 19 },
  cta: { marginTop: 20, alignSelf: 'flex-start', borderRadius: radii.pill, backgroundColor: '#fff', paddingHorizontal: 17, paddingVertical: 10 },
  ctaText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
});
