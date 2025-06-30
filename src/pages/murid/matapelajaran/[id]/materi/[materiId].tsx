import React from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../../../components/layouts/DashboardLayout';
import MateriDetail from '../../../../../components/views/Murid/MataPelajaran/MateriDetail';

const MateriDetailPage: NextPage = () => {
  const router = useRouter();
  const { id, materiId } = router.query;

  return (
    <DashboardLayout type="murid">
      <MateriDetail mataPelajaranId={id as string} materiId={materiId as string} />
    </DashboardLayout>
  );
};

export default MateriDetailPage; 