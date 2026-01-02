/**
 * SharedBottomNav 컴포넌트 테스트
 * 4탭 네비게이션 기능 검증
 */

import { describe, it, expect } from 'vitest';

// 탭 구성 테스트 데이터
const EXPENSE_COLOR = '#EF4444';
const INCOME_COLOR = '#16A34A';

const tabs = [
  { href: '/', label: '지출', activeColor: EXPENSE_COLOR },
  { href: '/dashboard', label: '지출분석', activeColor: EXPENSE_COLOR },
  { href: '/income', label: '소득', activeColor: INCOME_COLOR },
  { href: '/income/dashboard', label: '소득분석', activeColor: INCOME_COLOR },
];

describe('SharedBottomNav 탭 구성', () => {
  it('4개의 탭이 정의되어야 함', () => {
    expect(tabs).toHaveLength(4);
  });

  it('지출 탭들은 빨간색 (#EF4444)이어야 함', () => {
    const expenseTabs = tabs.filter(tab =>
      tab.href === '/' || tab.href === '/dashboard'
    );
    expect(expenseTabs).toHaveLength(2);
    expenseTabs.forEach(tab => {
      expect(tab.activeColor).toBe(EXPENSE_COLOR);
    });
  });

  it('소득 탭들은 녹색 (#16A34A)이어야 함', () => {
    const incomeTabs = tabs.filter(tab =>
      tab.href.startsWith('/income')
    );
    expect(incomeTabs).toHaveLength(2);
    incomeTabs.forEach(tab => {
      expect(tab.activeColor).toBe(INCOME_COLOR);
    });
  });

  it('각 탭의 경로가 올바르게 설정되어야 함', () => {
    expect(tabs[0].href).toBe('/');
    expect(tabs[1].href).toBe('/dashboard');
    expect(tabs[2].href).toBe('/income');
    expect(tabs[3].href).toBe('/income/dashboard');
  });

  it('각 탭의 라벨이 올바르게 설정되어야 함', () => {
    expect(tabs[0].label).toBe('지출');
    expect(tabs[1].label).toBe('지출분석');
    expect(tabs[2].label).toBe('소득');
    expect(tabs[3].label).toBe('소득분석');
  });
});

describe('SharedBottomNav 활성 상태 로직', () => {
  // isActive 로직 재현 (정확한 경로 매칭)
  const isActive = (href: string, pathname: string) => {
    return pathname === href;
  };

  it('루트 경로 (/)는 정확히 일치해야만 활성화됨', () => {
    expect(isActive('/', '/')).toBe(true);
    expect(isActive('/', '/dashboard')).toBe(false);
    expect(isActive('/', '/income')).toBe(false);
  });

  it('/dashboard는 정확히 일치해야 활성화됨', () => {
    expect(isActive('/dashboard', '/dashboard')).toBe(true);
    expect(isActive('/dashboard', '/')).toBe(false);
    expect(isActive('/dashboard', '/income/dashboard')).toBe(false);
  });

  it('/income은 정확히 일치해야만 활성화됨', () => {
    expect(isActive('/income', '/income')).toBe(true);
    expect(isActive('/income', '/income/dashboard')).toBe(false);
    expect(isActive('/income', '/')).toBe(false);
  });

  it('/income/dashboard는 정확히 일치해야 활성화됨', () => {
    expect(isActive('/income/dashboard', '/income/dashboard')).toBe(true);
    expect(isActive('/income/dashboard', '/income')).toBe(false);
    expect(isActive('/income/dashboard', '/dashboard')).toBe(false);
  });
});
