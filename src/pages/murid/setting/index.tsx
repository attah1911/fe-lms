import React from 'react';
import { NextPage } from 'next';
import DashboardLayout from '../../../components/layouts/DashboardLayout';
import Setting from '../../../components/views/Murid/Setting';

const SettingPage: NextPage = () => {
  return (
    <DashboardLayout type="murid">
      <Setting />
    </DashboardLayout>
  );
};

export default SettingPage;
