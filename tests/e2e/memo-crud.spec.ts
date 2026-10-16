import { expect, test } from '@playwright/test'
import {
  createMemoViaUI,
  deleteMemoViaUI,
  memoCard,
  uniqueTitle,
} from './helpers'

test.describe('메모 CRUD (Supabase)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept())
    await page.goto('/')
  })

  test('시드 데이터가 DB에서 로드된다', async ({ page }) => {
    await expect(page.getByTestId('memo-card').first()).toBeVisible()
    await expect(page.getByTestId('memo-error')).toHaveCount(0)
    await expect(page.getByText('프로젝트 회의 준비')).toBeVisible()
  })

  test('메모를 생성·검색·수정·삭제하면 새로고침 후에도 DB 상태가 반영된다', async ({
    page,
  }) => {
    const title = uniqueTitle('crud')
    // 원래 제목을 부분 문자열로 포함하면 hasText 필터가 둘 다 매칭하므로 별도 제목 사용
    const updatedTitle = uniqueTitle('crud-edited')

    // 생성 + 영속성
    await createMemoViaUI(page, {
      title,
      content: 'CRUD 검증 본문',
      tag: 'e2e',
    })
    await page.reload()
    await expect(memoCard(page, title)).toBeVisible()

    // 검색
    await page.getByPlaceholder('메모 검색...').fill(title)
    await expect(page.getByTestId('memo-card')).toHaveCount(1)
    await page.getByPlaceholder('메모 검색...').fill('')

    // 수정
    await memoCard(page, title).click()
    await page.getByTestId('viewer-edit-btn').click()
    await page.locator('#title').fill(updatedTitle)
    await page.locator('button[type=submit]').click()
    await expect(memoCard(page, updatedTitle)).toBeVisible()
    await page.reload()
    await expect(memoCard(page, updatedTitle)).toBeVisible()
    await expect(memoCard(page, title)).toHaveCount(0)

    // 삭제
    await deleteMemoViaUI(page, updatedTitle)
    await page.reload()
    await expect(page.getByTestId('memo-card').first()).toBeVisible()
    await expect(memoCard(page, updatedTitle)).toHaveCount(0)
  })

  test('제목이 비어 있으면 저장되지 않고 폼이 유지된다', async ({ page }) => {
    await page.getByRole('button', { name: '새 메모' }).click()
    await page.locator('button[type=submit]').click()
    await expect(page.locator('#title')).toBeVisible()
  })
})
