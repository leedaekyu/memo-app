'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Memo, MemoFormData } from '@/types/memo'
import {
  createMemo as createMemoAction,
  deleteMemo as deleteMemoAction,
  getMemos as getMemosAction,
  updateMemo as updateMemoAction,
} from '@/app/actions/memos'

export const useMemos = () => {
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 메모 로드
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const result = await getMemosAction()
        if (cancelled) return
        if (result.ok) {
          setMemos(result.data)
          setError(null)
        } else {
          setError(result.error)
        }
      } catch (e) {
        console.error('Failed to load memos:', e)
        if (!cancelled) setError('메모를 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // 메모 생성 (실패 시 null 반환, error 상태에 사유 기록)
  const createMemo = useCallback(
    async (formData: MemoFormData): Promise<Memo | null> => {
      const result = await createMemoAction(formData)
      if (!result.ok) {
        setError(result.error)
        return null
      }
      setError(null)
      setMemos(prev => [result.data, ...prev])
      return result.data
    },
    []
  )

  // 메모 업데이트
  const updateMemo = useCallback(
    async (id: string, formData: MemoFormData): Promise<boolean> => {
      const result = await updateMemoAction(id, formData)
      if (!result.ok) {
        setError(result.error)
        return false
      }
      setError(null)
      setMemos(prev => prev.map(memo => (memo.id === id ? result.data : memo)))
      return true
    },
    []
  )

  // 메모 삭제
  const deleteMemo = useCallback(async (id: string): Promise<boolean> => {
    const result = await deleteMemoAction(id)
    if (!result.ok) {
      setError(result.error)
      return false
    }
    setError(null)
    setMemos(prev => prev.filter(memo => memo.id !== id))
    return true
  }, [])

  // 요약이 저장된 뒤 목록의 해당 메모에 반영
  const applySummary = useCallback((id: string, summary: string): void => {
    setMemos(prev =>
      prev.map(memo => (memo.id === id ? { ...memo, summary } : memo))
    )
  }, [])

  // 메모 검색
  const searchMemos = useCallback((query: string): void => {
    setSearchQuery(query)
  }, [])

  // 카테고리 필터링
  const filterByCategory = useCallback((category: string): void => {
    setSelectedCategory(category)
  }, [])

  // 특정 메모 가져오기
  const getMemoById = useCallback(
    (id: string): Memo | undefined => {
      return memos.find(memo => memo.id === id)
    },
    [memos]
  )

  // 필터링된 메모 목록
  const filteredMemos = useMemo(() => {
    let filtered = memos

    // 카테고리 필터링
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(memo => memo.category === selectedCategory)
    }

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        memo =>
          memo.title.toLowerCase().includes(query) ||
          memo.content.toLowerCase().includes(query) ||
          memo.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [memos, selectedCategory, searchQuery])

  // 통계 정보
  const stats = useMemo(() => {
    const totalMemos = memos.length
    const categoryCounts = memos.reduce(
      (acc, memo) => {
        acc[memo.category] = (acc[memo.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      total: totalMemos,
      byCategory: categoryCounts,
      filtered: filteredMemos.length,
    }
  }, [memos, filteredMemos])

  return {
    // 상태
    memos: filteredMemos,
    allMemos: memos,
    loading,
    error,
    searchQuery,
    selectedCategory,
    stats,

    // 메모 CRUD
    createMemo,
    updateMemo,
    deleteMemo,
    getMemoById,
    applySummary,

    // 필터링 & 검색
    searchMemos,
    filterByCategory,
  }
}
