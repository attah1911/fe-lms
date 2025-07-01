import React, { useEffect, Key, useState, useCallback } from "react";
import { Input, Textarea, Button, Select, SelectItem } from "@nextui-org/react";
import { MataPelajaran, TeacherOption, kategoriList, tingkatKelasList, TeacherData } from "../../../../types/MataPelajaran";
import BaseModal from "../../../commons/Modal/BaseModal";
import { useForm, Controller, useWatch } from "react-hook-form";

interface CreateEditMataPelajaranModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MataPelajaran) => Promise<void>;
  initialData?: Partial<MataPelajaran>;
  mode: 'create' | 'edit';
  isSubmitting?: boolean;
  teachers: TeacherOption[];
}

const CreateEditMataPelajaranModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
  isSubmitting = false,
  teachers
}: CreateEditMataPelajaranModalProps): JSX.Element => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<MataPelajaran>({
    defaultValues: {
      judul: "",
      kategori: "",
      deskripsi: "",
      guru: "",
      tingkatKelas: "",
    },
  });

  // Watch for value changes
  const kategori = watch('kategori');
  const tingkatKelas = watch('tingkatKelas');
  const guruId = watch('guru');
  const [isAutoTitleEnabled, setIsAutoTitleEnabled] = useState(true);

  // Find selected teacher name
  const getTeacherName = useCallback((id: string | TeacherData): string => {
    const teacherId = typeof id === 'object' ? id._id : id;
    const teacher = teachers.find(t => t._id === teacherId);
    return teacher ? teacher.fullName : '';
  }, [teachers]);

  // Auto generate title when values change
  useEffect(() => {
    if (!isAutoTitleEnabled || mode === 'edit') return;
    
    // Only generate title if all required fields are filled
    if (kategori && tingkatKelas && guruId) {
      const teacherName = getTeacherName(guruId);
      const titleTemplate = `${kategori} | ${tingkatKelas} | ${teacherName}`;
      setValue('judul', titleTemplate);
    }
  }, [kategori, tingkatKelas, guruId, setValue, isAutoTitleEnabled, mode, teachers, getTeacherName]);

  // Reset form when modal opens/closes or when initialData changes
  useEffect(() => {
    if (isOpen && initialData) {
      // Set each field individually to ensure proper type handling
      setValue('judul', initialData.judul || '');
      setValue('kategori', initialData.kategori || '');
      setValue('deskripsi', initialData.deskripsi || '');
      setValue('tingkatKelas', initialData.tingkatKelas || '');
      
      // Handle guru field which can be either string or object
      if (initialData.guru) {
        const guruId = typeof initialData.guru === 'object' ? initialData.guru._id : initialData.guru;
        setValue('guru', guruId);
      }

      // Disable auto title in edit mode
      setIsAutoTitleEnabled(false);
    } else {
      reset({
        judul: "",
        kategori: "",
        deskripsi: "",
        guru: "",
        tingkatKelas: "",
      });
      // Enable auto title in create mode
      setIsAutoTitleEnabled(mode === 'create');
    }
  }, [isOpen, initialData, setValue, reset, mode]);

  const handleFormSubmit = async (data: MataPelajaran) => {
    await onSubmit(data);
    reset();
  };

  const modalTitle = mode === 'create' ? 'Tambah Mata Pelajaran' : 'Edit Mata Pelajaran';

  const formatTingkatKelas = (kelas: string) => {
    return kelas;
  };

  const submitForm = () => {
    handleSubmit(handleFormSubmit)();
  };

  // Helper function to get selected keys for Select components
  const getSelectedKeys = (value: string | undefined) => {
    if (!value) return new Set<string>();
    return new Set([value]);
  };

  // Helper function to get guru ID from value
  const getGuruId = (value: string | TeacherData | undefined) => {
    if (!value) return new Set<string>();
    const id = typeof value === 'object' ? value._id : value;
    return new Set([id]);
  };

  const footer = (
    <>
      <Button
        color="danger"
        variant="light"
        onPress={onClose}
        isDisabled={isSubmitting}
      >
        Batal
      </Button>
      <Button
        color="primary"
        onPress={submitForm}
        isLoading={isSubmitting}
      >
        {mode === 'create' ? 'Tambah' : 'Simpan'}
      </Button>
    </>
  );

  // Handle manual change of title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mode === 'create' && e.target.value !== '') {
      // If user manually edits title, disable auto-generation
      setIsAutoTitleEnabled(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      footer={footer}
      size="2xl"
      isSubmitting={isSubmitting}
    >
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(handleFormSubmit)();
      }}>
          <div className="space-y-2">
            <Controller
              name="judul"
              control={control}
              rules={{ required: "Judul harus diisi" }}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  label="Judul"
                  placeholder="Masukkan judul mata pelajaran"
                  errorMessage={fieldState.error?.message}
                  isInvalid={!!fieldState.error}
                  onChange={(e) => {
                    field.onChange(e);
                    handleTitleChange(e);
                  }}
                />
              )}
            />
            <div className="text-sm text-gray-500 px-2">
              Template: Mata Pelajaran | Kelas | Nama Guru
              {mode === 'create' && (
                <span className="ml-2">
                  {isAutoTitleEnabled 
                    ? '(Auto-generate aktif)' 
                    : (
                      <Button 
                        size="sm" 
                        variant="light" 
                        color="primary" 
                        className="ml-2 px-1 py-0 min-w-0 h-auto"
                        onPress={() => setIsAutoTitleEnabled(true)}
                      >
                        Aktifkan auto-generate
                      </Button>
                    )
                  }
                </span>
              )}
            </div>
          </div>

        <Controller
          name="kategori"
          control={control}
          rules={{ required: "Kategori harus diisi" }}
          render={({ field: { onChange, value }, fieldState }) => (
            <Select
              label="Kategori"
              placeholder="Pilih kategori"
              errorMessage={fieldState.error?.message}
              isInvalid={!!fieldState.error}
              selectedKeys={getSelectedKeys(value)}
              onChange={(e) => onChange(e.target.value)}
            >
              {kategoriList.map((kategori: string) => (
                <SelectItem key={kategori} value={kategori}>
                  {kategori}
                </SelectItem>
              ))}
            </Select>
          )}
        />

        <Controller
          name="tingkatKelas"
          control={control}
          rules={{ required: "Tingkat kelas harus diisi" }}
          render={({ field: { onChange, value }, fieldState }) => (
            <Select
              label="Tingkat Kelas"
              placeholder="Pilih tingkat kelas"
              errorMessage={fieldState.error?.message}
              isInvalid={!!fieldState.error}
              selectedKeys={getSelectedKeys(value)}
              onChange={(e) => onChange(e.target.value)}
            >
              {tingkatKelasList.map((kelas) => (
                <SelectItem key={kelas} value={kelas}>
                  {kelas}
                </SelectItem>
              ))}
            </Select>
          )}
        />

        <Controller
          name="guru"
          control={control}
          rules={{ required: "Guru harus dipilih" }}
          render={({ field: { onChange, value }, fieldState }) => (
            <Select
              label="Guru"
              placeholder="Pilih guru"
              errorMessage={fieldState.error?.message}
              isInvalid={!!fieldState.error}
              selectedKeys={getGuruId(value)}
              onChange={(e) => onChange(e.target.value)}
              classNames={{
                base: "w-full",
                trigger: "h-11"
              }}
            >
              {teachers.map((teacher) => (
                <SelectItem key={teacher._id} value={teacher._id}>
                  {teacher.fullName}
                </SelectItem>
              ))}
            </Select>
          )}
        />

        <Controller
          name="deskripsi"
          control={control}
          rules={{ required: "Deskripsi harus diisi" }}
          render={({ field, fieldState }) => (
            <Textarea
              {...field}
              label="Deskripsi"
              placeholder="Masukkan deskripsi mata pelajaran"
              errorMessage={fieldState.error?.message}
              isInvalid={!!fieldState.error}
            />
          )}
        />
      </form>
    </BaseModal>
  );
};

export default CreateEditMataPelajaranModal;
