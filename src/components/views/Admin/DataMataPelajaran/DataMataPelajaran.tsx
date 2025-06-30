import React, { useEffect, useState } from "react";
import PageContainer from "../../../commons/PageContainer";
import PageHeader from "../../../commons/PageHeader";
import { FiPlus } from "react-icons/fi";
import { getMataPelajaran, createMataPelajaran, updateMataPelajaran, deleteMataPelajaran, getTeachers } from "../../../../services/admin.service";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import CreateEditMataPelajaranModal from "./CreateEditMataPelajaranModal";
import DeleteConfirmationModal from "../DataAkun/DeleteConfirmationModal";
import { Button } from "@nextui-org/react";
import { MataPelajaran, TeacherOption, TeacherData } from "../../../../types/MataPelajaran";
import DataTable from "../../../commons/Table/DataTable";
import SearchInput from "../../../commons/SearchInput/SearchInput";
import useTableData from "../../../../hooks/useTableData";

interface ExtendedMataPelajaran extends Omit<MataPelajaran, 'guru'> {
  _id: string;
  guru: string | TeacherData;
  guruName?: string;
}

const DataMataPelajaran: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedMataPelajaran, setSelectedMataPelajaran] = useState<ExtendedMataPelajaran>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<ExtendedMataPelajaran>();
  const [isDeleting, setIsDeleting] = useState(false);

  const enrichMataPelajaranData = (data: any[]): ExtendedMataPelajaran[] => {
    if (!Array.isArray(data)) {
      console.error('Invalid data format received:', data);
      return [];
    }
    
    return data.map(item => {
      // Ensure item exists and has necessary properties
      if (!item) return {} as ExtendedMataPelajaran;
      
      // Handle different guru data formats
      let guruName = 'Unknown';
      if (typeof item.guru === 'object' && item.guru && item.guru.fullName) {
        guruName = item.guru.fullName;
      } else if (typeof item.guru === 'string') {
        guruName = 'ID: ' + item.guru;
      }
      
      return {
        ...item,
        _id: item._id || '',
        guruName
      };
    });
  };

  const fetchTeachers = async () => {
    try {
      const response = await getTeachers({ limit: 100 });
      setTeachers(response.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const {
    data: mataPelajarans,
    loading,
    pagination,
    searchTerm,
    handleSearch,
    handlePageChange,
    refreshData
  } = useTableData<ExtendedMataPelajaran>({
    fetchData: async (page, search) => {
      try {
        const response = await getMataPelajaran({ page, limit: 50, search });
        
        // Ensure response has the expected structure
        if (!response.data || !response.pagination) {
          return {
            data: [],
            pagination: {
              total: 0,
              totalPages: 0
            }
          };
        }
        
        return {
          data: enrichMataPelajaranData(response.data),
          pagination: {
            total: response.pagination.total || 0,
            totalPages: response.pagination.totalPages || 0
          }
        };
      } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
      }
    }
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleCreate = () => {
    setModalMode('create');
    setSelectedMataPelajaran(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (mataPelajaran: ExtendedMataPelajaran) => {
    setModalMode('edit');
    setSelectedMataPelajaran(mataPelajaran);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (mataPelajaran: ExtendedMataPelajaran) => {
    setSelectedForDelete(mataPelajaran);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedForDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteMataPelajaran(selectedForDelete._id);
      setDeleteModalOpen(false);
      refreshData();
      setError(null);
      setSuccessMessage('Berhasil menghapus mata pelajaran');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
      setSelectedForDelete(undefined);
    }
  };

  const handleModalSubmit = async (data: MataPelajaran) => {
    try {
      setIsSubmitting(true);
      if (modalMode === 'create') {
        await createMataPelajaran(data);
        setIsModalOpen(false);
        refreshData();
        setError(null);
        setSuccessMessage('Berhasil menambah mata pelajaran');
      } else if (selectedMataPelajaran?._id) {
        await updateMataPelajaran(selectedMataPelajaran._id, data);
        setIsModalOpen(false);
        refreshData();
        setError(null);
        setSuccessMessage('Berhasil mengupdate mata pelajaran');
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
      key: 'judul', 
      label: 'Judul',
      render: (value: string) => (
        <div className="text-sm font-medium text-gray-900">{value}</div>
      )
    },
    { 
      key: 'kategori', 
      label: 'Kategori',
      render: (value: string) => (
        <div className="text-sm text-gray-500">{value}</div>
      )
    },
    { 
      key: 'guruName', 
      label: 'Guru',
      render: (value: string) => (
        <div className="text-sm text-gray-500">{value}</div>
      )
    },
    { 
      key: 'deskripsi', 
      label: 'Deskripsi',
      render: (value: string) => {
        const maxLength = 30;
        const truncated = value.length > maxLength ? value.substring(0, maxLength) + '...' : value;
        return (
          <div className="text-sm text-gray-500" title={value}>
            {truncated}
          </div>
        );
      }
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
        title="Data Mata Pelajaran"
        description="Halaman untuk mengelola data mata pelajaran"
      />

      {/* Search and Add New Button */}
      <div className="mb-6 flex justify-between items-center">
        <SearchInput
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Cari mata pelajaran..."
        />
        <Button 
          color="primary"
          onPress={handleCreate}
          className="px-4 py-2 rounded-lg"
        >
          <FiPlus className="mr-2" />
          Tambah Mata Pelajaran
        </Button>
      </div>

      {/* Notifications */}
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={mataPelajarans || []}
        pagination={pagination}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        isLoading={loading}
      />

      {/* Modals */}
      <CreateEditMataPelajaranModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        onSubmit={handleModalSubmit}
        initialData={selectedMataPelajaran ? {
          ...selectedMataPelajaran,
          guru: typeof selectedMataPelajaran.guru === 'object' ? selectedMataPelajaran.guru._id : selectedMataPelajaran.guru
        } : undefined}
        mode={modalMode}
        isSubmitting={isSubmitting}
        teachers={teachers}
      />
      
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedForDelete(undefined);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        userName={selectedForDelete?.judul || ''}
      />
    </PageContainer>
  );
};

export default DataMataPelajaran;
