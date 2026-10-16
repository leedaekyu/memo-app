import { expect, test } from '@playwright/test'
import {
  createMemoViaUI,
  deleteMemoViaUI,
  memoCard,
  uniqueTitle,
} from './helpers'

// 서버 액션은 응답 포맷(RSC)에 의존해 모킹이 불안정하므로,
// 성공 경로는 실제 DB·Gemini를 사용하고 오류 경로는 요청 중단으로 검증한다.
const GEMINI_TIMEOUT_MS = 60_000

test.describe('메모 AI 요약', () => {
  test.setTimeout(120_000)

  let title: string

  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept())
    title = uniqueTitle('summary')

    await page.goto('/')
    await createMemoViaUI(page, {
      title,
      content: '요약할 메모의 본문입니다.\n\n- 항목 1\n- 항목 2\n- 항목 3',
    })
    await memoCard(page, title).click()
    await expect(page.getByTestId('memo-viewer')).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    // 뷰어가 열려 있으면 먼저 닫고 생성한 메모 정리
    const closeButton = page.getByTestId('close-viewer-btn')
    if (await closeButton.isVisible()) await closeButton.click()
    await deleteMemoViaUI(page, title)
  })

  test('요약 버튼을 누르면 로딩 후 요약이 표시되고 DB에 저장된다', async ({
    page,
  }) => {
    const button = page.getByTestId('summarize-btn')
    await expect(button).toHaveText('AI 요약')
    await button.click()
    await expect(button).toHaveText('요약 중...')
    await expect(button).toBeDisabled()

    const result = page.getByTestId('summary-result')
    await expect(result).toBeVisible({ timeout: GEMINI_TIMEOUT_MS })
    await expect(result.locator('li').first()).toBeVisible()
    await expect(button).toHaveText('다시 요약')

    // 닫았다 다시 열거나 새로고침해도 저장된 요약이 유지된다
    await page.getByTestId('close-viewer-btn').click()
    await memoCard(page, title).click()
    await expect(page.getByTestId('summary-result')).toBeVisible()

    await page.reload()
    await memoCard(page, title).click()
    await expect(page.getByTestId('summary-result')).toBeVisible()
  })

  test('요약에 실패하면 오류와 다시 시도 버튼이 표시되고 재시도할 수 있다', async ({
    page,
  }) => {
    // 뷰어가 열린 이후의 서버 액션 요청은 요약뿐이므로 첫 요청만 중단
    let calls = 0
    await page.route('**/', async route => {
      if (route.request().method() === 'POST' && ++calls === 1) {
        await route.abort()
        return
      }
      await route.continue()
    })

    await page.getByTestId('summarize-btn').click()
    await expect(page.getByTestId('summary-error')).toContainText(
      '네트워크 오류가 발생했습니다'
    )

    await page.getByTestId('summary-retry-btn').click()
    await expect(page.getByTestId('summary-result')).toBeVisible({
      timeout: GEMINI_TIMEOUT_MS,
    })
    await expect(page.getByTestId('summary-error')).toHaveCount(0)
  })

  test('내용을 수정하면 저장된 요약이 초기화된다', async ({ page }) => {
    await page.getByTestId('summarize-btn').click()
    await expect(page.getByTestId('summary-result')).toBeVisible({
      timeout: GEMINI_TIMEOUT_MS,
    })

    await page.getByTestId('viewer-edit-btn').click()
    await page
      .getByTestId('memo-content-editor')
      .locator('textarea')
      .fill('완전히 다른 내용으로 수정했습니다.')
    await page.locator('button[type=submit]').click()

    await memoCard(page, title).click()
    await expect(page.getByTestId('memo-viewer')).toBeVisible()
    await expect(page.getByTestId('summary-result')).toHaveCount(0)
    await expect(page.getByTestId('summarize-btn')).toHaveText('AI 요약')
  })
})
