import React, { useEffect, useState } from "react";
import Image from "next/image";
import PageContainer from "../../../commons/PageContainer";
import PageHeader from "../../../commons/PageHeader";
import { FiEdit, FiPlus } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
import { getTeachers, createTeacher, updateTeacher, deleteTeacher } from "../../../../services/admin.service";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import CreateEditTeacherModal from "./CreateEditTeacherModal";
import DeleteConfirmationModal from "../DataAkun/DeleteConfirmationModal";
import { Button } from "@nextui-org/react";
import TablePagination from "../../../commons/Table/TablePagination";
import { Teacher, TeacherInput } from "../../../../types/TeacherTypes";

interface PaginationData {
  total: number;
  totalPages: number;
  current: number;
}

const DataGuru: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    totalPages: 0,
    current: 1,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTeachers = async (page: number = 1, search: string = "") => {
    try {
      setPagination(prev => ({ ...prev, current: page }));
      setLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await getTeachers({ page, limit: 50, search });
      
      if (response.data.length === 0 && page > 1) {
        const prevPage = page - 1;
        const prevResponse = await getTeachers({ page: prevPage, limit: 50, search });
        setTeachers(prevResponse.data);
        setPagination({
          total: prevResponse.pagination.total,
          totalPages: prevResponse.pagination.totalPages,
          current: prevPage,
        });
      } else {
        setTeachers(response.data);
        setPagination({
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
          current: page,
        });
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers(1, searchTerm);
  }, [searchTerm]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    fetchTeachers(1, e.target.value);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === pagination.current) return;
    fetchTeachers(newPage, searchTerm);
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedTeacher(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (teacher: Teacher) => {
    setModalMode('edit');
    setSelectedTeacher(teacher);
    setIsModalOpen(true);
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTeacherForDelete, setSelectedTeacherForDelete] = useState<Teacher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDeleteClick = (teacher: Teacher) => {
    setSelectedTeacherForDelete(teacher);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTeacherForDelete) return;
    
    try {
      setIsDeleting(true);
      if (selectedTeacherForDelete && selectedTeacherForDelete._id) {
        await deleteTeacher(selectedTeacherForDelete._id);
      }
      setDeleteModalOpen(false);
      fetchTeachers(pagination.current, searchTerm);
      setError(null);
      setSuccessMessage('Berhasil menghapus data guru');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
      setSelectedTeacherForDelete(null);
    }
  };

  const handleModalSubmit = async (data: TeacherInput) => {
    try {
      setIsSubmitting(true);
      if (modalMode === 'create') {
        await createTeacher(data);
        setIsModalOpen(false);
        fetchTeachers(pagination.current, searchTerm);
        setError(null);
        setSuccessMessage('Berhasil menambah data guru');
      } else if (selectedTeacher?._id) {
        await updateTeacher(selectedTeacher._id, data);
        setIsModalOpen(false);
        fetchTeachers(pagination.current, searchTerm);
        setError(null);
        setSuccessMessage('Berhasil mengupdate data guru');
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
        title="Data Guru"
        description="Halaman untuk mengelola data guru"
      />

      <div className="mb-6 flex justify-between items-center">
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Cari guru..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute right-3 top-2.5 text-gray-400">
            <i className="fas fa-search"></i>
          </span>
        </div>
        <Button 
          color="primary"
          onPress={handleCreate}
          className="px-4 py-2 rounded-lg"
        >
          <FiPlus className="mr-2" />
          Tambah Guru
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

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Lengkap
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NRK
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No. Telepon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teachers.map((teacher) => (
                    <tr key={teacher._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {teacher.fullName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{teacher.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{teacher.nrk}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{teacher.noTelp}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <div className="flex gap-2">
                          <Button
                            isIconOnly
                            color="primary"
                            variant="solid"
                            onPress={() => handleEdit(teacher)}
                            size="sm"
                          >
                            <FiEdit className="text-white text-lg" />
                          </Button>
                          <Button
                            isIconOnly
                            color="danger"
                            variant="solid"
                            onPress={() => handleDeleteClick(teacher)}
                            size="sm"
                          >
                            <RiDeleteBin6Line className="text-white text-lg" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {teachers.length === 0 && !loading && pagination.total === 0 && (
              <div className="text-center py-12">
                <Image
                  src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg"
                  alt="No data"
                  width={384}
                  height={192}
                  className="mx-auto rounded-lg shadow-md mb-4"
                />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Tidak ada data
                </h3>
                <p className="text-gray-500">
                  Belum ada data guru yang tersedia
                </p>
              </div>
            )}

            {teachers.length > 0 && (
              <TablePagination
                total={pagination.total}
                totalPages={pagination.totalPages}
                current={pagination.current}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </>
      )}

      <CreateEditTeacherModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        onSubmit={handleModalSubmit}
        initialData={selectedTeacher}
        mode={modalMode}
        isSubmitting={isSubmitting}
      />
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedTeacherForDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        userName={selectedTeacherForDelete?.fullName || ''}
      />
    </PageContainer>
  );
};

export default DataGuru;
