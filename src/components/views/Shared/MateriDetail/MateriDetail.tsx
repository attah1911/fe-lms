import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Divider, Button, Spinner, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Switch } from "@nextui-org/react";
import { FiArrowLeft, FiUpload, FiTrash2, FiDownload } from "react-icons/fi";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageContainer from "@/components/commons/PageContainer";
import { getMateriPelajaranById, updateMateriPelajaran, deleteMateriPelajaran } from "@/services/materiPelajaran.service";
import mediaServices from "@/services/media.service";
import { downloadFile, getFileNameFromUrl } from "@/utils/fileUtils";

interface FileEntry {
  url: string;
  name: string;
}

interface Materi {
  _id: string;
  judul: string;
  konten: {
    teks: string;
    files: Array<string | FileEntry>;
  };
  order: number;
  createdAt: string;
  mataPelajaran: string;
}

export type MateriDetailRole = "admin" | "guru";

interface PropTypes {
  role: MateriDetailRole;
}

/** Older rows stored a bare URL string; newer ones store `{ url, name }`. */
const toFileEntry = (file: string | FileEntry): FileEntry =>
  typeof file === "string" ? { url: file, name: getFileNameFromUrl(file) } : file;

/** Cloudinary drops the extension for raw uploads, so put it back from the folder. */
const EXTENSION_BY_FOLDER: Array<[string, string[]]> = [
  ["/documents/word/", [".docx"]],
  ["/documents/pdf/", [".pdf"]],
  ["/documents/excel/", [".xlsx"]],
  ["/documents/presentations/", [".pptx", ".ppt"]],
];

const withExtension = ({ url, name }: FileEntry) => {
  const match = EXTENSION_BY_FOLDER.find(([folder]) => url.includes(folder));
  if (!match) return name;

  const [, extensions] = match;
  const alreadyHasOne = extensions.some((ext) => name.toLowerCase().endsWith(ext));
  return alreadyHasOne ? name : name + extensions[0];
};

