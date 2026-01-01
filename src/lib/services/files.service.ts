import {
  getUploadedFiles,
  getUploadedFileById,
  deleteUploadedFile,
  deleteAllFiles,
} from '@/lib/repositories/files.repo';

export async function fetchUploadedFiles() {
  return getUploadedFiles();
}

export async function fetchUploadedFileById(fileId: string) {
  return getUploadedFileById(fileId);
}

export async function removeUploadedFile(fileId: string) {
  return deleteUploadedFile(fileId);
}

export async function removeAllFiles(preserveMappings: boolean) {
  return deleteAllFiles(preserveMappings);
}
