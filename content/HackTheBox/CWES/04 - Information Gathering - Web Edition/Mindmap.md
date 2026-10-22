# Information Gathering - Web Edition

## 🎯 Main Idea
- Web reconnaissance is the first phase of any assessment: map the target's digital footprint before attacking.
- Goals: identify assets (domains, subdomains, IPs), uncover hidden info (dirs, files, tech), analyze attack surface, gather intelligence.
- Two modes: Active recon (direct interaction, higher detection risk) vs Passive recon (public data, stealthier).

## 💥 Attack / Exploit Vectors
### WHOIS Lookups (Passive)
- Query domain ownership, registrar, registration/expiry dates, nameservers, contact info — useful for social engineering.
- Data may be inaccurate or masked by privacy services; verify across sources.
- **Commands**
  - `whois example.com` — retrieve domain registration details

### DNS Enumeration
- Query DNS records to map infrastructure. Record types: A (IPv4), AAAA (IPv6), CNAME (alias), MX (mail), NS (nameserver), TXT, SOA.
- **Commands**
  - `dig example.com A` — query the A record (hostname → IPv4)

### Subdomain Enumeration
- Subdomains expose extra attack surface: dev/staging servers, forgotten/unsecured apps.
- Active (brute-force, zone transfer) vs Passive (CT logs, search engines); combine both for coverage.

### Subdomain Brute-Forcing (Active)
- Systematically test wordlist names against DNS to find valid subdomains (general, targeted, or custom wordlists).
- Tools: dnsenum, fierce, dnsrecon, amass, assetfinder, puredns.
- **Commands**
  - `dnsenum example.com -f subdomains.txt` — brute-force subdomains
  - `dnsenum --enum inlanefreight.com -f /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt -r` — recursive brute-force with SecLists

### DNS Zone Transfers (AXFR)
- Misconfigured DNS servers may allow a full zone transfer, dumping all subdomains/records (DNS blueprint).
- **Commands**
  - `dig @ns1.example.com example.com axfr` — request a full zone transfer

### Virtual Host Discovery
- Multiple sites share one IP; test hostnames against the IP to reveal hidden vhosts not visible by scanning the IP alone.
- **Commands**
  - `gobuster vhost -u http://192.0.2.1 -w hostnames.txt` — brute-force virtual hosts

### Certificate Transparency (CT) Logs (Passive)
- Public SSL/TLS cert logs (e.g. `crt.sh`) reveal overlooked subdomains without touching the target.
- **Commands**
  - `curl -s "https://crt.sh/?q=%25.example.com&output=json" | jq -r '.[].name_value' | sed 's/\*\.//g' | sort -u` — extract subdomains from crt.sh

### Fingerprinting
- Identify server, OS, CMS, frameworks, and WAF to tailor exploits. Techniques: banner grabbing, HTTP header analysis (`Server`, `X-Powered-By`), probing responses, page content.
- Tools: Wappalyzer, BuiltWith, WhatWeb, Nmap (NSE), Netcraft, wafw00f, Nikto.
- **Commands**
  - `curl -I inlanefreight.com` — banner grab via HTTP headers
  - `wafw00f inlanefreight.com` — detect/identify a Web Application Firewall
  - `nikto -h inlanefreight.com -Tuning b` — run Nikto software-identification modules

### Web Crawling / Spidering
- Automated link-following to map site structure and extract links, resources, and sensitive files.
- Analyze `robots.txt` for hidden/disallowed directories; `Scrapy` for large-scale crawling.
- **Commands**
  - `jq -r '.[] | select(.file != null) | .file' example_data.json | sort -u` — extract unique links from Scrapy output

### robots.txt & Sitemaps
- `robots.txt` in site root lists crawler-disallowed paths — often points to hidden/sensitive directories; `sitemap.xml` maps structure.

### Well-Known URIs
- `.well-known/` (RFC 8615) centralizes site metadata; IANA maintains the registry.
- Recon value: `security.txt`, `openid-configuration` (reveals OAuth/OIDC endpoints, `jwks_uri`, scopes, signing algs), `change-password`, `mta-sts.txt`.

### Search Engine Discovery (OSINT / Google Dorks) (Passive)
- Use search operators to find exposed docs, login pages, directories without touching the target.
- Operators: `site:`, `inurl:`, `filetype:`, `intitle:`, `cache:`, `"exact phrase"`, `OR`, `-` (exclude).
- Example: `site:example.com "password reset"`, `intitle:"index of" /backup`

### Web Archives (Wayback Machine) (Passive)
- Historical snapshots reveal removed/hidden directories, old content, and content changes over time.

## 🛠️ Key Tools & Concepts
- `whois`, `dig`, `nslookup` — DNS/domain querying.
- Subdomain: dnsenum, fierce, dnsrecon, amass, assetfinder, puredns; gobuster (vhost mode).
- Fingerprinting: Wappalyzer, WhatWeb, wafw00f, Nikto, Netcraft, Nmap.
- Crawling: Scrapy, web spiders; `jq`/`sed`/`sort` for parsing results.
- CT logs: crt.sh. Archives: Wayback Machine. OSINT: Google Dorks.
- Recon frameworks (automation): FinalRecon, Recon-ng, theHarvester, SpiderFoot, OSINT Framework.
- **Commands**
  - `./finalrecon.py --headers --whois --url http://inlanefreight.com` — automated headers + WHOIS recon
  - `./finalrecon.py --full --url <target>` — full automated recon scan

## 🛡️ Mitigations
- Use WHOIS privacy services and minimize exposed registrant data.
- Disable/restrict DNS zone transfers to authorized secondary servers only.
- Suppress or genericize server banners/version headers; add security headers (HSTS, X-Content-Type-Options).
- Avoid leaking sensitive paths in `robots.txt`; remove forgotten dev/staging subdomains and backups.
- Deploy a WAF and monitor for automated recon/crawling.
