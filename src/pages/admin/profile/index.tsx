import { useEffect } from 'react';
import { useRouter } from 'next/router';

const AdminProfileRedirect = () => {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the new settings page
    router.replace('/admin/setting');
  }, [router]);
  
  return null; // No UI needed for redirect
};

export default AdminProfileRedirect;
