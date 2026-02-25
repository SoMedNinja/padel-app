from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    # Mobile viewport to ensure BottomNav is visible
    context = browser.new_context(viewport={'width': 375, 'height': 812})
    page = context.new_page()

    try:
        print("Navigating to home...")
        page.goto("http://localhost:5173")
        # Wait for loading text to disappear or login form to appear
        try:
             page.wait_for_selector("text=Fortsätt som gäst", timeout=10000)
        except:
             print("Timeout waiting for 'Fortsätt som gäst'.")

        page.screenshot(path="/home/jules/verification/step1_ready.png")

        # Handle "Fortsätt som gäst"
        print("Looking for guest button...")
        try:
            guest_btn = page.get_by_text("Fortsätt som gäst")
            if guest_btn.is_visible():
                print("Found Guest button, clicking...")
                guest_btn.click()
                page.wait_for_load_state("networkidle")
                # Wait for navigation to complete (e.g. check URL or element on dashboard)
                page.wait_for_timeout(3000)
            else:
                print("Guest button not found.")
        except Exception as e:
            print(f"Guest handling info: {e}")

        page.screenshot(path="/home/jules/verification/step2_dashboard.png")

        # Navigate to Single Game
        print("Navigating to /single-game...")
        page.goto("http://localhost:5173/single-game")
        # Wait for MatchForm header or element
        try:
             page.wait_for_selector("text=Spelform", timeout=5000)
        except:
             print("Timeout waiting for 'Spelform' text on Single Game page.")

        page.wait_for_timeout(2000)

        page.screenshot(path="/home/jules/verification/step3_single_game.png")

        # Check for Avatars (any .MuiAvatar-root)
        avatars = page.locator(".MuiAvatar-root")
        count = avatars.count()
        print(f"Found {count} avatars on MatchForm.")

        # Verify BottomNav "Mer" button
        print("Checking BottomNav 'Mer' button attributes...")
        # Try finding by role button and name Mer
        more_btn = page.locator("button.MuiBottomNavigationAction-root").filter(has_text="Mer")
        if more_btn.count() > 0:
            aria_expanded = more_btn.first.get_attribute("aria-expanded")
            aria_haspopup = more_btn.first.get_attribute("aria-haspopup")
            print(f"aria-expanded: {aria_expanded}")
            print(f"aria-haspopup: {aria_haspopup}")
        else:
             print("Mer button not found.")

        # Navigate to /history
        print("Navigating to /history...")
        page.goto("http://localhost:5173/history")
        page.wait_for_timeout(2000)

        page.screenshot(path="/home/jules/verification/step4_history.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="/home/jules/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
