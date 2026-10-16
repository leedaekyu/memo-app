'use server'

import {
  ActionResult,
  DEFAULT_CATEGORIES,
  Memo,
  MemoFormData,
  MemoCategory,
} from '@/types/memo'
import { summarizeWithGemini } from '@/utils/gemini'
import { MemoRow, toMemo } from '@/utils/memoMapper'
import { createSupabaseServerClient } from '@/utils/supabase/server'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const fail = (
  message: string,
  error?: unknown
): { ok: false; error: string } => {
  if (error) console.error(message, error)
  return { ok: false, error: message }
}

// 서버 액션 인자는 클라이언트에서 오므로 런타임에서 다시 검증한다
const validateFormData = (formData: MemoFormData): string | null => {
  if (!formData || typeof formData !== 'object') return '잘못된 요청입니다.'
  if (typeof formData.title !== 'string' || !formData.title.trim())
    return '제목을 입력해주세요.'
  if (typeof formData.content !== 'string' || !formData.content.trim())
    return '내용을 입력해주세요.'
  if (!DEFAULT_CATEGORIES.includes(formData.category as MemoCategory))
    return '올바르지 않은 카테고리입니다.'
  if (
    !Array.isArray(formData.tags) ||
    formData.tags.some(tag => typeof tag !== 'string')
  )
    return '올바르지 않은 태그입니다.'
  return null
}

export async function getMemos(): Promise<ActionResult<Memo[]>> {
  try {
    const { data, error } = await createSupabaseServerClient()
      .from('memos')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return fail('메모를 불러오지 못했습니다.', error)
    return { ok: true, data: (data as MemoRow[]).map(toMemo) }
  } catch (error) {
    return fail('메모를 불러오지 못했습니다.', error)
  }
}

export async function createMemo(
  formData: MemoFormData
): Promise<ActionResult<Memo>> {
  const invalid = validateFormData(formData)
  if (invalid) return fail(invalid)

  try {
    const { data, error } = await createSupabaseServerClient()
      .from('memos')
      .insert({
        title: formData.title,
        content: formData.content,
        category: formData.category,
        tags: formData.tags,
      })
      .select('*')
      .single()
    if (error) return fail('메모를 저장하지 못했습니다.', error)
    return { ok: true, data: toMemo(data as MemoRow) }
  } catch (error) {
    return fail('메모를 저장하지 못했습니다.', error)
  }
}

export async function updateMemo(
  id: string,
  formData: MemoFormData
): Promise<ActionResult<Memo>> {
  if (!UUID_REGEX.test(id)) return fail('잘못된 메모 ID입니다.')
  const invalid = validateFormData(formData)
  if (invalid) return fail(invalid)

  try {
    // 내용이 바뀌면 기존 요약은 더 이상 유효하지 않으므로 함께 초기화
    const { data, error } = await createSupabaseServerClient()
      .from('memos')
      .update({
        title: formData.title,
        content: formData.content,
        category: formData.category,
        tags: formData.tags,
        summary: null,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) return fail('메모를 수정하지 못했습니다.', error)
    if (!data) return fail('메모를 찾을 수 없습니다.')
    return { ok: true, data: toMemo(data as MemoRow) }
  } catch (error) {
    return fail('메모를 수정하지 못했습니다.', error)
  }
}

export async function deleteMemo(id: string): Promise<ActionResult<null>> {
  if (!UUID_REGEX.test(id)) return fail('잘못된 메모 ID입니다.')

  try {
    const { error } = await createSupabaseServerClient()
      .from('memos')
      .delete()
      .eq('id', id)
    if (error) return fail('메모를 삭제하지 못했습니다.', error)
    return { ok: true, data: null }
  } catch (error) {
    return fail('메모를 삭제하지 못했습니다.', error)
  }
}

// DB의 메모 내용을 기준으로 요약(클라이언트가 내용을 조작해도 영향 없음)하고 결과를 저장
export async function summarizeMemo(id: string): Promise<ActionResult<string>> {
  if (!UUID_REGEX.test(id)) return fail('잘못된 메모 ID입니다.')

  try {
    const supabase = createSupabaseServerClient()
    const { data: row, error: selectError } = await supabase
      .from('memos')
      .select('title, content')
      .eq('id', id)
      .maybeSingle()
    if (selectError) return fail('AI 요약 중 오류가 발생했습니다.', selectError)
    if (!row) return fail('메모를 찾을 수 없습니다.')

    const result = await summarizeWithGemini(row.title, row.content)
    if (!result.ok) return { ok: false, error: result.error }

    const { error: updateError } = await supabase
      .from('memos')
      .update({ summary: result.summary })
      .eq('id', id)
    if (updateError) console.error('요약 저장 실패:', updateError)

    return { ok: true, data: result.summary }
  } catch (error) {
    return fail('AI 요약 중 오류가 발생했습니다.', error)
  }
}
