import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@nextui-org/react";
import { Teacher, TeacherInput } from "../../../../types/TeacherTypes";
import { useForm, Controller } from "react-hook-form";

interface CreateEditTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TeacherInput) => void;
  initialData?: Teacher;
  mode: 'create' | 'edit';
  isSubmitting?: boolean;
}

const PATTERNS = {
  fullName: /^[A-Za-zÀ-ÿ\s]+$/,
  email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  nrk: /^\d+$/,
  phone: /^\d+$/
};

const CreateEditTeacherModal: React.FC<CreateEditTeacherModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
  isSubmitting
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TeacherInput>({
    defaultValues: {
      fullName: initialData?.fullName || '',
      email: initialData?.email || '',
      nrk: initialData?.nrk || '',
      noTelp: initialData?.noTelp || ''
    },
    mode: "onChange"
  });

  React.useEffect(() => {
    if (initialData) {
      const { _id, ...rest } = initialData;
      reset(rest);
    } else {
      reset({
        fullName: '',
        email: '',
        nrk: '',
        noTelp: ''
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: TeacherInput) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      backdrop="blur"
      placement="center"
      size="2xl"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              {mode === 'create' ? 'Tambah Guru Baru' : 'Edit Guru'}
            </ModalHeader>
            <ModalBody>
              {mode === 'create' && (
                <div className="p-2 mb-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-600">
                    <span className="font-medium">Info:</span> Akun akan otomatis dibuat dengan password default: <span className="font-semibold">Smpn37Jakartaguru</span>
                  </p>
                </div>
              )}
              <form 
                id="teacherForm" 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(handleFormSubmit)(e);
                }} 
                className="space-y-4"
              >
                <Controller
                  name="fullName"
                  control={control}
                  rules={{
                    required: "Nama lengkap harus diisi",
                    pattern: {
                      value: PATTERNS.fullName,
                      message: "Nama lengkap hanya boleh berisi huruf"
                    },
                    validate: (value: string) => {
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
                      variant="bordered"
                      placeholder="Masukkan nama lengkap"
                      errorMessage={errors.fullName?.message}
                      isInvalid={!!errors.fullName}
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
                      variant="bordered"
                      placeholder="Masukkan email"
                      errorMessage={errors.email?.message}
                      isInvalid={!!errors.email}
                    />
                  )}
                />

                <Controller
                  name="nrk"
                  control={control}
                  rules={{
                    required: "NRK harus diisi",
                    pattern: {
                      value: PATTERNS.nrk,
                      message: "NRK hanya boleh berisi angka"
                    },
                    validate: (value: string) => {
                      if (!value) return "NRK harus diisi";
                      if (!/^\d+$/.test(value)) {
                        return "NRK hanya boleh berisi angka";
                      }
                      if (value.includes(' ')) {
                        return "NRK tidak boleh mengandung spasi";
                      }
                      if (value.length < 5) {
                        return "NRK minimal 5 digit";
                      }
                      if (value.length > 20) {
                        return "NRK maksimal 20 digit";
                      }
                      return true;
                    }
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="NRK"
                      variant="bordered"
                      placeholder="Masukkan NRK"
                      errorMessage={errors.nrk?.message}
                      isInvalid={!!errors.nrk}
                    />
                  )}
                />

                <Controller
                  name="noTelp"
                  control={control}
                  rules={{
                    required: "Nomor telepon harus diisi",
                    pattern: {
                      value: PATTERNS.phone,
                      message: "Nomor telepon hanya boleh berisi angka"
                    },
                    validate: (value: string) => {
                      if (!value) return "Nomor telepon harus diisi";
                      if (!/^\d+$/.test(value)) {
                        return "Nomor telepon hanya boleh berisi angka";
                      }
                      if (value.includes(' ')) {
                        return "Nomor telepon tidak boleh mengandung spasi";
                      }
                      if (value.length < 10) {
                        return "Nomor telepon minimal 10 digit";
                      }
                      if (value.length > 13) {
                        return "Nomor telepon maksimal 13 digit";
                      }
                      return true;
                    }
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="No. Telepon"
                      variant="bordered"
                      placeholder="Masukkan nomor telepon"
                      errorMessage={errors.noTelp?.message}
                      isInvalid={!!errors.noTelp}
                    />
                  )}
                />
              </form>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Batal
              </Button>
              <Button 
                color="primary" 
                type="submit" 
                form="teacherForm" 
                isLoading={isSubmitting}
              >
                {mode === 'create' ? 'Tambah' : 'Simpan'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CreateEditTeacherModal;
