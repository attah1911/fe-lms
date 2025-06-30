import instance from "../libs/axios/instance";
import { CustomRequestConfig } from "../libs/axios/instance";
import endpoint from "./endpoint.constant";

interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  mataPelajaran?: string;
}

// Get all materi pelajaran
export const getMateriPelajaran = async (params?: PaginationParams) => {
  try {
    const response = await instance.get(endpoint.MATERI_PELAJARAN, { params });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch materi pelajaran data");
  }
};

// Get materi pelajaran by ID
export const getMateriPelajaranById = async (id: string) => {
  try {
    // Extract mataPelajaranId from localStorage or other source
    // In a real app, this would be better handled through context or state management
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

// Get materi pelajaran by mata pelajaran ID
export const getMateriByMataPelajaranId = async (mataPelajaranId: string, params?: PaginationParams) => {
  try {
    // Create config with proper type casting
    const config: CustomRequestConfig = { 
      params: params || {},
      noRedirect: true
    };
    
    // Use the consistent URL structure with mataPelajaranId in the path
    const response = await instance.get(`${endpoint.MATA_PELAJARAN}/${mataPelajaranId}/materi`, config);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch materi for the mata pelajaran");
  }
};

// Create materi pelajaran
export const createMateriPelajaran = async (mataPelajaranId: string, data: any) => {
  try {
    // Get the current session to check token
    const session = await import('next-auth/react').then(mod => mod.getSession());
    
    // Create config with proper type casting
    const config: CustomRequestConfig = {
      noRedirect: true,
      headers: {
        // Add explicit authorization header for debugging
        "Authorization": session?.accessToken ? `Bearer ${session.accessToken}` : ""
      }
    };
    
    // Add mataPelajaran field to the request body
    const requestData = {
      ...data,
      mataPelajaran: mataPelajaranId
    };
    
    // Use the correct URL structure with mataPelajaranId in the path
    const response = await instance.post(`${endpoint.MATA_PELAJARAN}/${mataPelajaranId}/materi`, requestData, config);
    return response.data;
  } catch (error: any) {
    // Log full error details for debugging
    console.error("Full error response:", error);
    console.error("Response data:", error.response?.data);
    console.error("Response status:", error.response?.status);
    console.error("Response headers:", error.response?.headers);
    
    // For now, just pass through the raw error message
    if (error.response?.data?.meta?.message) {
      throw new Error(error.response.data.meta.message);
    }
    
    // Generic error fallback
    throw new Error(error.message || "Failed to create materi pelajaran");
  }
};

// Update materi pelajaran
export const updateMateriPelajaran = async (id: string, data: any) => {
  try {
    // Extract mataPelajaranId from the data or localStorage
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

// Delete materi pelajaran
export const deleteMateriPelajaran = async (id: string) => {
  try {
    // Extract mataPelajaranId from localStorage or other source
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
