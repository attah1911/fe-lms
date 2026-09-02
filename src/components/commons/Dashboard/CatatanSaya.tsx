import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Spinner, Button, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@nextui-org/react";
import { FiList, FiPlus, FiAlertTriangle } from "react-icons/fi";

import todoService, { Todo } from "../../../services/todo.service";
import { formatTanggal } from "@/utils/date";
import NoteCard from "../NoteCard";

interface CatatanSayaProps {
  /** gate the fetch on the session being ready */
  enabled?: boolean;
  /** the dashboards own the page-level alert banners */
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

/**
 * "Catatan Saya" — personal notes, identical for guru and murid (same endpoint,
 * same CRUD). Owns its own query + mutations; the host only renders messages.
 */
const CatatanSaya: React.FC<CatatanSayaProps> = ({ enabled = true, onSuccess, onError }) => {
  const queryClient = useQueryClient();

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => (await todoService.getTodos()).data,
    enabled,
  });

  const invalidateTodos = () => queryClient.invalidateQueries({ queryKey: ["todos"] });

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onOpenDeleteModal, onClose: onCloseDeleteModal } = useDisclosure();
  const [isEdit, setIsEdit] = useState(false);
  const [currentTodo, setCurrentTodo] = useState<Todo | null>(null);
  const [todoToDelete, setTodoToDelete] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setCurrentTodo(null);
    setIsEdit(false);
  };

  const saveMutation = useMutation({
    mutationFn: (todo: Omit<Todo, "_id" | "createdAt" | "updatedAt">) =>
      isEdit && currentTodo?._id
        ? todoService.updateTodo(currentTodo._id, todo)
        : todoService.createTodo(todo),
    onSuccess: () => {
      onSuccess?.(isEdit ? "Berhasil memperbarui catatan" : "Berhasil menambahkan catatan");
      onClose();
      resetForm();
      invalidateTodos();
    },
    onError: (err: Error) => onError?.(err.message || "Gagal menyimpan catatan"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => todoService.deleteTodo(id),
    onSuccess: () => {
      onSuccess?.("Berhasil menghapus catatan");
      onCloseDeleteModal();
      setTodoToDelete(null);
      invalidateTodos();
    },
    onError: (err: Error) => onError?.(err.message || "Gagal menghapus catatan"),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => todoService.toggleTodoStatus(id),
    onSuccess: invalidateTodos,
    onError: (err: Error) => onError?.(err.message || "Gagal mengubah status catatan"),
  });

  const handleAdd = () => {
    resetForm();
    onOpen();
  };

  const handleEdit = (todo: Todo) => {
    setCurrentTodo(todo);
    setTitle(todo.title);
    setDescription(todo.description || "");
    setDueDate(todo.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : "");
    setIsEdit(true);
    onOpen();
  };

  const handleConfirmDelete = (id: string) => {
    setTodoToDelete(id);
    onOpenDeleteModal();
  };

  const handleSave = () => {
    if (!title) {
      onError?.("Judul catatan harus diisi");
      return;
    }

    saveMutation.mutate({
      title,
      description,
      dueDate: dueDate || undefined,
      completed: isEdit ? currentTodo?.completed || false : false,
    });
  };

  return (
    <>
      <Card className="h-full">
        <CardBody className="p-4 md:p-3">
          <div className="flex items-center justify-between mb-4 md:mb-3">
            <div className="flex items-center">
              <FiList size={24} className="text-primary mr-2 md:text-xl" />
              <h3 className="text-lg font-semibold md:text-base">Catatan Saya</h3>
            </div>
            <Button
              color="primary"
              variant="light"
              startContent={<FiPlus className="md:text-sm" />}
              onPress={handleAdd}
              size="sm"
              className="md:min-w-0 md:px-3 md:text-xs"
            >
              <span className="block md:hidden">Tambah Catatan</span>
              <span className="hidden md:block">Tambah</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8 md:py-4">
              <Spinner size="sm" />
            </div>
          ) : todos.length === 0 ? (
            <p className="text-center text-gray-500 py-4 md:py-2 md:text-sm">
              <span className="block md:hidden">Belum ada Catatan yang tersedia. Klik &quot;Tambah Catatan&quot; untuk membuat Note baru.</span>
              <span className="hidden md:block">Belum ada Notes. Klik &quot;Tambah&quot; untuk membuat baru.</span>
            </p>
          ) : (
            <div className="space-y-3 md:space-y-2">
              {todos.map((todo) => (
                <NoteCard
                  key={todo._id}
                  note={{
                    _id: todo._id,
                    title: todo.title,
                    description: todo.description,
                    dueDate: todo.dueDate,
                    completed: todo.completed,
                  }}
                  onToggleStatus={(id) => toggleMutation.mutate(id)}
                  onEdit={handleEdit}
                  onDelete={handleConfirmDelete}
                  formatDate={formatTanggal}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>{isEdit ? "Edit Catatan" : "Tambah Catatan Baru"}</ModalHeader>
          <ModalBody>
            <Input
              label="Judul"
              placeholder="Masukkan judul catatan"
              value={title}
              onValueChange={setTitle}
              isRequired
            />
            <Textarea
              label="Deskripsi (opsional)"
              placeholder="Masukkan deskripsi catatan"
              value={description}
              onValueChange={setDescription}
            />
            <Input
              label="Tenggat Waktu (opsional)"
              placeholder="Pilih tanggal"
              type="date"
              value={dueDate}
              onValueChange={setDueDate}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              Batal
            </Button>
            <Button color="primary" onPress={handleSave} isLoading={saveMutation.isPending}>
              Simpan
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={onCloseDeleteModal}>
        <ModalContent>
          <ModalHeader className="flex gap-1">
            <FiAlertTriangle className="text-danger" size={24} />
            Konfirmasi Hapus
          </ModalHeader>
          <ModalBody>
            <p>Apakah Anda yakin ingin menghapus catatan ini?</p>
            <p className="text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onCloseDeleteModal}>
              Batal
            </Button>
            <Button
              color="danger"
              onPress={() => todoToDelete && deleteMutation.mutate(todoToDelete)}
              isLoading={deleteMutation.isPending}
            >
              Hapus
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CatatanSaya;
