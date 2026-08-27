import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/state/auth';
import { CartProvider } from '@/state/cart';
import LiveChatWidget from '@/components/LiveChatWidget';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <LiveChatWidget />
      </CartProvider>
    </AuthProvider>
  );
}
