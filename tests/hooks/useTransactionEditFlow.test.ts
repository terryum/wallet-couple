import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransactionEditFlow } from '@/hooks/useTransactionEditFlow';
import type { Transaction } from '@/types';

const baseTransaction: Transaction = {
  id: 'tx-1',
  transaction_date: '2024-01-01',
  merchant_name: 'Test Store',
  amount: 12000,
  category: '식료품',
  memo: null,
  source_type: '현대카드',
  owner: 'husband',
  is_deleted: false,
  transaction_type: 'expense',
  raw_data: null,
  created_at: '2024-01-01T00:00:00Z',
};

describe('useTransactionEditFlow', () => {
  it('편집 열기 시 거래 선택과 모달 상태가 갱신된다', () => {
    const { result } = renderHook(() => useTransactionEditFlow());

    act(() => {
      result.current.openEdit(baseTransaction);
    });

    expect(result.current.editModalProps.open).toBe(true);
    expect(result.current.editModalProps.transaction).toBe(baseTransaction);
  });

  it('모달 닫힘 시 onEditClose 콜백이 호출된다', () => {
    const onEditClose = vi.fn();
    const { result } = renderHook(() => useTransactionEditFlow({ onEditClose }));

    act(() => {
      result.current.editModalProps.onOpenChange(true);
    });
    act(() => {
      result.current.editModalProps.onOpenChange(false);
    });

    expect(onEditClose).toHaveBeenCalledTimes(1);
  });

  it('필드 변경 시 일정 딜레이 후 비슷한 거래 모달이 열린다', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useTransactionEditFlow({ openSimilarDelayMs: 50 })
    );

    act(() => {
      result.current.openEdit(baseTransaction);
    });

    act(() => {
      result.current.editModalProps.onFieldsChanged?.(baseTransaction, {
        merchant: { old: 'Test Store', new: 'New Store' },
        category: { old: '식료품', new: '쇼핑' },
      });
    });

    expect(result.current.similarModalProps?.open).toBe(false);

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(result.current.similarModalProps?.open).toBe(true);
    expect(result.current.similarModalProps?.newMerchantName).toBe('New Store');
    expect(result.current.similarModalProps?.newCategory).toBe('쇼핑');

    vi.useRealTimers();
  });
});
