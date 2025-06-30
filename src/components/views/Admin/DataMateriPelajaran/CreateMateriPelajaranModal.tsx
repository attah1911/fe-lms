import React, { useEffect, useState } from "react";
import { Input, Textarea, Button, Divider } from "@nextui-org/react";
import BaseModal from "../../../commons/Modal/BaseModal";
import { useForm, Controller } from "react-hook-form";
import FileUploader from "../../../commons/FileUploader/FileUploader";

interface Materi {
  judul: string;
  konten: {
    teks: string;
    files?: Array<string | {url: string; name: string}>;
  };
}

interface CreateMateriPelajaranModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Materi) => Promise<void>;
  isSubmitting?: boolean;
}

const CreateMateriPelajaranModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: CreateMateriPelajaranModalProps): JSX.Element => {
  const [files, setFiles] = useState<Array<{url: string; name: string}>>([]);
  
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<Materi>({
    defaultValues: {
      judul: "",
      konten: {
        teks: "",
        files: []
      }
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      reset({
        judul: "",
        konten: {
          teks: "",
          files: []
        }
      });
      setFiles([]);
    }
  }, [isOpen, reset]);

  const handleFormSubmit = async (data: Materi) => {
    // Include the uploaded files in the form data
    const dataWithFiles = {
      ...data,
      konten: {
        ...data.konten,
        files: files
      }
    };
    
    await onSubmit(dataWithFiles);
    reset();
    setFiles([]);
  };

  const submitForm = () => {
    handleSubmit(handleFormSubmit)();
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
        Tambah
      </Button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Materi Pelajaran"
      footer={footer}
      size="lg"
      isSubmitting={isSubmitting}
    >
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(handleFormSubmit)();
      }}>
        <Controller
          name="judul"
          control={control}
          rules={{ required: "Judul materi harus diisi" }}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              label="Judul Materi"
              placeholder="Masukkan judul materi pelajaran"
              errorMessage={fieldState.error?.message}
              isInvalid={!!fieldState.error}
            />
          )}
        />

        <Controller
          name="konten.teks"
          control={control}
          rules={{ required: "Konten materi harus diisi" }}
          render={({ field, fieldState }) => (
            <Textarea
              {...field}
              label="Konten Materi"
              placeholder="Masukkan konten atau deskripsi materi"
              minRows={5}
              errorMessage={fieldState.error?.message}
              isInvalid={!!fieldState.error}
            />
          )}
        />

        <Divider className="my-4" />
        
        <div>
          <h3 className="text-sm font-medium mb-2">File Lampiran</h3>
          <FileUploader 
            files={files}
            onFilesChange={setFiles}
            maxFiles={5}
          />
        </div>
      </form>
    </BaseModal>
  );
};

export default CreateMateriPelajaranModal; 
