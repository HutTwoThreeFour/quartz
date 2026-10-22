# Broken Authentication

## 🎯 Main Idea
- Authentication proves identity via three categories: Knowledge (passwords/PINs), Ownership (ID cards/TOTP), Inherence (biometrics).
- Flaws arise both in the authentication logic itself and in how session tokens are generated/handled.
- Module covers enumeration, brute forcing (passwords, reset tokens, 2FA), protection bypasses, password-reset logic bugs, direct/parameter auth bypasses, and session attacks.

## 💥 Attack / Exploit Vectors

### User Enumeration
- App responds differently to valid vs invalid usernames (login/register/reset), leaking valid accounts.
- Side-channel: response timing differences can reveal valid users even with identical responses.
- **Commands**
  - `ffuf -w /opt/useful/seclists/Usernames/xato-net-10-million-usernames.txt -u http://172.17.0.2/index.php -X POST -H "Content-Type: application/x-www-form-urlencoded" -d "username=FUZZ&password=invalid" -fr "Unknown user"` — enumerate valid users by filtering the invalid-user message

### Brute-Forcing Passwords
- Once a valid username is known, spray/brute-force its password with ffuf/Hydra.

### Brute-Forcing Password Reset Tokens
- Weak (short/numeric) reset tokens can be predicted or brute-forced to take over accounts.
- **Commands**
  - `seq -w 0 9999 > tokens.txt` — generate zero-padded 4-digit token wordlist
  - `ffuf -w ./tokens.txt -u http://weak_reset.htb/reset_password.php?token=FUZZ -fr "The provided token is invalid"` — brute-force active reset tokens

### Brute-Forcing 2FA / OTP Codes
- Short numeric TOTP codes (e.g. 4-digit) with no submission limit are brute-forceable against the authenticated session.
- **Commands**
  - `ffuf -w ./tokens.txt -u http://bf_2fa.htb/2fa.php -X POST -H "Content-Type: application/x-www-form-urlencoded" -b "PHPSESSID=fpfcm5b8dh1ibfa7idg0he7l93" -d "otp=FUZZ" -fr "Invalid 2FA Code"` — brute-force 4-digit OTP

### Bypassing Brute-Force Protection
- Rate limits keyed on IP can be defeated by spoofing the source-IP header.
- Flawed CAPTCHAs may leak the solution in the HTML/response.
- **Commands**
  - `X-Forwarded-For: <random IP>` — randomize per request to bypass IP-based rate limits (e.g. CVE-2020-35590)

### Default Credentials
- Try vendor defaults from CIRT.net, SecLists Default-Credentials, SCADA lists before brute forcing.

### Vulnerable Password Reset (logic bugs)
- `Guessable security questions` — answers obtainable via OSINT or brute-forced from a wordlist.
- `Username injection` — a hidden `username` parameter in the reset flow can be swapped to reset another account's password.
- **Commands**
  - `cat world-cities.csv | cut -d ',' -f1 > city_wordlist.txt` — build a city wordlist for "birth city" questions
  - `ffuf -w ./city_wordlist.txt -u http://pwreset.htb/security_question.php -X POST -H "Content-Type: application/x-www-form-urlencoded" -b "PHPSESSID=..." -d "security_response=FUZZ" -fr "Incorrect response."` — brute-force the security answer
  - `password=P@$$w0rd&username=admin` — tamper the reset request's username to hijack another account

### Authentication Bypass via Direct Access
- Requesting a protected page directly works if auth is only enforced by the login redirect.
- A `header("Location:")` redirect without `exit;` still returns the protected body — change the `302` response to `200` in Burp to render it.

### Authentication Bypass via Parameter Modification
- Auth/authorization that depends on an HTTP parameter (e.g. `user_id`) can be bypassed/escalated by guessing or brute-forcing the privileged value.
- **Commands**
  - `GET /admin.php?user_id=183` — access/escalate by supplying another (admin) user's id

### Attacking Session Tokens
- Tokens with insufficient entropy (too short, mostly-static, or incrementing) can be brute-forced/enumerated to hijack sessions.
- Predictable tokens that encode data (base64/hex/URL) can be decoded, tampered (e.g. role=admin), and re-encoded to forge sessions.
- **Commands**
  - `echo -n dXNlcj1odGItc3RkbnQ7cm9sZT11c2Vy | base64 -d` — decode a base64 session token
  - `echo -n 'user=htb-stdnt;role=admin' | base64` — forge an admin base64 cookie
  - `echo -n 'user=htb-stdnt;role=admin' | xxd -p` — forge a hex-encoded session token

### Session Fixation
- App fails to issue a new token after login; attacker plants a known token (e.g. via `?sid=`) then hijacks the victim's authenticated session.

### Improper Session Timeout
- Sessions that never expire let a hijacked token be used indefinitely; timeout must suit the app's sensitivity.

## 🛠️ Key Tools & Concepts
- **ffuf** — fuzzer for user/token/OTP/answer enumeration (`-fr` filter-regex to drop failures).
- **seq** — generate numeric token/OTP wordlists (`-w` zero-pads).
- **Burp Suite** — intercept and edit requests/responses (e.g. 302→200, tamper params).
- **base64 / xxd** — decode and forge encoded session tokens.
- **SecLists / CIRT.net / SCADAPASS** — username and default-credential lists.

## 🛡️ Mitigations
- Avoid user enumeration (use email login, uniform error messages); add timing-safe responses.
- Use long, high-entropy, unpredictable reset tokens, session IDs, and OTPs; enforce rate limits + CAPTCHA.
- Keep consistent state across the whole reset flow; don't trust client-supplied username/role.
- `exit;` after redirects; enforce server-side authorization, not parameter presence.
- Issue a fresh session token after login (prevent fixation) and set appropriate session timeouts.
