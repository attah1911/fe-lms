import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { 
  Card, 
  CardBody, 
  Button, 
  Chip, 
  Spinner,
  Progress
} from "@nextui-org/react";
import { FiEye, FiCheckCircle } from "react-icons/fi";

import DashboardLayout from "../../../components/layouts/DashboardLayout";
import PageContainer from "../../../components/commons/PageContainer";
import PageHeader from "../../../components/commons/PageHeader";
import NotificationAlert from "../../../components/commons/NotificationAlert/NotificationAlert";
import { getGuruMataPelajaran } from "../../../services/guru.service";
import { getMateriByMataPelajaranId } from "../../../services/materiPelajaran.service";
import { getAssignmentsByMateriId } from "../../../services/assignment.service";
import { Assignment, SubmissionStatus } from "../../../types/Assignment";
import { MataPelajaran } from "../../../types/MataPelajaran";
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

interface MenuItemData {
  id: string;
  title?: string;
}

const TeacherAssignmentsPage: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ExtendedAssignment[]>([]);
  const [mataPelajaranList, setMataPelajaranList] = useState<ExtendedMataPelajaran[]>([]);
  const [selectedMataPelajaran, setSelectedMataPelajaran] = useState<string>("all");
  const [showError, setShowError] = useState(false);
  const [loadingMateri, setLoadingMateri] = useState(false);
  
  // Fetch all mata pelajaran for the teacher
  const fetchMataPelajaran = async () => {
    try {
      setLoading(true);
      const response = await getGuruMataPelajaran({ limit: 100 });
      
      if (response && response.data && response.data.length > 0) {
        // Store the basic mata pelajaran data first
        setMataPelajaranList(response.data);
        
        // Now fetch materi for each mata pelajaran
        await fetchMateriForMataPelajaran(response.data);
      } else {
        
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Error fetching mata pelajaran:", err);
      setError(err.message || "Failed to load subjects");
      setShowError(true);
      setLoading(false);
    }
  };

  // Fetch materi for each mata pelajaran
  const fetchMateriForMataPelajaran = async (mataPelajaranData: ExtendedMataPelajaran[]) => {
    setLoadingMateri(true);
    const updatedMataPelajaranList: ExtendedMataPelajaran[] = [];
    
    for (const mp of mataPelajaranData) {
      try {
        const materiResponse = await getMateriByMataPelajaranId(mp._id as string);
        
        if (materiResponse && materiResponse.data) {
          // Add materi data to the mata pelajaran object
          updatedMataPelajaranList.push({
            ...mp,
            materiPelajaranList: materiResponse.data
          });
        } else {
          // No materi found, keep the original mata pelajaran
          updatedMataPelajaranList.push(mp);
        }
      } catch (err) {
        console.error(`Error fetching materi for mata pelajaran ${mp._id}:`, err);
        // Keep original mata pelajaran even if there was an error
        updatedMataPelajaranList.push(mp);
      }
    }
    
    // Update the state with mata pelajaran that include materi data
    setMataPelajaranList(updatedMataPelajaranList);
    setLoadingMateri(false);
    
    // Now fetch assignments using the updated list with materi data
    await fetchAssignmentsForMataPelajaran(updatedMataPelajaranList);
  };
  
  // Separate function to fetch assignments for specific mata pelajaran list
  const fetchAssignmentsForMataPelajaran = async (mataPelajaranData: ExtendedMataPelajaran[]) => {
    try {
      let allAssignments: ExtendedAssignment[] = [];
      
      // Loop through each mata pelajaran
      for (const mataPelajaran of mataPelajaranData) {
        // Get all materials for this mata pelajaran
        if (mataPelajaran.materiPelajaranList && mataPelajaran.materiPelajaranList.length > 0) {
          
          for (const materi of mataPelajaran.materiPelajaranList) {
            try {
              const response = await getAssignmentsByMateriId(materi._id);
              
              if (response && response.data) {
                // Add mata pelajaran and materi titles to each assignment
                const assignmentsWithContext = response.data.map((assignment: Assignment) => ({
                  ...assignment,
                  mataPelajaranTitle: mataPelajaran.judul,
                  materiTitle: materi.judul,
                }));
                allAssignments = [...allAssignments, ...assignmentsWithContext];
              }
            } catch (err) {
              console.error(`Error fetching assignments for materi ${materi._id}:`, err);
              // Continue to next materi even if one fails
            }
          }
        } else {
          
        }
      }
      
      // Sort assignments by creation date (newest first)
      allAssignments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setAssignments(allAssignments);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching assignments:", err);
      setError(err.message || "Failed to load assignments");
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchMataPelajaran();
  }, []);

  // Filter assignments based on selected filters
  const filteredAssignments = assignments.filter((assignment) => {
    if (selectedMataPelajaran !== "all" && assignment.mataPelajaranId !== selectedMataPelajaran) {
      return false;
    }
    return true;
  });
  
  // View assignment details
  const handleViewAssignment = (assignment: ExtendedAssignment) => {
    router.push(`/guru/matapelajaran/${assignment.mataPelajaranId}/tugas/${assignment._id}`);
  };
  
  // Format date to locale string
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
  
  // Check if deadline has passed
  const isDeadlinePassed = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    return deadlineDate < now;
  };

  // Calculate grading progress - based on submissions actually graded (having a score)
  const calculateGradingProgress = (assignment: ExtendedAssignment) => {
    if (!assignment.submissions || assignment.submissions.length === 0) {
      return 0; // No submissions means 0% progress
    }
    
    // Include only submissions with status REVIEWED (only these can be graded)
    const acceptableSubmissions = assignment.submissions.filter(
      submission => submission.status === SubmissionStatus.REVIEWED
    );
    
    if (acceptableSubmissions.length === 0) {
      return 0; // No acceptable submissions means 0% progress
    }
    
    // Count submissions that have actually been graded (have a score value)
    const gradedCount = acceptableSubmissions.filter(
      submission => submission.score !== undefined
    ).length;
    
    return Math.round((gradedCount / acceptableSubmissions.length) * 100);
  };
  
  return (
    <DashboardLayout type="guru">
      <PageContainer>
        <PageHeader
          title="Daftar Tugas"
          description="Kelola semua tugas yang telah Anda buat"
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
        
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Filter select */}
          <div className="flex flex-col gap-4 md:flex-row">
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
                disabled={loading || loadingMateri}
              >
                <option value="all">Semua Mata Pelajaran</option>
                {mataPelajaranList.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.judul || ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center my-12">
            <Spinner size="lg" />
            <span className="ml-2 text-gray-500">Memuat data tugas...</span>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center my-12 p-6 border border-dashed rounded-lg bg-gray-50">
            <p className="text-gray-500">Belum ada tugas yang tersedia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((assignment) => {
              const gradingProgress = calculateGradingProgress(assignment);
              return (
                <Card key={assignment._id} className="w-full">
                  <CardBody className="p-4">
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-semibold line-clamp-1">{assignment.title}</h3>
                          <p className="text-sm text-gray-500 mb-2">
                            {assignment.mataPelajaranTitle}
                          </p>
                        </div>
                        <Chip 
                          color={isDeadlinePassed(assignment.deadline) ? "danger" : "success"} 
                          size="sm"
                        >
                          {isDeadlinePassed(assignment.deadline) ? "Ditutup" : "Aktif"}
                        </Chip>
                      </div>
                      
                      <div className="mb-3 flex-grow">
                        <p className="text-sm line-clamp-2">{assignment.description}</p>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-3">
                        <p><strong>Batas Waktu:</strong> {formatDate(assignment.deadline)}</p>
                        <p><strong>Pengumpulan:</strong> {assignment.submissions?.length || 0} tugas</p>
                      </div>
                      
                      {/* Add progress bar for grading */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium">Progress Penilaian</span>
                          <span className="text-xs font-medium">{gradingProgress}%</span>
                        </div>
                        <Progress 
                          value={gradingProgress} 
                          color={gradingProgress === 100 ? "success" : "primary"}
                          className="h-2"
                          aria-label="Grading progress"
                        />
                      </div>
                      
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center">
                          <Button
                            color="primary"
                            variant="flat"
                            size="sm"
                            onPress={() => handleViewAssignment(assignment)}
                          >
                            Lihat Pengumpulan Tugas
                          </Button>
                          
                          <Button
                            color="success"
                            variant="solid"
                            size="sm"
                            startContent={<FiCheckCircle />}
                            onPress={() => router.push(`/guru/penilaian?assignmentId=${assignment._id}`)}
                            className="shadow-sm"
                          >
                            Penilaian
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </PageContainer>
    </DashboardLayout>
  );
};

export default TeacherAssignmentsPage; 
