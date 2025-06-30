import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Card, CardBody, Divider, Button, Spinner, Chip, Tab, Tabs } from "@nextui-org/react";
import { FiArrowLeft, FiPlus, FiDownload, FiUsers, FiCalendar, FiClipboard, FiEye } from "react-icons/fi";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import DashboardLayout from "../../../components/layouts/DashboardLayout";
import PageContainer from "../../../components/commons/PageContainer";
import NotificationAlert from "../../../components/commons/NotificationAlert/NotificationAlert";
import { getMataPelajaranById } from "../../../services/admin.service";
import { getMateriByMataPelajaranId, createMateriPelajaran } from "../../../services/materiPelajaran.service";
import { getAssignmentsByMateriId, createAssignment } from "../../../services/assignment.service";
import CreateMateriPelajaranModal from "../../../components/views/Admin/DataMateriPelajaran/CreateMateriPelajaranModal";
import EnrollmentModal from "../../../components/views/Admin/DataMataPelajaran/EnrollmentModal";
import AssignmentModal from "../../../components/views/Admin/DataMateriPelajaran/AssignmentModal";
import AssignmentSubmissionsModal from "../../../components/views/Admin/DataMateriPelajaran/AssignmentSubmissionsModal";
import { getFileNameFromUrl, downloadFile } from "@/utils/fileUtils";
import { EnrolledStudent } from "../../../types/MataPelajaran";
import { Assignment, CreateAssignmentInput, SubmissionStatus } from "../../../types/Assignment";

interface Materi {
  _id: string;
  judul: string;
  konten: {
    teks?: string;
    files?: Array<string | {url: string; name: string}>;
  };
  order: number;
  createdAt: string;
}

interface MataPelajaran {
  _id: string;
  judul: string;
  deskripsi: string;
  kategori: string;
  tingkatKelas: string;
  guru: {
    _id: string;
    fullName: string;
  };
  enrolledStudents?: EnrolledStudent[];
}

