from playwright.sync_api import sync_playwright
import os, time, socket, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND_ROOT = os.path.join(ROOT, 'backend')
PORT = 3000


def wait_for_port(host: str, port: int, timeout_s: float = 10.0) -> bool:
    end = time.time() + timeout_s
    while time.time() < end:
        try:
            with socket.create_connection((host, port), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.2)
    return False


def run_test():
    # Start the Express backend, which also serves the frontend + /data
    proc = subprocess.Popen(
        ['node', 'server.js'],
        cwd=BACKEND_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

    if not wait_for_port('127.0.0.1', PORT, timeout_s=15.0):
        try:
            out = (proc.stdout.read() if proc.stdout else '')
        except Exception:
            out = ''
        proc.terminate()
        raise RuntimeError(f'Backend did not start on port {PORT}. Output:\n{out}')

    results = { 'errors': [], 'steps': [] }

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(f'http://127.0.0.1:{PORT}/labpage.html', timeout=20000)
            page.wait_for_selector('.chemical-item', timeout=10000)
            results['steps'].append('page_loaded')

            # Add CuSO4 and NaOH by dragging onto flask
            try:
                page.wait_for_selector('[data-chemical="CuSO4"]', timeout=5000)
                page.wait_for_selector('[data-chemical="NaOH"]', timeout=5000)
                page.drag_and_drop('[data-chemical="CuSO4"]', '#mainFlask')
                time.sleep(0.3)
                page.drag_and_drop('[data-chemical="NaOH"]', '#mainFlask')
                time.sleep(0.5)
                results['steps'].append('added_CuSO4_NaOH')
            except Exception as e:
                results['errors'].append(f'add_chemicals_failed: {e}')
                browser.close()
                return results

            # Try start reaction without placing stirrer
            try:
                page.click('#startReaction')
                # wait for a warning about stirring
                try:
                    page.wait_for_selector('.observation:has-text("REQUIRES STIRRING")', timeout=4000)
                    results['steps'].append('blocked_for_stirrer')
                except Exception:
                    results['errors'].append('no_stirrer_warning')
            except Exception as e:
                results['errors'].append(f'start_click_failed: {e}')

            # Place stirrer by dragging apparatus into bench
            try:
                page.wait_for_selector('[data-equipment="stirrer"]', timeout=5000)
                page.drag_and_drop('[data-equipment="stirrer"]', '.lab-bench')
                time.sleep(0.5)
                results['steps'].append('placed_stirrer')
            except Exception as e:
                results['errors'].append(f'place_stirrer_failed: {e}')

            # Start reaction again
            try:
                page.click('#startReaction')
                # wait for reaction complete or observation indicating precipitate
                try:
                    page.wait_for_selector('.observation:has-text("Blue precipitate")', timeout=8000)
                    results['steps'].append('precipitate_observed')
                except Exception:
                    # fallback: check flask rect fills
                    fills = page.eval_on_selector_all('#flaskLiquid rect', 'els => els.map(e => e.getAttribute("fill"))')
                    results['fills'] = fills
                    if any(f and f.lower().startswith('#0099') for f in fills if f):
                        results['steps'].append('color_changed')
                    else:
                        results['errors'].append('reaction_no_visual_change')
            except Exception as e:
                results['errors'].append(f'start_after_stir_failed: {e}')

            browser.close()
            return results
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()

if __name__ == '__main__':
    print('Running UI playwright test...')
    r = run_test()
    print('RESULT:', r)
