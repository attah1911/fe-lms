import React, { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardBody, CardFooter, Spinner, Button, Chip, Divider, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@nextui-org/react';
import { FiArrowLeft, FiDownload, FiUpload, FiFile, FiTrash2, FiXCircle, FiClipboard, FiEdit, FiPlus, FiRefreshCw, FiAward } from 'react-icons/fi';
import { toast } from 'sonner';

import PageContainer from '../../../commons/PageContainer';
import { getMataPelajaranById } from '../../../../services/mataPelajaran.service';
import AssignmentInfoCards from '@/components/views/Shared/AssignmentInfoCards';
import { getFileNameFromUrl, downloadFile } from '../../../../utils/fileUtils';
import { getAssignmentById, submitAssignment, deleteOwnSubmission } from '../../../../services/assignment.service';
import mediaServices from '../../../../services/media.service';
import { SessionExtended } from '../../../../types/Auth';
import { formatTanggalSingkatWaktu, sudahLewat } from "@/utils/date";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface TugasDetailProps {
  mataPelajaranId: string;
  tugasId: string;
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
  status: 'submitted' | 'reviewed' | 'rejected';
  score?: number | null;
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
  materi?: { _id: string; judul: string };
  submissions?: Submission[];
  createdAt: string;
}

interface MataPelajaran {
  _id: string;
  judul: string;
}

/** The API mixes `title`/`judul` and `description`/`deskripsi` depending on age of the row. */
const normalizeAssignment = (assignment: any): Assignment => ({
  ...assignment,
  _id: assignment._id || "",
  judul: assignment.title || assignment.judul || "Tugas Tanpa Judul",
  deskripsi: assignment.description || assignment.deskripsi || "",
  deadline: assignment.deadline || new Date().toISOString(),
  attachments: Array.isArray(assignment.attachments) ? assignment.attachments : [],
  mataPelajaran: assignment.mataPelajaran || "",
  mataPelajaranId: assignment.mataPelajaranId || "",
  materiId: assignment.materiId || "",
  materi: assignment.materi,
  submissions: Array.isArray(assignment.submissions) ? assignment.submissions : [],
  createdAt: assignment.createdAt || new Date().toISOString(),
});

/** Older rows carry the file under `file`, newer ones flat as `fileUrl`/`fileName`. */
const withFileFallbacks = (submission: Submission): Submission => ({
  ...submission,
  fileUrl: submission.fileUrl || submission.file?.url,
  fileName: submission.fileName || submission.file?.originalName,
  additionalFiles: (submission.additionalFiles || []).filter((file) => !!file.fileUrl),
});

// `score` is `Int?` in the schema, so an ungraded submission arrives as null.
const isGraded = (submission: Submission) =>
  submission.score !== null && submission.score !== undefined;

const getStatusColor = (submission: Submission) => {
  if (isGraded(submission)) return "success";
  switch (submission.status) {
    case 'reviewed':
      return "success";
    case 'rejected':
      return "danger";
    default:
      return "primary";
  }
};

const getStatusText = (submission: Submission) => {
  if (isGraded(submission)) return "Sudah Dinilai";
  switch (submission.status) {
    case 'reviewed':
      return "Diterima";
    case 'rejected':
      return "Ditolak";
    default:
      return "Dikumpulkan";
  }
};

const TugasDetail: React.FC<TugasDetailProps> = ({ mataPelajaranId, tugasId }) => {
  const router = useRouter();
  const { data: session } = useSession() as { data: SessionExtended | null };
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const enabled = !!session?.user;

  // separate key from the guru/admin `["assignment", id]`: the backend scopes
  // the payload per requester, so a murid's copy is a different shape
  const assignmentKey = ["assignment", "murid", tugasId] as const;

  const { data: mataPelajaran = null } = useQuery({
    queryKey: ["mataPelajaran", mataPelajaranId],
    queryFn: async (): Promise<MataPelajaran | null> => {
      const response = await getMataPelajaranById(mataPelajaranId);
      return response?.data ? { _id: response.data._id, judul: response.data.judul } : null;
    },
    enabled: enabled && !!mataPelajaranId,
  });

  const {
    data: tugas = null,
    isLoading: loading,
    isFetching,
    refetch,
    error: queryError,
  } = useQuery({
    queryKey: assignmentKey,
    queryFn: async (): Promise<Assignment> =>
      normalizeAssignment((await getAssignmentById(tugasId)).data),
    enabled: enabled && !!tugasId,
  });

  if (queryError) {
    console.error("Error loading assignment:", queryError);
  }

  const attachmentFiles = (tugas?.attachments || []).map((attachment: any) => ({
    url: attachment.url,
    name: attachment.name || attachment.originalName || getFileNameFromUrl(attachment.url),
  }));

  // the backend already scopes submissions to the requesting murid; this is a
  // belt-and-braces filter so a scoping regression can't leak someone else's file
  const isMine = (submission: Submission) => {
    const student: any = submission.student;
    if (!student) return false;
    if (typeof student === 'string') return student === session?.user?.id;
    return (
      (!!student.email && student.email === session?.user?.email) ||
      (!!student._id && !!session?.user?.id && String(student._id) === String(session.user.id))
    );
  };

  const mySubmissions = (tugas?.submissions || [])
    .filter(isMine)
    .map(withFileFallbacks)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);

  const invalidateAssignment = () => queryClient.invalidateQueries({ queryKey: assignmentKey });

  const handleBack = () => {
    router.push(`/murid/matapelajaran/${mataPelajaranId}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filesArray = Array.from(files);

    if (selectedFiles.length + filesArray.length > MAX_FILES) {
      toast.error(`Maksimal ${MAX_FILES} file yang dapat diunggah`);
      return;
    }

    const oversizedFiles = filesArray.filter(file => file.size > MAX_FILE_BYTES);
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

  const submitMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploadedFiles: Array<{ fileUrl: string; fileName: string }> = [];

      for (const file of files) {
        try {
          const uploadResponse = await mediaServices.uploadSingle(file);
          if (uploadResponse?.data?.data?.url) {
            uploadedFiles.push({ fileUrl: uploadResponse.data.data.url, fileName: file.name });
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
        throw new Error('Tidak ada file yang berhasil diunggah');
      }

      return submitAssignment(tugasId, { files: uploadedFiles });
    },
    onSuccess: () => {
      toast.success('Tugas berhasil dikumpulkan');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      invalidateAssignment();
    },
    onError: (err: Error) => {
      console.error('Error submitting assignment:', err);
      toast.error(err.message || 'Gagal mengumpulkan tugas');
    },
  });

  const handleSubmit = () => {
    if (!tugasId || selectedFiles.length === 0) {
      toast.error('Pilih setidaknya satu file untuk dikumpulkan');
      return;
    }
    submitMutation.mutate(selectedFiles);
  };

  const closeSubmissionModals = () => {
    setIsDeleteModalOpen(false);
    setIsReplaceModalOpen(false);
    setSubmissionToDelete(null);
  };

  // "Hapus" and "Hapus & Ganti" are the same call; only the wording differs
  const deleteSubmissionMutation = useMutation({
    mutationFn: ({ submissionId }: { submissionId: string; replacing: boolean }) =>
      deleteOwnSubmission(tugasId, submissionId),
    onSuccess: (_data, { replacing }) => {
      toast.success(
        replacing
          ? 'Pengumpulan lama berhasil dihapus. Silakan unggah file baru.'
          : 'Pengumpulan tugas berhasil dihapus'
      );
      closeSubmissionModals();
      invalidateAssignment();
    },
    onError: (err: Error) => {
      console.error('Error deleting submission:', err);
      toast.error(err.message || 'Gagal menghapus pengumpulan tugas');
      closeSubmissionModals();
    },
  });

  const isDeadlinePassed = () => (tugas ? sudahLewat(tugas.deadline) : false);

  const handleDownloadFile = (file: { url: string; name: string }) => {
    try {
      downloadFile(file.url, file.name);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Gagal mengunduh file. Silakan coba lagi.');
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

  return (
    <PageContainer className="-mt-20">
      <Modal isOpen={isDeleteModalOpen} onClose={closeSubmissionModals}>
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
              onPress={closeSubmissionModals}
              disabled={deleteSubmissionMutation.isPending}
            >
              Batal
            </Button>
            <Button
              color="danger"
              onPress={() =>
                submissionToDelete &&
                deleteSubmissionMutation.mutate({ submissionId: submissionToDelete, replacing: false })
              }
              isLoading={deleteSubmissionMutation.isPending}
            >
              Hapus
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isReplaceModalOpen} onClose={closeSubmissionModals}>
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
              onPress={closeSubmissionModals}
              disabled={deleteSubmissionMutation.isPending}
            >
              Batal
            </Button>
            <Button
              color="primary"
              onPress={() =>
                submissionToDelete &&
                deleteSubmissionMutation.mutate({ submissionId: submissionToDelete, replacing: true })
              }
              isLoading={deleteSubmissionMutation.isPending}
            >
              Hapus &amp; Ganti
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
          <AssignmentInfoCards
            title={tugas.judul}
            description={tugas.deskripsi}
            deadline={tugas.deadline}
            materiJudul={tugas.materi?.judul}
            attachments={attachmentFiles}
            onDownload={handleDownloadFile}
            deadlineNotice={
              isDeadlinePassed() && !mySubmissions.length ? (
                <p className="mt-2 text-danger text-xs sm:text-sm">
                  Batas waktu pengumpulan telah berakhir
                </p>
              ) : null
            }
          />

          {mySubmissions.length > 0 && (
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
                    isLoading={isFetching}
                    onPress={() => refetch()}
                    startContent={<FiRefreshCw size={14} />}
                    className="min-w-0 h-8 px-2 py-0"
                  >
                    Refresh
                  </Button>
                </div>

                <Divider className="my-4" />

                <div className="flex flex-col gap-3">
                  {mySubmissions.map((submission) => (
                    <div key={submission._id} className="border rounded-lg shadow-sm overflow-hidden">
                      <div className="bg-default-50 p-3 border-b">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Chip
                              color={getStatusColor(submission)}
                              variant="flat"
                              size="sm"
                            >
                              {getStatusText(submission)}
                            </Chip>
                            <span className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-0">
                              Dikumpulkan: {formatTanggalSingkatWaktu(submission.submittedAt || submission.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-2">File Tugas:</h4>

                          {submission.fileUrl ? (
                            <div className="flex items-center p-3 border rounded-md bg-default-50 mb-3">
                              <FiFile className="text-primary mr-3 flex-shrink-0" size={18} />
                              <div className="flex-grow mr-4">
                                <div className="font-medium text-sm">
                                  {submission.fileName || "File Tugas"}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="flat"
                                color="primary"
                                startContent={<FiDownload size={14} />}
                                onPress={() => handleDownloadFile({
                                  url: submission.fileUrl || "",
                                  name: submission.fileName || "file.pdf"
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

                      {isGraded(submission) && (
                        <div className="p-4 bg-success-50 border-t">
                          <div className="flex items-center gap-2 mb-1">
                            <FiAward className="text-success" size={16} />
                            <h4 className="text-sm font-medium">Nilai:</h4>
                          </div>
                          <p className="text-xl font-semibold">{submission.score}</p>

                          {(submission.feedback || submission.comment) && (
                            <div className="mt-2">
                              <h5 className="text-xs font-medium text-gray-600">Komentar:</h5>
                              <p className="text-sm mt-1">{submission.feedback || submission.comment}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {!isDeadlinePassed() && mySubmissions.length === 0 && (
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
                      <div className="text-xs sm:text-sm font-medium">Lampiran File (Maks. {MAX_FILES} file)</div>
                      <span className="text-xs text-gray-500">{selectedFiles.length}/{MAX_FILES} file</span>
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

                    {selectedFiles.length < MAX_FILES && (
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
                  isLoading={isFetching}
                  onPress={() => refetch()}
                  className="py-1 h-9 text-xs sm:text-sm px-4"
                >
                  Refresh Data
                </Button>

                <Button
                  color="primary"
                  isLoading={submitMutation.isPending}
                  onClick={handleSubmit}
                  disabled={selectedFiles.length === 0 || submitMutation.isPending}
                  className="py-1 h-9 text-xs sm:text-sm px-4"
                >
                  Kumpulkan
                </Button>
              </CardFooter>
            </Card>
          )}

          {isDeadlinePassed() && mySubmissions.length === 0 && (
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
