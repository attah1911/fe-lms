import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export const PageLoading: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(router.asPath.split('?')[0]);

    const handleStart = (url: string) => {
      const newPath = url.split('?')[0];
      
      if (newPath !== currentPath) {
        setIsLoading(true);
      }
    };
    
    const handleComplete = () => setIsLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router, currentPath]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center">
      <div className="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="text-gray-700">Loading...</span>
      </div>
    </div>
  );
};

export default PageLoading;
