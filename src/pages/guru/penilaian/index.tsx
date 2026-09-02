import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardBody,
  Button,
  Chip,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
  SortDescriptor,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea
} from "@nextui-org/react";
import { FiCheckCircle, FiSearch, FiDownload, FiSend } from "react-icons/fi";

import DashboardLayout from "../../../components/layouts/DashboardLayout";
import PageContainer from "../../../components/commons/PageContainer";
import PageHeader from "../../../components/commons/PageHeader";
import NotificationAlert from "../../../components/commons/NotificationAlert/NotificationAlert";
import { getGuruMataPelajaran } from "../../../services/guru.service";
import { getAssignments, updateSubmissionStatus, updateSubmissionScore } from "../../../services/assignment.service";
import { Assignment, SubmissionStatus } from "../../../types/Assignment";
import { MataPelajaran } from "../../../types/MataPelajaran";
import { downloadFile } from "../../../utils/fileUtils";
import { toast } from "sonner";
import { formatTanggalWaktu } from "@/utils/date";

interface ExtendedAssignment extends Assignment {
  mataPelajaranTitle?: string;
  materiTitle?: string;
}

interface SubmissionWithUserData {
  _id: string;
  assignmentId: string;
  assignmentTitle: string;
  mataPelajaranTitle: string;
  materiTitle: string;
  studentName: string;
  studentNIS?: string;
  studentClass?: string;
  submittedAt: string;
  status: string;
  score?: number | null;
  fileUrl: string;
  fileName: string;
  feedback?: string;
}

/**
 * `score` is `Int?` in the schema, so an ungraded submission arrives as
 * `null` — `score !== undefined` was true for those and labelled every
 * ungraded row "Sudah Dinilai" with a blank score chip.
 */
const isGraded = (submission: SubmissionWithUserData) =>
  submission.score !== null && submission.score !== undefined;

interface GradingData {
  mataPelajaranList: MataPelajaran[];
  assignments: ExtendedAssignment[];
  assignmentsByMataPelajaran: Record<string, ExtendedAssignment[]>;
  submissions: SubmissionWithUserData[];
}

const EMPTY_DATA: GradingData = {
  mataPelajaranList: [],
  assignments: [],
  assignmentsByMataPelajaran: {},
  submissions: [],
};

/**
 * Two requests: the guru's mata pelajaran (for the filter dropdown) and every
 * assignment they can see, submissions included. The backend scopes the rows and
 * each one already carries its materi + mata pelajaran.
 */
const fetchGradingData = async (): Promise<GradingData> => {
  const [mataPelajaranResponse, assignmentsResponse] = await Promise.all([
    getGuruMataPelajaran({ limit: 100 }),
    getAssignments({ withSubmissions: true }),
  ]);

  const mataPelajaranList: MataPelajaran[] = mataPelajaranResponse?.data || [];

  const assignments: ExtendedAssignment[] = ((assignmentsResponse?.data || []) as Assignment[]).map(
    (assignment) => ({
      ...assignment,
      mataPelajaranTitle: assignment.mataPelajaran?.judul,
      materiTitle: assignment.materi?.judul,
    })
  );

  const assignmentsByMataPelajaran: Record<string, ExtendedAssignment[]> = {};
  for (const assignment of assignments) {
    const key = assignment.mataPelajaranId;
    assignmentsByMataPelajaran[key] = [...(assignmentsByMataPelajaran[key] || []), assignment];
  }

  const submissions = assignments
    .flatMap((assignment) =>
      (assignment.submissions || []).map((submission: any) => ({
        _id: submission._id,
        assignmentId: assignment._id,
        assignmentTitle: assignment.title,
        mataPelajaranTitle: assignment.mataPelajaranTitle as string,
        materiTitle: assignment.materiTitle as string,
        studentName: submission.student?.fullName || "Siswa",
        studentNIS: submission.student?.nis || "",
        studentClass: submission.student?.kelas || "",
        submittedAt: submission.submittedAt,
        status: submission.status,
        score: submission.score,
        fileUrl: submission.fileUrl,
        fileName: submission.fileName,
        feedback: submission.feedback,
      }))
    )
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return { mataPelajaranList, assignments, assignmentsByMataPelajaran, submissions };
};

