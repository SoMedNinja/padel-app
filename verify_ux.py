from playwright.sync_api import Page, expect, sync_playwright

def verify_ux(page: Page):
  page.goto("http://localhost:5173/")

  # Click "Fortsätt som gäst" if present
  try:
    guest_btn = page.get_by_role("button", name="Fortsätt som gäst")
    if guest_btn.is_visible():
        print("Clicking Guest button...")
        guest_btn.click()
        page.wait_for_timeout(3000) # Wait for navigation
  except Exception as e:
    print(f"Guest button logic failed: {e}")

  # 1. Verify Avatar Colors (Home page / Profile)
  # Guest profile might have a placeholder avatar.
  # Let's take a screenshot of the dashboard or profile page.
  page.screenshot(path="/home/jules/verification/ux_verification.png")

  # 2. Verify History Empty State
  page.goto("http://localhost:5173/history")
  page.wait_for_timeout(2000)

  # We might need to filter to show empty state.
  # If there are no matches (likely for a new guest session), we should see the empty state.

  page.screenshot(path="/home/jules/verification/history_verification.png")

if __name__ == "__main__":
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
      verify_ux(page)
    finally:
      browser.close()
