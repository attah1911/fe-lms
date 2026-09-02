import { EnrolledStudent } from "./MataPelajaran";

export interface Assignment {
  _id: string;
  title: string;
  description: string;
  deadline: string;
  materiId: string;
  mataPelajaranId: string;
  materi?: { _id: string; judul: string };
  mataPelajaran?: { _id: string; judul: string };
  /** absent on list responses (`GET /assignments` without `withSubmissions`) */
  submissions?: AssignmentSubmission[];
  /** list responses (`GET /assignments`) send a count instead of the rows */
  _count?: { submissions: number };
  attachments?: Array<{url: string; name: string}>;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionFile {
  fileUrl: string;
  fileName: string;
}

export interface AssignmentSubmission {
  _id: string;
  student: EnrolledStudent;
  fileUrl: string;
  fileName: string;
  submittedAt: string;
  status: SubmissionStatus;
  feedback?: string;
  score?: number;
  additionalFiles?: SubmissionFile[];
}

export enum SubmissionStatus {
  SUBMITTED = 'submitted',
  REVIEWED = 'reviewed',
  REJECTED = 'rejected'
}

export interface CreateAssignmentInput {
  title: string;
  description: string;
  deadline: string;
  materiId: string;
  mataPelajaranId: string;
  attachments?: Array<{url: string; name: string}>;
} 