const TeacherGradingPage: React.FC = () => {
  const router = useRouter();
  const { assignmentId: queryAssignmentId } = router.query;
  const queryClient = useQueryClient();

  const {
    data = EMPTY_DATA,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["grading", "guru"],
    queryFn: fetchGradingData,
  });
  const { mataPelajaranList, assignments, assignmentsByMataPelajaran, submissions } = data;

  const [errorDismissed, setErrorDismissed] = useState(false);
  const [selectedMataPelajaran, setSelectedMataPelajaran] = useState<string>("all");
  const [selectedAssignment, setSelectedAssignment] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "submittedAt",
    direction: "descending",
  });

  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState<SubmissionWithUserData | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [scoreValue, setScoreValue] = useState<number | "">("");

  // deep link from a notification: /guru/penilaian?assignmentId=...
  useEffect(() => {
    if (!queryAssignmentId) return;
    const target = assignments.find((assignment) => assignment._id === queryAssignmentId);
    if (!target) return;
    setSelectedMataPelajaran(target.mataPelajaranId || "all");
    setSelectedAssignment(target._id);
  }, [queryAssignmentId, assignments]);

  const handleOpenGradingModal = (submission: SubmissionWithUserData) => {
    setCurrentSubmission(submission);
    setFeedbackText(submission.feedback || "");
    setScoreValue(submission.score ?? "");
    setIsGradingModalOpen(true);
  };

  const handleCloseGradingModal = () => {
    setIsGradingModalOpen(false);
    setCurrentSubmission(null);
    setFeedbackText("");
    setScoreValue("");
  };

  const handleDownloadFile = (url: string, fileName: string) => {
    downloadFile(url, fileName);
  };

  const gradingMutation = useMutation({
    mutationFn: async ({ submission, score }: { submission: SubmissionWithUserData; score: number }) => {
      await updateSubmissionStatus(
        submission.assignmentId,
        submission._id,
        SubmissionStatus.REVIEWED,
        feedbackText
      );
      await updateSubmissionScore(submission.assignmentId, submission._id, score);
    },
    onSuccess: () => {
      toast.success("Penilaian berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["grading", "guru"] });
      handleCloseGradingModal();
    },
    onError: (error: Error) => {
      console.error("Error updating submission:", error);
      toast.error("Gagal menyimpan penilaian: " + (error.message || "Unknown error"));
    },
  });

  const handleSubmitGrading = () => {
    if (!currentSubmission) return;

    if (currentSubmission.status !== SubmissionStatus.REVIEWED) {
      toast.error("Hanya tugas yang sudah diterima yang dapat diberi nilai");
      return;
    }

    if (scoreValue === "" || feedbackText.trim() === "") {
      toast.error("Mohon isi nilai dan umpan balik");
      return;
    }

    const score = Number(scoreValue);
    if (isNaN(score) || score < 0 || score > 100) {
      toast.error("Nilai harus berupa angka antara 0-100");
      return;
    }

    gradingMutation.mutate({ submission: currentSubmission, score });
  };

  const filteredSubmissions = submissions.filter(submission => {
    if (selectedMataPelajaran !== "all" && submission.mataPelajaranTitle !== mataPelajaranList.find(mp => mp._id === selectedMataPelajaran)?.judul) {
      return false;
    }

    if (selectedAssignment !== "all" && submission.assignmentId !== selectedAssignment) {
      return false;
    }

    if (searchTerm &&
      !submission.studentName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !submission.assignmentTitle.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    if (submission.status === SubmissionStatus.REJECTED) {
      return false;
    }

    return true;
  });

  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    const first = a[sortDescriptor.column as keyof SubmissionWithUserData];
    const second = b[sortDescriptor.column as keyof SubmissionWithUserData];

    // an ungraded score is null, not undefined — both sort as "equal"
    if (first === null || first === undefined || second === null || second === undefined) {
      return 0;
    }

    const cmp = first < second ? -1 : first > second ? 1 : 0;

    return sortDescriptor.direction === "descending" ? -cmp : cmp;
  });

  const columns = [
    {
      key: "assignmentTitle",
      label: "JUDUL TUGAS"
    },
    {
      key: "studentName",
      label: "NAMA SISWA"
    },
    {
      key: "studentNIS",
      label: "NIS"
    },
    {
      key: "studentClass",
      label: "KELAS"
    },
    {
      key: "mataPelajaranTitle",
      label: "MATA PELAJARAN"
    },
    {
      key: "submittedAt",
      label: "TANGGAL PENGUMPULAN",
      render: (item: SubmissionWithUserData) => formatTanggalWaktu(item.submittedAt)
    },
    {
      key: "status",
      label: "STATUS PENILAIAN",
      render: (item: SubmissionWithUserData) => (
        <div>
          <Chip
            color={isGraded(item) ? "success" : "warning"}
            size="sm"
          >
            {isGraded(item) ? "Sudah Dinilai" : "Belum Dinilai"}
          </Chip>
          {isGraded(item) && (
            <div className="mt-1">
              <Chip color="primary" variant="flat" size="sm">
                Nilai: {item.score}
              </Chip>
            </div>
          )}
        </div>
      )
    },
    {
      key: "actions",
      label: "AKSI",
      render: (item: SubmissionWithUserData) => (
        <div>
          {item.status === SubmissionStatus.REVIEWED ? (
            <Button
              color="primary"
              size="sm"
              startContent={<FiCheckCircle />}
              onPress={() => handleOpenGradingModal(item)}
            >
              {isGraded(item) ? "Lihat Nilai" : "Beri Nilai"}
            </Button>
          ) : item.status === SubmissionStatus.SUBMITTED ? (
            <div>
              <Button
                color="warning"
                size="sm"
                isDisabled
                className="opacity-70 mb-1"
              >
                Menunggu Diterima
              </Button>
              <p className="text-xs text-gray-500">Terima di halaman detail tugas</p>
            </div>
          ) : (
            <Button
              color="danger"
              size="sm"
              isDisabled
            >
              Ditolak
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <DashboardLayout type="guru">
      <PageContainer>
        <PageHeader
          title="Penilaian Tugas"
          description="Tugas yang sudah diterima dapat dinilai. Tugas yang ditolak tidak dapat dinilai."
        />

        {queryError && !errorDismissed && (
          <div className="mb-4">
            <NotificationAlert
              message={(queryError as Error).message}
              type="error"
              onClose={() => setErrorDismissed(true)}
            />
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:flex-wrap">
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mata Pelajaran
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              value={selectedMataPelajaran}
              onChange={(e) => {
                // reset here rather than in an effect on selectedMataPelajaran —
                // the effect also fired for the deep link and wiped its selection
                setSelectedMataPelajaran(e.target.value);
                setSelectedAssignment("all");
              }}
              disabled={loading}
            >
              <option value="all">Semua Mata Pelajaran</option>
              {mataPelajaranList.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.judul || ""}
                </option>
              ))}
            </select>
          </div>

          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Judul Tugas
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              value={selectedAssignment}
              onChange={(e) => {
                setSelectedAssignment(e.target.value);
              }}
              disabled={loading || selectedMataPelajaran === "all"}
            >
              <option value="all">Semua Tugas</option>
              {selectedMataPelajaran !== "all" &&
                (assignmentsByMataPelajaran[selectedMataPelajaran] || []).map((assignment) => (
                  <option key={assignment._id} value={assignment._id}>
                    {assignment.title || ""}
                  </option>
                ))}
            </select>
          </div>

          <div className="w-full md:w-80">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari
            </label>
            <Input
              placeholder="Cari berdasarkan nama siswa atau judul tugas"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startContent={<FiSearch className="text-gray-400" />}
              className="w-full"
              size="sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center my-12">
            <Spinner size="lg" />
            <span className="ml-2 text-gray-500">Memuat data penilaian...</span>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="text-center my-12 p-6 border border-dashed rounded-lg bg-gray-50">
            <p className="text-gray-500">Belum ada tugas yang perlu dinilai.</p>
          </div>
        ) : (
          <Card className="w-full">
            <CardBody>
              <Table
                aria-label="Tabel Penilaian Tugas"
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                classNames={{
                  base: "overflow-x-auto",
                  table: "min-w-full",
                }}
              >
                <TableHeader>
                  {columns.map(column => (
                    <TableColumn
                      key={column.key}
                      allowsSorting={column.key !== "actions"}
                      className="text-xs font-semibold"
                    >
                      {column.label}
                    </TableColumn>
                  ))}
                </TableHeader>
                <TableBody>
                  {sortedSubmissions.map(item => (
                    <TableRow key={item._id}>
                      {columns.map(column => (
                        <TableCell key={`${item._id}-${column.key}`}>
                          {column.render ? column.render(item) :
                            getKeyValue(item, column.key)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        )}

        <Modal
          isOpen={isGradingModalOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) handleCloseGradingModal();
          }}
          size="3xl"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  {currentSubmission ? (
                    <div>
                      <h3 className="text-xl">{currentSubmission.assignmentTitle}</h3>
                      <p className="text-sm text-gray-500">
                        Dikumpulkan oleh: {currentSubmission.studentName} • {formatTanggalWaktu(currentSubmission.submittedAt)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        NIS: {currentSubmission.studentNIS || "-"} • Kelas: {currentSubmission.studentClass || "-"}
                      </p>
                    </div>
                  ) : (
                    "Penilaian Tugas"
                  )}
                </ModalHeader>
                <ModalBody>
                  {currentSubmission && (
                    <>
                      <div className="border rounded-lg p-4 mb-4 bg-gray-50">
                        <h4 className="font-medium mb-2">File Tugas</h4>
                        <div className="flex items-center gap-2">
                          <Button
                            color="primary"
                            variant="flat"
                            size="sm"
                            startContent={<FiDownload size={16} />}
                            onPress={() => handleDownloadFile(currentSubmission.fileUrl, currentSubmission.fileName)}
                          >
                            {currentSubmission.fileName}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nilai (0-100)
                          </label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={String(scoreValue)}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                setScoreValue('');
                              } else {
                                const parsed = parseInt(val);
                                if (!isNaN(parsed)) {
                                  setScoreValue(Math.min(100, Math.max(0, parsed)));
                                }
                              }
                            }}
                            placeholder="0 - 100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Umpan Balik / Komentar
                          </label>
                          <Textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Berikan umpan balik kepada siswa"
                            minRows={4}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="light" onPress={onClose}>
                    Batal
                  </Button>
                  <Button
                    color="primary"
                    startContent={<FiSend />}
                    onPress={handleSubmitGrading}
                    isLoading={gradingMutation.isPending}
                  >
                    Simpan Penilaian
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </PageContainer>
    </DashboardLayout>
  );
};

export default TeacherGradingPage;
