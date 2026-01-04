/**
 * 프리페칭 관리자
 * - requestIdleCallback을 활용한 유휴 시간 프리페칭
 * - 사용자 액션 시 프리페칭 일시 중단
 * - AbortController로 진행 중인 요청 취소 가능
 */

type Priority = 'high' | 'low';

interface ScheduledTask {
  id: number;
  type: 'timeout' | 'idle';
}

export class PrefetchManager {
  private scheduledTasks: ScheduledTask[] = [];
  private abortController: AbortController | null = null;
  private isPaused = false;
  private pauseTimeout: NodeJS.Timeout | null = null;
  private pendingCallbacks: Array<{ callback: () => void; priority: Priority }> = [];

  /**
   * 새 AbortController 생성 및 signal 반환
   */
  createAbortSignal(): AbortSignal {
    // 기존 controller가 있으면 abort하지 않음 (우선순위 방식)
    if (!this.abortController) {
      this.abortController = new AbortController();
    }
    return this.abortController.signal;
  }

  /**
   * 현재 AbortSignal 반환 (없으면 새로 생성)
   */
  getSignal(): AbortSignal {
    if (!this.abortController) {
      this.abortController = new AbortController();
    }
    return this.abortController.signal;
  }

  /**
   * 스케줄된 모든 프리페칭 취소
   */
  cancelScheduled(): void {
    this.scheduledTasks.forEach((task) => {
      if (task.type === 'timeout') {
        clearTimeout(task.id);
      }
      // requestIdleCallback은 cancelIdleCallback으로 취소
      if (task.type === 'idle' && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(task.id);
      }
    });
    this.scheduledTasks = [];
    this.pendingCallbacks = [];
  }

  /**
   * 진행 중인 fetch 요청 중단
   */
  abortInFlight(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 모든 프리페칭 취소 (스케줄 + 진행 중)
   */
  cancelAll(): void {
    this.cancelScheduled();
    this.abortInFlight();
  }

  /**
   * 사용자 액션 알림 - 프리페칭 즉시 취소 및 일시 중단
   * @param pauseDuration 중단 시간 (ms), 기본 500ms
   */
  notifyUserAction(pauseDuration = 500): void {
    this.isPaused = true;

    // ★ 핵심: 진행 중인 프리페칭 즉시 취소하여 네트워크 대역폭 확보
    this.cancelScheduled();  // 스케줄된 prefetch 취소
    this.abortInFlight();    // 진행 중인 fetch 취소

    // 기존 pause timeout 취소
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
    }

    // 일정 시간 후 재개
    this.pauseTimeout = setTimeout(() => {
      this.isPaused = false;
      this.resumePendingCallbacks();
    }, pauseDuration);
  }

  /**
   * idle 시간에 프리페칭 스케줄
   */
  scheduleIdlePrefetch(callback: () => void, priority: Priority = 'low'): void {
    // 일시 중단 상태면 대기열에 추가
    if (this.isPaused) {
      this.pendingCallbacks.push({ callback, priority });
      return;
    }

    this.executeIdlePrefetch(callback, priority);
  }

  /**
   * 실제 idle 프리페칭 실행
   */
  private executeIdlePrefetch(callback: () => void, priority: Priority): void {
    const timeout = priority === 'high' ? 1000 : 3000;

    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(
        () => {
          if (!this.isPaused) {
            callback();
          }
        },
        { timeout }
      );
      this.scheduledTasks.push({ id, type: 'idle' });
    } else {
      // Safari 등 미지원 브라우저용 fallback
      const delay = priority === 'high' ? 100 : 500;
      const id = setTimeout(() => {
        if (!this.isPaused) {
          callback();
        }
      }, delay) as unknown as number;
      this.scheduledTasks.push({ id, type: 'timeout' });
    }
  }

  /**
   * 대기 중인 콜백 재개
   */
  private resumePendingCallbacks(): void {
    const callbacks = [...this.pendingCallbacks];
    this.pendingCallbacks = [];

    // high priority 먼저 실행
    callbacks
      .sort((a, b) => (a.priority === 'high' ? -1 : 1))
      .forEach(({ callback, priority }) => {
        this.executeIdlePrefetch(callback, priority);
      });
  }

  /**
   * setTimeout 기반 스케줄 (호환성 유지용)
   */
  scheduleTimeout(callback: () => void, delay: number): void {
    if (this.isPaused) {
      // 일시 중단 시 delay + pauseDuration 후 실행
      this.pendingCallbacks.push({
        callback: () => {
          const id = setTimeout(callback, delay) as unknown as number;
          this.scheduledTasks.push({ id, type: 'timeout' });
        },
        priority: 'low',
      });
      return;
    }

    const id = setTimeout(() => {
      if (!this.isPaused) {
        callback();
      }
    }, delay) as unknown as number;
    this.scheduledTasks.push({ id, type: 'timeout' });
  }

  /**
   * 현재 일시 중단 상태인지
   */
  get paused(): boolean {
    return this.isPaused;
  }

  /**
   * 정리 (컴포넌트 언마운트 시)
   */
  cleanup(): void {
    this.cancelAll();
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
  }
}

// 싱글톤 인스턴스
let instance: PrefetchManager | null = null;

export function getPrefetchManager(): PrefetchManager {
  if (!instance) {
    instance = new PrefetchManager();
  }
  return instance;
}

// 테스트용 리셋
export function resetPrefetchManager(): void {
  if (instance) {
    instance.cleanup();
    instance = null;
  }
}
