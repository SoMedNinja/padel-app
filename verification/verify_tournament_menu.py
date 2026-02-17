from playwright.sync_api import sync_playwright, expect

def test_tournament_menu():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use mobile viewport to ensure BottomNav is visible
        context = browser.new_context(viewport={"width": 390, "height": 844})
        page = context.new_page()

        try:
            # 1. Navigate to the app
            page.goto("http://localhost:5173/")

            # Wait for app to load and settle
            page.wait_for_timeout(3000)

            # 2. Click "Mer" (More) in BottomNav
            # BottomNav has a button with label "Mer"
            # It might take a moment for BottomNav to appear if there's loading

            # Check if we are logged in (should be due to mock)
            # If not logged in, we might be redirected or see login screen?
            # But MainLayout renders BottomNav if authorized?

            mer_button = page.get_by_role("button", name="Mer")
            expect(mer_button).to_be_visible(timeout=10000)
            mer_button.click()

            # 3. Verify "Turnering" is visible in the SideMenu (Drawer)
            tournament_option = page.get_by_role("button", name="Turnering")
            expect(tournament_option).to_be_visible()

            # Verify icon is present (implicitly checked by role button containing it, but visual verify is better)

            # 4. Take screenshot
            page.screenshot(path="verification/tournament_menu_verified.png")
            print("Verification successful! Screenshot saved.")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/tournament_menu_failed.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    test_tournament_menu()
