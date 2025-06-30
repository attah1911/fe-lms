import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Spinner } from "@nextui-org/react";
import DashboardLayout from "../../../components/layouts/DashboardLayout";
import PageContainer from "../../../components/commons/PageContainer";
import NotificationAlert from "../../../components/commons/NotificationAlert/NotificationAlert";
import { getMataPelajaranById, getEnrolledStudents } from "../../../services/mataPelajaran.service";
import { MataPelajaran, EnrolledStudent } from "../../../types/MataPelajaran";
import { SessionExtended } from "../../../types/Auth";
import { Card, CardBody, Divider, Button, Chip, Tab, Tabs, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@nextui-org/react";
import { FiArrowLeft, FiPlus, FiDownload, FiCalendar, FiClipboard, FiEye, FiRefreshCw } from "react-icons/fi";
import { getMateriByMataPelajaranId, createMateriPelajaran } from "../../../services/materiPelajaran.service";
import { getAssignmentsByMateriId, createAssignment } from "../../../services/assignment.service";
import { Assignment, CreateAssignmentInput } from "../../../types/Assignment";
import { getFileNameFromUrl, downloadFile } from "@/utils/fileUtils";
import { toast } from "sonner";
import CreateMateriPelajaranModal from "../../../components/views/Admin/DataMateriPelajaran/CreateMateriPelajaranModal";
import AssignmentModal from "../../../components/views/Admin/DataMateriPelajaran/AssignmentModal";

// Define the Materi interface since it's not exported from materiPelajaran.service
interface Materi {
  _id: string;
  judul: string;
  order: number;
  konten: {
    teks: string;
    files?: Array<string | { url: string; name: string }>;
  };
}

const MataPelajaranDetail: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession() as { data: SessionExtended | null };
  
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [isMateriModalOpen, setIsMateriModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mataPelajaran, setMataPelajaran] = useState<MataPelajaran | null>(null);
  const [materiList, setMateriList] = useState<Materi[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [activeTab, setActiveTab] = useState<string>("materi");
  
  useEffect(() => {
    // Check for tab parameter in URL
    if (router.query.tab) {
      setActiveTab(router.query.tab as string);
    }
  }, [router.query]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch mata pelajaran details
        const mataPelajaranResponse = await getMataPelajaranById(id as string);
        setMataPelajaran(mataPelajaranResponse.data);
        
        // Fetch materi pelajaran list
        const materiResponse = await getMateriByMataPelajaranId(id as string);
        setMateriList(materiResponse.data);
        
        setError(null);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  // Separate effect for handling tab changes and fetching tab-specific data
  useEffect(() => {
    // Fetch assignments when switching to tugas tab
    if (activeTab === 'tugas' && materiList.length > 0 && assignments.length === 0) {
      fetchAssignments();
    }
    
    // Fetch enrolled students when switching to siswa tab
    if (activeTab === 'siswa' && id && enrolledStudents.length === 0) {
      fetchEnrolledStudents();
    }
  }, [activeTab, materiList.length, id]);
  
  const fetchAssignments = async () => {
    if (!id || materiList.length === 0) return;
    
    try {
      setLoadingAssignments(true);
      // Get assignments for the first materi (as an example)
      // In production you might want to get all assignments for all materis
      const firstMateriId = materiList[0]._id;
      const response = await getAssignmentsByMateriId(firstMateriId);
      setAssignments(response.data);
    } catch (err: any) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoadingAssignments(false);
    }
  };
  
  const fetchEnrolledStudents = async () => {
    if (!id) return;
    
    try {
      setLoadingStudents(true);
      const response = await getEnrolledStudents(id as string);
      setEnrolledStudents(response.data || []);
    } catch (err: any) {
      console.error("Error fetching enrolled students:", err);
      toast.error("Gagal memuat daftar siswa", {
        description: "Terjadi kesalahan saat memuat daftar siswa yang terdaftar.",
        duration: 3000
      });
    } finally {
      setLoadingStudents(false);
    }
  };
  
  const handleBack = () => {
    router.push('/guru/dashboard');
  };
  
  const handleAddMaterial = () => {
    setIsMateriModalOpen(true);
  };
  
  const handleMateriSubmit = async (formData: { judul: string, konten: { teks: string, files?: Array<string | {url: string; name: string}> } }) => {
    if (!id) return;
    
    try {
      setIsAddingMaterial(true);
      setError(null);
      
      // Create material object with proper order
      const newMaterial = {
        ...formData,
        order: materiList.length + 1
      };
      
      // Pass the mata pelajaran ID as the first parameter to the service function
      const response = await createMateriPelajaran(id as string, newMaterial);
      
      // Refresh the materials list
      const materiResponse = await getMateriByMataPelajaranId(id as string);
      setMateriList(materiResponse.data);
      
      // Close the modal and show success toast
      setIsMateriModalOpen(false);
      toast.success("Materi berhasil ditambahkan!", {
        description: `Materi "${formData.judul}" telah ditambahkan ke mata pelajaran.`,
        duration: 3000
      });
    } catch (err: any) {
      console.error("Error adding material:", err);
      
      // Display error toast
      toast.error("Gagal menambahkan materi", {
        description: err.message || "Terjadi kesalahan saat menambahkan materi.",
        duration: 5000
      });
      
      // Display the raw error for debugging in error state
      setError(`${err.message}`);
    } finally {
      setIsAddingMaterial(false);
    }
  };
  
  const handleAddAssignment = () => {
    setIsAssignmentModalOpen(true);
  };
  
  const handleAssignmentSubmit = async (data: CreateAssignmentInput) => {
    try {
      setIsAddingAssignment(true);
      setError(null);

      // Call the actual API endpoint to create an assignment
      const response = await createAssignment(data);
      
      // Update the assignments list with the newly created assignment
      if (response && response.data) {
        // Make sure to add the newly created assignment to our state
        setAssignments(prev => [...prev, response.data]);
      }

      // Close the modal and show success toast
      setIsAssignmentModalOpen(false);
      toast.success("Tugas berhasil ditambahkan!", {
        description: `Tugas "${data.title}" telah berhasil dibuat.`,
        duration: 3000
      });
      
      // If we're in the "materi" tab, switch to the "tugas" tab to show the new assignment
      if (activeTab !== "tugas") {
        setActiveTab("tugas");
      }
    } catch (err: any) {
      console.error("Error adding assignment:", err);
      
      toast.error("Gagal menambahkan tugas", {
        description: err.message || "Terjadi kesalahan saat menambahkan tugas.",
        duration: 5000
      });
      
      setError(`${err.message}`);
    } finally {
      setIsAddingAssignment(false);
    }
  };
  
  const handleTabChange = (key: string | number) => {
    const tabKey = key.toString();
    setActiveTab(tabKey);
    
    // Don't use router.push as it triggers the page loading overlay
    // Instead, just update the state locally
    
    // Fetch assignments if switching to tugas tab
    if (tabKey === 'tugas' && assignments.length === 0 && materiList.length > 0) {
      fetchAssignments();
    }
  };

  // Add handler for file downloads
  const handleDownloadFile = (file: string | { url: string; name: string }) => {
    const fileUrl = typeof file === 'string' ? file : file.url;
    
    // Get the proper filename with extension
    let fileName: string;
    
    if (typeof file === 'string') {
      // For backwards compatibility with old data format
      fileName = getFileNameFromUrl(file);
    } else if (file.name) {
      // For new format with stored filename
      fileName = file.name;
      
      // Ensure file has extension (especially for docx files from Cloudinary)
      if (fileUrl.includes('/documents/word/') && !fileName.toLowerCase().endsWith('.docx')) {
        fileName += '.docx';
      } else if (fileUrl.includes('/documents/pdf/') && !fileName.toLowerCase().endsWith('.pdf')) {
        fileName += '.pdf';
      } else if (fileUrl.includes('/documents/excel/') && !fileName.toLowerCase().endsWith('.xlsx')) {
        fileName += '.xlsx';
      } else if (fileUrl.includes('/documents/presentations/') && 
                !fileName.toLowerCase().endsWith('.pptx') && 
                !fileName.toLowerCase().endsWith('.ppt')) {
        // Only add extension if the file doesn't already have a PowerPoint extension
        fileName += '.pptx';
      }
    } else {
      fileName = 'file';
    }
    
    downloadFile(fileUrl, fileName);
  };

  const renderMaterialList = () => {
    if (!materiList.length) {
      return (
        <Card className="mt-4">
          <CardBody className="py-8">
            <p className="text-center text-gray-500">
              Belum ada materi pelajaran yang tersedia.
            </p>
          </CardBody>
        </Card>
      );
    }

    return (
      <div className="space-y-4 mt-4">
        {materiList.map((materi) => (
          <Card key={materi._id} className="w-full">
            <CardBody className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="w-full">
                  <h3 className="text-lg font-semibold">
                    {materi.order}. {materi.judul}
                  </h3>
                  {materi.konten.teks && (
                    <p className="text-gray-600 text-sm mt-2">
                      {materi.konten.teks.length > 200 
                        ? `${materi.konten.teks.substring(0, 200)}...` 
                        : materi.konten.teks}
                    </p>
                  )}
                </div>
                <div className="flex sm:flex-shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
                  <Button 
                    size="sm"
                    variant="flat"
                    color="primary"
                    startContent={<FiEye size={14} />}
                    onPress={() => {
                      // Store the mataPelajaranId in localStorage before navigation
                      localStorage.setItem('currentMataPelajaranId', id as string);
                      router.push(`/guru/matapelajaran/${id}/materi/${materi._id}`);
                    }}
                    className="w-full sm:w-auto"
                  >
                    Lihat Detail
                  </Button>
                </div>
              </div>
              
              {materi.konten.files && materi.konten.files.length > 0 && (
                <>
                  <Divider className="my-3" />
                  <div>
                    <h4 className="text-sm font-medium mb-2">File Terlampir:</h4>
                    <div className="flex flex-wrap gap-2">
                      {materi.konten.files.map((file, fileIndex) => {
                        // Handle both string URLs and object format with url and name properties
                        const fileUrl = typeof file === 'string' ? file : file.url;
                        const fileName = typeof file === 'string' ? getFileNameFromUrl(file) : file.name;
                        
                        return (
                          <Button
                            key={fileIndex}
                            size="sm"
                            variant="flat"
                            color="default"
                            startContent={<FiDownload size={14} />}
                            onPress={() => handleDownloadFile(file)}
                            className="text-xs"
                          >
                            {fileName}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    );
  };

  const renderAssignmentList = () => {
    if (loadingAssignments) {
      return (
        <Card className="mt-4">
          <CardBody className="py-8">
            <div className="flex justify-center items-center">
              <Spinner size="sm" color="primary" />
              <span className="ml-2 text-gray-500">Memuat data tugas...</span>
            </div>
          </CardBody>
        </Card>
      );
    }

    if (!assignments.length) {
      return (
        <Card className="mt-4">
          <CardBody className="py-8">
            <p className="text-center text-gray-500">
              Belum ada tugas yang tersedia.
            </p>
          </CardBody>
        </Card>
      );
    }

    return (
      <div className="space-y-4 mt-4">
        {assignments.map((assignment) => {
          // Calculate if the deadline is past
          const deadlineDate = new Date(assignment.deadline);
          const isDeadlinePast = deadlineDate < new Date();
          const totalSubmissions = assignment.submissions.length;
          
          return (
            <Card key={assignment._id} className="w-full">
              <CardBody className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{assignment.title}</h3>
                      <Chip 
                        size="sm" 
                        color={isDeadlinePast ? "danger" : "success"}
                        variant="flat"
                      >
                        {isDeadlinePast ? "Berakhir" : "Aktif"}
                      </Chip>
                    </div>
                    <p className="text-gray-600 text-sm">
                      {assignment.description.length > 120 
                        ? `${assignment.description.substring(0, 120)}...` 
                        : assignment.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                      <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center">
                        <FiCalendar size={12} className="mr-1" />
                        Tenggat: {new Date(assignment.deadline).toLocaleDateString('id-ID', { 
                          day: 'numeric', month: 'long', year: 'numeric' 
                        })} {new Date(assignment.deadline).toLocaleTimeString('id-ID', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                      <div className="text-xs flex items-center">
                        <FiClipboard size={14} className="mr-1 sm:w-3 sm:h-3" />
                        <span className="text-xs sm:text-[10px]">Pengumpulan: {totalSubmissions || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:flex-shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
                    <Button 
                      size="sm"
                      variant="flat"
                      color="primary"
                      startContent={<FiEye size={14} />}
                      onPress={() => {
                        router.push(`/guru/matapelajaran/${id}/tugas/${assignment._id}`);
                      }}
                      className="w-full sm:w-auto"
                    >
                      Lihat Detail
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderSubjectInfo = () => {
    if (!mataPelajaran) return null;
    
    return (
      <Card className="w-full">
        <CardBody className="p-5">
          <div className="flex flex-col gap-2">
            <div>
              <span className="text-sm text-gray-500">Kategori:</span>
              <span className="text-sm font-medium ml-2">{mataPelajaran.kategori}</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Kelas:</span>
              <span className="text-sm font-medium ml-2">{mataPelajaran.tingkatKelas}</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Pengajar:</span>
              <span className="text-sm font-medium ml-2">
                {typeof mataPelajaran.guru === 'string' 
                  ? 'Tidak tersedia' 
                  : mataPelajaran.guru?.fullName || 'Tidak tersedia'}
              </span>
            </div>
            
            <Divider className="my-2" />
            
            <div>
              <h3 className="text-sm text-gray-500 mb-1">Deskripsi:</h3>
              <p className="text-sm">{mataPelajaran.deskripsi}</p>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  };

  const renderEnrolledStudents = () => {
    if (loadingStudents) {
      return (
        <div className="flex justify-center py-8">
          <Spinner size="md" color="primary" />
        </div>
      );
    }
    
    return (
      <div className="mt-4">
        <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">Daftar Siswa Terdaftar</h3>
            <span className="inline-block text-xs bg-primary text-white px-2 py-1 rounded-full">
              {enrolledStudents.length} siswa
            </span>
          </div>
          <Button
            size="sm"
            color="primary"
            variant="flat"
            startContent={<FiRefreshCw size={16} />}
            onPress={fetchEnrolledStudents}
            isLoading={loadingStudents}
            className="w-full xs:w-auto"
          >
            Refresh
          </Button>
        </div>
        
        {enrolledStudents.length === 0 ? (
          <Card>
            <CardBody className="py-6">
              <p className="text-center text-gray-500">
                Belum ada murid yang terdaftar.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <Table 
              aria-label="Daftar siswa terdaftar"
              classNames={{
                wrapper: "min-h-[200px]",
              }}
            >
              <TableHeader>
                <TableColumn>NO</TableColumn>
                <TableColumn>NAMA</TableColumn>
                <TableColumn>NIS</TableColumn>
                <TableColumn>KELAS</TableColumn>
                <TableColumn>EMAIL</TableColumn>
              </TableHeader>
              <TableBody>
                {enrolledStudents.map((student, index) => (
                  <TableRow key={student._id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{student.fullName}</TableCell>
                    <TableCell>{student.nis}</TableCell>
                    <TableCell>{student.kelas}</TableCell>
                    <TableCell>{student.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout type="guru">
      <PageContainer className="-mt-20">
        {error && (
          <div className="mb-4 relative z-10">
            <NotificationAlert
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Spinner size="lg" color="primary" />
          </div>
        ) : (
          <>
            <div className="mb-4 relative z-40 pointer-events-auto">
              <Button
                size="md"
                variant="solid"
                color="default"
                startContent={<FiArrowLeft size={16} />}
                onClick={handleBack}
                className="mb-5"
              >
                Kembali
              </Button>
              
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">{mataPelajaran?.judul || 'Detail Mata Pelajaran'}</h1>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 mt-2">
              <div className="md:col-span-1">
                <h3 className="text-lg font-semibold mb-3">Informasi Mata Pelajaran</h3>
                {renderSubjectInfo()}
                
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Aksi</h3>
                  <div className="space-y-2">
                    <Button 
                      startContent={<FiPlus size={16} />} 
                      color="primary" 
                      variant="flat"
                      className="w-full justify-start"
                      onPress={handleAddMaterial}
                    >
                      Tambah Materi Baru
                    </Button>
                    <Button 
                      startContent={<FiPlus size={16} />} 
                      color="primary" 
                      variant="flat"
                      className="w-full justify-start"
                      onPress={handleAddAssignment}
                    >
                      Tambah Tugas Baru
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-3">
                <Tabs 
                  aria-label="Mata Pelajaran Content" 
                  selectedKey={activeTab}
                  onSelectionChange={handleTabChange}
                >
                  <Tab key="materi" title="Materi">
                    {renderMaterialList()}
                  </Tab>
                  <Tab key="tugas" title="Tugas">
                    {renderAssignmentList()}
                  </Tab>
                  <Tab key="siswa" title="Daftar Siswa">
                    {renderEnrolledStudents()}
                  </Tab>
                </Tabs>
              </div>
            </div>
            
            {/* Modal for adding new materials */}
            <CreateMateriPelajaranModal
              isOpen={isMateriModalOpen}
              onClose={() => setIsMateriModalOpen(false)}
              onSubmit={handleMateriSubmit}
              isSubmitting={isAddingMaterial}
            />
            
            {/* Modal for adding new assignment */}
            {mataPelajaran && mataPelajaran._id && materiList.length > 0 && (
              <AssignmentModal
                isOpen={isAssignmentModalOpen}
                onClose={() => setIsAssignmentModalOpen(false)}
                onSubmit={handleAssignmentSubmit}
                isSubmitting={isAddingAssignment}
                materiId={materiList[0]._id}  // Default to first material
                mataPelajaranId={mataPelajaran._id}
                mode="create"
              />
            )}
          </>
        )}
      </PageContainer>
    </DashboardLayout>
  );
};

export default MataPelajaranDetail; 