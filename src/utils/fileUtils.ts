/**
 * Utility functions for file operations
 */

/**
 * Extract filename from URL for display
 */
export const getFileNameFromUrl = (fileUrl: string): string => {
  if (typeof fileUrl !== 'string') return 'File';
  
  const urlParts = fileUrl.split('/');
  const fullFileName = urlParts[urlParts.length - 1];
  
  let fileName = decodeURIComponent(fullFileName);
  const timestampRegex = /^\d+_/;
  fileName = fileName.replace(timestampRegex, '');
  
  fileName = fileName.replace(/_/g, ' ');
  
  return fileName;
};

/**
 * Get file extension from URL or original filename
 */
export const getFileExtension = (fileUrl: string, originalName?: string): string => {
  if (originalName) {
    const nameParts = originalName.split('.');
    if (nameParts.length > 1) {
      return nameParts[nameParts.length - 1].toLowerCase();
    }
  }
  
  if (typeof fileUrl !== 'string') return '';
  
  const urlParts = fileUrl.split('.');
  if (urlParts.length > 1) {
    return urlParts[urlParts.length - 1].toLowerCase();
  }
  
  if (fileUrl.includes('/documents/word/')) {
    return 'docx';
  } else if (fileUrl.includes('/documents/pdf/')) {
    return 'pdf';
  } else if (fileUrl.includes('/documents/excel/')) {
    return 'xlsx';
  } else if (fileUrl.includes('/documents/presentations/')) {
    return 'pptx';
  } else if (fileUrl.includes('/documents/archives/')) {
    return 'zip';
  }
  
  return '';
};

/**
 * Get appropriate MIME type based on file extension
 */
export const getMimeTypeFromExtension = (extension: string): string => {
  const mimeTypes: {[key: string]: string} = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'txt': 'text/plain',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'mp4': 'video/mp4',
    'webm': 'video/webm'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
};

/**
 * Download file with proper filename
 */
export const downloadFile = async (fileUrl: string, fileName?: string): Promise<void> => {
  try {
    const displayFileName = fileName || getFileNameFromUrl(fileUrl);
    
    const originalExtension = displayFileName.includes('.') ? 
      displayFileName.split('.').pop()?.toLowerCase() : null;
    
    const fileExt = originalExtension || getFileExtension(fileUrl);
    
    const fullFileName = displayFileName.includes('.') 
      ? displayFileName 
      : `${displayFileName}.${fileExt}`;
    
    if (fileExt === 'pdf') {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fullFileName);
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
      
      return;
    }
    
    const mimeType = getMimeTypeFromExtension(fileExt);
    
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }
    
    const blob = await response.blob();
    
    const fileBlob = new Blob([blob], { type: mimeType });
    
    const downloadUrl = window.URL.createObjectURL(fileBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', fullFileName);
    document.body.appendChild(link);
    link.click();
    
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
  } catch (error) {
    alert('Gagal mengunduh file. Silakan coba lagi.');
  }
}; 
