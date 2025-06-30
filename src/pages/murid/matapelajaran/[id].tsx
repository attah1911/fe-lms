import React from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/layouts/DashboardLayout';
import MataPelajaranDetail from '../../../components/views/Murid/MataPelajaran/MataPelajaranDetail';

const MataPelajaranDetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;

  return (
    <DashboardLayout type="murid">
      <MataPelajaranDetail id={id as string} />
    </DashboardLayout>
  );
};

export default MataPelajaranDetailPage; 