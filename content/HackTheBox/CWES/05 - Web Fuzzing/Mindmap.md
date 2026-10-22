# Web Fuzzing

## 🎯 Main Idea
- Fuzzing injects large sets of unexpected/varied input into a web app and analyzes responses to find hidden resources and vulnerabilities (wider net than targeted brute-forcing).
- Uncovers hidden directories/files, parameters, virtual hosts, subdomains, and API endpoints that expand the attack surface.
- Core workflow: pick a wordlist, place the `FUZZ` keyword in the request, send requests, then filter responses by status/size/words/lines.

## 💥 Attack / Exploit Vectors

### Directory & File Fuzzing
- Discover hidden directories and files (backups, configs, old scripts) by probing a wordlist against the URL path.
- Add common extensions (`.php`, `.html`, `.txt`, `.bak`, `.js`) to each file-name guess.
- **Commands**
  - `ffuf -w /usr/share/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt -u http://IP:PORT/FUZZ` — directory fuzzing with FUZZ placeholder
  - `ffuf -w /usr/share/seclists/Discovery/Web-Content/common.txt -u http://IP:PORT/w2ksvrus/FUZZ -e .php,.html,.txt,.bak,.js -v` — file fuzzing with extensions
  - `gobuster dir -u http://example.com -w wordlist.txt -x .php,.html` — gobuster directory fuzzing with extensions
  - `feroxbuster -u http://example.com -w wordlist.txt -x` — feroxbuster with file extensions

### Recursive Fuzzing
- Automatically fuzz each discovered directory deeper, branching into nested structures until a depth limit is hit.
- Throttle to avoid overwhelming the server.
- **Commands**
  - `ffuf -w /usr/share/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt -ic -v -u http://IP:PORT/FUZZ -e .html -recursion` — recursive fuzzing, ignore comments
  - `ffuf -w wordlist.txt -ic -u http://IP:PORT/FUZZ -e .html -recursion -recursion-depth 2 -rate 500` — limit depth and request rate
  - `feroxbuster -u http://example.com -w wordlist.txt --depth 3` — feroxbuster recursion depth

### Parameter & Value Fuzzing
- Fuzz GET parameter values (in URL after `?`) and POST parameter values (in request body) to trigger unique/valid responses.
- Manipulating parameters can expose IDOR, hidden features, XSS, or SQLi.
- **Commands**
  - `curl http://IP:PORT/get.php?x=1` — manually probe a GET parameter
  - `wenum -w /usr/share/seclists/Discovery/Web-Content/common.txt --hc 404 -u "http://IP:PORT/get.php?x=FUZZ"` — fuzz a GET parameter value, hide 404s
  - `ffuf -u http://IP:PORT/post.php -X POST -H "Content-Type: application/x-www-form-urlencoded" -d "y=FUZZ" -w /usr/share/seclists/Discovery/Web-Content/common.txt -mc 200 -v` — fuzz a POST parameter value
  - `curl -d "y=SU..." http://IP:PORT/post.php` — validate the discovered POST value

### Virtual Host (VHost) Fuzzing
- Uncover hidden sites served on the same IP by manipulating the `Host` header; misconfigured vhosts expose internal apps.
- **Commands**
  - `echo "IP inlanefreight.htb" | sudo tee -a /etc/hosts` — add host entry for vhost testing
  - `gobuster vhost -u http://inlanefreight.htb:81 -w /usr/share/seclists/Discovery/Web-Content/common.txt --append-domain` — vhost fuzzing (200 status = valid vhost)

### Subdomain Fuzzing
- Enumerate subdomains of a domain via DNS resolution to map the attack surface (watch for subdomain takeover).
- **Commands**
  - `gobuster dns -d inlanefreight.com -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt` — DNS subdomain enumeration
  - `gobuster dns -d example.com -w subdomains.txt -i` — show IPs of discovered subdomains

### Web API Fuzzing
- Find undocumented/hidden API endpoints and fuzz their parameters, headers, and data formats (JSON/XML).
- Three types: parameter fuzzing, data format fuzzing, sequence fuzzing — can expose BOLA/BFLA, SSRF, injection, IDOR.
- Identify endpoints via API docs (Swagger/OpenAPI/WSDL), network traffic analysis, GraphQL introspection, or parameter-name fuzzing.
- **Commands**
  - `curl http://IP:PORT/docs` — view auto-generated API (Swagger) documentation
  - `git clone https://github.com/PandaSt0rm/webfuzz_api.git` — endpoint-discovery fuzzer
  - `python3 api_fuzzer.py http://IP:PORT` — fuzz API for undocumented endpoints (watch 200/405 anomalies)
  - `curl http://localhost:8000/cz...` — access discovered undocumented endpoint

### Filtering Fuzzing Output
- Essential to cut noise (mostly 404s) and surface meaningful results by status code, size, words, lines, regex, or response time.
- **Commands**
  - `ffuf -u http://example.com/FUZZ -w wordlist.txt -mc 200 -fw 427 -ms >500` — match code 200, filter words, match size
  - `ffuf -u http://example.com/FUZZ -w wordlist.txt -fc 404,401,302` — filter out error/redirect codes
  - `ffuf -u http://example.com/FUZZ -w wordlist.txt -mt >500` — match slow responses (TTFB >500ms)
  - `gobuster dir -u http://example.com/ -w wordlist.txt -s 200,301 --exclude-length 0` — include codes, exclude empty responses
  - `wenum -w wordlist.txt --sc 200,301,302 -u https://example.com/FUZZ` — show only success/redirect codes
  - `feroxbuster --url http://example.com -w wordlist.txt -s 200 -S 10240 -X "error"` — status allowlist, size and regex filters

### General Commands
- Useful helpers for wordlists, hosts, and manual requests.
- **Commands**
  - `sudo sh -c 'echo "SERVER_IP academy.htb" >> /etc/hosts'` — add local DNS entry
  - `for i in $(seq 1 1000); do echo $i >> ids.txt; done` — generate numeric ID wordlist
  - `curl http://admin.academy.htb:PORT/admin/admin.php -X POST -d 'id=key' -H 'Content-Type: application/x-www-form-urlencoded'` — manual POST request

## 🛠️ Key Tools & Concepts
- `ffuf` — fast Go web fuzzer; FUZZ keyword, `-w`, `-u`, `-e`, `-mc/-fc/-fs`, `-recursion`.
- `gobuster` — dir/file, DNS subdomain, and vhost fuzzing.
- `wenum` — wfuzz fork for GET/POST params, headers, cookies; install via `pipx install git+https://github.com/WebFuzzForge/wenum`.
- `feroxbuster` — recursive content discovery.
- `SecLists` — wordlist collection (`common.txt`, `directory-list-2.3-medium.txt`, `raft-large-directories.txt`, `big.txt`); on pwnbox at `/usr/share/seclists/`.
- Wordlist / Payload / Response Analysis / False Positive / False Negative — core fuzzing concepts.
- Web API types: REST (HTTP CRUD, JSON), SOAP (XML envelopes, WSDL), GraphQL (single endpoint, queries/mutations, introspection).
