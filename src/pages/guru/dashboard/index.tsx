import DashboardLayout from "@/components/layouts/DashboardLayout";
import Dashboard from "@/components/views/Guru/Dashboard";

const DashboardGuruPage = () => {
  return (
    <DashboardLayout
      type="guru"
    >
      <Dashboard />
    </DashboardLayout>
  );
};

export default DashboardGuruPage;
