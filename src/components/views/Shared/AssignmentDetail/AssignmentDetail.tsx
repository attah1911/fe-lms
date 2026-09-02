import React from "react";
import {
  Card,
  CardBody,
  Divider,
  Button,
  Spinner,
  Input,
  Textarea,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Switch
} from "@nextui-org/react";
import {
  FiArrowLeft,
  FiCalendar,
  FiTrash2,
  FiEdit,
  FiDownload,
  FiUpload,
  FiClipboard
} from "react-icons/fi";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageContainer from "@/components/commons/PageContainer";
import NotificationAlert from "@/components/commons/NotificationAlert/NotificationAlert";
import SubmissionsTable from "./SubmissionsTable";
import StudentPreview from "./StudentPreview";
import useAssignmentDetail, { AssignmentDetailRole } from "./useAssignmentDetail";

export type { AssignmentDetailRole };

interface PropTypes {
  role: AssignmentDetailRole;
}

const AssignmentDetail: React.FC<PropTypes> = ({ role }) => {
  const {
    session,
    fileInputRef,
    hasPermission,
    loading,
    saving,
    deleting,
    uploading,
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
    toggleStudentView,
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
    handleSave,
    handleDeleteAssignment,
    handleFileUpload,
    handleDownloadFile,
    handleDeleteAttachment,
    triggerFileInput,
    toggleFeedbackInput,
    handleStatusUpdate,
    openDeleteSubmissionModal,
    handleDeleteSubmission
  } = useAssignmentDetail(role);

  return (
    <>
      <DashboardLayout type={role}>
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
                        <span className="text-sm whitespace-nowrap">Tampilan {role === "admin" ? "Admin" : "Guru"}</span>
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

              {isStudentView && assignment ? (
                <StudentPreview
                  assignment={assignment}
                  attachmentFiles={attachmentFiles}
                  hasPermission={hasPermission}
                  userEmail={session?.user?.email}
                  fileInputRef={fileInputRef}
                  uploading={uploading}
                  uploadingFileName={uploadingFileName}
                  recentlyUploadedFile={recentlyUploadedFile}
                  onFileUpload={handleFileUpload}
                  onDownload={handleDownloadFile}
                  onTriggerFileInput={triggerFileInput}
                  onDeleteSubmission={openDeleteSubmissionModal}
                />
              ) : (
                <div className="grid grid-cols-1 gap-6 mb-6">
                  <Card>
                    <CardBody className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FiCalendar size={16} className="text-primary" />
                        <h3 className="text-lg font-semibold">Informasi Tugas</h3>
                      </div>

                      <div className="space-y-4">
                        <Select
                          label="Materi"
                          variant="bordered"
                          selectedKeys={materiId ? new Set([materiId]) : new Set<string>()}
                          onChange={(e) => e.target.value && setMateriId(e.target.value)}
                          className="mb-4"
                        >
                          {materiList.map((materi) => (
                            <SelectItem key={materi._id} value={materi._id}>
                              {materi.judul}
                            </SelectItem>
                          ))}
                        </Select>

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
                        <div className="flex flex-col gap-2">
                          {attachmentFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 rounded border p-2"
                            >
                              <Button
                                size="sm"
                                variant="flat"
                                color="primary"
                                startContent={<FiDownload size={16} />}
                                onPress={() => handleDownloadFile(file)}
                                className="min-w-0 flex-grow justify-start"
                              >
                                <span className="truncate">{file.name}</span>
                              </Button>
                              <Button
                                isIconOnly
                                size="sm"
                                color="danger"
                                variant="flat"
                                aria-label={`Hapus lampiran ${file.name}`}
                                onPress={() => handleDeleteAttachment(index)}
                              >
                                <FiTrash2 size={16} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          Tidak ada file yang dilampirkan.
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      <div className="mt-4 flex flex-col gap-2">
                        <Button
                          color="primary"
                          variant="flat"
                          startContent={<FiUpload size={16} />}
                          onPress={triggerFileInput}
                          isLoading={uploading}
                          className="self-start"
                        >
                          Tambah Lampiran
                        </Button>

                        {uploading && uploadingFileName && (
                          <span className="text-sm text-gray-500">
                            Sedang mengunggah: {uploadingFileName}
                          </span>
                        )}

                        <p className="text-xs text-gray-500">
                          Format: .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .jpeg, .jpg.
                          Perubahan lampiran tersimpan setelah menekan Simpan Perubahan.
                        </p>
                      </div>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardBody className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FiClipboard size={16} className="text-primary" />
                        <h3 className="text-lg font-semibold">Pengumpulan Tugas</h3>
                      </div>

                      <Divider className="my-3" />

                      <SubmissionsTable
                        submissions={assignment?.submissions}
                        processingSubmissionId={processingSubmissionId}
                        activeFeedbackSubmissionId={activeFeedbackSubmissionId}
                        feedbackText={feedbackText}
                        recentlyUploadedFile={recentlyUploadedFile}
                        onFeedbackTextChange={setFeedbackText}
                        onToggleFeedback={toggleFeedbackInput}
                        onStatusUpdate={handleStatusUpdate}
                        onDeleteSubmission={openDeleteSubmissionModal}
                        onDownload={handleDownloadFile}
                      />
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
