import React, { useState } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  Button, 
  Input, 
  Textarea,
  Divider
} from "@nextui-org/react";
import { useForm, Controller } from "react-hook-form";
import { CreateAssignmentInput } from "../../../../types/Assignment";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import FileUploader from "../../../commons/FileUploader/FileUploader";

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAssignmentInput) => Promise<void>;
  isSubmitting: boolean;
  materiId: string;
  mataPelajaranId: string;
  initialData?: Partial<CreateAssignmentInput>;
  mode: 'create' | 'edit';
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  materiId,
  mataPelajaranId,
  initialData,
  mode
}) => {
  const [error, setError] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<Array<{url: string; name: string}>>([]);
  
  const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateAssignmentInput>({
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      deadline: initialData?.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : '',
      materiId: materiId,
      mataPelajaranId: mataPelajaranId
    }
  });

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      reset({
        title: initialData?.title || '',
        description: initialData?.description || '',
        deadline: initialData?.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : '',
        materiId: materiId,
        mataPelajaranId: mataPelajaranId
      });

      // Reset files if initialData contains attachments
      if (initialData?.attachments) {
        setAttachmentFiles(initialData.attachments);
      } else {
        setAttachmentFiles([]);
      }
    }
  }, [isOpen, initialData, reset, materiId, mataPelajaranId]);

  const handleFormSubmit = async (data: CreateAssignmentInput) => {
    try {
      // Add attachment files to the data before submitting
      const dataWithAttachments = {
        ...data,
        attachments: attachmentFiles
      };
      
      await onSubmit(dataWithAttachments as CreateAssignmentInput);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save assignment");
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="lg"
      scrollBehavior="inside"
      isDismissable={!isSubmitting}
      hideCloseButton={isSubmitting}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              {mode === 'create' ? 'Tambah Tugas Baru' : 'Edit Tugas'}
            </ModalHeader>
            <ModalBody>
              {error && (
                <NotificationAlert
                  type="error"
                  message={error}
                  onClose={() => setError(null)}
                />
              )}
              
              <form id="assignmentForm" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                <Controller
                  name="title"
                  control={control}
                  rules={{ required: "Judul tugas harus diisi" }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Judul Tugas"
                      variant="bordered"
                      placeholder="Masukkan judul tugas"
                      errorMessage={errors.title?.message}
                      isInvalid={!!errors.title}
                    />
                  )}
                />
                
                <Controller
                  name="description"
                  control={control}
                  rules={{ required: "Deskripsi tugas harus diisi" }}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      label="Deskripsi Tugas"
                      variant="bordered"
                      placeholder="Masukkan deskripsi tugas"
                      errorMessage={errors.description?.message}
                      isInvalid={!!errors.description}
                      minRows={4}
                    />
                  )}
                />
                
                <Controller
                  name="deadline"
                  control={control}
                  rules={{ required: "Tenggat waktu harus diisi" }}
                  render={({ field }) => (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        type="date"
                        label="Tanggal Tenggat"
                        variant="bordered"
                        placeholder="Pilih tanggal"
                        value={field.value ? field.value.split('T')[0] : ''}
                        onChange={(e) => {
                          // Combine date and time (if already set)
                          const currentValue = field.value || '';
                          const currentTime = currentValue.includes('T') ? 
                            currentValue.split('T')[1] : 
                            '23:59';
                          field.onChange(`${e.target.value}T${currentTime}`);
                        }}
                        errorMessage={errors.deadline?.message}
                        isInvalid={!!errors.deadline}
                      />
                      <Input
                        type="time"
                        label="Jam Tenggat (WIB)"
                        variant="bordered"
                        placeholder="Pilih jam"
                        value={field.value && field.value.includes('T') ? 
                          field.value.split('T')[1] : 
                          '23:59'}
                        onChange={(e) => {
                          // Combine date and time
                          const currentValue = field.value || '';
                          const currentDate = currentValue.includes('T') ? 
                            currentValue.split('T')[0] : 
                            new Date().toISOString().split('T')[0];
                          field.onChange(`${currentDate}T${e.target.value}`);
                        }}
                      />
                    </div>
                  )}
                />
                
                <input type="hidden" {...control.register("materiId")} value={materiId} />
                <input type="hidden" {...control.register("mataPelajaranId")} value={mataPelajaranId} />
              </form>

              <Divider className="my-4" />
              
              {/* File upload section using the reusable FileUploader component */}
              <div>
                <h3 className="text-sm font-medium mb-2">File Lampiran</h3>
                <FileUploader 
                  files={attachmentFiles}
                  onFilesChange={setAttachmentFiles}
                  maxFiles={5}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose} isDisabled={isSubmitting}>
                Batal
              </Button>
              <Button 
                color="primary" 
                type="submit" 
                form="assignmentForm" 
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

export default AssignmentModal; 
