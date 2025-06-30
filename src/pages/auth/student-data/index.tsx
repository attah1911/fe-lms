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
    // Verify this is a valid student email by attempting to get student data
    // This will throw a 404 if the email is valid but data doesn't exist yet
    // Or other errors if the email is invalid
    await authServices.getStudentData(email as string);
    
    // If we get here, student data already exists, redirect to login
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  } catch (error: any) {
    // If it's a 404, this is what we want - the email is valid but needs data
    if (error.response?.status === 404) {
      return {
        props: {
          email: email as string,
        },
      };
    }

    // For any other error, redirect to login
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }
};

export default StudentDataPage;
