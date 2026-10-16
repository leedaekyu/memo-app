import { Memo } from '@/types/memo'

// DB(snake_case) 행 형태
export interface MemoRow {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  summary: string | null
  created_at: string
  updated_at: string
}

export const toMemo = (row: MemoRow): Memo => ({
  id: row.id,
  title: row.title,
  content: row.content,
  category: row.category,
  tags: row.tags ?? [],
  summary: row.summary,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
