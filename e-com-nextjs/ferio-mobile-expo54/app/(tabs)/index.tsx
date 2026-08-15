import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FerioHeader } from '@/components/FerioHeader';
import { HeroShowcase } from '@/components/HeroShowcase';
import { CategoryRail } from '@/components/CategoryRail';
import { SectionHeader } from '@/components/SectionHeader';
import { ProductCard } from '@/components/ProductCard';
import { ProductRequestBanner } from '@/components/ProductRequestBanner';
import { FerioFooter } from '@/components/FerioFooter';
import { getCategories, getProducts } from '@/lib/catalog';
import { colors } from '@/lib/theme';
import type { CatalogCategory, CatalogProduct } from '@/types/catalog';

export default function HomeScreen() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([getCategories(), getProducts({ limit: 4 })]).then(([c,p]) => { setCategories(c); setProducts(p.items); }).catch(() => {}).finally(() => setLoading(false)); }, []);
  return <SafeAreaView style={styles.safe}><FerioHeader /><ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
    <HeroShowcase />
    <View style={styles.section}><SectionHeader title='Shop by category' href='/(tabs)/products' /><View style={styles.rail}><CategoryRail categories={categories} /></View>{!categories.length && !loading ? <Text style={styles.empty}>Categories will appear after the catalog is published.</Text> : null}</View>
    <View style={styles.section}><SectionHeader title='Featured products' href='/(tabs)/products' />{loading ? <ActivityIndicator style={styles.loader} /> : <View style={styles.grid}>{products.map(p => <ProductCard key={p.id} product={p} />)}</View>}{!products.length && !loading ? <Text style={styles.empty}>Products will appear after an administrator publishes them.</Text> : null}</View>
    <ProductRequestBanner />
    <View style={[styles.section, styles.divided]}><SectionHeader title='Exclusive deals' href={{ pathname: '/(tabs)/products', params: { sale: 'true' } }} /><View style={styles.grid}>{products.map(p => <ProductCard key={`deal-${p.id}`} product={p} />)}</View></View>
    <View style={[styles.section, styles.divided]}><SectionHeader title='Latest products' href={{ pathname: '/(tabs)/products', params: { sort: 'newest' } }} /><Text style={styles.empty}>Freshly published products appear here.</Text></View>
    <View style={[styles.section, styles.divided]}><SectionHeader title='Best sellers' href='/(tabs)/products' /><Text style={styles.empty}>Best sellers will appear when enough verified order data exists.</Text></View>
    <View style={[styles.section, styles.divided]}><SectionHeader title='Flash sale' href={{ pathname: '/(tabs)/products', params: { sale: 'true' } }} /><View style={styles.grid}>{products.map(p => <ProductCard key={`flash-${p.id}`} product={p} />)}</View></View>
    <FerioFooter />
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:colors.paper}, scroll:{paddingBottom:0}, section:{paddingHorizontal:18,paddingTop:42}, rail:{marginTop:18}, grid:{marginTop:22,flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'}, loader:{marginTop:30}, empty:{marginTop:18,color:colors.ink2,fontSize:13,lineHeight:19}, divided:{marginTop:4,borderTopWidth:1,borderTopColor:colors.line,paddingTop:34} });
