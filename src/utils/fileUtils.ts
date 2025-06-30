/**
 * Utility functions for file operations
 */

/**
 * Extract filename from URL for display
 */
export const getFileNameFromUrl = (fileUrl: string): string => {
  // Extract filename from URL
  if (typeof fileUrl !== 'string') return 'File';
  
  const urlParts = fileUrl.split('/');
  const fullFileName = urlParts[urlParts.length - 1];
  
  // Decode URI components and remove timestamp prefix if present
  let fileName = decodeURIComponent(fullFileName);
  const timestampRegex = /^\d+_/;
  fileName = fileName.replace(timestampRegex, '');
  
  // Replace underscores with spaces for better readability
  fileName = fileName.replace(/_/g, ' ');
  
  return fileName;
};

/**
 * Get file extension from URL or original filename
 */
export const getFileExtension = (fileUrl: string, originalName?: string): string => {
  // If we have the original name, extract extension from it
  if (originalName) {
    const nameParts = originalName.split('.');
    if (nameParts.length > 1) {
      return nameParts[nameParts.length - 1].toLowerCase();
    }
  }
  
  if (typeof fileUrl !== 'string') return '';
  
  // Get extension from URL if available
  const urlParts = fileUrl.split('.');
  if (urlParts.length > 1) {
    return urlParts[urlParts.length - 1].toLowerCase();
  }
  
  // If no extension in URL, check URL path for document type
  if (fileUrl.includes('/documents/word/')) {
    return 'docx';
  } else if (fileUrl.includes('/documents/pdf/')) {
    return 'pdf';
  } else if (fileUrl.includes('/documents/excel/')) {
    return 'xlsx';
  } else if (fileUrl.includes('/documents/presentations/')) {
    // Default to pptx, but this should only be a fallback
    // Original extension should come from originalName
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
    // If fileName not provided, extract from URL
    const displayFileName = fileName || getFileNameFromUrl(fileUrl);
    
    // Extract extension from original filename if exists or URL
    const originalExtension = displayFileName.includes('.') ? 
      displayFileName.split('.').pop()?.toLowerCase() : null;
    
    // Get file extension from URL or infer it based on URL path
    const fileExt = originalExtension || getFileExtension(fileUrl);
    
    // Use extension from URL if filename doesn't include it
    const fullFileName = displayFileName.includes('.') 
      ? displayFileName 
      : `${displayFileName}.${fileExt}`;
    
    // Special handling for PDF files to ensure proper download
    if (fileExt === 'pdf') {
      // For PDFs, use the fetch API with arraybuffer response type
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      // Get array buffer for binary integrity
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fullFileName);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
      
      return;
    }
    
    // Standard download process for non-PDF files
    // Get appropriate MIME type
    const mimeType = getMimeTypeFromExtension(fileExt);
    
    // Fetch the file
    const response = await fetch(fileUrl);
    
    // Check if the response is valid
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }
    
    // Get the file as a blob
    const blob = await response.blob();
    
    // Create a blob with the correct MIME type
    const fileBlob = new Blob([blob], { type: mimeType });
    
    // Create a temporary link and trigger download
    const downloadUrl = window.URL.createObjectURL(fileBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', fullFileName);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
  } catch (error) {
    // Don't use fallback to direct link as it opens in a new tab
    // Instead, show an error message
    alert('Gagal mengunduh file. Silakan coba lagi.');
  }
}; 
