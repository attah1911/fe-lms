import instance from "../libs/axios/instance";

const mediaServices = {
  uploadSingle: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
  
    return instance.post("/media/single", formData, {
      timeout: 30000, // 30 second timeout
      transformRequest: [(data) => data], // Keep this to prevent axios from transforming FormData
      headers: {
        // Let the browser set the Content-Type with boundary
        'Content-Type': undefined,
      },
    });
  },

  uploadMultiple: (files: File[]) => {
    const formData = new FormData();
    
    // Append each file to the form data
    files.forEach((file, index) => {
      formData.append("files", file);
    });
  
    return instance.post("/media/multiple", formData, {
      timeout: 60000, // 60 second timeout
      transformRequest: [(data) => data], // Keep this to prevent axios from transforming FormData
      headers: {
        // Let the browser set the Content-Type with boundary
        'Content-Type': undefined,
      },
    });
  },

  remove: (fileUrl: string) => {
    return instance.delete(`/media?fileUrl=${fileUrl}`);
  },
};

export default mediaServices;
