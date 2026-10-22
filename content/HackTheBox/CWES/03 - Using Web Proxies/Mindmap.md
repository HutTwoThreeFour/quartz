# Using Web Proxies

## 🎯 Main Idea
- Web proxies (Burp Suite & OWASP ZAP) sit between browser/app and server as a MITM to capture, inspect, and manipulate HTTP(S) traffic.
- Core skill for web pentesting: intercept, modify, repeat, fuzz, encode/decode, and scan web requests.
- Module teaches the tooling and features, not specific attacks — which proxy feature supports which class of attack.

## 💥 Attack / Exploit Vectors
### Intercepting Requests
- Pause a request in-flight to modify parameters the front-end JS would otherwise block (e.g. inject non-numeric input).
- Enables testing: SQLi, command injection, upload bypass, auth bypass, XSS, XXE, error handling, deserialization.
- Example: change `ip=1` to `ip=;ls;` to trigger command injection on a ping form.
- **Commands**
  - `CTRL+B` — ZAP: toggle intercept on/off
  - ZAP HUD `step` / `continue` / `drop` — control request flow in-browser

### Intercepting Responses
- Intercept and edit the server's response before the browser renders it (e.g. unhide fields, change input types/limits).

### Automatic Modification (Match & Replace)
- Burp `Match and Replace` / ZAP `Replacer` rules auto-rewrite every request/response (headers or body).
- Uses: spoof `User-Agent` to bypass filters, auto-change input `type="number"` → `type="text"`, auto-inject payloads.
- Example: match `^User-Agent.*$` → replace `User-Agent: HackTheBox Agent 1.0` (regex enabled).

### Repeating Requests
- Burp `Repeater` / ZAP `Request Editor` to manually resend and tweak a single request repeatedly without the browser.
- **Commands**
  - `CTRL+R` — Burp: send to Repeater
  - `CTRL+SHIFT+R` — Burp: go to Repeater
  - `CTRL+R` — ZAP: go to Replacer

### Encoding / Decoding
- Encode payloads so the server parses them correctly; decode captured data (e.g. base64 cookies) to tamper.
- Key chars to URL-encode: space, `&`, `#`. Encoders: URL, HTML, Unicode, Base64, ASCII hex.
- Example: decode cookie `eyJ1c2VybmFtZSI6Imd1ZXN0Ii...` → `{"username":"guest","is_admin":false}`, flip to admin/true, re-encode.
- **Commands**
  - `CTRL+U` — Burp: URL encode
  - `CTRL+SHIFT+U` — Burp: URL decode
  - `CTRL+E` — ZAP: go to Encode/Decode/Hash

### Fuzzing — Burp Intruder
- Built-in fuzzer/brute-forcer for directories, subdomains, parameters, values, passwords, password spraying (AD/OWA/VPN/RDS).
- Workflow: set payload position (`§`), choose attack type (Sniper/Cluster Bomb), load wordlist, payload processing/encoding, Grep-Match results.
- Free Community version throttled to ~1 req/sec; Pro is unthrottled.
- **Commands**
  - `CTRL+I` — Burp: send to Intruder
  - `CTRL+SHIFT+I` — Burp: go to Intruder
  - `/opt/useful/seclists/Discovery/Web-Content/common.txt` — example directory wordlist
  - `^\..*$` — payload-processing regex to skip lines starting with `.`

### Fuzzing — ZAP Fuzzer
- ZAP's free fuzzer alternative to Intruder; no paid tier / throttling.
- Extendable with FuzzDB wordlists (e.g. `fuzzdb>attack>os-cmd-execution`) for command-injection fuzzing / WAF bypass.

### Web Vulnerability Scanning — Burp Scanner (Pro)
- Crawler builds site map; Passive Scan analyzes visited pages (no new requests); Active Scan crawls+fuzzes insertion points for XSS, SQLi, command injection, etc.
- Define `Target Scope` (include/exclude) to focus and avoid dangerous endpoints (e.g. logout).
- Prioritize `High` severity + `Certain`/`Firm` confidence; export report as appendix data (never as the final deliverable).

### Web Vulnerability Scanning — ZAP Scanner
- ZAP's free passive + active scanning and Spider crawler as an open-source alternative to Burp Scanner.

### Extensions
- Extend functionality via Burp `BApp Store` and ZAP `Marketplace`.
- Notable Burp extensions: Active Scan++, Retire.JS, Autorize, CSRF Scanner, Java Deserialization Scanner, JS Link Finder.
- Some require dependencies (e.g. Jython) or Pro.

## 🛠️ Key Tools & Concepts
- Burp Suite — most common web proxy; Community (free) vs Pro (active scanner, fast Intruder, extensions).
- OWASP ZAP — free & open-source proxy; HUD (in-browser control), Replacer, Fuzzer, Marketplace.
- Proxy setup — configure browser/CA cert to route HTTP/HTTPS traffic through the proxy.
- Proxying other tools — route CLI tools (e.g. via proxychains) through the proxy to capture their traffic.
- Uses beyond replay: vuln scanning, fuzzing, crawling, app mapping, request analysis, config testing, code review.
- `CTRL+SHIFT+R` — Firefox: force refresh page.

## 🛡️ Mitigations
- Never rely on front-end (client-side JS) validation alone — always validate/sanitize on the back end, since proxies bypass it.
- Set secure cookie flags (`HttpOnly`, `Secure`, `SameSite`) and avoid trusting client-controllable values.
