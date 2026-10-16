'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { summarizeMemo } from '@/app/actions/memos'

interface UseSummarizeOptions {
  // 요약이 DB에 저장된 직후 호출 (목록 상태 동기화용)
  onSummarized?: (id: string, summary: string) => void
}

export function useSummarize({ onSummarized }: UseSummarizeOptions = {}) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 서버 액션은 취소할 수 없으므로 요청 번호로 오래된 응답을 무시
  const requestIdRef = useRef(0)

  const reset = useCallback(() => {
    requestIdRef.current += 1
    setSummary(null)
    setError(null)
    setLoading(false)
  }, [])

  const summarize = useCallback(
    async (id: string) => {
      const requestId = ++requestIdRef.current

      setLoading(true)
      setError(null)
      setSummary(null)

      try {
        const result = await summarizeMemo(id)
        if (requestId !== requestIdRef.current) return

        if (!result.ok) {
          setError(result.error)
          return
        }
        setSummary(result.data)
        onSummarized?.(id, result.data)
      } catch {
        if (requestId !== requestIdRef.current) return
        setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.')
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    },
    [onSummarized]
  )

  // 언마운트 시 진행 중인 요청의 응답 무시
  useEffect(
    () => () => {
      requestIdRef.current += 1
    },
    []
  )

  return { summary, loading, error, summarize, reset }
}
