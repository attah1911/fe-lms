import React, { useEffect, useState } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  Button, 
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Input,
  Chip
} from "@nextui-org/react";
import { EnrolledStudent } from "../../../../types/MataPelajaran";
import { getStudents } from "../../../../services/admin.service";
import { FiSearch, FiUserPlus, FiUserX } from "react-icons/fi";
import { Student } from "../../../../types/Student";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import { toast } from "sonner";
import { getEnrolledStudents, enrollStudent, unenrollStudent } from "../../../../services/mataPelajaran.service";

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mataPelajaranId: string;
  mataPelajaranTitle: string;
}

const EnrollmentModal: React.FC<EnrollmentModalProps> = ({
  isOpen,
  onClose,
  mataPelajaranId,
  mataPelajaranTitle
}) => {
  const [loading, setLoading] = useState(true);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'enrolled' | 'available'>('enrolled');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchEnrolledStudents = async () => {
    try {
      setLoading(true);
      
      // Use the actual API call to get enrolled students
      const response = await getEnrolledStudents(mataPelajaranId);
      setEnrolledStudents(response.data || []);
      setError(null);
      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching enrolled students:", err);
      setError("Tidak dapat memuat daftar murid yang terdaftar.");
      setEnrolledStudents([]); // Set to empty array on error
      setLoading(false);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      setLoading(true);
      const response = await getStudents({ limit: 100 });
      
      // Filter out already enrolled students
      const enrolledIds = enrolledStudents.map(student => student._id);
      const available = response.data.filter((student: Student) => 
        !enrolledIds.includes(student._id as string)
      );
      
      setAvailableStudents(available);
      setError(null);
      setLoading(false);
    } catch (err: any) {
      setError("Gagal memuat daftar murid yang tersedia.");
      console.error("Error fetching available students:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && mataPelajaranId) {
      fetchEnrolledStudents();
    }
  }, [isOpen, mataPelajaranId]);

  useEffect(() => {
    if (activeTab === 'available' && isOpen) {
      fetchAvailableStudents();
    }
  }, [activeTab, isOpen, enrolledStudents]);

  const handleEnrollStudent = async (studentId: string) => {
    try {
      setIsProcessing(true);
      
      // Use the actual API call to enroll a student
      await enrollStudent(mataPelajaranId, studentId);
      
      // After successful enrollment, update the local state
      const studentToEnroll = availableStudents.find(student => student._id === studentId);
      if (studentToEnroll) {
        const newEnrolledStudent: EnrolledStudent = {
          _id: studentToEnroll._id as string,
          fullName: studentToEnroll.fullName,
          email: studentToEnroll.email,
          nis: studentToEnroll.nis,
          kelas: studentToEnroll.kelas
        };
        
        setEnrolledStudents(prev => [...prev, newEnrolledStudent]);
        setAvailableStudents(prev => prev.filter(student => student._id !== studentId));
      }
      
      toast.success("Murid berhasil ditambahkan ke mata pelajaran");
      setActiveTab('enrolled');
      setError(null);
      setIsProcessing(false);
    } catch (err: any) {
      setError("Gagal menambahkan murid ke mata pelajaran.");
      console.error("Error enrolling student:", err);
      setIsProcessing(false);
    }
  };

  const handleUnenrollStudent = async (studentId: string) => {
    try {
      setIsProcessing(true);
      
      // Use the actual API call to unenroll a student
      await unenrollStudent(mataPelajaranId, studentId);
      
      // After successful unenrollment, update the local state
      setEnrolledStudents(prev => prev.filter(student => student._id !== studentId));
      
      toast.success("Murid berhasil dihapus dari mata pelajaran");
      setError(null);
      setIsProcessing(false);
    } catch (err: any) {
      setError("Gagal menghapus murid dari mata pelajaran.");
      console.error("Error unenrolling student:", err);
      setIsProcessing(false);
    }
  };

  const filteredEnrolledStudents = enrolledStudents.filter(student => 
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.nis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAvailableStudents = availableStudents.filter(student => 
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.nis && student.nis.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      backdrop="blur"
      placement="center"
      size="3xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">
                Daftar Murid - {mataPelajaranTitle}
              </h3>
            </ModalHeader>
            <ModalBody>
              {/* Notifications */}
              {error && (
                <NotificationAlert
                  type="error"
                  message={error}
                  onClose={() => setError(null)}
                />
              )}
              {success && (
                <NotificationAlert
                  type="success"
                  message={success}
                  onClose={() => setSuccess(null)}
                />
              )}

              {/* Tabs */}
              <div className="flex border-b mb-4">
                <button
                  className={`px-4 py-2 ${
                    activeTab === 'enrolled'
                      ? 'border-b-2 border-primary text-primary font-medium'
                      : 'text-gray-500'
                  }`}
                  onClick={() => setActiveTab('enrolled')}
                >
                  Murid Terdaftar
                  {enrolledStudents.length > 0 && (
                    <span className="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                      {enrolledStudents.length}
                    </span>
                  )}
                </button>
                <button
                  className={`px-4 py-2 ${
                    activeTab === 'available'
                      ? 'border-b-2 border-primary text-primary font-medium'
                      : 'text-gray-500'
                  }`}
                  onClick={() => setActiveTab('available')}
                >
                  Tambah Murid
                  {availableStudents.length > 0 && (
                    <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                      {availableStudents.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Search */}
              <div className="mb-4">
                <Input
                  placeholder="Cari murid..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  startContent={<FiSearch className="text-gray-400" />}
                />
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" color="primary" />
                </div>
              ) : activeTab === 'enrolled' ? (
                // Enrolled Students Table
                filteredEnrolledStudents.length > 0 ? (
                  <Table aria-label="Enrolled students table">
                    <TableHeader>
                      <TableColumn>NO</TableColumn>
                      <TableColumn>NAMA</TableColumn>
                      <TableColumn>NIS</TableColumn>
                      <TableColumn>KELAS</TableColumn>
                      <TableColumn>EMAIL</TableColumn>
                      <TableColumn>AKSI</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {filteredEnrolledStudents.map((student, index) => (
                        <TableRow key={student._id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{student.fullName}</TableCell>
                          <TableCell>{student.nis}</TableCell>
                          <TableCell>{student.kelas}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              color="danger"
                              variant="flat"
                              isIconOnly
                              onPress={() => handleUnenrollStudent(student._id)}
                              isLoading={isProcessing}
                            >
                              <FiUserX size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Belum ada murid yang terdaftar pada mata pelajaran ini.
                  </div>
                )
              ) : (
                // Available Students Table
                filteredAvailableStudents.length > 0 ? (
                  <Table aria-label="Available students table">
                    <TableHeader>
                      <TableColumn>NO</TableColumn>
                      <TableColumn>NAMA</TableColumn>
                      <TableColumn>NIS</TableColumn>
                      <TableColumn>KELAS</TableColumn>
                      <TableColumn>EMAIL</TableColumn>
                      <TableColumn>AKSI</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {filteredAvailableStudents.map((student, index) => (
                        <TableRow key={student._id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{student.fullName}</TableCell>
                          <TableCell>{student.nis}</TableCell>
                          <TableCell>{student.kelas}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              color="primary"
                              variant="flat"
                              isIconOnly
                              onPress={() => handleEnrollStudent(student._id as string)}
                              isLoading={isProcessing}
                            >
                              <FiUserPlus size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Tidak ada murid yang tersedia untuk ditambahkan.
                  </div>
                )
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Tutup
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default EnrollmentModal; 
