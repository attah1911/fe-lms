import { GetServerSideProps } from "next";
import AuthLayout from "../../../components/layouts/AuthLayout";
import StudentDataForm from "../../../components/views/Auth/StudentDataForm";
import authServices from "../../../services/auth.service";

interface Props {
  email: string;
}

const StudentDataPage = ({ email }: Props) => {
  return (
    <AuthLayout title="E-Learning | Data Murid">
      <StudentDataForm email={email} />
    </AuthLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { email } = context.query;

  if (!email) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  try {
    await authServices.getStudentData(email as string);
    
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return {
        props: {
          email: email as string,
        },
      };
    }

    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }
};

export default StudentDataPage;
