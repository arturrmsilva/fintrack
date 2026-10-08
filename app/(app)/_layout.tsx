import { Redirect, Stack } from 'expo-router';
import { LoadingView } from '@/components/StateViews';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) return <LoadingView />;
  if (!session) return <Redirect href="/login" />; // sem sessão: vai para o login

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="transaction/new" options={{ title: 'Novo lançamento' }} />
      <Stack.Screen name="transaction/[id]" options={{ title: 'Editar lançamento' }} />
      <Stack.Screen name="banks/index" options={{ title: 'Contas bancárias' }} />
      <Stack.Screen name="banks/connect" options={{ headerShown: false }} />
      <Stack.Screen name="banks/callback" options={{ headerShown: false }} />
    </Stack>
  );
}
