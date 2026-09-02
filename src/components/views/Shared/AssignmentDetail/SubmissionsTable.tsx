import React from "react";
import {
  Card,
  CardBody,
  Button,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Chip
} from "@nextui-org/react";
import { FiTrash2, FiDownload, FiCheck, FiX } from "react-icons/fi";
import { Assignment, SubmissionStatus } from "@/types/Assignment";
import { formatTanggalSingkatWaktu } from "@/utils/date";
import { getStatusColor, getStatusText } from "./submissionStatus";

interface PropTypes {
  submissions?: Assignment["submissions"];
  processingSubmissionId: string | null;
  activeFeedbackSubmissionId: string | null;
  feedbackText: string;
  recentlyUploadedFile: string | null;
  onFeedbackTextChange: (value: string) => void;
  onToggleFeedback: (submissionId: string, currentFeedback?: string) => void;
  onStatusUpdate: (submissionId: string, status: SubmissionStatus) => void;
  onDeleteSubmission: (submissionId: string) => void;
  onDownload: (file: { url: string; name: string }) => void;
}

const SubmissionsTable: React.FC<PropTypes> = ({
  submissions,
  processingSubmissionId,
  activeFeedbackSubmissionId,
  feedbackText,
  recentlyUploadedFile,
  onFeedbackTextChange,
  onToggleFeedback,
  onStatusUpdate,
  onDeleteSubmission,
  onDownload
}) => {
  if (!submissions || submissions.length === 0) {
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
        {submissions.map((submission) => {
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
                    onPress={() => onDownload({
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
                      <Button
                        isIconOnly
                        size="sm"
                        color="success"
                        variant="flat"
                        isLoading={processingSubmissionId === submission._id}
                        onPress={() => onStatusUpdate(submission._id, SubmissionStatus.REVIEWED)}
                      >
                        <FiCheck size={16} />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        color="danger"
                        variant="flat"
                        isLoading={processingSubmissionId === submission._id}
                        onPress={() => onStatusUpdate(submission._id, SubmissionStatus.REJECTED)}
                      >
                        <FiX size={16} />
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant={activeFeedbackSubmissionId === submission._id ? "solid" : "flat"}
                    color="primary"
                    onPress={() => onToggleFeedback(submission._id, submission.feedback)}
                  >
                    Feedback
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    variant="flat"
                    onPress={() => onDeleteSubmission(submission._id)}
                  >
                    <FiTrash2 size={16} />
                  </Button>
                </div>
                {activeFeedbackSubmissionId === submission._id && (
                  <div className="mt-2">
                    <Textarea
                      placeholder="Berikan feedback..."
                      value={feedbackText}
                      onChange={(e) => onFeedbackTextChange(e.target.value)}
                      minRows={2}
                      className="mb-2"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        color="danger"
                        onPress={() => onToggleFeedback(submission._id)}
                      >
                        Batal
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        onPress={() => onStatusUpdate(
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

export default SubmissionsTable;
