'use client'

import { useCallback, useState } from 'react'
import { useMemos } from '@/hooks/useMemos'
import { Memo, MemoFormData } from '@/types/memo'
import MemoList from '@/components/MemoList'
import MemoForm from '@/components/MemoForm'
import MemoViewer from '@/components/MemoViewer'

export default function Home() {
  const {
    memos,
    allMemos,
    loading,
    error,
    searchQuery,
    selectedCategory,
    stats,
    createMemo,
    updateMemo,
    deleteMemo,
    applySummary,
    searchMemos,
    filterByCategory,
  } = useMemos()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null)
  // 요약 저장 등 목록 변경이 뷰어에 반영되도록 ID만 보관하고 메모는 목록에서 찾음
  const [viewingMemoId, setViewingMemoId] = useState<string | null>(null)
  const viewingMemo = allMemos.find(memo => memo.id === viewingMemoId) ?? null

  // 저장에 성공했을 때만 폼을 닫아 입력 내용을 잃지 않도록 함
  const handleCreateMemo = async (formData: MemoFormData) => {
    const created = await createMemo(formData)
    if (created) {
      setIsFormOpen(false)
    } else {
      alert('메모를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  const handleUpdateMemo = async (formData: MemoFormData) => {
    if (!editingMemo) return
    const updated = await updateMemo(editingMemo.id, formData)
    if (updated) {
      setEditingMemo(null)
    } else {
      alert('메모를 수정하지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  const handleDeleteMemo = async (id: string) => {
    const deleted = await deleteMemo(id)
    if (!deleted)
      alert('메모를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.')
  }

  const handleEditMemo = (memo: Memo) => {
    setEditingMemo(memo)
    setIsFormOpen(true)
  }

  const handleViewMemo = (memo: Memo) => {
    setViewingMemoId(memo.id)
  }

  const handleCloseViewer = useCallback(() => {
    setViewingMemoId(null)
  }, [])

  const handleEditFromViewer = (memo: Memo) => {
    setViewingMemoId(null)
    handleEditMemo(memo)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingMemo(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">📝 슈퍼 메모 앱</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                새 메모
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div
            role="alert"
            className="mb-6 p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg"
            data-testid="memo-error"
          >
            {error}
          </div>
        )}
        <MemoList
          memos={memos}
          loading={loading}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onSearchChange={searchMemos}
          onCategoryChange={filterByCategory}
          onEditMemo={handleEditMemo}
          onDeleteMemo={handleDeleteMemo}
          onViewMemo={handleViewMemo}
          stats={stats}
        />
      </main>

      {/* 상세 보기 모달 */}
      <MemoViewer
        memo={viewingMemo}
        onClose={handleCloseViewer}
        onEdit={handleEditFromViewer}
        onDelete={handleDeleteMemo}
        onSummarized={applySummary}
      />

      {/* 모달 폼 */}
      <MemoForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={editingMemo ? handleUpdateMemo : handleCreateMemo}
        editingMemo={editingMemo}
      />
    </div>
  )
}
