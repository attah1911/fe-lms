import instance from "../libs/axios/instance";
import { CustomRequestConfig } from "../libs/axios/instance";
import endpoint from "./endpoint.constant";

interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  mataPelajaran?: string;
}

export const getMateriPelajaran = async (params?: PaginationParams) => {
  try {
    const response = await instance.get(endpoint.MATERI_PELAJARAN, { params });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch materi pelajaran data");
  }
};

export const getMateriPelajaranById = async (id: string) => {
  try {
    const mataPelajaranId = localStorage.getItem('currentMataPelajaranId');
    
    if (!mataPelajaranId) {
      throw new Error("Missing mata pelajaran ID. Please navigate from the mata pelajaran page.");
    }
    
    const response = await instance.get(`${endpoint.MATA_PELAJARAN}/${mataPelajaranId}/materi/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch materi pelajaran detail");
  }
};

export const getMateriByMataPelajaranId = async (mataPelajaranId: string, params?: PaginationParams) => {
  try {
    const config: CustomRequestConfig = {
      params: params || {},
    };
    
    const response = await instance.get(`${endpoint.MATA_PELAJARAN}/${mataPelajaranId}/materi`, config);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch materi for the mata pelajaran");
  }
};

export const createMateriPelajaran = async (mataPelajaranId: string, data: any) => {
  try {
    const session = await import('next-auth/react').then(mod => mod.getSession());
    
    const config: CustomRequestConfig = {
      headers: {
        "Authorization": session?.accessToken ? `Bearer ${session.accessToken}` : ""
      },
    };
    
    const requestData = {
      ...data,
      mataPelajaran: mataPelajaranId
    };
    
    const response = await instance.post(`${endpoint.MATA_PELAJARAN}/${mataPelajaranId}/materi`, requestData, config);
    return response.data;
  } catch (error: any) {
    console.error("Full error response:", error);
    console.error("Response data:", error.response?.data);
    console.error("Response status:", error.response?.status);
    console.error("Response headers:", error.response?.headers);
    
    if (error.response?.data?.meta?.message) {
      throw new Error(error.response.data.meta.message);
    }
    
    throw new Error(error.message || "Failed to create materi pelajaran");
  }
};

export const updateMateriPelajaran = async (id: string, data: any) => {
  try {
    const mataPelajaranId = data.mataPelajaran || localStorage.getItem('currentMataPelajaranId');
    
    if (!mataPelajaranId) {
      throw new Error("Missing mata pelajaran ID for update operation");
    }
    
    const response = await instance.put(`${endpoint.MATA_PELAJARAN}/${mataPelajaranId}/materi/${id}`, data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.meta?.errors) {
      const errors = error.response.data.meta.errors;
      const messages = Object.values(errors).flat().join(", ");
      throw new Error(messages);
    }
    throw new Error(error.response?.data?.message || "Failed to update materi pelajaran");
  }
};

export const deleteMateriPelajaran = async (id: string) => {
  try {
    const mataPelajaranId = localStorage.getItem('currentMataPelajaranId');
    
    if (!mataPelajaranId) {
      throw new Error("Missing mata pelajaran ID for delete operation");
    }
    
    const response = await instance.delete(`${endpoint.MATA_PELAJARAN}/${mataPelajaranId}/materi/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete materi pelajaran");
  }
}; 
