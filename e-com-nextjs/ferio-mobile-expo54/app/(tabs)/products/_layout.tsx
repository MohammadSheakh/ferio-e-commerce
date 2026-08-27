import { Stack } from 'expo-router';

export default function ProductsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[slug]" />
    </Stack>
  );
}
