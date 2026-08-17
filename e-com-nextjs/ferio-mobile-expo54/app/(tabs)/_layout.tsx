import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/lib/theme';
import { useCart } from '@/state/cart';

const Icon = ({ label, color }: { label: string; color: string }) => (
  <Text style={{ color, fontSize: 14, fontWeight: '700' }}>{label}</Text>
);

export default function TabLayout() {
  const { count } = useCart();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: '#949499',
        tabBarStyle: {
          borderTopColor: colors.line,
          backgroundColor: '#fff',
          height: 62,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Icon label="H" color={color} /> }}
      />
      <Tabs.Screen
        name="categories"
        options={{ title: 'Categories', tabBarIcon: ({ color }) => <Icon label="CAT" color={color} /> }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: 'Shop', tabBarIcon: ({ color }) => <Icon label="S" color={color} /> }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarBadge: count || undefined,
          tabBarIcon: ({ color }) => <Icon label="C" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Account', tabBarIcon: ({ color }) => <Icon label="A" color={color} /> }}
      />
    </Tabs>
  );
}
