import instance, { CustomRequestConfig } from "../libs/axios/instance";
import endpoint from "./endpoint.constant";

interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const getMataPelajaran = async (params?: PaginationParams) => {
  try {
    const response = await instance.get(endpoint.MATA_PELAJARAN, { params });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch mata pelajaran data");
  }
};

export const getMataPelajaranById = async (id: string) => {
  try {
    const response = await instance.get(`${endpoint.MATA_PELAJARAN}/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch mata pelajaran detail");
  }
};

export const createMataPelajaran = async (data: any) => {
  try {
    const response = await instance.post(endpoint.MATA_PELAJARAN, data);
    return response.data;
  } catch (error: any) {
    console.error('Create MataPelajaran Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.response?.data?.message,
      requestData: data
    });
    
    if (error.response?.data?.meta?.errors) {
      const errors = error.response.data.meta.errors;
      const messages = Object.values(errors).flat().join(", ");
      throw new Error(messages);
    }
    throw new Error(error.response?.data?.message || "Failed to create mata pelajaran");
  }
};

export const updateMataPelajaran = async (id: string, data: any) => {
  try {
    const response = await instance.put(`${endpoint.MATA_PELAJARAN}/${id}`, data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.meta?.errors) {
      const errors = error.response.data.meta.errors;
      const messages = Object.values(errors).flat().join(", ");
      throw new Error(messages);
    }
    throw new Error(error.response?.data?.message || "Failed to update mata pelajaran");
  }
};

export const deleteMataPelajaran = async (id: string) => {
  try {
    const response = await instance.delete(`${endpoint.MATA_PELAJARAN}/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete mata pelajaran");
  }
};

export const getEnrolledStudents = async (mataPelajaranId: string) => {
  try {
    const response = await instance.get(`${endpoint.MATA_PELAJARAN}/${mataPelajaranId}/students`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to get enrolled students");
  }
};

export const enrollStudent = async (mataPelajaranId: string, studentId: string) => {
  try {
    const response = await instance.post(`${endpoint.MATA_PELAJARAN}/${mataPelajaranId}/enroll/${studentId}`, {});
    return response.data;
  } catch (error: any) {
    console.error("Enrollment error:", error);
    throw new Error(error.response?.data?.meta?.message || error.message || "Failed to enroll student");
  }
};

export const selfEnrollStudent = async (mataPelajaranId: string) => {
  try {
    const response = await instance.post(`${endpoint.MATA_PELAJARAN}/${mataPelajaranId}/self-enroll`, {});
    return response.data;
  } catch (error: any) {
    console.error("Self-enrollment error:", error);
    throw new Error(error.response?.data?.meta?.message || error.response?.data?.message || error.message || "Failed to enroll in course");
  }
};

export const unenrollStudent = async (mataPelajaranId: string, studentId: string) => {
  try {
    const response = await instance.delete(`${endpoint.MATA_PELAJARAN}/${mataPelajaranId}/unenroll/${studentId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to unenroll student");
  }
}; 
