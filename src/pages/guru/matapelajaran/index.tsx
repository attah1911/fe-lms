import React from "react";
import DashboardLayout from "../../../components/layouts/DashboardLayout";
import MataPelajaran from "../../../components/views/Guru/MataPelajaran";
import PageHead from "../../../components/commons/PageHead";

const MataPelajaranPage: React.FC = () => {
  return (
    <DashboardLayout type="guru">
      <PageHead title="Mata Pelajaran" />
      <MataPelajaran />
    </DashboardLayout>
  );
};

export default MataPelajaranPage; 
