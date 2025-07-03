import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from "next-auth/react";
import { Card, CardBody, CardHeader, CardFooter, Spinner, Button, Chip, Textarea, Divider, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@nextui-org/react';
import { FiArrowLeft, FiDownload, FiCalendar, FiClock, FiUpload, FiFile, FiTrash2, FiCheckCircle, FiXCircle, FiClipboard, FiEdit, FiPlus, FiRefreshCw, FiAward } from 'react-icons/fi';
import { format, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { toast } from 'sonner';

import PageContainer from '../../../commons/PageContainer';
import NotificationAlert from '../../../commons/NotificationAlert/NotificationAlert';
import { getMataPelajaranById } from '../../../../services/mataPelajaran.service';
import { getFileExtension, getFileNameFromUrl, downloadFile } from '../../../../utils/fileUtils';
import { getAssignmentById, submitAssignment, deleteOwnSubmission } from '../../../../services/assignment.service';
import mediaServices from '../../../../services/media.service';
import { SessionExtended } from '../../../../types/Auth';

const submitAssignmentWithAnswer = async (assignmentId: string, data: {
  files: Array<{
    fileUrl: string;
    fileName: string;
  }>;
}) => {
  try {
    const response = await submitAssignment(assignmentId, data);
    return response;
  } catch (error) {
    throw error;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  if (!dateString) return 'Tanggal tidak tersedia';
  
  const date = new Date(dateString);
  if (!isValid(date)) return 'Format tanggal tidak valid';
  
  try {
    return format(date, "d MMMM yyyy", { locale: idLocale });
  } catch (error) {
    return 'Tanggal tidak valid';
  }
};

const formatDateTime = (dateString: string): string => {
  if (!dateString) return 'Tanggal tidak tersedia';
  
  const date = new Date(dateString);
  if (!isValid(date)) return 'Format tanggal tidak valid';
  
  try {
    return format(date, "d MMMM yyyy, HH:mm", { locale: idLocale });
  } catch (error) {
    return 'Tanggal tidak valid';
  }
};

interface TugasDetailProps {
  mataPelajaranId: string;
  tugasId: string;
}

interface Attachment {
  _id: string;
  originalName: string;
  url: string;
  mimetype: string;
  size?: number;
}

interface Submission {
  _id: string;
  student: {
    _id: string;
    fullName: string;
    nis: string;
    kelas: string;
    email: string;
  };
  assignment: string;
  answer: string;
  file?: {
    originalName: string;
    url: string;
    mimetype: string;
  };
  fileUrl?: string;
  fileName?: string;
  additionalFiles?: Array<{
    fileUrl: string;
    fileName: string;
  }>;
  status: 'submitted' | 'graded' | 'reviewed' | 'rejected';
  score?: number;
  comment?: string;
  feedback?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface Assignment {
  _id: string;
  judul: string;
  title?: string;
  deskripsi: string;
  description?: string;
  deadline: string;
  attachments: Array<{
    url: string;
    name: string;
  }>;
  mataPelajaran: string;
  mataPelajaranId?: string;
  materiId?: string;
  materi?: string;
  submissions?: Submission[];
  createdAt: string;
}

interface MataPelajaran {
  _id: string;
  judul: string;
}

interface AssignmentSubmissionPayload {
  files: Array<{
    fileUrl: string;
    fileName: string;
  }>;
}

const TugasDetail: React.FC<TugasDetailProps> = ({ mataPelajaranId, tugasId }) => {
  const router = useRouter();
  const { data: session } = useSession() as { data: SessionExtended | null };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tugas, setTugas] = useState<Assignment | null>(null);
  const [mataPelajaran, setMataPelajaran] = useState<MataPelajaran | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<Array<{url: string; name: string}>>([]);
  const [recentlyUploadedFile, setRecentlyUploadedFile] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
    
  const fetchData = useCallback(async () => {
    if (!tugasId || !mataPelajaranId || !session?.user) return;
    
    try {
      setLoading(true);
      
      const mataPelajaranResponse = await getMataPelajaranById(mataPelajaranId);
      if (mataPelajaranResponse && mataPelajaranResponse.data) {
        setMataPelajaran({
          _id: mataPelajaranResponse.data._id,
          judul: mataPelajaranResponse.data.judul
        });
      }
      
      const response = await getAssignmentById(tugasId);
      
      if (response && response.data) {
        const assignment = response.data;
        
        const normalizedAssignment = {
          ...assignment,
          _id: assignment._id || "",
          judul: assignment.title || assignment.judul || "Tugas Tanpa Judul",
          deskripsi: assignment.description || assignment.deskripsi || "",
          deadline: assignment.deadline || new Date().toISOString(),
          attachments: Array.isArray(assignment.attachments) ? assignment.attachments : [],
          mataPelajaran: assignment.mataPelajaran || "",
          mataPelajaranId: assignment.mataPelajaranId || "",
          materiId: assignment.materiId || "",
          materi: assignment.materi || "",
          submissions: Array.isArray(assignment.submissions) ? assignment.submissions : [],
          createdAt: assignment.createdAt || new Date().toISOString()
        };
        
        setTugas(normalizedAssignment);
        
        if (normalizedAssignment.attachments && normalizedAssignment.attachments.length > 0) {
          const files = normalizedAssignment.attachments.map((attachment: any) => ({
            url: attachment.url,
            name: attachment.name || attachment.originalName || getFileNameFromUrl(attachment.url)
          }));
          setAttachmentFiles(files);
        }
        
        let foundSubmissions = [];
        
        if (normalizedAssignment.submissions && normalizedAssignment.submissions.length > 0) {
          const userEmail = session.user.email;
          const userId = session.user.id;
          
          const userSubmissions = normalizedAssignment.submissions.filter((sub: Submission) => {
            if (!sub.student) return false;
            
            if (typeof sub.student === 'string') {
              return sub.student === userId;
            }
            
            const emailMatch = (sub.student as any).email && (sub.student as any).email === userEmail;
            const idMatch = (sub.student as any)._id && userId && (sub.student as any)._id.toString() === userId.toString();
            
            return emailMatch || idMatch;
          });
          
          if (userSubmissions.length > 0) {
            foundSubmissions = userSubmissions.map((submission: Submission) => {
              const processedSubmission = { ...submission };
              
              if (!processedSubmission.fileUrl && processedSubmission.file && processedSubmission.file.url) {
                processedSubmission.fileUrl = processedSubmission.file.url;
                processedSubmission.fileName = processedSubmission.file.originalName;
              }
              
              if (processedSubmission.additionalFiles && processedSubmission.additionalFiles.length > 0) {
                processedSubmission.additionalFiles = processedSubmission.additionalFiles.filter(file => {
                  return !!file.fileUrl;
                });
              }
              
              return processedSubmission;
            });
            
            foundSubmissions = foundSubmissions.sort(
              (a: Submission, b: Submission) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
            );
            
            if (foundSubmissions.length > 0) {
              setMySubmissions(foundSubmissions);
              
              saveSubmissionToStorage(foundSubmissions[0]);
              setHasSubmitted(true);
            }
          } else {
            
            
            
            const submissionKey = `submission_${tugasId}_${session?.user?.id}`;
            const submissionStatus = sessionStorage.getItem(submissionKey) || localStorage.getItem(submissionKey);
            const submissionData = sessionStorage.getItem(`${submissionKey}_data`) || localStorage.getItem(`${submissionKey}_data`);
            
            if (submissionStatus === 'submitted' && submissionData) {
              try {
                const parsedData = JSON.parse(submissionData);
                
                
                if (mySubmissions.length === 0 || !initialLoadComplete) {
                  setMySubmissions([parsedData]);
                  setHasSubmitted(true);
                }
              } catch (e) {
                console.error('Error parsing cached submission data:', e);
                if (mySubmissions.length === 0) {
                  setMySubmissions([]);
                }
              }
            } else if (mySubmissions.length === 0) {
              setMySubmissions([]);
            }
          }
        } else {
          
          
          if (mySubmissions.length === 0) {
            const submissionKey = `submission_${tugasId}_${session?.user?.id}`;
            const submissionStatus = localStorage.getItem(submissionKey);
            const submissionData = localStorage.getItem(`${submissionKey}_data`);
            
            if (submissionStatus === 'submitted' && submissionData) {
              try {
                const parsedData = JSON.parse(submissionData);
                setMySubmissions([parsedData]);
              } catch (e) {
                console.error('Error parsing cached submission data:', e);
                setMySubmissions([]);
              }
            } else {
              setMySubmissions([]);
            }
          }
        }
      }
      
      setInitialLoadComplete(true);
    } catch (err: any) {
      console.error("Error loading assignment:", err);
      toast.error("Gagal memuat tugas", {
        description: "Terjadi kesalahan saat memuat data tugas."
      });
    } finally {
      setLoading(false);
    }
  }, [tugasId, mataPelajaranId, session?.user, mySubmissions.length, initialLoadComplete]);

  useEffect(() => {
    if (tugasId && mataPelajaranId) {
      fetchData();
      const submissionKey = `submission_${tugasId}_${session?.user?.id}`;
      const submissionStatus = localStorage.getItem(submissionKey);
      const submissionData = localStorage.getItem(`${submissionKey}_data`);
      setHasSubmitted(submissionStatus === 'submitted');
      
      if (submissionStatus === 'submitted' && submissionData) {
        const loadedFromCache = true;
        
        if (loadedFromCache && mySubmissions.length === 0) {
          try {
            const parsedData = JSON.parse(submissionData!);
            setMySubmissions([parsedData]);
          } catch (e) {
          }
        }
      }
    }
  }, [tugasId, mataPelajaranId, session?.user?.id, mySubmissions.length, fetchData]);
  
  const saveSubmissionToStorage = (submissionData: Submission) => {
    if (!tugasId || !session?.user?.id) return;
    
    const submissionKey = `submission_${tugasId}_${session.user.id}`;
    const dataToStore = JSON.stringify(submissionData);
    
    localStorage.setItem(submissionKey, 'submitted');
    localStorage.setItem(`${submissionKey}_data`, dataToStore);
    
    sessionStorage.setItem(submissionKey, 'submitted');
    sessionStorage.setItem(`${submissionKey}_data`, dataToStore);
  };

  const clearSubmissionFromStorage = () => {
    if (!tugasId || !session?.user?.id) return;
    
    const submissionKey = `submission_${tugasId}_${session.user.id}`;
    
    localStorage.removeItem(submissionKey);
    localStorage.removeItem(`${submissionKey}_data`);
    sessionStorage.removeItem(submissionKey);
    sessionStorage.removeItem(`${submissionKey}_data`);
  };

  const handleBack = () => {
    router.push(`/murid/matapelajaran/${mataPelajaranId}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const filesArray = Array.from(files);
    
    if (selectedFiles.length + filesArray.length > 5) {
      toast.error('Maksimal 5 file yang dapat diunggah');
      return;
    }
    
    const oversizedFiles = filesArray.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error(`${oversizedFiles.length} file melebihi ukuran maksimal 10MB`);
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...filesArray]);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!tugasId || selectedFiles.length === 0) {
      toast.error('Pilih setidaknya satu file untuk dikumpulkan');
      return;
    }
    
    try {
      setSubmitting(true);
      
      
      const uploadedFiles = [];
      
      for (const file of selectedFiles) {
        
        try {
          const uploadResponse = await mediaServices.uploadSingle(file);
          
          
          if (uploadResponse && uploadResponse.data && uploadResponse.data.data) {
            const fileData = {
              fileUrl: uploadResponse.data.data.url,
              fileName: file.name
            };
            
            uploadedFiles.push(fileData);
          } else {
            console.error("Upload response missing data structure:", uploadResponse);
            toast.error(`Gagal mengunggah file ${file.name}`);
          }
        } catch (uploadErr) {
          console.error(`Error uploading file ${file.name}:`, uploadErr);
          toast.error(`Gagal mengunggah file ${file.name}`);
        }
      }
      
      if (uploadedFiles.length === 0) {
        toast.error('Tidak ada file yang berhasil diunggah');
        return;
      }
      
      const payload: AssignmentSubmissionPayload = {
        files: uploadedFiles
      };
      
      
      const submitResponse = await submitAssignmentWithAnswer(tugasId, payload);
      
      
      toast.success('Tugas berhasil dikumpulkan');
      
      const newSubmission = createNewSubmission(uploadedFiles, submitResponse);
      
      setMySubmissions([newSubmission]);
      setRecentlyUploadedFile(uploadedFiles[0].fileName);
      
      saveSubmissionToStorage(newSubmission);
      
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (err: any) {
      console.error('Error submitting assignment:', err);
      toast.error(err.message || 'Gagal mengumpulkan tugas');
    } finally {
      setSubmitting(false);
    }
  };

  const createNewSubmission = (uploadedFiles: any[], submitResponse: any): Submission => {
    let newSubmission: Submission;
    
    if (submitResponse?.data?.submission) {
      
      newSubmission = submitResponse.data.submission;
      
      if (!newSubmission.fileUrl && newSubmission.file && newSubmission.file.url) {
        newSubmission.fileUrl = newSubmission.file.url;
        newSubmission.fileName = newSubmission.file.originalName;
      }
      
      if (uploadedFiles.length > 1 && !newSubmission.additionalFiles) {
        newSubmission.additionalFiles = uploadedFiles.slice(1).map(file => ({
          fileUrl: file.fileUrl,
          fileName: file.fileName
        }));
      }
    } else {
      
      newSubmission = {
        _id: `temp_${new Date().getTime()}`,
        student: {
          _id: session?.user?.id || "",
          fullName: session?.user?.name || "",
          email: session?.user?.email || "",
          nis: "",
          kelas: ""
        },
        assignment: tugasId || "",
        answer: "",
        fileUrl: uploadedFiles[0].fileUrl,
        fileName: uploadedFiles[0].fileName,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (uploadedFiles.length > 1) {
        newSubmission.additionalFiles = uploadedFiles.slice(1).map(file => ({
          fileUrl: file.fileUrl,
          fileName: file.fileName
        }));
      }
    }
    
    return newSubmission;
  };

  const isDeadlinePassed = () => {
    if (!tugas) return false;
    const now = new Date();
    try {
      const deadline = new Date(tugas.deadline);
      if (!isValid(deadline)) return false;
      return now > deadline;
    } catch (error) {
      console.error('Error checking deadline:', error);
      return false;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded':
      case 'reviewed':
        return "success";
      case 'rejected':
        return "danger";
      case 'submitted':
      default:
        return "primary";
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'graded':
        return "Sudah Dinilai";
      case 'reviewed':
        return "Diterima";
      case 'rejected':
        return "Ditolak";
      case 'submitted':
      default:
        return "Dikumpulkan";
    }
  };
  
  const handleDownloadFile = (file: { url: string; name: string }) => {
    try {
      
      downloadFile(file.url, file.name);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Gagal mengunduh file. Silakan coba lagi.');
    }
  };

  const handleDeleteSubmission = async () => {
    if (!submissionToDelete || !tugasId) return;
    
    try {
      setDeleting(true);
      
      await deleteOwnSubmission(tugasId, submissionToDelete);
      
      toast.success('Pengumpulan tugas berhasil dihapus');
      
      clearSubmissionFromStorage();
      setHasSubmitted(false);
      
      setMySubmissions([]);
      setIsDeleteModalOpen(false);
      setSubmissionToDelete(null);
    } catch (err: any) {
      console.error('Error deleting submission:', err);
      toast.error(err.message || 'Gagal menghapus pengumpulan tugas');
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
      setSubmissionToDelete(null);
    }
  };
  
  const openDeleteModal = (submissionId: string) => {
    setSubmissionToDelete(submissionId);
    setIsDeleteModalOpen(true);
  };
  
  const openReplaceModal = (submissionId: string) => {
    
    setSubmissionToDelete(submissionId);
    setIsReplaceModalOpen(true);
  };
  
  const handleReplaceSubmission = async () => {
    if (!submissionToDelete || !tugasId) return;
    
    try {
      setDeleting(true);
      
      
      await deleteOwnSubmission(tugasId, submissionToDelete);
      
      toast.success('Pengumpulan lama berhasil dihapus. Silakan unggah file baru.');
      
      clearSubmissionFromStorage();
      setHasSubmitted(false);
      
      setMySubmissions([]);
      
      setIsReplaceModalOpen(false);
      setSubmissionToDelete(null);
    } catch (err: any) {
      console.error('Error replacing submission:', err);
      toast.error(err.message || 'Gagal mengganti pengumpulan tugas');
    } finally {
      setDeleting(false);
      setIsReplaceModalOpen(false);
      setSubmissionToDelete(null);
    }
  };

  return (
    <PageContainer className="-mt-20">
      {error && (
        <NotificationAlert
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <ModalContent>
          <ModalHeader>Konfirmasi Hapus Pengumpulan</ModalHeader>
          <ModalBody>
            <p>Apakah Anda yakin ingin menghapus pengumpulan tugas ini?</p>
            <p className="text-sm text-gray-500 mt-2">
              Setelah dihapus, Anda dapat mengumpulkan ulang tugas ini selama masih dalam tenggat waktu.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={() => setIsDeleteModalOpen(false)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              color="danger"
              onPress={handleDeleteSubmission}
              isLoading={deleting}
            >
              Hapus
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      <Modal isOpen={isReplaceModalOpen} onClose={() => setIsReplaceModalOpen(false)}>
        <ModalContent>
          <ModalHeader className="text-primary">Ubah Pengumpulan Tugas</ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-4">
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm font-medium">Untuk mengubah pengumpulan tugas, Anda perlu menghapus pengumpulan saat ini terlebih dahulu.</p>
              </div>
              <p>Setelah dihapus, Anda akan dapat mengunggah file baru.</p>
              <p className="text-xs text-gray-500">Catatan: Proses ini tidak dapat dibatalkan.</p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={() => setIsReplaceModalOpen(false)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              color="primary"
              onPress={handleReplaceSubmission}
              isLoading={deleting}
            >
              Hapus & Ganti
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <div className="mb-3 relative z-40 pointer-events-auto mt-16">
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
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
            {tugas?.judul || 'Detail Tugas'}
          </h1>
          {mataPelajaran && (
            <div className="mt-1">
              <Chip color="primary" variant="flat" size="sm">
                {mataPelajaran.judul}
              </Chip>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <Spinner size="lg" color="primary" />
        </div>
      ) : tugas ? (
        <div className="grid grid-cols-1 gap-6 mb-6">
          <Card>
            <CardBody className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <FiCalendar size={16} className="text-primary" />
                <h3 className="text-base sm:text-lg font-semibold">Informasi Tugas</h3>
              </div>

              <Divider className="my-3 sm:my-4" />

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h4 className="text-xs sm:text-sm text-gray-500">Judul Tugas:</h4>
                  <p className="font-medium text-sm sm:text-base">{tugas.judul}</p>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm text-gray-500">Deskripsi:</h4>
                  <p className="whitespace-pre-wrap text-xs sm:text-sm">{tugas.deskripsi}</p>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm text-gray-500">Tenggat Waktu:</h4>
                  <p className={`font-medium text-sm sm:text-base ${isDeadlinePassed() ? 'text-danger' : ''}`}>
                    {new Date(tugas.deadline).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}{' '}
                    pukul{' '}
                    {new Date(tugas.deadline).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                      timeZone: 'Asia/Jakarta'
                    })}
                    {' '}WIB
                  </p>
                  {isDeadlinePassed() && !mySubmissions.length && (
                    <p className="mt-2 text-danger text-xs sm:text-sm">Batas waktu pengumpulan telah berakhir</p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <FiClipboard size={16} className="text-primary" />
                <h3 className="text-base sm:text-lg font-semibold">File Lampiran</h3>
              </div>

              <Divider className="my-3 sm:my-4" />

              {attachmentFiles && attachmentFiles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {attachmentFiles.map((file, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant="flat"
                      color="primary"
                      startContent={<FiDownload size={14} />}
                      onPress={() => handleDownloadFile(file)}
                      className="mb-2 py-1 px-3 h-8 text-xs sm:text-sm"
                    >
                      <span className="truncate max-w-[120px] sm:max-w-[200px]">{file.name}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4 text-xs sm:text-sm">
                  Tidak ada file yang dilampirkan.
                </div>
              )}
            </CardBody>
          </Card>

          {((mySubmissions && mySubmissions.length > 0) || hasSubmitted) && (
            <Card>
              <CardBody className="p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FiClipboard size={16} className="text-primary" />
                    <h3 className="text-lg font-semibold">Pengumpulan Tugas</h3>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    isLoading={loading}
                    onPress={() => {
                      setLoading(true);
                      fetchData();
                    }}
                    startContent={<FiRefreshCw size={14} />}
                    className="min-w-0 h-8 px-2 py-0"
                  >
                    Refresh
                  </Button>
                </div>
                
                <Divider className="my-4" />

                <div className="flex flex-col gap-3">
                  {mySubmissions.length > 0 ? (
                    mySubmissions.map((submission) => (
                      <div key={submission._id} className="border rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-default-50 p-3 border-b">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Chip
                                color={getStatusColor(submission.status)}
                                variant="flat"
                                size="sm"
                              >
                                {getStatusText(submission.status)}
                              </Chip>
                              <span className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-0">
                                Dikumpulkan: {new Date(submission.submittedAt || submission.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">File Tugas:</h4>
                            
                            {process.env.NODE_ENV === 'development' && (
                              <div className="text-xs text-gray-500 mb-2 border-l-2 border-warning pl-2">
                                <p>File Name: {submission.fileName || 'Tidak tersedia'}</p>
                              </div>
                            )}
                            
                            {(submission.fileUrl || (submission.file && submission.file.url)) ? (
                              <div className="flex items-center p-3 border rounded-md bg-default-50 mb-3">
                                <FiFile className="text-primary mr-3 flex-shrink-0" size={18} />
                                <div className="flex-grow mr-4">
                                  <div className="font-medium text-sm">
                                    {submission.fileName || submission.file?.originalName || "File Tugas"}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="flat"
                                  color="primary"
                                  startContent={<FiDownload size={14} />}
                                  onPress={() => handleDownloadFile({ 
                                    url: submission.fileUrl || submission.file?.url || "", 
                                    name: submission.fileName || submission.file?.originalName || "file.pdf" 
                                  })}
                                  className="flex-shrink-0"
                                >
                                  Download
                                </Button>
                              </div>
                            ) : (
                              <div className="text-center text-gray-500 py-4 text-sm border rounded-md">
                                File tidak tersedia
                              </div>
                            )}
                            
                            {submission.additionalFiles && submission.additionalFiles.length > 0 && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium mb-2">File Tambahan:</h4>
                                <div className="space-y-2">
                                  {submission.additionalFiles.map((file, index) => (
                                    file.fileUrl ? (
                                      <div key={index} className="flex items-center p-3 border rounded-md bg-default-50">
                                        <FiFile className="text-primary mr-3 flex-shrink-0" size={18} />
                                        <div className="flex-grow mr-4">
                                          <div className="font-medium text-sm">
                                            {file.fileName || `File Tambahan ${index + 1}`}
                                          </div>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="flat"
                                          color="primary"
                                          startContent={<FiDownload size={14} />}
                                          onPress={() => handleDownloadFile({ 
                                            url: file.fileUrl, 
                                            name: file.fileName || `file-${index + 1}.pdf`
                                          })}
                                          className="flex-shrink-0"
                                        >
                                          Download
                                        </Button>
                                      </div>
                                    ) : null
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {!isDeadlinePassed() && submission.status === 'submitted' && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                color="danger"
                                variant="flat"
                                startContent={<FiTrash2 size={16} />}
                                onPress={() => openDeleteModal(submission._id)}
                              >
                                Hapus Pengumpulan
                              </Button>
                              
                              <Button
                                color="primary"
                                variant="flat"
                                startContent={<FiEdit size={16} />}
                                onPress={() => openReplaceModal(submission._id)}
                              >
                                Edit Pengumpulan
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {submission.status === 'graded' && submission.score !== undefined && (
                          <div className="p-4 bg-success-50 border-t">
                            <div className="flex items-center gap-2 mb-1">
                              <FiAward className="text-success" size={16} />
                              <h4 className="text-sm font-medium">Nilai:</h4>
                            </div>
                            <p className="text-xl font-semibold">{submission.score}</p>
                            
                            {submission.comment && (
                              <div className="mt-2">
                                <h5 className="text-xs font-medium text-gray-600">Komentar:</h5>
                                <p className="text-sm mt-1">{submission.comment}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-primary/5 p-3 border-b">
                        <div className="flex items-center gap-2">
                          <Chip color="success" variant="flat" size="sm" className="ml-0">
                            Dikumpulkan
                          </Chip>
                          <span className="text-xs sm:text-sm text-gray-500">
                            {new Date().toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="flex items-center gap-4 mb-3">
                          <FiCheckCircle size={24} className="text-success" />
                          <div>
                            <h4 className="text-sm sm:text-base font-medium">File tugas telah dikumpulkan</h4>
                            <p className="text-xs text-gray-500">Klik tombol &quot;Refresh&quot; untuk melihat detail pengumpulan</p>
                          </div>
                        </div>
                        
                        <div className="flex justify-end mt-4">
                          <Button
                            color="primary"
                            size="sm"
                            variant="solid"
                            startContent={<FiRefreshCw size={14} />}
                            onPress={() => {
                              setLoading(true);
                              fetchData();
                            }}
                          >
                            Refresh Data
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}
          
          {!isDeadlinePassed() && !hasSubmitted && (!mySubmissions || mySubmissions.length === 0) && (
            <Card>
              <CardBody className="p-4 sm:p-6">
                <div className="flex items-center gap-2">
                  <FiUpload size={16} className="text-primary" />
                  <h3 className="text-base sm:text-lg font-semibold">Kumpulkan Tugas</h3>
                </div>
                
                <Divider className="my-3 sm:my-4" />
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs sm:text-sm font-medium">Lampiran File (Maks. 5 file)</div>
                      <span className="text-xs text-gray-500">{selectedFiles.length}/5 file</span>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      multiple
                    />
                    
                    {selectedFiles.length > 0 && (
                      <div className="mb-3 sm:mb-4 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center p-2 sm:p-3 border rounded-md">
                            <FiFile className="text-primary mr-2 flex-shrink-0" size={14} />
                            <div className="flex-grow min-w-0">
                              <div className="font-medium truncate text-xs sm:text-sm">{file.name}</div>
                              <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                            </div>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              onClick={() => handleRemoveFile(index)}
                              className="ml-2 flex-shrink-0 h-8 w-8 min-w-0"
                            >
                              <FiTrash2 size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {selectedFiles.length < 5 && (
                      <Button
                        color="primary"
                        variant="flat"
                        startContent={<FiPlus size={14} />}
                        onClick={triggerFileInput}
                        className="mb-2 py-1 h-9 text-xs sm:text-sm"
                      >
                        Tambah File
                      </Button>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-2">
                      <p>Format yang didukung: .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .jpg, .jpeg, .png, .gif, .mp3, .wav, .mp4, .zip, .rar</p>
                      <p>Ukuran maksimum file: 10MB per file</p>
                    </div>
                  </div>
                </div>
              </CardBody>
              <CardFooter className="justify-between gap-2 border-t border-divider p-3 sm:p-4">
                <Button
                  color="default"
                  variant="flat"
                  isLoading={loading}
                  onPress={() => {
                    
                    setLoading(true);
                    fetchData();
                  }}
                  className="py-1 h-9 text-xs sm:text-sm px-4"
                >
                  Refresh Data
                </Button>
                
                <Button
                  color="primary"
                  isLoading={submitting}
                  onClick={handleSubmit}
                  disabled={selectedFiles.length === 0 || submitting}
                  className="py-1 h-9 text-xs sm:text-sm px-4"
                >
                  Kumpulkan
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {isDeadlinePassed() && mySubmissions.length === 0 && !hasSubmitted && (
            <Card>
              <CardBody className="p-6 text-center">
                <div className="flex flex-col items-center gap-4 py-4">
                  <FiXCircle size={40} className="text-danger" />
                  <h3 className="text-lg font-semibold text-danger">Batas Waktu Pengumpulan Telah Berakhir</h3>
                  <p className="text-gray-600">
                    Anda tidak dapat mengumpulkan tugas ini karena tenggat waktu telah berakhir.
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardBody className="py-8">
            <p className="text-center text-gray-500">Tugas tidak ditemukan.</p>
          </CardBody>
        </Card>
      )}
    </PageContainer>
  );
};

export default TugasDetail;
