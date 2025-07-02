import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { 
  Card, 
  CardBody, 
  Button, 
  Chip, 
  Spinner,
  Progress,
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
  Textarea,
  Link
} from "@nextui-org/react";
import { FiEye, FiCheckCircle, FiSearch, FiDownload, FiSend } from "react-icons/fi";

import DashboardLayout from "../../../components/layouts/DashboardLayout";
import PageContainer from "../../../components/commons/PageContainer";
import PageHeader from "../../../components/commons/PageHeader";
import NotificationAlert from "../../../components/commons/NotificationAlert/NotificationAlert";
import { getGuruMataPelajaran } from "../../../services/guru.service";
import { getMateriByMataPelajaranId } from "../../../services/materiPelajaran.service";
import { getAssignmentsByMateriId, updateSubmissionStatus, getAssignmentById, updateSubmissionScore } from "../../../services/assignment.service";
import { Assignment, SubmissionStatus } from "../../../types/Assignment";
import { MataPelajaran } from "../../../types/MataPelajaran";
import { downloadFile } from "../../../utils/fileUtils";
import { toast } from "sonner";

interface Materi {
  _id: string;
  judul: string;
}

interface ExtendedMataPelajaran extends MataPelajaran {
  materiPelajaranList?: Materi[];
}

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
  score?: number;
  fileUrl: string;
  fileName: string;
  feedback?: string;
}

const TeacherGradingPage: React.FC = () => {
  const router = useRouter();
  const { assignmentId: queryAssignmentId } = router.query;
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ExtendedAssignment[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithUserData[]>([]);
  const [mataPelajaranList, setMataPelajaranList] = useState<ExtendedMataPelajaran[]>([]);
  const [selectedMataPelajaran, setSelectedMataPelajaran] = useState<string>("all");
  const [selectedAssignment, setSelectedAssignment] = useState<string>("all");
  const [assignmentsByMataPelajaran, setAssignmentsByMataPelajaran] = useState<{[key: string]: ExtendedAssignment[]}>({});
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showError, setShowError] = useState(false);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "submittedAt",
    direction: "descending",
  });

  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState<SubmissionWithUserData | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [scoreValue, setScoreValue] = useState<number | "">(""); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getGuruMataPelajaran({ limit: 100 });
      
      if (response && response.data && response.data.length > 0) {
        setMataPelajaranList(response.data);
        await fetchAssignmentsAndSubmissions(response.data);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "Failed to load data");
      setShowError(true);
      setLoading(false);
    }
  }, []);

  const fetchAssignmentsAndSubmissions = async (mataPelajaranData: ExtendedMataPelajaran[]) => {
    try {
      let allSubmissions: SubmissionWithUserData[] = [];
      let allAssignments: ExtendedAssignment[] = [];
      const assignmentsByMp: {[key: string]: ExtendedAssignment[]} = {};
      
      for (const mataPelajaran of mataPelajaranData) {
        assignmentsByMp[mataPelajaran._id as string] = [];
        
        const materiResponse = await getMateriByMataPelajaranId(mataPelajaran._id as string);
        
        if (materiResponse && materiResponse.data && materiResponse.data.length > 0) {
          for (const materi of materiResponse.data) {
            const assignmentResponse = await getAssignmentsByMateriId(materi._id);
            
            if (assignmentResponse && assignmentResponse.data) {
              const assignmentsWithContext = assignmentResponse.data.map((assignment: Assignment) => ({
                ...assignment,
                mataPelajaranTitle: mataPelajaran.judul,
                materiTitle: materi.judul,
              }));
              
              allAssignments = [...allAssignments, ...assignmentsWithContext];
              assignmentsByMp[mataPelajaran._id as string] = [
                ...assignmentsByMp[mataPelajaran._id as string],
                ...assignmentsWithContext
              ];
              
              for (const assignment of assignmentResponse.data) {
                if (assignment.submissions && assignment.submissions.length > 0) {
                  const submissionsWithContext = assignment.submissions.map((submission: any) => ({
                    _id: submission._id,
                    assignmentId: assignment._id,
                    assignmentTitle: assignment.title,
                    mataPelajaranTitle: mataPelajaran.judul,
                    materiTitle: materi.judul,
                    studentName: submission.student?.fullName || "Siswa",
                    studentNIS: submission.student?.nis || "",
                    studentClass: submission.student?.kelas || "",
                    submittedAt: submission.submittedAt,
                    status: submission.status,
                    score: submission.score,
                    fileUrl: submission.fileUrl,
                    fileName: submission.fileName,
                    feedback: submission.feedback
                  }));
                  
                  allSubmissions = [...allSubmissions, ...submissionsWithContext];
                }
              }
            }
          }
        }
      }
      
      allSubmissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      
      setAssignments(allAssignments);
      setAssignmentsByMataPelajaran(assignmentsByMp);
      setSubmissions(allSubmissions);

      if (queryAssignmentId) {
        const targetAssignment = allAssignments.find(a => a._id === queryAssignmentId);
        if (targetAssignment) {
          setSelectedAssignment(targetAssignment._id as string);
          setSelectedMataPelajaran(targetAssignment.mataPelajaranId || "all");
        }
      }
    } catch (err: any) {
      console.error("Error processing data:", err);
      setError(err.message || "Failed to process data");
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenGradingModal = (submission: SubmissionWithUserData) => {
    setCurrentSubmission(submission);
    setFeedbackText(submission.feedback || "");
    setScoreValue(submission.score || "");
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

  const handleSubmitGrading = async () => {
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

    try {
      setIsSubmitting(true);

      await updateSubmissionStatus(
        currentSubmission.assignmentId,
        currentSubmission._id,
        SubmissionStatus.REVIEWED,
        feedbackText
      );
      
      await updateSubmissionScore(
        currentSubmission.assignmentId,
        currentSubmission._id,
        score
      );
      
      toast.success("Penilaian berhasil disimpan");
      
      const updatedSubmissions = submissions.map(sub => {
        if (sub._id === currentSubmission._id) {
          return {
            ...sub,
            status: SubmissionStatus.REVIEWED,
            feedback: feedbackText,
            score: score
          };
        }
        return sub;
      });
      
      setSubmissions(updatedSubmissions);
      
      fetchData();
      
      handleCloseGradingModal();
    } catch (error: any) {
      console.error("Error updating submission:", error);
      toast.error("Gagal menyimpan penilaian: " + (error.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (selectedMataPelajaran !== "all") {
      if (selectedAssignment !== "all") {
        setSelectedAssignment("all");
      }
    }
  }, [selectedMataPelajaran, selectedAssignment]);

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
    
    if (first === undefined || second === undefined) {
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
      render: (item: SubmissionWithUserData) => formatDate(item.submittedAt)
    },
    { 
      key: "status", 
      label: "STATUS PENILAIAN",
      render: (item: SubmissionWithUserData) => (
        <div>
          <Chip 
            color={item.score !== undefined ? "success" : "warning"}
            size="sm"
          >
            {item.score !== undefined ? "Sudah Dinilai" : "Belum Dinilai"}
          </Chip>
          {item.score !== undefined && (
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
              {item.score !== undefined ? "Lihat Nilai" : "Beri Nilai"}
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
        
        {showError && error && (
          <div className="mb-4">
            <NotificationAlert 
              message={error} 
              type="error" 
              onClose={() => setShowError(false)} 
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
                setSelectedMataPelajaran(e.target.value);
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
                        Dikumpulkan oleh: {currentSubmission.studentName} • {formatDate(currentSubmission.submittedAt)}
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
                    isLoading={isSubmitting}
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
