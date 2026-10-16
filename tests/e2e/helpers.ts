import { expect, type Page } from '@playwright/test'

// 테스트마다 고유한 제목을 써서 병렬 실행(브라우저 3종)과 기존 시드 데이터에 영향받지 않도록 함
export const uniqueTitle = (label: string) =>
  `E2E-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export const memoCard = (page: Page, title: string) =>
  page.getByTestId('memo-card').filter({ hasText: title })

export async function createMemoViaUI(
  page: Page,
  { title, content, tag }: { title: string; content: string; tag?: string }
) {
  await page.getByRole('button', { name: '새 메모' }).click()
  await page.locator('#title').fill(title)
  await page.locator('#category').selectOption('work')
  await page
    .getByTestId('memo-content-editor')
    .locator('textarea')
    .fill(content)
  if (tag) {
    await page.getByPlaceholder('태그를 입력하고 Enter를 누르세요').fill(tag)
    await page.keyboard.press('Enter')
  }
  await page.locator('button[type=submit]').click()
  await expect(memoCard(page, title)).toBeVisible()
}

// 카드의 삭제 버튼은 window.confirm을 사용 (dialog는 호출 측에서 수락 처리)
export async function deleteMemoViaUI(page: Page, title: string) {
  const card = memoCard(page, title)
  if ((await card.count()) === 0) return
  await card.getByRole('button', { name: /삭제/ }).click()
  await expect(card).toHaveCount(0)
}
