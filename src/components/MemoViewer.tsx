'use client'

import { useEffect, type ComponentProps } from 'react'
import dynamic from 'next/dynamic'
import { useSummarize } from '@/hooks/useSummarize'
import { Memo, MEMO_CATEGORIES } from '@/types/memo'

// 에디터와 동일한 렌더러로 마크다운 표시 (클라이언트에서만 로드)
const MarkdownPreview = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default.Markdown),
  { ssr: false }
)

interface MemoViewerProps {
  memo: Memo | null
  onClose: () => void
  onEdit: (memo: Memo) => void
  onDelete: (id: string) => void
  onSummarized?: (id: string, summary: string) => void
}

// 외부 링크는 새 탭으로 열어 메모 앱을 벗어나지 않도록 함
const openExternalLinksInNewTab: ComponentProps<
  typeof MarkdownPreview
>['rehypeRewrite'] = node => {
  if (node.type !== 'element' || node.tagName !== 'a') return
  const href = node.properties?.href
  if (typeof href === 'string' && /^https?:\/\//i.test(href)) {
    node.properties = {
      ...node.properties,
      target: '_blank',
      rel: ['noopener', 'noreferrer'],
    }
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  personal: 'bg-blue-100 text-blue-800',
  work: 'bg-green-100 text-green-800',
  study: 'bg-purple-100 text-purple-800',
  idea: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-800',
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function MemoViewer({
  memo,
  onClose,
  onEdit,
  onDelete,
  onSummarized,
}: MemoViewerProps) {
  const isOpen = memo !== null
  const memoId = memo?.id
  const { summary, loading, error, summarize, reset } = useSummarize({
    onSummarized,
  })

  // 모달이 닫히거나 다른 메모로 바뀌면 요약 진행 상태 초기화 (저장된 요약은 memo.summary로 표시)
  useEffect(() => {
    reset()
  }, [memoId, reset])

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!memo) return null

  const handleDelete = () => {
    if (window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      onDelete(memo.id)
      onClose()
    }
  }

  const handleSummarize = () => summarize(memo.id)
  const displayedSummary = summary ?? memo.summary

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      data-testid="memo-viewer-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="memo-viewer-title"
        className="flex flex-col w-full max-w-2xl max-h-[85vh] bg-white rounded-lg shadow-xl"
        onClick={e => e.stopPropagation()}
        data-testid="memo-viewer"
      >
        {/* 헤더 */}
        <div className="flex justify-between items-start gap-4 p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2
              id="memo-viewer-title"
              className="text-xl font-semibold text-gray-900 mb-2 break-words"
            >
              {memo.title}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[memo.category] ?? CATEGORY_COLORS.other}`}
              >
                {MEMO_CATEGORIES[
                  memo.category as keyof typeof MEMO_CATEGORIES
                ] || memo.category}
              </span>
              <span className="text-xs text-gray-500">
                수정: {formatDate(memo.updatedAt)}
              </span>
              <span className="text-xs text-gray-500">
                작성: {formatDate(memo.createdAt)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="close-viewer-btn"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6">
          {displayedSummary && (
            <div
              className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg"
              data-testid="summary-result"
            >
              <p className="mb-2 text-sm font-semibold text-blue-800">
                AI 요약
              </p>
              <div data-color-mode="light">
                <MarkdownPreview
                  source={displayedSummary}
                  className="!bg-transparent"
                />
              </div>
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="flex items-center justify-between gap-4 mb-6 p-4 bg-red-50 border border-red-100 rounded-lg"
              data-testid="summary-error"
            >
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={handleSummarize}
                className="shrink-0 px-3 py-1.5 text-sm font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                data-testid="summary-retry-btn"
              >
                다시 시도
              </button>
            </div>
          )}
          <div data-color-mode="light" data-testid="memo-viewer-content">
            <MarkdownPreview
              source={memo.content}
              rehypeRewrite={openExternalLinksInNewTab}
            />
          </div>
          {memo.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-6">
              {memo.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={handleSummarize}
            disabled={loading}
            className="mr-auto px-4 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="summarize-btn"
          >
            {loading ? '요약 중...' : memo.summary ? '다시 요약' : 'AI 요약'}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            data-testid="viewer-delete-btn"
          >
            삭제
          </button>
          <button
            onClick={() => onEdit(memo)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            data-testid="viewer-edit-btn"
          >
            편집
          </button>
        </div>
      </div>
    </div>
  )
}
