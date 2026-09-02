import React, { useEffect, useState } from "react";
import PageContainer from "../../../commons/PageContainer";
import PageHeader from "../../../commons/PageHeader";
import { FiEdit, FiPlus } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
import { getStudents, createStudent, updateStudent, deleteStudent } from "../../../../services/admin.service";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import CreateEditStudentModal from "./CreateEditStudentModal";
import DeleteConfirmationModal from "../DataAkun/DeleteConfirmationModal";
import { Button } from "@nextui-org/react";
import TablePagination from "../../../commons/Table/TablePagination";
import Image from "next/image";
import { Student } from "../../../../types/Student";

interface PaginationData {
  total: number;
  totalPages: number;
  current: number;
}

const DataMurid: React.FC = () => {
  const [students, setStudents] = useState<(Student & { _id: string })[]>([]);
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
  const [selectedStudent, setSelectedStudent] = useState<Student & { _id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStudents = async (page: number = 1, search: string = "") => {
    try {
      setPagination(prev => ({ ...prev, current: page }));
      setLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await getStudents({ page, limit: 50, search });
      
      if (response.data.length === 0 && page > 1) {
        const prevPage = page - 1;
        const prevResponse = await getStudents({ page: prevPage, limit: 50, search });
        setStudents(prevResponse.data);
        setPagination({
          total: prevResponse.pagination.total,
          totalPages: prevResponse.pagination.totalPages,
          current: prevPage,
        });
      } else {
        setStudents(response.data);
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
    fetchStudents(1, searchTerm);
  }, [searchTerm]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    fetchStudents(1, e.target.value);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === pagination.current) return;
    fetchStudents(newPage, searchTerm);
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedStudent(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (student: Student & { _id: string }) => {
    setModalMode('edit');
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedStudentForDelete, setSelectedStudentForDelete] = useState<Student & { _id: string }>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDeleteClick = (student: Student & { _id: string }) => {
    setSelectedStudentForDelete(student);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStudentForDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteStudent(selectedStudentForDelete._id);
      setDeleteModalOpen(false);
      fetchStudents(pagination.current, searchTerm);
      setError(null);
      setSuccessMessage('Berhasil menghapus data murid');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
      setSelectedStudentForDelete(undefined);
    }
  };

  const handleModalSubmit = async (data: Student) => {
    try {
      setIsSubmitting(true);
      if (modalMode === 'create') {
        await createStudent(data);
        setIsModalOpen(false);
        fetchStudents(pagination.current, searchTerm);
        setError(null);
        setSuccessMessage('Berhasil menambah data murid');
      } else if (selectedStudent?._id) {
        await updateStudent(selectedStudent._id, data);
        setIsModalOpen(false);
        fetchStudents(pagination.current, searchTerm);
        setError(null);
        setSuccessMessage('Berhasil mengupdate data murid');
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
        title="Data Murid"
        description="Halaman untuk mengelola data murid"
      />

      <div className="mb-6 flex justify-between items-center">
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Cari murid..."
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
          Tambah Murid
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
                      NIS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kelas
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
                  {students.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {student.fullName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{student.nis}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{student.kelas}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{student.noTelp}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <div className="flex gap-2">
                          <Button
                            isIconOnly
                            color="primary"
                            variant="solid"
                            onPress={() => handleEdit(student)}
                            size="sm"
                          >
                            <FiEdit className="text-white text-lg" />
                          </Button>
                          <Button
                            isIconOnly
                            color="danger"
                            variant="solid"
                            onPress={() => handleDeleteClick(student)}
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

            {students.length === 0 && !loading && pagination.total === 0 && (
              <div className="text-center py-12">
                <div className="mx-auto h-48 w-auto rounded-lg shadow-md mb-4 relative">
                  <Image
                    src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg"
                    alt="No data"
                    fill
                    style={{ objectFit: "cover" }}
                    className="rounded-lg"
                  />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Tidak ada data
                </h3>
                <p className="text-gray-500">
                  Belum ada data murid yang tersedia
                </p>
              </div>
            )}

            {students.length > 0 && (
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

      <CreateEditStudentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        onSubmit={handleModalSubmit}
        initialData={selectedStudent}
        mode={modalMode}
      />
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedStudentForDelete(undefined);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        userName={selectedStudentForDelete?.fullName || ''}
      />
    </PageContainer>
  );
};

export default DataMurid;
