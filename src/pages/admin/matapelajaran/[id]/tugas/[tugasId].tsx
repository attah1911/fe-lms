import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import {
  Card,
  CardBody,
  Divider,
  Button,
  Spinner,
  Input,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Chip,
  Switch,
  CardFooter
} from "@nextui-org/react";
import {
  FiArrowLeft,
  FiCalendar,
  FiTrash2,
  FiEdit,
  FiDownload,
  FiUpload,
  FiCheck,
  FiX,
  FiClipboard,
  FiEye,
  FiXCircle
} from "react-icons/fi";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import DashboardLayout from "../../../../../components/layouts/DashboardLayout";
import PageContainer from "../../../../../components/commons/PageContainer";
import NotificationAlert from "../../../../../components/commons/NotificationAlert/NotificationAlert";
import {
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  updateSubmissionStatus,
  deleteSubmission,
  submitAssignment
} from "../../../../../services/assignment.service";
import { Assignment, SubmissionStatus, AssignmentSubmission } from "../../../../../types/Assignment";
import { downloadFile } from "../../../../../utils/fileUtils";
import mediaServices from "../../../../../services/media.service";

interface ExtendedAssignmentSubmission extends AssignmentSubmission {
  answer?: string;
}

const AssignmentDetail: React.FC = () => {
  const router = useRouter();
  const { id, tugasId } = router.query;
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [processingSubmissionId, setProcessingSubmissionId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [activeFeedbackSubmissionId, setActiveFeedbackSubmissionId] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<Array<{ url: string; name: string }>>([]);
  const [isStudentView, setIsStudentView] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [editFormVisible, setEditFormVisible] = useState(false);
  const [isDeleteSubmissionModalOpen, setIsDeleteSubmissionModalOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [recentlyUploadedFile, setRecentlyUploadedFile] = useState<string | null>(null);

  const hasPermission = session?.user?.role === 'admin' || session?.user?.role === 'guru';

  useEffect(() => {
    if (!tugasId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const response = await getAssignmentById(tugasId as string);

        if (response.data) {
          setAssignment(response.data);
          setTitle(response.data.title);
          setDescription(response.data.description);
          
          const date = new Date(response.data.deadline);
          const dateStr = date.toISOString().split('T')[0];
          const timeStr = date.toTimeString().substring(0, 5);
          setDeadline(`${dateStr}T${timeStr}`);

          if (response.data.attachments) {
            setAttachmentFiles(response.data.attachments);
          }
        }

        setError(null);
      } catch (err: any) {
        console.error("Error fetching assignment data:", err);
        setError(err.message || "Gagal memuat data tugas");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tugasId]);

  const handleBack = () => {
    router.push(`/admin/matapelajaran/${id}?tab=tugas`);
  };

  const handleSave = async () => {
    if (!assignment) return;

    try {
      setSaving(true);

      const updateData = {
        title,
        description,
        deadline,
        attachments: attachmentFiles,
        mataPelajaranId: assignment.mataPelajaranId,
        materiId: assignment.materiId
      };

      await updateAssignment(assignment._id, updateData);

      toast.success("Tugas berhasil diperbarui!", {
        description: "Perubahan tugas telah berhasil disimpan.",
        duration: 3000
      });
    } catch (err: any) {
      console.error("Error saving assignment:", err);

      toast.error("Gagal menyimpan tugas", {
        description: err.message || "Terjadi kesalahan saat menyimpan tugas.",
        duration: 5000
      });

      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignment) return;

    try {
      setDeleting(true);

      await deleteAssignment(assignment._id);

      toast.success("Tugas berhasil dihapus!", {
        description: "Tugas telah berhasil dihapus.",
        duration: 3000
      });

      router.push(`/admin/matapelajaran/${id}?tab=tugas`);
    } catch (err: any) {
      console.error("Error deleting assignment:", err);

      toast.error("Gagal menghapus tugas", {
        description: err.message || "Terjadi kesalahan saat menghapus tugas.",
        duration: 5000
      });

      setError(err.message);
      setIsDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !assignment) {
      toast.error("Tidak ada file yang dipilih");
      return;
    }

    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpeg', 'jpg'];
    
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error("Format file tidak didukung", {
        description: "Hanya file dengan format .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .jpeg, dan .jpg yang diperbolehkan.",
        duration: 5000
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      setUploading(true);
      setUploadingFileName(file.name);

      const response = await mediaServices.uploadSingle(file);

      if (response.data && response.data.data) {
        const fileUrl = response.data.data.url;
        const fileName = file.name;

        if (isStudentView) {
          try {
            await submitAssignment(assignment._id, {
              files: [{
                fileUrl,
                fileName
              }]
            });
            
            toast.success("Tugas berhasil dikumpulkan!", {
              description: "File telah berhasil dikirim sebagai pengumpulan tugas.",
              duration: 3000
            });
            
            setRecentlyUploadedFile(fileName);
            
            const response = await getAssignmentById(assignment._id);
            setAssignment(response.data);
            
            setTimeout(() => {
              setRecentlyUploadedFile(null);
            }, 5000);
          } catch (err: any) {
            console.error("Error submitting assignment:", err);
            
            toast.error("Gagal mengumpulkan tugas", {
              description: err.message || "Terjadi kesalahan saat mengumpulkan tugas.",
              duration: 5000
            });
            
            await mediaServices.remove(fileUrl);
          }
        } else {
          const newFileObject = {
            url: fileUrl,
            name: fileName
          };

          const updatedFiles = [...attachmentFiles, newFileObject];
          setAttachmentFiles(updatedFiles);

          toast.success("File berhasil diunggah!", {
            description: "File telah berhasil ditambahkan ke tugas.",
            duration: 3000
          });
        }
      }
    } catch (err: any) {
      console.error("Error uploading file:", err);
      toast.error("Gagal mengunggah file", {
        description: err.message || "Terjadi kesalahan saat mengunggah file.",
        duration: 5000
      });
    } finally {
      setUploading(false);
      setUploadingFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteFile = async (index: number) => {
    try {
      const fileToDelete = attachmentFiles[index];
      const updatedFiles = [...attachmentFiles];
      updatedFiles.splice(index, 1);
      setAttachmentFiles(updatedFiles);

      await mediaServices.remove(fileToDelete.url);

      toast.success("File berhasil dihapus!");
    } catch (err: any) {
      console.error("Error deleting file:", err);

      toast.error("Gagal menghapus file", {
        description: err.message || "Terjadi kesalahan saat menghapus file.",
        duration: 5000
      });

      setError(err.message);
    }
  };

  const handleDownloadFile = (file: { url: string; name: string }) => {
    downloadFile(file.url, file.name);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const toggleFeedbackInput = (submissionId: string, currentFeedback?: string) => {
    if (activeFeedbackSubmissionId === submissionId) {
      setActiveFeedbackSubmissionId(null);
      setFeedbackText('');
    } else {
      setActiveFeedbackSubmissionId(submissionId);
      setFeedbackText(currentFeedback || '');
    }
  };

  const handleStatusUpdate = async (submissionId: string, status: SubmissionStatus) => {
    try {
      setProcessingSubmissionId(submissionId);

      const feedback = activeFeedbackSubmissionId === submissionId ? feedbackText : undefined;

      await updateSubmissionStatus(assignment!._id, submissionId, status, feedback);

      const response = await getAssignmentById(assignment!._id);
      setAssignment(response.data);

      toast.success(`Status pengumpulan berhasil diperbarui menjadi ${status}`);

      setActiveFeedbackSubmissionId(null);
      setFeedbackText('');
    } catch (err: any) {
      setError(err.message || "Failed to update submission status");
      console.error("Error updating submission status:", err);
    } finally {
      setProcessingSubmissionId(null);
    }
  };

  const getStatusColor = (status: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.SUBMITTED:
        return "warning";
      case SubmissionStatus.REVIEWED:
        return "success";
      case SubmissionStatus.REJECTED:
        return "danger";
      default:
        return "default";
    }
  };

  const getStatusText = (status: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.SUBMITTED:
        return "Terkirim";
      case SubmissionStatus.REVIEWED:
        return "Diterima";
      case SubmissionStatus.REJECTED:
        return "Ditolak";
      default:
        return "Unknown";
    }
  };

  const openDeleteSubmissionModal = (submissionId: string) => {
    setSubmissionToDelete(submissionId);
    setIsDeleteSubmissionModalOpen(true);
  };

  const handleDeleteSubmission = async () => {
    if (!submissionToDelete) return;
    
    try {
      setProcessingSubmissionId(submissionToDelete);
      
      await deleteSubmission(assignment!._id, submissionToDelete);
      
      const response = await getAssignmentById(assignment!._id);
      setAssignment(response.data);
      
      toast.success("Pengumpulan tugas berhasil dihapus");
    } catch (err: any) {
      console.error("Error deleting submission:", err);
      toast.error("Gagal menghapus pengumpulan tugas", {
        description: err.message || "Terjadi kesalahan saat menghapus pengumpulan tugas.",
        duration: 5000
      });
    } finally {
      setProcessingSubmissionId(null);
      setSubmissionToDelete(null);
      setIsDeleteSubmissionModalOpen(false);
    }
  };

  const renderSubmissions = () => {
    if (!assignment || !assignment.submissions || assignment.submissions.length === 0) {
      return (
        <Card className="mt-4">
          <CardBody className="py-8">
            <p className="text-center text-gray-500">
              Belum ada pengumpulan tugas.
            </p>
          </CardBody>
        </Card>
      );
    }

    return (
      <Table aria-label="Submissions table" className="mt-4">
        <TableHeader>
          <TableColumn>NAMA MURID</TableColumn>
          <TableColumn>KELAS</TableColumn>
          <TableColumn>FILE</TableColumn>
          <TableColumn>WAKTU PENGUMPULAN</TableColumn>
          <TableColumn>STATUS</TableColumn>
          <TableColumn>AKSI</TableColumn>
        </TableHeader>
        <TableBody>
          {assignment.submissions.map((submission) => {
            const isTestSubmission = submission.student && 
                                    typeof submission.student === 'object' && 
                                    submission.student.fullName && 
                                    (submission.student.fullName.includes('Testing'));
            
            return (
              <TableRow key={submission._id}>
                <TableCell>
                  {isTestSubmission ? (
                    <Chip color="warning" variant="flat">{submission.student.fullName}</Chip>
                  ) : (
                    submission.student?.fullName || "Tidak diketahui"
                  )}
                </TableCell>
                <TableCell>{isTestSubmission ? "-" : (submission.student?.kelas || "-")}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      startContent={<FiDownload size={16} />}
                      onPress={() => handleDownloadFile({ 
                        url: submission.fileUrl, 
                        name: submission.fileName 
                      })}
                      className={recentlyUploadedFile === submission.fileName ? "animate-pulse border-2 border-primary" : ""}
                    >
                      {submission.fileName}
                      {recentlyUploadedFile === submission.fileName && (
                        <span className="ml-2 text-xs text-success">Baru diupload!</span>
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(submission.submittedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </TableCell>
                <TableCell>
                  <Chip
                    color={getStatusColor(submission.status)}
                    variant="flat"
                    size="sm"
                  >
                    {getStatusText(submission.status)}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {submission.status === SubmissionStatus.SUBMITTED && (
                      <>
                        <Button
                          isIconOnly
                          size="sm"
                          color="success"
                          variant="flat"
                          isLoading={processingSubmissionId === submission._id}
                          onPress={() => handleStatusUpdate(submission._id, SubmissionStatus.REVIEWED)}
                        >
                          <FiCheck size={16} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          color="danger"
                          variant="flat"
                          isLoading={processingSubmissionId === submission._id}
                          onPress={() => handleStatusUpdate(submission._id, SubmissionStatus.REJECTED)}
                        >
                          <FiX size={16} />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant={activeFeedbackSubmissionId === submission._id ? "solid" : "flat"}
                      color="primary"
                      onPress={() => toggleFeedbackInput(submission._id, submission.feedback)}
                    >
                      Feedback
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      color="danger"
                      variant="flat"
                      onPress={() => openDeleteSubmissionModal(submission._id)}
                    >
                      <FiTrash2 size={16} />
                    </Button>
                  </div>
                  {activeFeedbackSubmissionId === submission._id && (
                    <div className="mt-2">
                      <Textarea
                        placeholder="Berikan feedback..."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        minRows={2}
                        className="mb-2"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          color="danger"
                          onPress={() => toggleFeedbackInput(submission._id)}
                        >
                          Batal
                        </Button>
                        <Button
                          size="sm"
                          color="primary"
                          onPress={() => handleStatusUpdate(
                            submission._id,
                            submission.status
                          )}
                          isLoading={processingSubmissionId === submission._id}
                        >
                          Simpan
                        </Button>
                      </div>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const renderFileList = () => {
    if (!attachmentFiles || (attachmentFiles.length === 0 && !uploading)) {
      return (
        <div className="text-center text-gray-500 py-4">
          Tidak ada file yang dilampirkan.
        </div>
      );
    }

    const files = [...attachmentFiles];
    
    if (uploading && uploadingFileName) {
      files.push({
        url: "uploading",
        name: uploadingFileName
      });
    }

    return (
      <div className="space-y-3">
        {files.map((file, index) => {
          const isUploading = file.url === "uploading";
          
          return (
            <div key={index} className="flex flex-col p-3 border rounded">
              <div className="w-full mb-2">
                <span className="text-sm font-medium break-all">{file.name}</span>
                {isUploading && (
                  <div className="mt-1">
                    <Spinner size="sm" color="primary" labelColor="primary" label="Sedang mengunggah..." />
                  </div>
                )}
              </div>
              {!isUploading && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    startContent={<FiDownload size={16} />}
                    onPress={() => handleDownloadFile(file)}
                    className="min-w-[100px] flex-grow"
                  >
                    Unduh
                  </Button>
                  {hasPermission && (
                    <Button
                      size="sm"
                      color="danger"
                      variant="flat"
                      startContent={<FiTrash2 size={16} />}
                      onPress={() => handleDeleteFile(index)}
                      className="min-w-[100px] flex-grow"
                    >
                      Hapus
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const toggleStudentView = () => {
    setIsStudentView(!isStudentView);
  };

  const renderStudentView = () => {
    if (!assignment) return null;

    const userEmail = session?.user?.email;
    
    const mySubmissions = assignment.submissions?.filter(sub => {
      if (!sub.student) return false;
      
      const isTestSubmission = typeof sub.student === 'object' && 
                              'fullName' in sub.student && 
                              typeof sub.student.fullName === 'string' &&
                              (sub.student.fullName.includes('Testing') || 
                               sub.student.fullName.includes('Admin') || 
                               sub.student.fullName.includes('Guru'));
      
      if (isTestSubmission && hasPermission) {
        return true;
      }
      
      return sub.student.email === userEmail;
    }) || [];
    
    const isDeadlinePassed = new Date(assignment.deadline) < new Date();
    
    const canUpload = hasPermission || !isDeadlinePassed;
    
    return (
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiCalendar size={16} className="text-primary" />
              <h3 className="text-lg font-semibold">Informasi Tugas</h3>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm text-gray-500">Judul Tugas:</h4>
                <p className="font-medium">{assignment.title}</p>
              </div>

              <div>
                <h4 className="text-sm text-gray-500">Deskripsi:</h4>
                <p className="whitespace-pre-wrap">{assignment.description}</p>
              </div>

              <div>
                <h4 className="text-sm text-gray-500">Tenggat Waktu:</h4>
                <p className={`font-medium ${isDeadlinePassed ? 'text-danger' : ''}`}>
                  {new Date(assignment.deadline).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}{' '}
                  pukul{' '}
                  {new Date(assignment.deadline).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'Asia/Jakarta'
                  })}
                  {' '}WIB
                </p>
                {isDeadlinePassed && !hasPermission && (
                  <p className="mt-2 text-danger">Batas waktu pengumpulan telah berakhir</p>
                )}
                {hasPermission && isDeadlinePassed && (
                  <p className="mt-2 text-warning">Batas waktu pengumpulan telah berakhir, namun Anda tetap dapat mengupload file untuk testing</p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center gap-2">
              <FiClipboard size={16} className="text-primary" />
              <h3 className="text-lg font-semibold">File Lampiran</h3>
            </div>

            <Divider className="my-4" />

            {attachmentFiles && attachmentFiles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {attachmentFiles.map((file, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="flat"
                    color="primary"
                    startContent={<FiDownload size={16} />}
                    onPress={() => handleDownloadFile(file)}
                    className="mb-2 min-w-[120px] flex-grow xs:flex-grow-0"
                  >
                    {file.name}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                Tidak ada file yang dilampirkan.
              </div>
            )}
          </CardBody>
        </Card>

        {mySubmissions.length > 0 ? (
          <Card>
            <CardBody className="p-6">
              <div className="flex items-center gap-2">
                <FiClipboard size={16} className="text-primary" />
                <h3 className="text-lg font-semibold">Pengumpulan Tugas</h3>
                {hasPermission && (
                  <Chip color="warning" variant="flat" size="sm">Mode Testing</Chip>
                )}
              </div>

              <Divider className="my-4" />

              <div className="flex flex-col gap-3">
                {mySubmissions.map((submission) => {
                  const isTestSubmission = typeof submission.student === 'object' && 
                                         submission.student.fullName && 
                                         (submission.student.fullName.includes('Testing'));
                                      
                  const isRecentlyUploaded = recentlyUploadedFile === submission.fileName;
                                     
                  return (
                    <div key={submission._id} className="border rounded p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Chip
                          color={getStatusColor(submission.status)}
                          variant="flat"
                          size="sm"
                        >
                          {getStatusText(submission.status)}
                        </Chip>
                        <span className="text-sm text-gray-500">
                          Dikumpulkan pada: {new Date(submission.submittedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        
                        {isTestSubmission && hasPermission && (
                          <Button
                            isIconOnly
                            size="sm"
                            color="danger"
                            variant="flat"
                            onPress={() => openDeleteSubmissionModal(submission._id)}
                          >
                            <FiTrash2 size={16} />
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          startContent={<FiDownload size={16} />}
                          onPress={() => handleDownloadFile({ 
                            url: submission.fileUrl, 
                            name: submission.fileName 
                          })}
                          className={isRecentlyUploaded ? "animate-pulse border-2 border-primary" : ""}
                        >
                          {submission.fileName}
                          {isRecentlyUploaded && (
                            <span className="ml-2 text-xs text-success">Baru diupload!</span>
                          )}
                        </Button>
                      </div>
                      
                      {(submission as ExtendedAssignmentSubmission).answer && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium">Jawaban:</h4>
                          <p className="mt-1 p-3 bg-gray-50 rounded whitespace-pre-line">
                            {(submission as ExtendedAssignmentSubmission).answer}
                          </p>
                        </div>
                      )}
                      
                      {submission.feedback && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md">
                          <h4 className="text-sm font-medium">Feedback:</h4>
                          <p className="mt-1 whitespace-pre-wrap">{submission.feedback}</p>
                        </div>
                      )}
                      
                      {submission.status === SubmissionStatus.REVIEWED && submission.score !== undefined && (
                        <div className="mt-3 p-3 bg-green-50 rounded-md">
                          <h4 className="text-sm font-medium">Nilai:</h4>
                          <p className="mt-1 font-semibold text-lg">{submission.score}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {canUpload && (
                <div className="mt-4">
                  <h4 className="text-sm mb-2">
                    {hasPermission ? "Upload File (Mode Testing)" : "Ubah Pengumpulan:"}
                  </h4>
                  <div className="flex flex-col xs:flex-row gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      color="primary"
                      variant="flat"
                      startContent={<FiUpload size={16} />}
                      onPress={triggerFileInput}
                      isLoading={uploading}
                      className="w-full xs:w-auto"
                    >
                      Unggah File {hasPermission ? "Test" : "Baru"}
                    </Button>
                  </div>
                  
                  {uploading && uploadingFileName && (
                    <div className="mt-3 p-3 border rounded">
                      <div className="flex items-center gap-2">
                        <Spinner size="sm" color="primary" />
                        <span className="text-sm">Sedang mengunggah: {uploadingFileName}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    <p>Format yang didukung: .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .jpg, .jpeg, .png, .gif, .mp3, .wav, .mp4, .zip, .rar</p>
                    <p>Ukuran maksimal: 10MB per file</p>
                    {hasPermission && (
                      <p className="text-warning mt-1">Mode testing: Upload file untuk mengecek fungsionalitas upload</p>
                    )}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          isDeadlinePassed && !hasPermission ? (
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
          ) : (
            <Card>
              <CardBody className="p-6">
                <div className="flex items-center gap-2">
                  <FiUpload size={16} className="text-primary" />
                  <h3 className="text-lg font-semibold">Kumpulkan Tugas</h3>
                  {hasPermission && (
                    <Chip color="warning" variant="flat" size="sm">Mode Testing</Chip>
                  )}
                </div>
                
                <Divider className="my-4" />
                
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium mb-2">Lampiran File</div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    
                    <Button
                      color="primary"
                      variant="flat"
                      startContent={<FiUpload />}
                      onPress={triggerFileInput}
                      isLoading={uploading}
                    >
                      Pilih File
                    </Button>
                    
                    {uploading && uploadingFileName && (
                      <div className="mt-3 p-3 border rounded">
                        <div className="flex items-center gap-2">
                          <Spinner size="sm" color="primary" />
                          <span className="text-sm">Sedang mengunggah: {uploadingFileName}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-2">
                      <p>Format yang didukung: .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .jpg, .jpeg, .png, .gif, .mp3, .wav, .mp4, .zip, .rar</p>
                      <p>Ukuran maksimal: 10MB per file</p>
                      {hasPermission && (
                        <p className="text-warning mt-1">Mode testing: Upload file untuk mengecek fungsionalitas upload</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
              <CardFooter className="justify-end gap-2 border-t border-divider p-4">
                <Button
                  color="primary"
                  isLoading={uploading}
                  onPress={triggerFileInput}
                  disabled={uploading}
                >
                  Kumpulkan
                </Button>
              </CardFooter>
            </Card>
          )
        )}
      </div>
    );
  };

  return (
    <>
      <DashboardLayout>
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
              <div className="mb-4 relative z-40 pointer-events-auto mt-16">
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

                <div className="flex justify-between flex-col sm:flex-row items-start sm:items-center gap-3">
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                    {assignment?.title || 'Detail Tugas'}
                  </h1>

                  <div className="flex flex-col xs:flex-row gap-4 w-full sm:w-auto">
                    {hasPermission && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm whitespace-nowrap">Tampilan Admin</span>
                        <Switch 
                          isSelected={isStudentView}
                          onValueChange={toggleStudentView}
                          size="sm"
                          color="primary"
                        />
                        <span className="text-sm whitespace-nowrap">Tampilan Murid</span>
                      </div>
                    )}
                    
                    {hasPermission && !isStudentView && (
                      <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
                        <Button
                          color="danger"
                          variant="flat"
                          startContent={<FiTrash2 size={16} />}
                          onPress={() => setIsDeleteModalOpen(true)}
                          className="flex-grow min-w-[140px]"
                          size="md"
                        >
                          Hapus Tugas
                        </Button>
                        <Button
                          color="primary"
                          startContent={<FiEdit size={16} />}
                          onPress={handleSave}
                          isLoading={saving}
                          className="flex-grow min-w-[140px]"
                          size="md"
                        >
                          Simpan Perubahan
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isStudentView ? renderStudentView() : (
                <div className="grid grid-cols-1 gap-6 mb-6">
                  <Card>
                    <CardBody className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FiCalendar size={16} className="text-primary" />
                        <h3 className="text-lg font-semibold">Informasi Tugas</h3>
                      </div>

                      <div className="space-y-4">
                        <Input
                          label="Judul Tugas"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          variant="bordered"
                          className="mb-4"
                        />

                        <Textarea
                          label="Deskripsi"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          variant="bordered"
                          minRows={5}
                          className="mb-4"
                        />

                        <Input
                          label="Tenggat Waktu"
                          type="datetime-local"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                          variant="bordered"
                          className="mb-4"
                        />
                      </div>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardBody className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FiClipboard size={16} className="text-primary" />
                        <h3 className="text-lg font-semibold">File Lampiran</h3>
                      </div>

                      <Divider className="my-3" />

                      {attachmentFiles && attachmentFiles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {attachmentFiles.map((file, index) => (
                            <Button
                              key={index}
                              size="sm"
                              variant="flat"
                              color="primary"
                              startContent={<FiDownload size={16} />}
                              onPress={() => handleDownloadFile(file)}
                              className="mb-2 min-w-[120px] flex-grow xs:flex-grow-0"
                            >
                              {file.name}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          Tidak ada file yang dilampirkan.
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  <Card>
                    <CardBody className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FiClipboard size={16} className="text-primary" />
                        <h3 className="text-lg font-semibold">Pengumpulan Tugas</h3>
                      </div>

                      <Divider className="my-3" />

                      {renderSubmissions()}
                    </CardBody>
                  </Card>
                </div>
              )}

              <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                backdrop="blur"
              >
                <ModalContent>
                  {(onClose) => (
                    <>
                      <ModalHeader className="flex flex-col gap-1">Konfirmasi Penghapusan</ModalHeader>
                      <ModalBody>
                        <p>Apakah Anda yakin ingin menghapus tugas <strong>{assignment?.title}</strong>?</p>
                        <p className="text-gray-500 text-sm">Tindakan ini tidak dapat dibatalkan.</p>
                      </ModalBody>
                      <ModalFooter>
                        <Button variant="flat" onPress={onClose}>
                          Batal
                        </Button>
                        <Button
                          color="danger"
                          onPress={handleDeleteAssignment}
                          isLoading={deleting}
                        >
                          Hapus
                        </Button>
                      </ModalFooter>
                    </>
                  )}
                </ModalContent>
              </Modal>
            </>
          )}
        </PageContainer>
      </DashboardLayout>
      
      <Modal 
        isOpen={isDeleteSubmissionModalOpen} 
        onOpenChange={(open) => {
          setIsDeleteSubmissionModalOpen(open);
          if (!open) setSubmissionToDelete(null);
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Konfirmasi Hapus</ModalHeader>
              <ModalBody>
                <p>Apakah Anda yakin ingin menghapus pengumpulan tugas ini?</p>
                <p className="text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Batal
                </Button>
                <Button 
                  color="danger" 
                  onPress={handleDeleteSubmission}
                  isLoading={processingSubmissionId === submissionToDelete}
                >
                  Hapus
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default AssignmentDetail; 