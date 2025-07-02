import { useEffect } from 'react';
import { useRouter } from 'next/router';

const AdminProfileRedirect = () => {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin/setting');
  }, [router]);
  
  return null;
};

export default AdminProfileRedirect;
