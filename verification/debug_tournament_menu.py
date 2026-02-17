from playwright.sync_api import sync_playwright

def test_debug():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use mobile viewport
        context = browser.new_context(viewport={"width": 390, "height": 844})
        page = context.new_page()

        try:
            page.goto("http://localhost:5173/")
            page.wait_for_timeout(3000)
            print(f"Page title: {page.title()}")
            page.screenshot(path="verification/debug_start.png")

            # Check if "Mer" button exists
            # Try to find by text if role fails
            mer_text = page.get_by_text("Mer")
            if mer_text.count() > 0:
                print(f"Found 'Mer' text {mer_text.count()} times")

            mer_button = page.get_by_role("button", name="Mer")
            if mer_button.is_visible():
                print("'Mer' button found via role")
                mer_button.click()
                page.wait_for_timeout(1000)
                page.screenshot(path="verification/debug_menu_open.png")

                # Check for Turnering
                tourn = page.get_by_text("Turnering")
                if tourn.is_visible():
                    print("'Turnering' found")
                else:
                    print("'Turnering' NOT found")
            else:
                print("'Mer' button NOT found via role")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/debug_error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    test_debug()
