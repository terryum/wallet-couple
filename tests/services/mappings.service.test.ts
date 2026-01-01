import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category } from '@/types';
import {
  updateCategoryMappingWithHistory,
  restoreMappingFromHistory,
} from '@/lib/services/mappings.service';
import * as repo from '@/lib/repositories/mappings.repo';

vi.mock('@/lib/repositories/mappings.repo', () => ({
  fetchCategoryMappings: vi.fn(),
  fetchMerchantMappings: vi.fn(),
  getCategoryMappingById: vi.fn(),
  getMerchantMappingById: vi.fn(),
  updateCategoryMapping: vi.fn(),
  updateMerchantMapping: vi.fn(),
  deleteMapping: vi.fn(),
  createMappingHistory: vi.fn(),
  fetchMappingHistory: vi.fn(),
  getHistoryById: vi.fn(),
}));

const mockedRepo = vi.mocked(repo);

describe('mappings.service', () => {
  beforeEach(() => {
    mockedRepo.getCategoryMappingById.mockReset();
    mockedRepo.updateCategoryMapping.mockReset();
    mockedRepo.createMappingHistory.mockReset();
    mockedRepo.getHistoryById.mockReset();
    mockedRepo.updateMerchantMapping.mockReset();
  });

  it('updates category mapping and 기록 히스토리', async () => {
    mockedRepo.getCategoryMappingById.mockResolvedValue({
      data: {
        id: '1',
        pattern: '스타벅스',
        category: '기타' as Category,
        source: 'ai',
        match_count: 1,
        created_at: '2025-01-01',
      },
      error: null,
    });
    mockedRepo.updateCategoryMapping.mockResolvedValue({ data: true, error: null });
    mockedRepo.createMappingHistory.mockResolvedValue({ data: true, error: null });

    const result = await updateCategoryMappingWithHistory('1', '외식/커피');
    expect(result.error).toBeNull();
    expect(mockedRepo.updateCategoryMapping).toHaveBeenCalledWith('1', '외식/커피');
    expect(mockedRepo.createMappingHistory).toHaveBeenCalled();
  });

  it('restores category mapping from history', async () => {
    mockedRepo.getHistoryById.mockResolvedValue({
      data: {
        id: 'h1',
        action_type: 'update',
        entity_type: 'mapping',
        entity_id: 'm1',
        description: 'test',
        previous_data: { category: '기타', source: 'manual' },
        new_data: { category: '쇼핑', source: 'manual' },
        created_at: '2025-01-01',
      },
      error: null,
    });
    mockedRepo.updateCategoryMapping.mockResolvedValue({ data: true, error: null });
    mockedRepo.createMappingHistory.mockResolvedValue({ data: true, error: null });

    const result = await restoreMappingFromHistory('h1');
    expect(result.error).toBeNull();
    expect(mockedRepo.updateCategoryMapping).toHaveBeenCalledWith('m1', '기타');
  });
});