const MateriPelajaranDetail: React.FC<PropTypes> = ({ role }) => {
  const router = useRouter();
  const { id, materiId } = router.query;
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const materiKey = ["materi", id, materiId] as const;

  const { data: materi = null, isLoading: loading } = useQuery({
    queryKey: materiKey,
    queryFn: async (): Promise<Materi | null> =>
      (await getMateriPelajaranById(id as string, materiId as string))?.data ?? null,
    enabled: !!id && !!materiId,
  });

  const [kontenTeks, setKontenTeks] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStudentView, setIsStudentView] = useState(false);

  const hasPermission = session?.user?.role === 'admin' || session?.user?.role === 'guru';

  // Seed the editor once per materi — a refetch after uploading a file must not
  // wipe text the user has typed but not saved yet.
  const seededId = useRef<string | null>(null);
  useEffect(() => {
    if (!materi || seededId.current === materi._id) return;
    seededId.current = materi._id;
    setKontenTeks(materi.konten.teks || "");
  }, [materi]);

  const invalidateMateri = () => queryClient.invalidateQueries({ queryKey: materiKey });

  /** Every write is the same PUT with a rebuilt `konten`. */
  const saveKonten = (konten: { teks: string; files: FileEntry[] }) =>
    updateMateriPelajaran(id as string, materi!._id, { ...materi, konten });

  const currentFiles = (materi?.konten.files || []).map(toFileEntry);

  const saveContentMutation = useMutation({
    mutationFn: () => saveKonten({ teks: kontenTeks, files: currentFiles }),
    onSuccess: () => {
      toast.success("Konten berhasil disimpan!", {
        description: "Perubahan konten materi telah berhasil disimpan.",
        duration: 3000
      });
      invalidateMateri();
    },
    onError: (err: Error) => {
      console.error("Error saving content:", err);
      toast.error("Gagal menyimpan konten", {
        description: err.message || "Terjadi kesalahan saat menyimpan konten.",
        duration: 5000
      });
    },
  });

  const deleteMateriMutation = useMutation({
    mutationFn: () => deleteMateriPelajaran(id as string, materi!._id),
    onSuccess: () => {
      toast.success("Materi berhasil dihapus!", {
        description: "Materi pelajaran telah berhasil dihapus.",
        duration: 3000
      });
      router.push(`/${role}/matapelajaran/${id}`);
    },
    onError: (err: Error) => {
      console.error("Error deleting material:", err);
      toast.error("Gagal menghapus materi", {
        description: err.message || "Terjadi kesalahan saat menghapus materi.",
        duration: 5000
      });
      setIsDeleteModalOpen(false);
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await mediaServices.uploadSingle(file);
      const url = response?.data?.data?.url;
      if (!url) throw new Error("Server tidak mengembalikan URL file");

      return saveKonten({
        teks: materi!.konten.teks,
        files: [...currentFiles, { url, name: file.name }],
      });
    },
    onSuccess: () => {
      toast.success("File berhasil diunggah!", {
        description: "File telah berhasil ditambahkan ke materi.",
        duration: 3000
      });
      invalidateMateri();
    },
    onError: (err: Error) => {
      console.error("Error uploading file:", err);
      toast.error("Gagal mengunggah file", {
        description: err.message || "Terjadi kesalahan saat mengunggah file.",
        duration: 5000
      });
    },
    onSettled: () => {
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileUrl: string) => {
      await mediaServices.remove(fileUrl);
      return saveKonten({
        teks: materi!.konten.teks,
        files: currentFiles.filter((entry) => entry.url !== fileUrl),
      });
    },
    onSuccess: () => {
      toast.success("File berhasil dihapus!", { duration: 3000 });
      invalidateMateri();
    },
    onError: (err: Error) => {
      console.error("Error deleting file:", err);
      toast.error("Gagal menghapus file", {
        description: err.message || "Terjadi kesalahan saat menghapus file.",
        duration: 5000
      });
    },
  });

  const handleBack = () => {
    router.push(`/${role}/matapelajaran/${id}?tab=materi`);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !materi) {
      toast.error("Tidak ada file yang dipilih");
      return;
    }
    uploadFileMutation.mutate(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadFile = (file: string | FileEntry) => {
    const entry = toFileEntry(file);
    downloadFile(entry.url, withExtension(entry));
  };

  const renderFileList = () => {
    const uploadingFile = uploadFileMutation.isPending ? uploadFileMutation.variables : null;

    if (currentFiles.length === 0 && !uploadingFile) {
      return (
        <div className="text-center text-gray-500 py-4">
          Tidak ada file yang dilampirkan.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {currentFiles.map((file, index) => {
          const isDeleting = deleteFileMutation.isPending && deleteFileMutation.variables === file.url;

          return (
            <div key={index} className="flex flex-col p-3 border rounded">
              <div className="w-full mb-2">
                <span className="text-sm font-medium break-all">{file.name}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  startContent={<FiDownload size={16} />}
                  onPress={() => handleDownloadFile(file)}
                  isDisabled={isDeleting}
                  className="min-w-[100px] flex-grow"
                >
                  Unduh
                </Button>
                {hasPermission && (
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    startContent={isDeleting ? null : <FiTrash2 size={16} />}
                    onPress={() => deleteFileMutation.mutate(file.url)}
                    isLoading={isDeleting}
                    isDisabled={isDeleting}
                    className="min-w-[100px] flex-grow"
                  >
                    {isDeleting ? "" : "Hapus"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {uploadingFile && (
          <div className="flex flex-col p-3 border rounded">
            <div className="w-full mb-2">
              <span className="text-sm font-medium break-all">{uploadingFile.name}</span>
              <div className="mt-1">
                <Spinner size="sm" color="primary" labelColor="primary" label="Sedang mengunggah..." />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStudentView = () => {
    if (!materi) return null;

    return (
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardBody className="p-6">
            <h2 className="text-xl font-semibold mb-4">Materi: {materi.judul}</h2>

            <div className="prose max-w-none mb-6">
              {materi.konten.teks ? (
                <div className="whitespace-pre-wrap">{materi.konten.teks}</div>
              ) : (
                <p className="text-gray-500">Tidak ada konten teks.</p>
              )}
            </div>

            {currentFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">File Materi</h3>
                <div className="flex flex-wrap gap-2">
                  {currentFiles.map((file, index) => (
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
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  };

  const renderAdminView = () => {
    return (
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardBody className="p-6">
            <h2 className="text-xl font-semibold mb-4">Konten Materi</h2>

            <Textarea
              minRows={8}
              placeholder="Konten materi..."
              value={kontenTeks}
              onChange={(e) => setKontenTeks(e.target.value)}
              disabled={!hasPermission}
              className="mb-4"
            />

            {hasPermission && (
              <div className="flex justify-end">
                <Button
                  color="primary"
                  onPress={() => saveContentMutation.mutate()}
                  isLoading={saveContentMutation.isPending}
                  size="md"
                >
                  Simpan Perubahan
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center mb-4 gap-2">
              <h2 className="text-xl font-semibold">File Terlampir</h2>

              {hasPermission && (
                <div>
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
                    isLoading={uploadFileMutation.isPending}
                    className="w-full xs:w-auto"
                    size="md"
                  >
                    Unggah File
                  </Button>
                </div>
              )}
            </div>

            {hasPermission && (
              <div className="text-xs text-gray-500 mb-3">
                <p>Format yang didukung: .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .jpg, .jpeg, .png, .gif, .mp3, .wav, .mp4, .zip, .rar</p>
                <p>Ukuran maksimal: 10MB per file</p>
              </div>
            )}

            <Divider className="my-3" />

            {renderFileList()}
          </CardBody>
        </Card>
      </div>
    );
  };

  return (
    <DashboardLayout type={role}>
      <PageContainer className="-mt-20">
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

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                  {materi?.judul || 'Detail Materi Pelajaran'}
                </h1>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                  {hasPermission && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-sm whitespace-nowrap">Tampilan {role === "admin" ? "Admin" : "Guru"}</span>
                      <Switch
                        isSelected={isStudentView}
                        onValueChange={setIsStudentView}
                        size="sm"
                        color="primary"
                      />
                      <span className="text-sm whitespace-nowrap">Tampilan Murid</span>
                    </div>
                  )}

                  {hasPermission && !isStudentView && (
                    <Button
                      color="danger"
                      variant="flat"
                      startContent={<FiTrash2 size={16} />}
                      onPress={() => setIsDeleteModalOpen(true)}
                      className="w-full sm:w-auto min-w-[140px]"
                      size="md"
                    >
                      Hapus Materi
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {isStudentView ? renderStudentView() : renderAdminView()}

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
                      <p>Apakah Anda yakin ingin menghapus materi <strong>{materi?.judul}</strong>?</p>
                      <p className="text-gray-500 text-sm">Tindakan ini tidak dapat dibatalkan.</p>
                    </ModalBody>
                    <ModalFooter>
                      <Button variant="flat" onPress={onClose}>
                        Batal
                      </Button>
                      <Button
                        color="danger"
                        onPress={() => deleteMateriMutation.mutate()}
                        isLoading={deleteMateriMutation.isPending}
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
  );
};

export default MateriPelajaranDetail;
