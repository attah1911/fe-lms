import React from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../../../components/layouts/DashboardLayout';
import TugasDetail from '../../../../../components/views/Murid/MataPelajaran/TugasDetail';

const TugasDetailPage: NextPage = () => {
  const router = useRouter();
  const { id, tugasId } = router.query;

  return (
    <DashboardLayout type="murid">
      <TugasDetail mataPelajaranId={id as string} tugasId={tugasId as string} />
    </DashboardLayout>
  );
};

export default TugasDetailPage; 