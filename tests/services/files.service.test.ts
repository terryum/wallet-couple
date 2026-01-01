import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchUploadedFiles, removeAllFiles } from '@/lib/services/files.service';
import * as repo from '@/lib/repositories/files.repo';

vi.mock('@/lib/repositories/files.repo', () => ({
  getUploadedFiles: vi.fn(),
  getUploadedFileById: vi.fn(),
  deleteUploadedFile: vi.fn(),
  deleteAllFiles: vi.fn(),
}));

const mockedRepo = vi.mocked(repo);

describe('files.service', () => {
  beforeEach(() => {
    mockedRepo.getUploadedFiles.mockReset();
    mockedRepo.deleteAllFiles.mockReset();
  });

  it('fetches uploaded files', async () => {
    mockedRepo.getUploadedFiles.mockResolvedValue({ data: [], error: null });
    const result = await fetchUploadedFiles();
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('deletes all files with preserve flag', async () => {
    mockedRepo.deleteAllFiles.mockResolvedValue({ data: 3, error: null });
    const result = await removeAllFiles(true);
    expect(result.data).toBe(3);
  });
});
