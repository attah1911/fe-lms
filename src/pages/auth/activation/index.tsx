import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import AuthLayout from "../../../components/layouts/AuthLayout";
import Activation from "../../../components/views/Auth/Activation";
import authServices from "../../../services/auth.service";

interface PropTypes {
  status: 'success' | 'failed';
  userData?: {
    email: string;
  };
}

const ActivationPage = (props: PropTypes) => {
  const router = useRouter();
  const { status, userData } = props;
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (status === 'success' && !isProcessing && userData?.email) {
      setIsProcessing(true);
      // Redirect to student data form with the correct email
      router.push({
        pathname: '/auth/student-data',
        query: { email: userData.email }
      });
    } else if (status === 'success' && !isProcessing) {
      router.push('/auth/login');
    }
  }, [status, router, isProcessing, userData]);

  return (
    <AuthLayout title="E-Learning | Activation">
      <Activation status={status} />
    </AuthLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const { token } = context.query;

    if (!token || typeof token !== 'string') {
      console.error('Invalid or missing token');
      return {
        props: {
          status: "failed"
        }
      };
    }

    // Call the activation endpoint
    const response = await authServices.activation({ token });
    
    // Check if we have user data in the response
    if (response?.data?.data?.user) {
      const { user } = response.data.data;
      
      // Ensure we have the email
      if (user.email) {
        
        return {
          props: {
            status: "success",
            userData: {
              email: user.email,
            },
          },
        };
      }
    }
    
    console.error('Activation response missing user data');
    return {
      props: {
        status: "failed",
      },
    };
  } catch (error) {
    console.error("Activation error:", error);
    return {
      props: {
        status: "failed",
      },
    };
  }
};

export default ActivationPage;
