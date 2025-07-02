import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from "next-auth/react";
import { Card, CardBody, Spinner, Button, Chip, Divider, Tabs, Tab } from '@nextui-org/react';
import { FiArrowLeft, FiCalendar, FiUserPlus, FiEye, FiDownload } from 'react-icons/fi';

import PageContainer from '../../../commons/PageContainer';
import NotificationAlert from '../../../commons/NotificationAlert/NotificationAlert';
import { getMataPelajaranById, enrollStudent, selfEnrollStudent } from '../../../../services/mataPelajaran.service';
import { getMateriByMataPelajaranId } from '../../../../services/materiPelajaran.service';
import { getAssignmentsByMateriId } from '../../../../services/assignment.service';
import { getFileNameFromUrl, downloadFile } from "@/utils/fileUtils";
import { format, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { toast } from "sonner";
import { getEnrolledMataPelajaran } from '../../../../services/student.service';
import { SessionExtended } from '../../../../types/Auth';

interface MataPelajaranDetailProps {
  id: string;
}

interface Materi {
  _id: string;
  judul: string;
  order: number;
  konten: {
    teks: string;
    files?: Array<string | { url: string; name: string }>;
  };
}

interface Assignment {
  _id: string;
  title: string;
  description: string;
  deadline: string;
  submissions: any[];
  createdAt: string;
}

interface EnrolledStudent {
  _id: string;
  fullName: string;
  nis: string;
  kelas: string;
  email: string;
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
    email: string;
  };
  createdAt: string;
}

const formatDate = (dateString: string): string => {
  if (!dateString) return 'Tanggal tidak tersedia';
  
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return 'Format tanggal tidak valid';
    
    return format(date, "d MMMM yyyy", { locale: idLocale });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Tanggal tidak valid';
  }
};

