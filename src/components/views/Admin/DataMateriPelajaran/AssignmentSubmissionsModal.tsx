import React, { useState, useEffect, useCallback } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  Button, 
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Chip,
  Textarea,
  Tooltip
} from "@nextui-org/react";
import { Assignment, AssignmentSubmission, SubmissionStatus } from "../../../../types/Assignment";
import { getAssignmentById, updateSubmissionStatus } from "../../../../services/assignment.service";
import { FiDownload, FiCheck, FiX } from "react-icons/fi";
import { downloadFile } from "../../../../utils/fileUtils";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import { formatTanggalHari, formatTanggalSingkatWaktu } from "@/utils/date";

interface AssignmentSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
}

const AssignmentSubmissionsModal: React.FC<AssignmentSubmissionsModalProps> = ({
  isOpen,
  onClose,
  assignmentId
}) => {
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingSubmissionId, setProcessingSubmissionId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [activeFeedbackSubmissionId, setActiveFeedbackSubmissionId] = useState<string | null>(null);

  const fetchAssignmentDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAssignmentById(assignmentId);
      setAssignment(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch assignment details");
      console.error("Error fetching assignment details:", err);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    if (isOpen && assignmentId) {
      fetchAssignmentDetails();
    }
  }, [isOpen, assignmentId, fetchAssignmentDetails]);

  const handleDownloadSubmission = (fileUrl: string, fileName: string) => {
    downloadFile(fileUrl, fileName);
  };

  const handleStatusUpdate = async (submissionId: string, status: SubmissionStatus) => {
    try {
      setProcessingSubmissionId(submissionId);
      
      const feedback = activeFeedbackSubmissionId === submissionId ? feedbackText : undefined;
      
      await updateSubmissionStatus(assignmentId, submissionId, status, feedback);
      
      await fetchAssignmentDetails();
      
      setSuccess(`Status pengumpulan berhasil diperbarui menjadi ${status}`);
      
      setActiveFeedbackSubmissionId(null);
      setFeedbackText('');
    } catch (err: any) {
      setError(err.message || "Failed to update submission status");
      console.error("Error updating submission status:", err);
    } finally {
      setProcessingSubmissionId(null);
    }
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

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      backdrop="blur"
      placement="center"
      size="4xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">
                Pengumpulan Tugas - {assignment?.title || ''}
              </h3>
              {assignment && (
                <p className="text-sm text-gray-500">
                  Tenggat: {formatTanggalHari(assignment.deadline)}
                </p>
              )}
            </ModalHeader>
            <ModalBody>
              {error && (
                <NotificationAlert
                  type="error"
                  message={error}
                  onClose={() => setError(null)}
                />
              )}
              {success && (
                <NotificationAlert
                  type="success"
                  message={success}
                  onClose={() => setSuccess(null)}
                />
              )}

              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" color="primary" />
                </div>
              ) : assignment?.submissions && assignment.submissions.length > 0 ? (
                <Table aria-label="Submissions table">
                  <TableHeader>
                    <TableColumn>NAMA MURID</TableColumn>
                    <TableColumn>KELAS</TableColumn>
                    <TableColumn>FILE</TableColumn>
                    <TableColumn>WAKTU PENGUMPULAN</TableColumn>
                    <TableColumn>STATUS</TableColumn>
                    <TableColumn>AKSI</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {assignment.submissions.map((submission) => (
                      <TableRow key={submission._id}>
                        <TableCell>{submission.student.fullName}</TableCell>
                        <TableCell>{submission.student.kelas}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            startContent={<FiDownload size={16} />}
                            onPress={() => handleDownloadSubmission(submission.fileUrl, submission.fileName)}
                          >
                            {submission.fileName}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {formatTanggalSingkatWaktu(submission.submittedAt)}
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
                                <Tooltip content="Terima">
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
                                </Tooltip>
                                <Tooltip content="Tolak">
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
                                </Tooltip>
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
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Belum ada pengumpulan tugas.
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="default" variant="light" onPress={onClose}>
                Tutup
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default AssignmentSubmissionsModal; 
