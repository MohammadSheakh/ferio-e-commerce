import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FerioHeader } from '@/components/FerioHeader';
import { useCategoryTree, type CategoryNode } from '@/lib/categories';
import { colors, radii } from '@/lib/theme';

export default function CategoriesScreen() {
  const router = useRouter();
  const { tree, loading } = useCategoryTree();
  const [activeRootId, setActiveRootId] = useState<string | null>(null);

  const safeRootId = activeRootId || tree[0]?.id || null;

  const activeRootNode = useMemo(() => {
    return tree.find((n) => n.id === safeRootId) || tree[0] || null;
  }, [tree, safeRootId]);

  function handleNavigateCategory(slug: string) {
    router.push({
      pathname: '/(tabs)/products',
      params: { category: slug },
    });
  }

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
      <View style={styles.headerTitleBox}>
        <Text style={styles.eyebrow}>CATALOG NAVIGATION</Text>
        <Text style={styles.title}>All Categories</Text>
      </View>

      {/* Recommended Mobile Dual-Pane Navigation */}
      <View style={styles.dualPane}>
        {/* Left Column: Root Categories List */}
        <View style={styles.leftSidebar}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarContent}>
            {tree.map((node) => {
              const isActive = node.id === safeRootId;
              return (
                <Pressable
                  key={node.id}
                  onPress={() => setActiveRootId(node.id)}
                  style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                >
                  {isActive ? <View style={styles.activeBar} /> : null}
                  <Text style={[styles.sidebarText, isActive && styles.sidebarTextActive]}>
                    {node.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Right Column: Subcategories & Sub-subcategories Panel */}
        <View style={styles.rightPanel}>
          {activeRootNode ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.panelContent}>
              {/* Show All Main Category Link Banner */}
              <Pressable
                onPress={() => handleNavigateCategory(activeRootNode.slug)}
                style={styles.allBanner}
              >
                <View>
                  <Text style={styles.allBannerTitle}>Shop All {activeRootNode.name}</Text>
                  <Text style={styles.allBannerSub}>Browse full catalog collection →</Text>
                </View>
              </Pressable>

              {/* Subcategories (Level 2) */}
              {activeRootNode.children.length > 0 ? (
                <View style={styles.subGroup}>
                  {activeRootNode.children.map((subNode) => (
                    <View key={subNode.id} style={styles.subCard}>
                      <Pressable
                        onPress={() => handleNavigateCategory(subNode.slug)}
                        style={styles.subCardHeader}
                      >
                        <Text style={styles.subCardTitle}>{subNode.name}</Text>
                        <Text style={styles.subCardArrow}>→</Text>
                      </Pressable>

                      {/* Sub-subcategories Chips (Level 3) */}
                      {subNode.children.length > 0 ? (
                        <View style={styles.chipsRow}>
                          {subNode.children.map((subSubNode) => (
                            <Pressable
                              key={subSubNode.id}
                              onPress={() => handleNavigateCategory(subSubNode.slug)}
                              style={styles.chip}
                            >
                              <Text style={styles.chipText}>{subSubNode.name}</Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Explore items in {activeRootNode.name}</Text>
                  <Pressable
                    onPress={() => handleNavigateCategory(activeRootNode.slug)}
                    style={styles.exploreBtn}
                  >
                    <Text style={styles.exploreBtnText}>View Products</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  headerTitleBox: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  eyebrow: { fontSize: 9, letterSpacing: 1.2, color: colors.ink2, fontWeight: '700' },
  title: { marginTop: 4, fontSize: 24, fontWeight: '600', letterSpacing: -0.6, color: colors.ink },
  dualPane: { flex: 1, flexDirection: 'row' },
  leftSidebar: { width: 115, borderRightWidth: 1, borderRightColor: colors.line, backgroundColor: colors.surface },
  sidebarContent: { paddingVertical: 8 },
  sidebarItem: { position: 'relative', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f1f4' },
  sidebarItemActive: { backgroundColor: '#ffffff' },
  activeBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.ink },
  sidebarText: { fontSize: 12, color: colors.ink2, fontWeight: '500' },
  sidebarTextActive: { color: colors.ink, fontWeight: '700' },
  rightPanel: { flex: 1, backgroundColor: '#ffffff' },
  panelContent: { padding: 14, paddingBottom: 60, gap: 14 },
  allBanner: { borderWidth: 1, borderColor: colors.ink, borderRadius: radii.card, padding: 14, backgroundColor: colors.ink },
  allBannerTitle: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  allBannerSub: { marginTop: 4, fontSize: 11, color: '#d1d1d6' },
  subGroup: { gap: 12 },
  subCard: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 14, backgroundColor: '#ffffff' },
  subCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subCardTitle: { fontSize: 13, fontWeight: '600', color: colors.ink, flex: 1 },
  subCardArrow: { fontSize: 14, color: colors.ink2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.surface },
  chipText: { fontSize: 11, color: colors.ink2 },
  emptyState: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 13, color: colors.ink2 },
  exploreBtn: { backgroundColor: colors.ink, borderRadius: radii.pill, paddingHorizontal: 18, paddingVertical: 10 },
  exploreBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
});
