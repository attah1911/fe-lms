import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AuthLayout from "../../../components/layouts/AuthLayout";
import StudentDataForm from "../../../components/views/Auth/StudentDataForm";
import authServices from "../../../services/auth.service";

const StudentDataPage = () => {
  const router = useRouter();
  const email = router.query.email as string;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('pendingAuthToken');
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    authServices.getStudentData(token)
      .then(() => {
        // Student data already exists for this account.
        sessionStorage.removeItem('pendingAuthToken');
        router.replace('/auth/login');
      })
      .catch((error: any) => {
        if (error.response?.status === 404) {
          setReady(true);
        } else {
          router.replace('/auth/login');
        }
      });
  }, [router]);

  if (!ready) {
    return null;
  }

  return (
    <AuthLayout title="E-Learning | Data Murid">
      <StudentDataForm email={email} />
    </AuthLayout>
  );
};

export default StudentDataPage;
