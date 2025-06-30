import React from 'react';
import { NextPage } from 'next';
import DashboardLayout from '../../../components/layouts/DashboardLayout';
import Tugas from '../../../components/views/Murid/Tugas';

const TugasPage: NextPage = () => {
  return (
    <DashboardLayout type="murid">
      <Tugas />
    </DashboardLayout>
  );
};

export default TugasPage;
