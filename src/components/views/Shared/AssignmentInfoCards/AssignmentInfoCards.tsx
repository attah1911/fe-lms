import React from "react";
import { Card, CardBody, Divider, Button } from "@nextui-org/react";
import { FiCalendar, FiClipboard, FiDownload } from "react-icons/fi";

export interface AssignmentAttachment {
  url: string;
  name: string;
}

interface PropTypes {
  title: string;
  description: string;
  deadline: string;
  materiJudul?: string;
  attachments: AssignmentAttachment[];
  onDownload: (file: AssignmentAttachment) => void;
  /** Role-specific note under the deadline (e.g. "batas waktu berakhir"). */
  deadlineNotice?: React.ReactNode;
}

/**
 * The read-only half of the student-facing assignment page: the "Informasi
 * Tugas" and "File Lampiran" cards. Shared by the murid page and by the
 * "Tampilan Murid" toggle on the admin/guru page, so the preview really does
 * match what a student sees. The submit/upload half is NOT here — murid and
 * admin/guru run different upload flows.
 */
const AssignmentInfoCards: React.FC<PropTypes> = ({
  title,
  description,
  deadline,
  materiJudul,
  attachments,
  onDownload,
  deadlineNotice,
}) => {
  const isDeadlinePassed = new Date(deadline) < new Date();

  return (
    <>
      <Card>
        <CardBody className="p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <FiCalendar size={16} className="text-primary" />
            <h3 className="text-base sm:text-lg font-semibold">Informasi Tugas</h3>
          </div>

          <Divider className="my-3 sm:my-4" />

          <div className="space-y-3 sm:space-y-4">
            <div>
              <h4 className="text-xs sm:text-sm text-gray-500">Judul Tugas:</h4>
              <p className="font-medium text-sm sm:text-base">{title}</p>
            </div>

            <div>
              <h4 className="text-xs sm:text-sm text-gray-500">Materi:</h4>
              <p className="font-medium text-sm sm:text-base">
                {materiJudul || "Materi tidak diketahui"}
              </p>
            </div>

            <div>
              <h4 className="text-xs sm:text-sm text-gray-500">Deskripsi:</h4>
              <p className="whitespace-pre-wrap text-xs sm:text-sm">{description}</p>
            </div>

            <div>
              <h4 className="text-xs sm:text-sm text-gray-500">Tenggat Waktu:</h4>
              <p className={`font-medium text-sm sm:text-base ${isDeadlinePassed ? "text-danger" : ""}`}>
                {new Date(deadline).toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                pukul{" "}
                {new Date(deadline).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Jakarta",
                })}{" "}
                WIB
              </p>
              {deadlineNotice}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <FiClipboard size={16} className="text-primary" />
            <h3 className="text-base sm:text-lg font-semibold">File Lampiran</h3>
          </div>

          <Divider className="my-3 sm:my-4" />

          {attachments && attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant="flat"
                  color="primary"
                  startContent={<FiDownload size={14} />}
                  onPress={() => onDownload(file)}
                  className="mb-2 py-1 px-3 h-8 text-xs sm:text-sm"
                >
                  <span className="truncate max-w-[120px] sm:max-w-[200px]">{file.name}</span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4 text-xs sm:text-sm">
              Tidak ada file yang dilampirkan.
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
};

export default AssignmentInfoCards;
