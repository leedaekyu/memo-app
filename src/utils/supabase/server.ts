import 'server-only'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 인증이 없는 앱이므로 anon 키로 접근하며, 접근 범위는 memos 테이블의 RLS 정책(anon 허용)이 결정한다.
// 서버 액션에서만 사용하므로 키는 서버 전용 환경변수로 둔다.
export const createSupabaseServerClient = (): SupabaseClient => {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'SUPABASE_URL 또는 SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다.'
    )
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
