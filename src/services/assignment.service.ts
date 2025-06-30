import instance, { CustomRequestConfig } from "../libs/axios/instance";
import { CreateAssignmentInput, SubmissionStatus } from "../types/Assignment";

// Get assignments for a specific materi
export const getAssignmentsByMateriId = async (materiId: string) => {
  const response = await instance.get(`/assignments/materi/${materiId}`);
  return response.data;
};

// Get a specific assignment
export const getAssignmentById = async (id: string) => {
  try {
    const response = await instance.get(`/assignments/${id}`);
    
    // Check if the response has the expected structure
    if (response.data && response.data.meta && response.data.data) {
      return response.data;
    } else if (response.data) {
      // If the response doesn't have the expected structure but has data
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

// Create a new assignment
export const createAssignment = async (data: CreateAssignmentInput) => {
  const response = await instance.post(`/assignments`, data);
  return response.data;
};

// Update an assignment
export const updateAssignment = async (id: string, data: Partial<CreateAssignmentInput>) => {
  const response = await instance.put(`/assignments/${id}`, data);
  return response.data;
};

// Delete an assignment
export const deleteAssignment = async (id: string) => {
  const response = await instance.delete(`/assignments/${id}`);
  return response.data;
};

// Submit an assignment (for students)
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

// Update submission status (for teachers/admins)
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

// Update submission score (for teachers/admins)
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

// Delete a submission (for teachers/admins)
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

// Delete student's own submission
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

export default {
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
