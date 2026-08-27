import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiRequest } from '@/lib/api';

const CART_TOKEN_KEY = 'ferio_mobile_cart_token_v1';

type CheckoutCartItem = {
  variantId: string;
  quantity: number;
};

type ServerCart = {
  cartToken?: string;
};

async function saveCartToken(token: string) {
  if (Platform.OS === 'web') await AsyncStorage.setItem(CART_TOKEN_KEY, token);
  else await SecureStore.setItemAsync(CART_TOKEN_KEY, token);
}

export async function clearServerCartToken() {
  if (Platform.OS === 'web') await AsyncStorage.removeItem(CART_TOKEN_KEY);
  else await SecureStore.deleteItemAsync(CART_TOKEN_KEY);
}

export async function syncCheckoutCart(items: CheckoutCartItem[]) {
  if (items.length === 0) throw new Error('Your cart is empty.');
  await clearServerCartToken();

  let cartToken = '';
  for (const item of items) {
    const cart = await apiRequest<ServerCart>('/cart/items', {
      method: 'POST',
      body: { variantId: item.variantId, quantity: item.quantity },
      headers: cartToken ? { 'x-cart-token': cartToken } : undefined,
    });
    if (!cart.cartToken) throw new Error('The server did not return a valid cart session.');
    cartToken = cart.cartToken;
  }

  await saveCartToken(cartToken);
  return cartToken;
}