const MataPelajaranDetail: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mataPelajaran, setMataPelajaran] = useState<MataPelajaran | null>(null);
  const [materiList, setMateriList] = useState<Materi[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [isMateriModalOpen, setIsMateriModalOpen] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("materi");
  
  // Check if user has permission to add materials
  // For now, allow all users with admin role regardless of the teacher check
  const hasPermission = session?.user?.role === 'admin' || session?.user?.role === 'guru';

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
        
        // Fetch learning materials
        try {
          const materiResponse = await getMateriByMataPelajaranId(id as string);
          const materials = materiResponse.data || [];
          setMateriList(materials);
        } catch (materiErr: any) {
          console.error("Error fetching materi:", materiErr);
          setMateriList([]);
        }
        
        setError(null);
      } catch (err: any) {
        console.error("Error fetching subject data:", err);
        setError(err.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, session]);
  
  // Separate effect for handling tab changes and fetching tab-specific data
  useEffect(() => {
    // Only fetch assignments when:
    // 1. We switch to the tugas tab
    // 2. We have materials available
    // 3. We don't already have assignments loaded (avoid refetching unnecessarily)
    if (activeTab === "tugas" && materiList.length > 0 && assignments.length === 0) {
      fetchAssignments(materiList);
    }
  }, [activeTab, materiList, materiList.length, assignments.length]);

  const fetchAssignments = async (materials: Materi[]) => {
    try {
      setLoadingAssignments(true);
      let allAssignments: Assignment[] = [];
      
      // For each material, fetch its assignments
      for (const material of materials) {
        try {
          const response = await getAssignmentsByMateriId(material._id);
          
          // Check the actual structure of the response
          if (response && response.data) {
            allAssignments = [...allAssignments, ...response.data];
          }
        } catch (err: any) {
          // Continue with the next material even if one fails
        }
      }
      
      setAssignments(allAssignments);
    } catch (err: any) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleBack = () => {
    router.push("/admin/dashboard");
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
      setMateriList(materiResponse.data || []);
      
      // Also refresh assignments since new material may need assignments
      if (materiResponse.data && materiResponse.data.length > 0) {
        await fetchAssignments(materiResponse.data);
      }
      
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
        router.push(`/admin/matapelajaran/${id}?tab=tugas`);
      }
    } catch (err: any) {
      console.error("Error adding assignment:", err);
      
      toast.error("Gagal menambahkan tugas", {
        description: err.message || "Terjadi kesalahan saat menambahkan tugas.",
        duration: 5000
      });
      
      setError(`${err.message}`);
      throw err; // Rethrow to be handled by the modal
    } finally {
      setIsAddingAssignment(false);
    }
  };

  // Add handler for file downloads
  const handleDownloadFile = (file: any) => {
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
                  <h3 className="text-md lg:text-lg font-semibold">
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
                      router.push(`/admin/matapelajaran/${id}/materi/${materi._id}`);
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
                      {materi.konten.files.map((file, index) => {
                        // Handle both string URLs and object format with url and name properties
                        const fileUrl = typeof file === 'string' ? file : file.url;
                        const fileName = typeof file === 'string' ? getFileNameFromUrl(file) : file.name;
                        
                        return (
                          <Button
                            key={index}
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
          const submissionCount = assignment.submissions.length;

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
                        <span className="text-xs sm:text-[10px]">Pengumpulan: {submissionCount || 0}</span>
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
                        router.push(`/admin/matapelajaran/${id}/tugas/${assignment._id}`);
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
              <span className="text-sm font-medium ml-2">{mataPelajaran.guru?.fullName || 'Tidak tersedia'}</span>
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

  return (
    <DashboardLayout>
      <PageContainer className="-mt-12 lg:-mt-20">
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
                    {hasPermission ? (
                      <>
                        <Button 
                          startContent={<FiPlus size={16} />} 
                          color="primary" 
                          variant="flat"
                          className="w-full justify-start"
                          onPress={() => setIsMateriModalOpen(true)}
                        >
                          Tambah Materi Baru
                        </Button>
                        <Button 
                          startContent={<FiPlus size={16} />} 
                          color="primary" 
                          variant="flat"
                          className="w-full justify-start"
                          onPress={() => setIsAssignmentModalOpen(true)}
                        >
                          Tambah Tugas Baru
                        </Button>
                        <Button 
                          startContent={<FiUsers size={16} />} 
                          color="primary" 
                          variant="flat"
                          className="w-full justify-start"
                          onPress={() => setIsEnrollmentModalOpen(true)}
                        >
                          Kelola Murid
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          startContent={<FiPlus size={16} />} 
                          color="default" 
                          variant="flat"
                          className="w-full justify-start"
                          isDisabled
                          title="Anda tidak memiliki izin untuk menambahkan materi"
                        >
                          Tambah Materi Baru
                        </Button>
                        <Button 
                          startContent={<FiPlus size={16} />} 
                          color="default" 
                          variant="flat"
                          className="w-full justify-start"
                          isDisabled
                          title="Anda tidak memiliki izin untuk menambahkan tugas"
                        >
                          Tambah Tugas Baru
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <Tabs 
                  aria-label="Mata Pelajaran Tabs" 
                  selectedKey={activeTab}
                  onSelectionChange={(key) => {
                    // Update tab state without using router navigation
                    const tabKey = key.toString();
                    setActiveTab(tabKey);
                    
                    // Fetch assignments if switching to tugas tab and they haven't been loaded yet
                    if (tabKey === "tugas" && materiList.length > 0 && assignments.length === 0) {
                      fetchAssignments(materiList);
                    }
                  }}
                  className="mb-4"
                >
                  <Tab key="materi" title="Materi Pelajaran" />
                  <Tab key="tugas" title="Tugas" />
                </Tabs>

                {activeTab === "materi" ? (
                  <>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold">Materi Pelajaran</h3>
                    </div>
                    {renderMaterialList()}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold">Daftar Tugas</h3>
                    </div>
                    {renderAssignmentList()}
                  </>
                )}
              </div>
            </div>
            
            {/* Modal for adding new materials */}
            <CreateMateriPelajaranModal
              isOpen={isMateriModalOpen}
              onClose={() => setIsMateriModalOpen(false)}
              onSubmit={handleMateriSubmit}
              isSubmitting={isAddingMaterial}
            />

            {/* Modal for managing enrollments */}
            {mataPelajaran && (
              <EnrollmentModal
                isOpen={isEnrollmentModalOpen}
                onClose={() => {
                  setIsEnrollmentModalOpen(false);
                  // Force a refresh of the mata pelajaran data when the modal is closed
                  if (id) {
                    const fetchData = async () => {
                      try {
                        // Fetch mata pelajaran details
                        const mataPelajaranResponse = await getMataPelajaranById(id as string);
                        setMataPelajaran(mataPelajaranResponse.data);
                        
                        // Fetch learning materials
                        try {
                          const materiResponse = await getMateriByMataPelajaranId(id as string);
                          const materials = materiResponse.data || [];
                          setMateriList(materials);
                        } catch (materiErr: any) {
                          console.error("Error fetching materi:", materiErr);
                          setMateriList([]);
                        }
                      } catch (err: any) {
                        console.error("Error refreshing data:", err);
                      }
                    };
                    fetchData();
                  }
                }}
                mataPelajaranId={mataPelajaran._id}
                mataPelajaranTitle={mataPelajaran.judul}
              />
            )}

            {/* Modal for adding new assignment */}
            {mataPelajaran && materiList.length > 0 && (
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