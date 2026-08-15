import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CartProvider } from '@/state/cart';
export default function RootLayout(){return <CartProvider><StatusBar style='dark'/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:'#fff'}}}><Stack.Screen name='(tabs)'/><Stack.Screen name='products/[slug]'/><Stack.Screen name='checkout'/><Stack.Screen name='order-confirmation'/><Stack.Screen name='track'/><Stack.Screen name='support'/></Stack></CartProvider>}
