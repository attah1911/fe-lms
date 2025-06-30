import React, { useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem } from "@nextui-org/react";
import { Student, kelasList } from "../../../../types/Student";

interface ValidationErrors {
  fullName?: string;
  email?: string;
  nis?: string;
  kelas?: string;
  noTelp?: string;
}

interface CreateEditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Student) => void;
  initialData?: Student;
  mode: 'create' | 'edit';
}

const CreateEditStudentModal: React.FC<CreateEditStudentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode
}) => {
  const [formData, setFormData] = React.useState<Student>({
    fullName: '',
    email: '',
    nis: '',
    kelas: '',
    noTelp: ''
  });

  const [errors, setErrors] = React.useState<ValidationErrors>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        fullName: '',
        email: '',
        nis: '',
        kelas: '',
        noTelp: ''
      });
    }
    // Reset errors when modal opens/closes
    setErrors({});
  }, [initialData, isOpen]);

  const validateFullName = (value: string): string | undefined => {
    if (!value) return 'Nama lengkap harus diisi';
    if (!/^[a-zA-Z\s]*$/.test(value)) return 'Nama lengkap hanya boleh berisi huruf';
    return undefined;
  };

  const validateEmail = (value: string): string | undefined => {
    if (!value) return 'Email harus diisi';
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
      return 'Format email tidak valid';
    }
    return undefined;
  };

  const validateNIS = (value: string): string | undefined => {
    if (!value) return 'NIS harus diisi';
    if (!/^\d+$/.test(value)) return 'NIS hanya boleh berisi angka';
    return undefined;
  };

  const validateKelas = (value: string): string | undefined => {
    if (!value) return 'Kelas harus dipilih';
    return undefined;
  };

  const validateNoTelp = (value: string): string | undefined => {
    if (!value) return 'Nomor telepon harus diisi';
    if (!/^\d+$/.test(value)) return 'Nomor telepon hanya boleh berisi angka';
    return undefined;
  };

  const handleFieldChange = (field: keyof Student, value: string) => {
    setFormData({ ...formData, [field]: value });
    
    // Validate field on change
    let error: string | undefined;
    switch (field) {
      case 'fullName':
        error = validateFullName(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'nis':
        error = validateNIS(value);
        break;
      case 'kelas':
        error = validateKelas(value);
        break;
      case 'noTelp':
        error = validateNoTelp(value);
        break;
    }
    
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      fullName: validateFullName(formData.fullName),
      email: validateEmail(formData.email),
      nis: validateNIS(formData.nis),
      kelas: validateKelas(formData.kelas),
      noTelp: validateNoTelp(formData.noTelp)
    };

    setErrors(newErrors);

    // Check if there are any errors
    return !Object.values(newErrors).some(error => error !== undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      backdrop="blur"
      placement="center"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              {mode === 'create' ? 'Tambah Murid Baru' : 'Edit Murid'}
            </ModalHeader>
            <ModalBody>
              {mode === 'create' && (
                <div className="p-2 mb-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-600">
                    <span className="font-medium">Info:</span> Akun akan otomatis dibuat dengan password default: <span className="font-semibold">Smpn37Jakartamurid</span>
                  </p>
                </div>
              )}
              <form id="studentForm" onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nama Lengkap"
                  value={formData.fullName}
                  onValueChange={(value) => handleFieldChange('fullName', value)}
                  isInvalid={!!errors.fullName}
                  errorMessage={errors.fullName}
                  variant="bordered"
                  placeholder="Masukkan nama lengkap"
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onValueChange={(value) => handleFieldChange('email', value)}
                  isInvalid={!!errors.email}
                  errorMessage={errors.email}
                  variant="bordered"
                  placeholder="Masukkan email"
                />
                <Input
                  label="NIS"
                  value={formData.nis}
                  onValueChange={(value) => handleFieldChange('nis', value)}
                  isInvalid={!!errors.nis}
                  errorMessage={errors.nis}
                  variant="bordered"
                  placeholder="Masukkan NIS"
                />
                <Select
                  label="Kelas"
                  selectedKeys={[formData.kelas]}
                  onChange={(e) => handleFieldChange('kelas', e.target.value)}
                  isInvalid={!!errors.kelas}
                  errorMessage={errors.kelas}
                  variant="bordered"
                >
                  {kelasList.map((kelas) => (
                    <SelectItem key={kelas} value={kelas}>
                      {kelas}
                    </SelectItem>
                  ))}
                </Select>
                <Input
                  label="No. Telepon"
                  value={formData.noTelp}
                  onValueChange={(value) => handleFieldChange('noTelp', value)}
                  isInvalid={!!errors.noTelp}
                  errorMessage={errors.noTelp}
                  variant="bordered"
                  placeholder="Masukkan nomor telepon"
                />
              </form>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Batal
              </Button>
              <Button color="primary" type="submit" form="studentForm">
                {mode === 'create' ? 'Tambah' : 'Simpan'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CreateEditStudentModal;
