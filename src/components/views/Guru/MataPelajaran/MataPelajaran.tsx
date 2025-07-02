import React, { useState, useEffect } from "react";
import PageContainer from "../../../commons/PageContainer";
import PageHeader from "../../../commons/PageHeader";
import { getGuruMataPelajaran, createGuruMataPelajaran, updateGuruMataPelajaran, deleteGuruMataPelajaran, getCurrentTeacher } from "../../../../services/guru.service";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import { Button } from "@nextui-org/react";
import DataTable from "../../../commons/Table/DataTable";
import SearchInput from "../../../commons/SearchInput/SearchInput";
import useTableData from "../../../../hooks/useTableData";
import { useRouter } from "next/router";
import { FiEdit, FiEye, FiPlus } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
import CreateEditMataPelajaranModal from "./CreateEditMataPelajaranModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { MataPelajaran as IMataPelajaran, TeacherData } from "../../../../types/MataPelajaran";

interface ExtendedMataPelajaran extends Omit<IMataPelajaran, 'guru'> {
  _id: string;
  guru: string | TeacherData;
  guruName?: string;
}

const MataPelajaran: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  const [teacherId, setTeacherId] = useState<string>("");
  const [teacherName, setTeacherName] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedMataPelajaran, setSelectedMataPelajaran] = useState<ExtendedMataPelajaran>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<ExtendedMataPelajaran>();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const teacher = await getCurrentTeacher();
        setTeacherId(teacher._id);
        setTeacherName(teacher.fullName);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchTeacherData();
  }, []);

  const enrichMataPelajaranData = (data: any[]): ExtendedMataPelajaran[] => {
    if (!Array.isArray(data)) {
      console.error('Invalid data format received:', data);
      return [];
    }
    
    return data.map(item => {
      if (!item) return {} as ExtendedMataPelajaran;
      
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
        const response = await getGuruMataPelajaran({ page, limit: 50, search });
        
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

  const handleViewDetails = (mataPelajaran: ExtendedMataPelajaran) => {
    router.push(`/guru/matapelajaran/${mataPelajaran._id}`);
  };

  const handleDeleteClick = (mataPelajaran: ExtendedMataPelajaran) => {
    setSelectedForDelete(mataPelajaran);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedForDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteGuruMataPelajaran(selectedForDelete._id);
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

  const handleModalSubmit = async (data: IMataPelajaran) => {
    try {
      setIsSubmitting(true);
      if (modalMode === 'create') {
        await createGuruMataPelajaran(data);
        setIsModalOpen(false);
        refreshData();
        setError(null);
        setSuccessMessage('Berhasil menambah mata pelajaran');
      } else if (selectedMataPelajaran?._id) {
        await updateGuruMataPelajaran(selectedMataPelajaran._id, data);
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
      key: 'tingkatKelas', 
      label: 'Tingkat Kelas',
      render: (value: string) => (
        <div className="text-sm text-gray-500">{value}</div>
      )
    },
    { 
      key: 'deskripsi', 
      label: 'Deskripsi',
      render: (value: string, row: any) => {
        const maxLength = 30;
        const truncated = value.length > maxLength ? value.substring(0, maxLength) + '...' : value;
        return (
          <div className="text-sm text-gray-500" title={value}>
            {truncated}
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: any, row: ExtendedMataPelajaran) => (
        <div className="flex gap-2">
          <Button
            isIconOnly
            color="primary"
            size="sm"
            onPress={() => handleViewDetails(row)}
          >
            <FiEye size={16} />
          </Button>
          <Button
            isIconOnly
            color="primary"
            size="sm"
            onPress={() => handleEdit(row)}
          >
            <FiEdit size={16} />
          </Button>
          <Button
            isIconOnly
            color="danger"
            size="sm"
            onPress={() => handleDeleteClick(row)}
          >
            <RiDeleteBin6Line size={16} />
          </Button>
        </div>
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
        title="Mata Pelajaran"
        description="Daftar mata pelajaran yang Anda ajar"
      />

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
        data={mataPelajarans || []}
        pagination={pagination}
        onPageChange={handlePageChange}
        isLoading={loading}
        showActions={false}
      />

      {teacherId && (
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
          teacherId={teacherId}
          teacherName={teacherName}
        />
      )}
      
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedForDelete(undefined);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        mataPelajaranTitle={selectedForDelete?.judul || ''}
      />
    </PageContainer>
  );
};

export default MataPelajaran; 
