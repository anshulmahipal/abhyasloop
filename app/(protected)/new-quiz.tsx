import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function NewQuizRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to quiz config
    router.replace('/(protected)/quiz/config');
  }, []);

  return null;
}
