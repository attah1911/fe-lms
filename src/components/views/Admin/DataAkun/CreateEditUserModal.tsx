import React from "react";
import { Input, Button, Select, SelectItem } from "@nextui-org/react";
import BaseModal from "../../../commons/Modal/BaseModal";
import { useForm, Controller } from "react-hook-form";

export interface UserSubmitData {
  fullName: string;
  username: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  role: string;
}

interface CreateEditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserSubmitData) => Promise<void>;
  initialData?: {
    fullName: string;
    username: string;
    email: string;
    role: string;
  };
  mode: 'create' | 'edit';
  isSubmitting?: boolean;
}

const ROLES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Guru', value: 'guru' },
  { label: 'Murid', value: 'murid' },
];

const PATTERNS = {
  fullName: /^[A-Za-zÀ-ÿ\s]+$/,
  username: /^[a-zA-Z0-9_-]+$/,
  email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
};

const CreateEditUserModal: React.FC<CreateEditUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
  isSubmitting = false,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    trigger
  } = useForm<UserSubmitData>({
    defaultValues: {
      fullName: initialData?.fullName || "",
      username: initialData?.username || "",
      email: initialData?.email || "",
      role: initialData?.role || "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange"
  });

  const handleFormSubmit = async (data: UserSubmitData) => {
    try {
      const isValid = await trigger();
      if (!isValid) return;

      const { confirmPassword, ...submitData } = data;
      
      await onSubmit(submitData);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const modalTitle = mode === 'create' ? 'Tambah Akun' : 'Edit Akun';

  const footer = (
    <>
      <Button
        color="danger"
        variant="light"
        onClick={onClose}
        disabled={isSubmitting}
      >
        Batal
      </Button>
      <Button
        color="primary"
        onClick={() => handleSubmit(handleFormSubmit)()}
        isLoading={isSubmitting}
      >
        {mode === 'create' ? 'Tambah' : 'Simpan'}
      </Button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      footer={footer}
      size="2xl"
      isSubmitting={isSubmitting}
    >
      <form 
        className="space-y-4" 
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(handleFormSubmit)(e);
        }}
      >
        <Controller
          name="fullName"
          control={control}
          rules={{
            required: "Nama lengkap harus diisi",
            pattern: {
              value: PATTERNS.fullName,
              message: "Nama lengkap hanya boleh berisi huruf dan spasi"
            },
            validate: (value: string | undefined) => {
              if (!value) return "Nama lengkap harus diisi";
              if (/\d/.test(value)) {
                return "Nama lengkap tidak boleh mengandung angka";
              }
              if (value.trim().length < 3) {
                return "Nama lengkap minimal 3 karakter";
              }
              if (value.trim().length > 50) {
                return "Nama lengkap maksimal 50 karakter";
              }
              return true;
            }
          }}
          render={({ field }) => (
            <Input
              {...field}
              label="Nama Lengkap"
              placeholder="Masukkan nama lengkap"
              errorMessage={errors.fullName?.message}
              isInvalid={!!errors.fullName}
            />
          )}
        />

        <Controller
          name="username"
          control={control}
          rules={{
            required: "Username harus diisi",
            pattern: {
              value: PATTERNS.username,
              message: "Username hanya boleh berisi huruf, angka, underscore, dan dash"
            },
            minLength: {
              value: 3,
              message: "Username minimal 3 karakter"
            },
            maxLength: {
              value: 20,
              message: "Username maksimal 20 karakter"
            }
          }}
          render={({ field }) => (
            <Input
              {...field}
              label="Username"
              placeholder="Masukkan username"
              errorMessage={errors.username?.message}
              isInvalid={!!errors.username}
            />
          )}
        />

        <Controller
          name="email"
          control={control}
          rules={{
            required: "Email harus diisi",
            pattern: {
              value: PATTERNS.email,
              message: "Format email tidak valid"
            },
            maxLength: {
              value: 50,
              message: "Email terlalu panjang"
            }
          }}
          render={({ field }) => (
            <Input
              {...field}
              type="email"
              label="Email"
              placeholder="Masukkan email"
              errorMessage={errors.email?.message}
              isInvalid={!!errors.email}
            />
          )}
        />

        {mode === 'create' && (
          <>
            <Controller
              name="password"
              control={control}
              rules={{
                required: "Password harus diisi",
                minLength: {
                  value: 6,
                  message: "Password setidaknya harus 6 karakter"
                },
                validate: {
                  hasUpperCase: (value: string | undefined) => 
                    value && /[A-Z]/.test(value) || "Password harus memiliki setidaknya satu huruf kapital",
                  hasNumber: (value: string | undefined) =>
                    value && /\d/.test(value) || "Password harus memiliki setidaknya satu angka"
                }
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  type="password"
                  label="Password"
                  placeholder="Masukkan password"
                  errorMessage={errors.password?.message}
                  isInvalid={!!errors.password}
                />
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              rules={{
                required: "Konfirmasi password harus diisi",
                validate: (value: string | undefined) =>
                  value === watch("password") || "Password tidak sesuai"
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  type="password"
                  label="Konfirmasi Password"
                  placeholder="Konfirmasi password"
                  errorMessage={errors.confirmPassword?.message}
                  isInvalid={!!errors.confirmPassword}
                />
              )}
            />
          </>
        )}

        <Controller
          name="role"
          control={control}
          rules={{ 
            required: "Role harus dipilih",
            validate: (value: string | undefined) => 
              value && ROLES.some(role => role.value === value) || "Role tidak valid"
          }}
          render={({ field }) => (
            <Select
              label="Role"
              placeholder="Pilih role"
              errorMessage={errors.role?.message}
              isInvalid={!!errors.role}
              selectedKeys={field.value ? [field.value] : []}
              onChange={(e) => field.onChange(e.target.value)}
            >
              {ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </Select>
          )}
        />
      </form>
    </BaseModal>
  );
};

export default CreateEditUserModal;