const MataPelajaranDetail: React.FC<MataPelajaranDetailProps> = ({ id }) => {
  const router = useRouter();
  const { data: session } = useSession() as { data: SessionExtended | null };
  
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mataPelajaran, setMataPelajaran] = useState<MataPelajaran | null>(null);
  const [materiList, setMateriList] = useState<Materi[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState<string>("materi");
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrolledMataPelajaranIds, setEnrolledMataPelajaranIds] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;

    const fetchEnrollmentStatus = async () => {
      try {
        const enrolledResponse = await getEnrolledMataPelajaran();
        
        if (enrolledResponse && enrolledResponse.data) {
          const enrolledIds = enrolledResponse.data.map((subject: any) => subject._id);
          setEnrolledMataPelajaranIds(enrolledIds);
          
          if (id && enrolledIds.includes(id)) {
            setIsEnrolled(true);
          }
        }
      } catch (err: any) {
        console.error("Error checking enrollment status:", err);
      }
    };

    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        const mataPelajaranResponse = await getMataPelajaranById(id);
        setMataPelajaran(mataPelajaranResponse.data);
        
        if (isEnrolled) {
          const materiResponse = await getMateriByMataPelajaranId(id);
          setMateriList(materiResponse.data);
        }
        
        setError(null);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, isEnrolled]);
  
  const fetchAssignments = useCallback(async () => {
    if (!id || materiList.length === 0) return;
    
    try {
      setLoadingAssignments(true);
      const firstMateriId = materiList[0]._id;
      const response = await getAssignmentsByMateriId(firstMateriId);
      setAssignments(response.data);
    } catch (err: any) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoadingAssignments(false);
    }
  }, [id, materiList]);
  
  useEffect(() => {
    if (isEnrolled && activeTab === 'tugas' && materiList.length > 0 && assignments.length === 0) {
      fetchAssignments();
    }
  }, [activeTab, materiList.length, id, isEnrolled, assignments.length, fetchAssignments]);
  
  const handleBack = () => {
    router.push('/murid/dashboard');
  };
  
  const handleTabChange = (key: string | number) => {
    if (!isEnrolled) return;
    
    const tabKey = key.toString();
    setActiveTab(tabKey);
    
    if (tabKey === 'tugas' && assignments.length === 0 && materiList.length > 0) {
      fetchAssignments();
    }
  };
  
  const handleEnrollment = async () => {
    if (!id || !session?.user?.id) return;
    
    try {
      setIsEnrolling(true);
      
      await selfEnrollStudent(id);
      
      toast.success("Berhasil Mendaftar!", {
        description: "Anda telah berhasil mendaftar ke mata pelajaran ini."
      });
      
      setIsEnrolled(true);
    } catch (err: any) {
      console.error("Error enrolling in subject:", err);
      toast.error("Gagal Mendaftar", {
        description: err.message || "Terjadi kesalahan saat mendaftar ke mata pelajaran ini."
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleDownloadFile = (file: string | { url: string; name: string }) => {
    const fileUrl = typeof file === 'string' ? file : file.url;
    
    let fileName: string;
    
    if (typeof file === 'string') {
      fileName = getFileNameFromUrl(file);
    } else if (file.name) {
      fileName = file.name;
      
      if (fileUrl.includes('/documents/word/') && !fileName.toLowerCase().endsWith('.docx')) {
        fileName += '.docx';
      } else if (fileUrl.includes('/documents/pdf/') && !fileName.toLowerCase().endsWith('.pdf')) {
        fileName += '.pdf';
      } else if (fileUrl.includes('/documents/excel/') && !fileName.toLowerCase().endsWith('.xlsx')) {
        fileName += '.xlsx';
      } else if (fileUrl.includes('/documents/presentations/') && 
                !fileName.toLowerCase().endsWith('.pptx') && 
                !fileName.toLowerCase().endsWith('.ppt')) {
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
                      localStorage.setItem('currentMataPelajaranId', id as string);
                      router.push(`/murid/matapelajaran/${id}/materi/${materi._id}`);
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
          const deadlineDate = new Date(assignment.deadline);
          const isDeadlinePast = deadlineDate < new Date();
          
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
                    </div>
                  </div>
                  <div className="flex sm:flex-shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
                    <Button 
                      size="sm"
                      variant="flat"
                      color="primary"
                      startContent={<FiEye size={14} />}
                      onPress={() => {
                        router.push(`/murid/matapelajaran/${id}/tugas/${assignment._id}`);
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
            
            {!isEnrolled && (
              <>
                <Divider className="my-2" />
                <div className="pt-2">
                  <Button
                    color="primary"
                    variant="solid"
                    startContent={<FiUserPlus size={16} />}
                    className="w-full"
                    isLoading={isEnrolling}
                    onClick={handleEnrollment}
                  >
                    Daftar Mata Pelajaran
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardBody>
      </Card>
    );
  };

  const renderUnenrolledContent = () => {
    if (!mataPelajaran) return null;
    
    return (
      <Card className="w-full mt-6">
        <CardBody className="py-12 px-6">
          <div className="text-center">
            <div className="mb-4 text-gray-500">
              <FiUserPlus size={48} className="mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              Anda belum terdaftar pada mata pelajaran ini
            </h2>
            <p className="text-gray-600 mb-6">
              Untuk melihat materi dan tugas dari mata pelajaran ini, Anda perlu mendaftar terlebih dahulu.
            </p>
            <Button
              color="primary"
              size="lg"
              startContent={<FiUserPlus size={18} />}
              isLoading={isEnrolling}
              onClick={handleEnrollment}
            >
              Daftar Sekarang
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  };

  return (
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
          <div className="mb-3 relative z-40 pointer-events-auto">
            <Button
              size="md"
              variant="solid"
              color="default"
              startContent={<FiArrowLeft size={16} />}
              onClick={handleBack}
              className="mb-3"
            >
              Kembali
            </Button>
            
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">{mataPelajaran?.judul || 'Detail Mata Pelajaran'}</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 mt-0">
            <div className="md:col-span-1">
              <h3 className="text-lg font-semibold mb-2">Informasi Mata Pelajaran</h3>
              {renderSubjectInfo()}
            </div>
            
            <div className="md:col-span-3">
              {isEnrolled ? (
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
                </Tabs>
              ) : (
                renderUnenrolledContent()
              )}
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
};

export default MataPelajaranDetail; 
