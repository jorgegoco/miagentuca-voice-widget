// Smoke test: with `npm run demo` running, stubs the token endpoint and checks the
// widget renders and the mic button shows the connect error. Needs Playwright + Chromium.
const { chromium } = require("playwright")
;(async () => {
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] })
  const results = {}
  for (const mode of ["http-error", "fake-token"]) {
    const page = await browser.newPage()
    const logs = []
    page.on("console", (m) => logs.push(m.type() + ": " + m.text()))
    let tokenCalls = []
    await page.route("**/token/**", (route) => {
      tokenCalls.push(route.request().method() + " " + route.request().url())
      return mode === "http-error"
        ? route.fulfill({ status: 503, body: "stub" })
        : route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" },
            body: JSON.stringify({ connection_url: "wss://127.0.0.1:9/stub", token: "stub", session_name: "s", agent_mode: "x" }) })
    })
    await page.goto("http://localhost:5173/")
    await page.waitForSelector(".vw-mic-button")
    const before = await page.textContent(".vw-root")
    await page.click(".vw-mic-button")
    await page.waitForSelector(".vw-error", { timeout: 20000 })
    results[mode] = {
      tokenCalls,
      before: before.slice(0, 80),
      error: await page.textContent(".vw-error"),
      status: await page.textContent(".vw-status"),
      bg: await page.$eval(".vw-root", (e) => getComputedStyle(e).backgroundColor),
      logs: logs.filter((l) => !l.startsWith("debug")).slice(0, 6),
    }
    await page.close()
  }
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
