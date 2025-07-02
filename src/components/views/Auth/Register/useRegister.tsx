import { useState } from "react";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { IRegister, IRegisterForm } from "../../../../types/Auth";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { toast } from "sonner";
import authServices from "../../../../services/auth.service";
import { Control, FieldErrors } from "react-hook-form";
import { AxiosError } from "axios";

const fullNameRegex = /^[A-Za-z\s]+$/;

const usernameRegex = /^(?=(?:.*[A-Za-z]){3})[A-Za-z0-9]+$/;

const registerSchema = yup.object().shape({
  fullName: yup
    .string()
    .required("Nama lengkap harus diisi")
    .max(50, "Nama lengkap maksimal 50 karakter")
    .matches(fullNameRegex, "Nama lengkap hanya boleh berisi huruf dan spasi")
    .test("no-double-spaces", "Tidak boleh ada spasi ganda", value => 
      !value?.includes("  ")
    )
    .trim(),
  username: yup
    .string()
    .required("Username harus diisi")
    .max(15, "Username maksimal 15 karakter")
    .matches(usernameRegex, "Username harus mengandung minimal 3 huruf")
    .trim(),
  email: yup
    .string()
    .required("Email harus diisi")
    .email("Format email tidak valid"),
  password: yup
    .string()
    .required("Password harus diisi")
    .min(6, "Password setidaknya harus 6 karakter")
    .test(
      "at-least-one-uppercase-letter",
      "Password harus memiliki setidaknya satu huruf kapital",
      (value) => {
        if (!value) return false;
        const regex = /^(?=.*[A-Z])/;
        return regex.test(value);
      }
    )
    .test(
      "at-least-one-number",
      "Password harus memiliki setidaknya satu angka",
      (value) => {
        if (!value) return false;
        const regex = /^(?=.*\d)/;
        return regex.test(value);
      }
    ),
  confirmPassword: yup
    .string()
    .required("Konfirmasi password harus diisi")
    .oneOf([yup.ref("password"), ""], "Password tidak sesuai"),
});

interface UseRegisterReturn {
  visiblePassword: {
    password: boolean;
    confirmPassword: boolean;
  };
  handleVisiblePassword: (field: "password" | "confirmPassword") => void;
  control: Control<IRegisterForm>;
  handleSubmit: (handler: (data: IRegisterForm) => void) => (e: React.FormEvent) => void;
  handleRegister: (data: IRegisterForm) => void;
  isPendingRegister: boolean;
  errors: FieldErrors<IRegisterForm> & { root?: { message?: string } };
}

export const useRegister = (): UseRegisterReturn => {
  const router = useRouter();
  const [visiblePassword, setVisiblePassword] = useState({
    password: false,
    confirmPassword: false,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<IRegisterForm>({
    resolver: yupResolver(registerSchema),
    mode: "onChange",
  });

  const handleVisiblePassword = (field: "password" | "confirmPassword") => {
    setVisiblePassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const { mutate: mutateRegister, isPending: isPendingRegister } = useMutation({
    mutationFn: async (formData: IRegisterForm) => {
      clearErrors();

      try {
        const registerData = {
          fullName: formData.fullName,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          role: 'murid',
        };

        const response = await authServices.register(registerData);
        return { data: response.data, email: formData.email };
      } catch (error) {
        if (error instanceof AxiosError && error.response) {
          const errorMessage = error.response.data?.meta?.message;
          
          if (errorMessage?.toLowerCase().includes('username')) {
            setError('username', {
              type: 'manual',
              message: 'Username sudah digunakan'
            });
            throw new Error('Username sudah digunakan');
          }
          
          if (errorMessage?.toLowerCase().includes('email')) {
            setError('email', {
              type: 'manual',
              message: 'Email sudah digunakan'
            });
            throw new Error('Email sudah digunakan');
          }

          throw new Error(errorMessage || 'Registrasi gagal');
        }
        
        throw new Error('Registrasi gagal. Silakan coba lagi.');
      }
    },
    onSuccess: (result) => {
      router.push({
        pathname: '/auth/register/success',
        query: { email: result.email }
      });
    },
    onError(error: Error) {
      toast.error("Registrasi Gagal", {
        description: error.message,
      });
    },
  });

  const handleRegister = (data: IRegisterForm) => mutateRegister(data);

  return {
    visiblePassword,
    handleVisiblePassword,
    control,
    handleSubmit,
    handleRegister,
    isPendingRegister,
    errors,
  };
};

export default useRegister;
