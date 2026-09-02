import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMateriByMataPelajaranId } from "@/services/materiPelajaran.service";
import {
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  updateSubmissionStatus,
  deleteSubmission,
  submitAssignment
} from "@/services/assignment.service";
import { Assignment, SubmissionStatus } from "@/types/Assignment";
import { downloadFile } from "@/utils/fileUtils";
import mediaServices from "@/services/media.service";

const ALLOWED_UPLOAD_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpeg', 'jpg'];

export type AssignmentDetailRole = "admin" | "guru";

/** `2026-09-05T23:59` — what <input type="datetime-local"> expects. */
const toDateTimeLocal = (deadline: string) => {
  const date = new Date(deadline);
  return `${date.toISOString().split("T")[0]}T${date.toTimeString().substring(0, 5)}`;
};

const useAssignmentDetail = (role: AssignmentDetailRole) => {
  const router = useRouter();
  const { id, tugasId } = router.query;
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assignmentKey = ["assignment", tugasId] as const;

  // --- server state ---------------------------------------------------------

  const {
    data: assignment = null,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: assignmentKey,
    queryFn: async (): Promise<Assignment> => (await getAssignmentById(tugasId as string)).data,
    enabled: !!tugasId,
  });

  // the materi dropdown is a nice-to-have; a failure here leaves it empty
  // rather than blocking the page (same as before)
  const { data: materiList = [] } = useQuery({
    queryKey: ["materi", assignment?.mataPelajaranId],
    queryFn: async (): Promise<Array<{ _id: string; judul: string }>> =>
      (await getMateriByMataPelajaranId(assignment!.mataPelajaranId)).data || [],
    enabled: !!assignment?.mataPelajaranId,
  });

  // --- form + UI state ------------------------------------------------------

  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [materiId, setMateriId] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<Array<{ url: string; name: string }>>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [activeFeedbackSubmissionId, setActiveFeedbackSubmissionId] = useState<string | null>(null);
  const [isStudentView, setIsStudentView] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [isDeleteSubmissionModalOpen, setIsDeleteSubmissionModalOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [recentlyUploadedFile, setRecentlyUploadedFile] = useState<string | null>(null);

  const hasPermission = session?.user?.role === 'admin' || session?.user?.role === 'guru';

  useEffect(() => {
    if (queryError) setError((queryError as Error).message || "Gagal memuat data tugas");
  }, [queryError]);

  // Seed the edit form once per assignment. Refetches (after grading a
  // submission, say) must not wipe out edits the user has not saved yet.
  const seededId = useRef<string | null>(null);
  useEffect(() => {
    if (!assignment || seededId.current === assignment._id) return;
    seededId.current = assignment._id;

    setTitle(assignment.title);
    setDescription(assignment.description);
    setMateriId(assignment.materiId || "");
    setDeadline(toDateTimeLocal(assignment.deadline));
    setAttachmentFiles(assignment.attachments || []);
  }, [assignment]);

  // --- mutations ------------------------------------------------------------

  const saveMutation = useMutation({
    mutationFn: () =>
      updateAssignment(assignment!._id, {
        title,
        description,
        deadline,
        attachments: attachmentFiles,
        mataPelajaranId: assignment!.mataPelajaranId,
        materiId,
      }),
    onSuccess: (updated) => {
      if (updated?.data) queryClient.setQueryData(assignmentKey, updated.data);
      toast.success("Tugas berhasil diperbarui!", {
        description: "Perubahan tugas telah berhasil disimpan.",
        duration: 3000
      });
    },
    onError: (err: any) => {
      console.error("Error saving assignment:", err);
      toast.error("Gagal menyimpan tugas", {
        description: err.message || "Terjadi kesalahan saat menyimpan tugas.",
        duration: 5000
      });
      setError(err.message);
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: () => deleteAssignment(assignment!._id),
    onSuccess: () => {
      toast.success("Tugas berhasil dihapus!", {
        description: "Tugas telah berhasil dihapus.",
        duration: 3000
      });
      router.push(`/${role}/matapelajaran/${id}?tab=tugas`);
    },
    onError: (err: any) => {
      console.error("Error deleting assignment:", err);
      toast.error("Gagal menghapus tugas", {
        description: err.message || "Terjadi kesalahan saat menghapus tugas.",
        duration: 5000
      });
      setError(err.message);
      setIsDeleteModalOpen(false);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await mediaServices.uploadSingle(file);
      const fileUrl = response?.data?.data?.url || response?.data?.url || null;

      if (!fileUrl) {
        console.error("Invalid upload response structure:", response);
        toast.error("Gagal mengunggah file: URL tidak tersedia", {
          description: "Format respons server tidak valid",
          duration: 5000
        });
        return;
      }

      const fileName = file.name;

      if (!isStudentView) {
        setAttachmentFiles((prev) => [...prev, { url: fileUrl, name: fileName }]);
        toast.success("File berhasil diunggah!", {
          description: "File telah berhasil ditambahkan ke tugas.",
          duration: 3000
        });
        return;
      }

      // student preview: the upload doubles as a submission
      try {
        await submitAssignment(assignment!._id, { files: [{ fileUrl, fileName }] });

        toast.success("Tugas berhasil dikumpulkan!", {
          description: "File telah berhasil dikirim sebagai pengumpulan tugas.",
          duration: 3000
        });

        setRecentlyUploadedFile(fileName);
        await queryClient.invalidateQueries({ queryKey: assignmentKey });
        setTimeout(() => setRecentlyUploadedFile(null), 5000);
      } catch (err: any) {
        console.error("Error submitting assignment:", err);
        toast.error("Gagal mengumpulkan tugas", {
          description: err.response?.data?.meta?.message || err.message || "Terjadi kesalahan saat mengumpulkan tugas.",
          duration: 5000
        });
        await mediaServices.remove(fileUrl);
      }
    },
    onError: (err: any) => {
      console.error("Error uploading file:", err);
      toast.error("Gagal mengunggah file", {
        description: err.response?.data?.meta?.message || err.message || "Terjadi kesalahan saat mengunggah file.",
        duration: 5000
      });
    },
    onSettled: () => {
      setUploadingFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ submissionId, status }: { submissionId: string; status: SubmissionStatus }) =>
      updateSubmissionStatus(
        assignment!._id,
        submissionId,
        status,
        activeFeedbackSubmissionId === submissionId ? feedbackText : undefined
      ),
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: assignmentKey });
      toast.success(`Status pengumpulan berhasil diperbarui menjadi ${status}`);
      setActiveFeedbackSubmissionId(null);
      setFeedbackText('');
    },
    onError: (err: any) => {
      setError(err.message || "Failed to update submission status");
      console.error("Error updating submission status:", err);
    },
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: (submissionId: string) => deleteSubmission(assignment!._id, submissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKey });
      toast.success("Pengumpulan tugas berhasil dihapus");
    },
    onError: (err: any) => {
      console.error("Error deleting submission:", err);
      toast.error("Gagal menghapus pengumpulan tugas", {
        description: err.message || "Terjadi kesalahan saat menghapus pengumpulan tugas.",
        duration: 5000
      });
    },
    onSettled: () => {
      setSubmissionToDelete(null);
      setIsDeleteSubmissionModalOpen(false);
    },
  });

  /** Which submission row should show a spinner right now. */
  const processingSubmissionId = statusMutation.isPending
    ? statusMutation.variables.submissionId
    : deleteSubmissionMutation.isPending
      ? deleteSubmissionMutation.variables
      : null;

  // --- handlers -------------------------------------------------------------

  const handleBack = () => {
    router.push(`/${role}/matapelajaran/${id}?tab=tugas`);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !assignment) {
      toast.error("Tidak ada file yang dipilih");
      return;
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(fileExtension)) {
      toast.error("Format file tidak didukung", {
        description: "Hanya file dengan format .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .jpeg, dan .jpg yang diperbolehkan.",
        duration: 5000
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadingFileName(file.name);
    uploadMutation.mutate(file);
  };

  const handleDownloadFile = (file: { url: string; name: string }) => {
    downloadFile(file.url, file.name);
  };

  // Only drops the file from the pending list — it is detached for real when
  // the guru saves. Removing it from Cloudinary here would leave the still-
  // saved assignment pointing at a dead URL if they never hit save.
  // ponytail: the file stays in Cloudinary as an orphan; add a sweep job if
  // storage cost ever matters.
  const handleDeleteAttachment = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
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

  const openDeleteSubmissionModal = (submissionId: string) => {
    setSubmissionToDelete(submissionId);
    setIsDeleteSubmissionModalOpen(true);
  };

  return {
    session,
    fileInputRef,
    hasPermission,

    loading,
    saving: saveMutation.isPending,
    deleting: deleteAssignmentMutation.isPending,
    uploading: uploadMutation.isPending,
    uploadingFileName,
    error,
    setError,

    assignment,
    title,
    setTitle,
    description,
    setDescription,
    deadline,
    setDeadline,
    materiId,
    setMateriId,
    materiList,
    attachmentFiles,
    recentlyUploadedFile,

    isStudentView,
    toggleStudentView: () => setIsStudentView(!isStudentView),

    processingSubmissionId,
    feedbackText,
    setFeedbackText,
    activeFeedbackSubmissionId,

    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleteSubmissionModalOpen,
    setIsDeleteSubmissionModalOpen,
    submissionToDelete,
    setSubmissionToDelete,

    handleBack,
    handleSave: () => saveMutation.mutate(),
    handleDeleteAssignment: () => deleteAssignmentMutation.mutate(),
    handleFileUpload,
    handleDownloadFile,
    handleDeleteAttachment,
    triggerFileInput,
    toggleFeedbackInput,
    handleStatusUpdate: (submissionId: string, status: SubmissionStatus) =>
      statusMutation.mutate({ submissionId, status }),
    openDeleteSubmissionModal,
    handleDeleteSubmission: () => {
      if (submissionToDelete) deleteSubmissionMutation.mutate(submissionToDelete);
    }
  };
};

export default useAssignmentDetail;
