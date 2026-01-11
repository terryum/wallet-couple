/**
 * AI 인사이트 텍스트 컴포넌트
 * - 로딩 시 스켈레톤 표시
 * - AI 아이콘 + 텍스트 표시
 * - 두 줄 초과 시 더보기/접기 토글
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface InsightTextProps {
  insight: string | null;
  isLoading: boolean;
  className?: string;
}

export function InsightText({ insight, isLoading, className }: InsightTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // 텍스트가 두 줄을 초과하는지 체크
  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight);
      const height = textRef.current.scrollHeight;
      // 두 줄 이상이면 토글 버튼 표시
      setNeedsToggle(height > lineHeight * 2.5);
    }
  }, [insight]);

  // 로딩 중: 스켈레톤 표시
  if (isLoading) {
    return (
      <div className={cn('space-y-1.5', className)}>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    );
  }

  // 인사이트가 없으면 렌더링하지 않음
  if (!insight) {
    return null;
  }

  // 인사이트 표시
  return (
    <div className={cn('flex gap-0.5', className)}>
      <Sparkles className="w-2.5 h-2.5 text-blue-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p
          ref={textRef}
          className={cn(
            'text-sm text-slate-600 leading-relaxed',
            !isExpanded && 'line-clamp-2'
          )}
        >
          {insight}
        </p>
        {needsToggle && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-500 hover:text-blue-600 mt-0.5"
          >
            {isExpanded ? '접기' : '더보기'}
          </button>
        )}
      </div>
    </div>
  );
}
