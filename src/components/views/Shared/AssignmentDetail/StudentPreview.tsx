import React from "react";
import {
  Card,
  CardBody,
  CardFooter,
  Divider,
  Button,
  Spinner,
  Chip
} from "@nextui-org/react";
import { FiTrash2, FiDownload, FiUpload, FiClipboard, FiXCircle } from "react-icons/fi";
import { Assignment, SubmissionStatus, AssignmentSubmission } from "@/types/Assignment";
import AssignmentInfoCards from "@/components/views/Shared/AssignmentInfoCards";
import { formatTanggalSingkatWaktu } from "@/utils/date";
import { getStatusColor, getStatusText } from "./submissionStatus";

interface ExtendedAssignmentSubmission extends AssignmentSubmission {
  answer?: string;
}

const SUPPORTED_FORMATS =
  "Format yang didukung: .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .jpg, .jpeg, .png, .gif, .mp3, .wav, .mp4, .zip, .rar";

interface PropTypes {
  assignment: Assignment;
  attachmentFiles: Array<{ url: string; name: string }>;
  hasPermission: boolean;
  userEmail?: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  uploading: boolean;
  uploadingFileName: string | null;
  recentlyUploadedFile: string | null;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: (file: { url: string; name: string }) => void;
  onTriggerFileInput: () => void;
  onDeleteSubmission: (submissionId: string) => void;
}

const StudentPreview: React.FC<PropTypes> = ({
  assignment,
  attachmentFiles,
  hasPermission,
  userEmail,
  fileInputRef,
  uploading,
  uploadingFileName,
  recentlyUploadedFile,
  onFileUpload,
  onDownload,
  onTriggerFileInput,
  onDeleteSubmission
}) => {
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

  const uploadingIndicator = uploading && uploadingFileName ? (
    <div className="mt-3 p-3 border rounded">
      <div className="flex items-center gap-2">
        <Spinner size="sm" color="primary" />
        <span className="text-sm">Sedang mengunggah: {uploadingFileName}</span>
      </div>
    </div>
  ) : null;

  const uploadHints = (
    <div className="text-xs text-gray-500 mt-2">
      <p>{SUPPORTED_FORMATS}</p>
      <p>Ukuran maksimal: 10MB per file</p>
      {hasPermission && (
        <p className="text-warning mt-1">Mode testing: Upload file untuk mengecek fungsionalitas upload</p>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 mb-6">
      <AssignmentInfoCards
        title={assignment.title}
        description={assignment.description}
        deadline={assignment.deadline}
        materiJudul={assignment.materi?.judul}
        attachments={attachmentFiles}
        onDownload={onDownload}
        deadlineNotice={
          isDeadlinePassed ? (
            hasPermission ? (
              <p className="mt-2 text-warning text-xs sm:text-sm">
                Batas waktu pengumpulan telah berakhir, namun Anda tetap dapat mengupload file untuk testing
              </p>
            ) : (
              <p className="mt-2 text-danger text-xs sm:text-sm">
                Batas waktu pengumpulan telah berakhir
              </p>
            )
          ) : null
        }
      />

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
                        Dikumpulkan pada: {formatTanggalSingkatWaktu(submission.submittedAt)}
                      </span>

                      {isTestSubmission && hasPermission && (
                        <Button
                          isIconOnly
                          size="sm"
                          color="danger"
                          variant="flat"
                          onPress={() => onDeleteSubmission(submission._id)}
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
                        onPress={() => onDownload({
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

                    {submission.score !== null && submission.score !== undefined && (
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
                    onChange={onFileUpload}
                    className="hidden"
                  />
                  <Button
                    color="primary"
                    variant="flat"
                    startContent={<FiUpload size={16} />}
                    onPress={onTriggerFileInput}
                    isLoading={uploading}
                    className="w-full xs:w-auto"
                  >
                    Unggah File {hasPermission ? "Test" : "Baru"}
                  </Button>
                </div>

                {uploadingIndicator}

                {uploadHints}
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
                    onChange={onFileUpload}
                    className="hidden"
                  />

                  <Button
                    color="primary"
                    variant="flat"
                    startContent={<FiUpload />}
                    onPress={onTriggerFileInput}
                    isLoading={uploading}
                  >
                    Pilih File
                  </Button>

                  {uploadingIndicator}

                  {uploadHints}
                </div>
              </div>
            </CardBody>
            <CardFooter className="justify-end gap-2 border-t border-divider p-4">
              <Button
                color="primary"
                isLoading={uploading}
                onPress={onTriggerFileInput}
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

export default StudentPreview;
