from playwright.sync_api import Page, expect, sync_playwright

def test_ux(page: Page):
  # 1. Arrange: Go to UX Test Page
  # Using waitUntil networkidle to ensure react hydrates
  page.goto("http://localhost:5173/uxtest", wait_until="networkidle")

  # 2. Assert: Verify Interactive Alert
  interactive_alert = page.locator("[data-testid=interactive-alert]")
  expect(interactive_alert).to_be_visible()
  expect(interactive_alert).to_have_attribute("role", "button")
  expect(interactive_alert).to_have_attribute("tabindex", "0")

  # 3. Assert: Verify Static Alert
  static_alert = page.locator("[data-testid=static-alert]")
  expect(static_alert).to_be_visible()
  expect(static_alert).not_to_have_attribute("role", "button")

  # 4. Screenshot
  page.screenshot(path="verification.png")
  print("Verification successful!")

if __name__ == "__main__":
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
      test_ux(page)
    except Exception as e:
      print(f"Test failed: {e}")
      page.screenshot(path="failure.png")
    finally:
      browser.close()
