import React from 'react';
import { NextPage } from 'next';
import DashboardLayout from '../../../components/layouts/DashboardLayout';
import MataPelajaran from '../../../components/views/Murid/MataPelajaran';

const MataPelajaranPage: NextPage = () => {
  return (
    <DashboardLayout type="murid">
      <MataPelajaran />
    </DashboardLayout>
  );
};

export default MataPelajaranPage;
