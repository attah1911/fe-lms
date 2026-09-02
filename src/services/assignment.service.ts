import instance, { CustomRequestConfig } from "../libs/axios/instance";
import { CreateAssignmentInput, SubmissionStatus } from "../types/Assignment";

/**
 * One request for a whole mata pelajaran (omit `mataPelajaranId` for everything
 * the requester can see). The backend scopes the rows, and each one already
 * carries its `materi` and `mataPelajaran`.
 *
 * Rows come back with `_count.submissions` only; pass `withSubmissions` when the
 * screen actually renders submission rows, so list views stay light.
 */
export const getAssignments = async (
  params: { mataPelajaranId?: string; withSubmissions?: boolean } = {}
) => {
  const query = new URLSearchParams();
  if (params.mataPelajaranId) query.set("mataPelajaranId", params.mataPelajaranId);
  if (params.withSubmissions) query.set("withSubmissions", "true");

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await instance.get(`/assignments${suffix}`);
  return response.data;
};

export const getAssignmentById = async (id: string) => {
  try {
    const response = await instance.get(`/assignments/${id}`);
    
    if (response.data && response.data.meta && response.data.data) {
      return response.data;
    } else if (response.data) {
      return { 
        meta: { status: 200, message: 'Success' },
        data: response.data 
      };
    } else {
      throw new Error('Tidak ada data yang diterima dari server');
    }
  } catch (error: any) {
    if (error.response && error.response.data && error.response.data.meta) {
      throw new Error(error.response.data.meta.message || 'Gagal mengambil data tugas');
    }
    throw error;
  }
};

export const createAssignment = async (data: CreateAssignmentInput) => {
  const response = await instance.post(`/assignments`, data);
  return response.data;
};

export const updateAssignment = async (id: string, data: Partial<CreateAssignmentInput>) => {
  const response = await instance.put(`/assignments/${id}`, data);
  return response.data;
};

export const deleteAssignment = async (id: string) => {
  const response = await instance.delete(`/assignments/${id}`);
  return response.data;
};

export const submitAssignment = async (assignmentId: string, data: { 
  files: Array<{
    fileUrl: string, 
    fileName: string
  }> 
}) => {
  const response = await instance.post(`/assignments/${assignmentId}/submit`, data);
  return response.data;
};

export const updateSubmissionStatus = async (
  assignmentId: string, 
  submissionId: string, 
  status: SubmissionStatus,
  feedback?: string
) => {
  const response = await instance.put(
    `/assignments/${assignmentId}/submissions/${submissionId}`, 
    { status, feedback }
  );
  return response.data;
};

export const updateSubmissionScore = async (
  assignmentId: string,
  submissionId: string,
  score: number
) => {
  const response = await instance.put(
    `/assignments/${assignmentId}/submissions/${submissionId}/score`,
    { score }
  );
  return response.data;
};

export const deleteSubmission = async (assignmentId: string, submissionId: string) => {
  const response = await instance.delete(
    `/assignments/${assignmentId}/submissions/${submissionId}`
  );
  return response.data;
};

export const deleteOwnSubmission = async (assignmentId: string, submissionId: string) => {
  try {
    const response = await instance.delete(
      `/assignments/${assignmentId}/submissions/${submissionId}`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

const assignmentService = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  updateSubmissionStatus,
  updateSubmissionScore,
  deleteSubmission,
  deleteOwnSubmission
}; 

export default assignmentService; 
