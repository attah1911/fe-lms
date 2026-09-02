import { SubmissionStatus } from "@/types/Assignment";

export const getStatusColor = (status: SubmissionStatus) => {
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

export const getStatusText = (status: SubmissionStatus) => {
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
