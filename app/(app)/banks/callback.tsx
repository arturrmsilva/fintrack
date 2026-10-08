import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { LoadingView } from '@/components/StateViews';

// Tela invisível: o banco devolve o usuário para cá (deep link) depois da autorização.
// Voltamos à tela do widget, que continua aberta por baixo e acompanha a conexão.
export default function BankCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/banks');
  }, [router]);

  return <LoadingView />;
}
