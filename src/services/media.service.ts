import instance from "../libs/axios/instance";

const mediaServices = {
  uploadSingle: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
  
    return instance.post("/media/single", formData, {
      timeout: 30000,
      transformRequest: [(data) => data],
      headers: {
        'Content-Type': undefined,
      },
    });
  },

  uploadMultiple: (files: File[]) => {
    const formData = new FormData();
    
    files.forEach((file, index) => {
      formData.append("files", file);
    });
  
    return instance.post("/media/multiple", formData, {
      timeout: 60000,
      transformRequest: [(data) => data],
      headers: {
        'Content-Type': undefined,
      },
    });
  },

  remove: (fileUrl: string) => {
    return instance.delete(`/media?fileUrl=${fileUrl}`);
  },
};

export default mediaServices;
