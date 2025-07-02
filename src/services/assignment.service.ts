import instance, { CustomRequestConfig } from "../libs/axios/instance";
import { CreateAssignmentInput, SubmissionStatus } from "../types/Assignment";

export const getAssignmentsByMateriId = async (materiId: string) => {
  const response = await instance.get(`/assignments/materi/${materiId}`);
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
  const config: CustomRequestConfig = {
    noRedirect: true
  };
  const response = await instance.post(`/assignments/${assignmentId}/submit`, data, config);
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
  const config: CustomRequestConfig = {
    noRedirect: true
  };
  const response = await instance.delete(
    `/assignments/${assignmentId}/submissions/${submissionId}`,
    config
  );
  return response.data;
};

export const deleteOwnSubmission = async (assignmentId: string, submissionId: string) => {
  const config: CustomRequestConfig = {
    noRedirect: true
  };
  try {
    const response = await instance.delete(
      `/assignments/${assignmentId}/submissions/${submissionId}`,
      config
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

const assignmentService = {
  createAssignment,
  getAssignmentsByMateriId,
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
