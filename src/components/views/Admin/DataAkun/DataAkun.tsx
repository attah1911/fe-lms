import React, { useState, useEffect } from "react";
import PageContainer from "../../../commons/PageContainer";
import PageHeader from "../../../commons/PageHeader";
import { FiPlus } from "react-icons/fi";
import { getUsers, createUser, updateUser, deleteUser } from "../../../../services/admin.service";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import CreateEditUserModal, { UserSubmitData } from "./CreateEditUserModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { Button } from "@nextui-org/react";
import DataTable from "../../../commons/Table/DataTable";
import SearchInput from "../../../commons/SearchInput/SearchInput";
import useTableData from "../../../../hooks/useTableData";

interface User {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
}

const DataAkun: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: users,
    loading,
    pagination,
    searchTerm,
    handleSearch,
    handlePageChange,
    refreshData
  } = useTableData<User>({
    fetchData: async (page, search) => {
      const response = await getUsers({ page, limit: 50, search });
      return {
        data: response.data,
        pagination: {
          total: response.pagination.total,
          totalPages: response.pagination.totalPages
        }
      };
    }
  });

  const handleCreate = () => {
    setModalMode('create');
    setSelectedUser(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setModalMode('edit');
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUserForDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUserForDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteUser(selectedUserForDelete._id);
      setDeleteModalOpen(false);
      refreshData();
      setError(null);
      setSuccessMessage('Berhasil menghapus data pengguna');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
      setSelectedUserForDelete(null);
    }
  };

  const handleModalSubmit = async (data: UserSubmitData) => {
    try {
      setIsSubmitting(true);
      if (modalMode === 'create') {
        await createUser(data);
        setIsModalOpen(false);
        refreshData();
        setError(null);
        setSuccessMessage('Berhasil membuat akun pengguna baru');
      } else if (selectedUser?._id) {
        await updateUser(selectedUser._id, data);
        setIsModalOpen(false);
        refreshData();
        setError(null);
        setSuccessMessage('Berhasil mengupdate data pengguna');
      }
    } catch (err: any) {
      setError(err.message);
      if (err.message.includes("tidak memiliki izin") || err.message.includes("Sesi Anda telah berakhir")) {
        setIsModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { 
      key: 'fullName', 
      label: 'Nama Lengkap',
      render: (value: string) => (
        <div className="text-sm font-medium text-gray-900">{value}</div>
      )
    },
    { 
      key: 'username', 
      label: 'Username',
      render: (value: string) => (
        <div className="text-sm text-gray-500">{value}</div>
      )
    },
    { 
      key: 'email', 
      label: 'Email',
      render: (value: string) => (
        <div className="text-sm text-gray-500">{value}</div>
      )
    },
    { 
      key: 'role', 
      label: 'Role',
      render: (value: string) => (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          {value}
        </span>
      )
    },
    { 
      key: 'isActive', 
      label: 'Status',
      render: (value: boolean) => (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {value ? "Active" : "Inactive"}
        </span>
      )
    }
  ];

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <PageContainer>
      <PageHeader
        title="Data Akun"
        description="Halaman untuk mengelola data akun pengguna"
      />

      <div className="mb-6 flex justify-between items-center">
        <SearchInput
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Cari pengguna..."
        />
        <Button 
          color="primary"
          onPress={handleCreate}
          className="px-4 py-2 rounded-lg"
        >
          <FiPlus className="mr-2" />
          Tambah Akun
        </Button>
      </div>

      <div className="relative z-50">
        {error && (
          <NotificationAlert
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}
        {successMessage && (
          <NotificationAlert
            type="success"
            message={successMessage}
            onClose={() => setSuccessMessage(null)}
          />
        )}
      </div>

      <DataTable
        columns={columns}
        data={users}
        pagination={pagination}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        isLoading={loading}
      />

      {isModalOpen && (
        <CreateEditUserModal
          isOpen={true}
          onClose={() => {
            setIsModalOpen(false);
            setError(null);
          }}
          onSubmit={handleModalSubmit}
          initialData={selectedUser}
          mode={modalMode}
          isSubmitting={isSubmitting}
        />
      )}
      {deleteModalOpen && (
        <DeleteConfirmationModal
          isOpen={true}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedUserForDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
          userName={selectedUserForDelete?.fullName || ''}
        />
      )}
    </PageContainer>
  );
};

export default DataAkun;
