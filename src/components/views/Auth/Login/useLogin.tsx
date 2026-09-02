import { useState } from "react";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { ILogin } from "../../../../types/Auth";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { signIn, signOut } from "next-auth/react";
import { toast } from "sonner";
import authServices from "../../../../services/auth.service";
import { Control, FieldErrors } from "react-hook-form";

const loginSchema = yup.object().shape({
  identifier: yup.string().required("Tolong masukkan email atau username anda"),
  password: yup.string().required("Tolong masukkan Password anda"),
});

interface UseLoginReturn {
  isVisible: boolean;
  toggleVisibility: () => void;
  control: Control<ILogin>;
  handleSubmit: (handler: (data: ILogin) => void) => (e: React.FormEvent) => void;
  handleLogin: (data: ILogin) => void;
  isPendingLogin: boolean;
  errors: FieldErrors<ILogin> & { root?: { message?: string } };
  handleResendActivation: (email: string) => Promise<void>;
  isResending: boolean;
  lastAttemptedEmail: string | null;
}

export const useLogin = (): UseLoginReturn => {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [lastAttemptedEmail, setLastAttemptedEmail] = useState<string | null>(null);
  const toggleVisibility = () => setIsVisible(!isVisible);
  const callbackUrl = (router.query.callbackUrl as string) || "";

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<ILogin>({
    resolver: yupResolver(loginSchema),
  });

  const { mutate: mutateResendActivation, isPending: isResending } = useMutation({
    mutationFn: async (email: string) => {
      const response = await authServices.resendActivation(email);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Email Aktivasi Terkirim", {
        description: "Silakan cek email Anda untuk aktivasi akun",
      });
    },
    onError: (error: any) => {
      toast.error("Gagal Mengirim Email", {
        description: error.response?.data?.meta?.message || "Gagal mengirim email aktivasi",
      });
    },
  });

  const { mutate: mutateLogin, isPending: isPendingLogin } = useMutation({
    mutationFn: async (data: ILogin) => {
      try {
        if (data.identifier.includes('@')) {
          setLastAttemptedEmail(data.identifier);
        }

        await signOut({ redirect: false });
        const response = await authServices.login(data);
        return response.data;
      } catch (error: any) {
        // 401 = wrong credentials, 403 = valid credentials but the account is
        // not activated yet. Both land here with a message worth showing.
        if (error.response?.status === 401 || error.response?.status === 403) {
          const message = error.response?.data?.meta?.message;
          if (message === "User tidak ditemukan") {
            throw new Error("Akun tidak ditemukan");
          }
          if (message === "Password Salah") {
            throw new Error("Password yang anda masukkan salah");
          }
          if (message === "Akun belum diaktivasi. Silakan cek email Anda untuk aktivasi.") {
            throw new Error("Akun belum diaktivasi. Silakan cek email Anda untuk aktivasi.");
          }
          throw new Error(message || "Akses ditolak");
        }
        if (!error.response) {
          throw new Error("Gagal terhubung ke server");
        }
        throw new Error(error.response?.data?.meta?.message || "Login gagal");
      }
    },
    onError(error: Error) {
      setError("root", { message: error.message });
      toast.error("Login Gagal", { description: error.message });
    },
    onSuccess: async (response) => {
      try {
        const { data } = response;
        const { user, token } = data;

        if (user.role === 'murid') {
          try {
            await authServices.getStudentData(user.email);
          } catch (error: any) {
            if (error.response?.status === 404) {
              toast.info("Data Murid Belum Lengkap", {
                description: "Silakan lengkapi data murid Anda",
              });
              
              router.push({
                pathname: '/auth/student-data',
                query: { email: user.email }
              });
              return;
            }
          }
        }

        toast.success("Login Berhasil", {
          description: `Anda akan diarahkan ke halaman ${
            user.role === 'admin' ? 'Admin' : 
            user.role === 'guru' ? 'Guru' : 'Murid'
          }`,
        });

        await signIn("credentials", {
          identifier: user.email,
          password: token,
          userData: JSON.stringify(user),
          redirect: true,
          callbackUrl: callbackUrl || `/${user.role}/dashboard`
        });

        reset();
      } catch (error: any) {
        setError("root", {
          message: "Gagal mendapatkan informasi pengguna",
        });
        toast.error("Login Gagal", {
          description: "Gagal mendapatkan informasi pengguna",
        });
      }
    },
  });

  const handleLogin = (data: ILogin) => mutateLogin(data);
  const handleResendActivation = async (email: string) => mutateResendActivation(email);

  return {
    isVisible,
    toggleVisibility,
    control,
    handleSubmit,
    handleLogin,
    isPendingLogin,
    errors,
    handleResendActivation,
    isResending,
    lastAttemptedEmail,
  };
};

export default useLogin;
