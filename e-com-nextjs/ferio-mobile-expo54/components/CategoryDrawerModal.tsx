import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCategoryTree, type CategoryNode } from '@/lib/categories';
import { colors, radii } from '@/lib/theme';

export function CategoryDrawerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { tree } = useCategoryTree();
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  function toggleExpand(id: string) {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSelectCategory(slug: string) {
    onClose();
    router.push({
      pathname: '/(tabs)/products',
      params: { category: slug },
    });
  }

  function renderNodes(nodes: CategoryNode[], level = 0) {
    return nodes.map((node) => {
      const hasChildren = node.children.length > 0;
      const isExpanded = !!expandedNodes[node.id];

      return (
        <View key={node.id} style={styles.nodeContainer}>
          <View style={[styles.nodeRow, { paddingLeft: level * 16 + 14 }]}>
            <Pressable
              onPress={() => handleSelectCategory(node.slug)}
              style={styles.nodeNameBtn}
            >
              <Text style={[styles.nodeName, level === 0 && styles.rootNodeName]}>
                {node.name}
              </Text>
            </Pressable>

            {hasChildren ? (
              <Pressable onPress={() => toggleExpand(node.id)} style={styles.expandBtn}>
                <Text style={styles.expandIcon}>{isExpanded ? '−' : '+'}</Text>
              </Pressable>
            ) : null}
          </View>

          {hasChildren && isExpanded ? (
            <View style={styles.childrenWrapper}>{renderNodes(node.children, level + 1)}</View>
          ) : null}
        </View>
      );
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>CATEGORIES DRAWER</Text>
            <Text style={styles.title}>Shop by Category</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderNodes(tree)}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.ink2, fontWeight: '600' },
  title: { marginTop: 2, fontSize: 22, fontWeight: '600', letterSpacing: -0.6, color: colors.ink },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 16, color: colors.ink, fontWeight: '600' },
  scrollContent: { paddingVertical: 10, paddingBottom: 60 },
  nodeContainer: { borderBottomWidth: 1, borderBottomColor: colors.line },
  nodeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16, paddingVertical: 12 },
  nodeNameBtn: { flex: 1 },
  nodeName: { fontSize: 14, color: colors.ink },
  rootNodeName: { fontWeight: '600', fontSize: 15 },
  expandBtn: { padding: 6, paddingHorizontal: 12 },
  expandIcon: { fontSize: 18, color: colors.ink2, fontWeight: '600' },
  childrenWrapper: { backgroundColor: colors.surface, paddingBottom: 4 },
});
