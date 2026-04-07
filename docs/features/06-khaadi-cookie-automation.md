# Feature: Khaadi Cookie Automation

## 1. What It Does

Khaadi is the only brand in the Poshak catalog that uses Salesforce Commerce Cloud (SFCC) instead of Shopify. SFCC requires valid session cookies to return product data from its API endpoints. These cookies expire periodically, so the scraper needs fresh cookies before every run. `khaadi_setup.py` automates this — it opens a headless browser, visits Khaadi's website, lets the server set session cookies naturally, and saves them to a JSON file that the main scraper reads.

This replaced the original manual process where you had to open Khaadi in Chrome, copy cookies from DevTools, and paste them into the scraper code every few days.

---

## 2. How It Works Technically

### On the Local Machine (Playwright)

1. Launches Playwright with headless Chromium.
2. Navigates to `https://pk.khaadi.com`.
3. Waits for the page to load (`domcontentloaded` — not `networkidle`, which is too strict for Railway's memory).
4. Extracts all cookies from the browser context via `context.cookies()`.
5. Saves them to `khaadi_cookies.json`.
6. Closes the browser.

### On Railway (HTTP-based approach)

Railway's containerized environment complicates Playwright — Chromium needs specific flags and extra memory. The current Railway setup uses a simplified HTTP-based approach:

1. Makes a direct HTTP request to `pk.khaadi.com` with a standard browser User-Agent.
2. Captures the `Set-Cookie` headers from the response.
3. Stores the session cookies in `khaadi_cookies.json`.

This works because Khaadi's server sets session cookies on the initial page visit. The key discovery was that the actual problem with Khaadi scraping on Railway wasn't cookies at all — it was missing HTTP headers. The scraper needed `X-Requested-With: XMLHttpRequest` and a proper `Referer: pk.khaadi.com` header when hitting the SFCC `Search-UpdateGrid` endpoint. Without these headers, the endpoint returns valid HTML with 0 products.

### How the Scraper Uses the Cookies

`scraper.py` checks for `khaadi_cookies.json` at startup. If found, it reads the cookies and attaches them to every request to Khaadi's SFCC endpoints via a `requests.Session`. The log shows `→ Using fresh cookies from khaadi_cookies.json` on success.

### Container-Safe Browser Flags

When Playwright is used on Railway, these Chromium flags are required:
```
--no-sandbox
--disable-dev-shm-usage
--disable-gpu
--disable-software-rasterizer
```

And `wait_until="domcontentloaded"` instead of `networkidle` (which can hang indefinitely in constrained environments).

---

## 3. Files / Components Involved

| File | Role |
|---|---|
| `khaadi_setup.py` | Cookie refresh script. Runs before `scraper.py` in the pipeline. |
| `khaadi_cookies.json` | Output — saved cookies that `scraper.py` reads. |
| `scraper.py` | Reads cookies from JSON file for Khaadi scraping. |
| `run_pipeline.sh` | Calls `khaadi_setup.py` as Step 1 before running the scraper. |

---

## 4. APIs Used

| API | Purpose |
|---|---|
| `pk.khaadi.com` (HTTP GET) | Trigger session cookie generation |
| Playwright Chromium (local) | Headless browser for cookie extraction |

No paid APIs involved.

---

## 5. Edge Cases

- **Playwright browser crash on Railway:** The browser sometimes closes before cookies are collected, throwing `TargetClosedError: BrowserContext.cookies: Target page, context or browser has been closed`. Fixed by adding error handling that retries the browser launch.
- **Cookie expiration timing:** Khaadi's session cookies have an unknown TTL. If the pipeline takes 12+ hours and cookies expire mid-run, later Khaadi pagination requests could fail silently (returning 0 products per page). The cookies are only refreshed once at pipeline start.
- **Railway memory limits:** Playwright + Chromium requires ~200–300MB RAM. Railway's Hobby plan ($5/month) provides enough, but the free tier doesn't. This was a key reason for choosing the Hobby plan.
- **`khaadi_cookies.json` missing:** If `khaadi_setup.py` fails and the file doesn't exist, `scraper.py` logs `→ No cookies found` and skips Khaadi entirely. The rest of the pipeline continues normally for other brands.
- **Proxy was unnecessary:** A $5 residential proxy was initially purchased on the assumption that Railway's IP was blocked by Khaadi. After debugging, the actual issue was missing SFCC headers (`X-Requested-With`, `Referer`), not IP blocking. The proxy was an unnecessary expense.

---

## 6. How to Improve

- **Mid-run cookie refresh:** For pipelines exceeding 10 hours, add a cookie health check before each Khaadi pagination batch. If a request returns 0 products unexpectedly, trigger an inline cookie refresh and retry.
- **Cookie TTL monitoring:** Log the timestamp when cookies are created and track how long they remain valid. Establish the actual expiration pattern so the pipeline can proactively refresh before expiry.
- **Eliminate Playwright entirely for cookies:** Since the HTTP-based approach works on Railway, standardize on it everywhere. Removes the Playwright dependency for cookies (though Playwright is still needed for Sapphire/Cross Stitch scraping).
- **Cookie validation step:** After capturing cookies, make a test request to one known Khaadi cgid. If it returns >0 products, cookies are good. If not, retry cookie generation. Currently, bad cookies are only detected when the scraper runs and gets 0 products.
