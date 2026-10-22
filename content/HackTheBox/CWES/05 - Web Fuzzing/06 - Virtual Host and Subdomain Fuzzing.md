# Virtual Host and Subdomain Fuzzing

---

Both virtual hosting (vhosting) and subdomains play pivotal roles in organizing and managing web content.

Virtual hosting enables multiple websites or domains to be served from a single server or IP address. Each vhost is associated with a unique domain name or hostname. When a client sends an HTTP request, the web server examines the `Host` header to determine which vhost's content to deliver. This facilitates efficient resource utilization and cost reduction, as multiple websites can share the same server infrastructure.

Subdomains, on the other hand, are extensions of a primary domain name, creating a hierarchical structure within the domain. They are used to organize different sections or services within a website. For example, `blog.example.com` and `shop.example.com` are subdomains of the main domain `example.com`. Unlike vhosts, subdomains are resolved to specific IP addresses through DNS (Domain Name System) records.

| Feature | Virtual Hosts | Subdomains |
| --- | --- | --- |
| Identification | Identified by the `Host` header in HTTP requests. | Identified by DNS records, pointing to specific IP addresses. |
| Purpose | Primarily used to host multiple websites on a single server. | Used to organize different sections or services within a website. |
| Security Risks | Misconfigured vhosts can expose internal applications or sensitive data. | Subdomain takeover vulnerabilities can occur if DNS records are mismanaged. |

## Gobuster

`Gobuster` is a versatile command-line tool renowned for its directory/file and DNS busting capabilities. It systematically probes target web servers or domains to uncover hidden directories, files, and subdomains, making it a valuable asset in security assessments and penetration testing.

`Gobuster's` flexibility extends to fuzzing for various types of content:

- `Directories`: Discover hidden directories on a web server.
- `Files`: Identify files with specific extensions (e.g., `.php`, `.txt`, `.bak`).
- `Subdomains`: Enumerate subdomains of a given domain.
- `Virtual Hosts (vhosts)`: Uncover hidden virtual hosts by manipulating the `Host` header.

### Gobuster VHost Fuzzing

While `gobuster` is primarily known for directory and file enumeration, its capabilities extend to virtual host (vhost) discovery, making it a valuable tool in assessing the security posture of a web server.

To follow along, start the target system via the question section at the bottom of the page. Add the specified vhost to your hosts file using the command below, replacing IP with the IP address of your spawned instance. We will be using the `/usr/share/seclists/Discovery/Web-Content/common.txt` wordlists for these fuzzing tasks.

```
        shellsession
hiimeins@htb[/htb]$ echo "IP inlanefreight.htb" | sudo tee -a /etc/hosts
```

Let's dissect the `Gobuster` vhost fuzzing command:

```
        shellsession
hiimeins@htb[/htb]$ gobuster vhost -u http://inlanefreight.htb:81 -w /usr/share/seclists/Discovery/Web-Content/common.txt --append-domain
```

- `gobuster vhost`: This flag activates `Gobuster's vhost fuzzing mode`, instructing it to focus on discovering virtual hosts rather than directories or files.
- `-u http://inlanefreight.htb:81`: This specifies the base URL of the target server. `Gobuster` will use this URL as the foundation for constructing requests with different vhost names. In this example, the target server is located at `inlanefreight.htb` and listens on port 81.
- `-w /usr/share/seclists/Discovery/Web-Content/common.txt`: This points to the wordlist file that `Gobuster` will use to generate potential vhost names. The `common.txt` wordlist from SecLists contains a collection of commonly used vhost names and subdomains.
- `--append-domain`: This crucial flag instructs `Gobuster` to append the base domain (`inlanefreight.htb`) to each word in the wordlist. This ensures that the `Host` header in each request includes a complete domain name (e.g., `admin.inlanefreight.htb`), which is essential for vhost discovery.

In essence, `Gobuster` takes each word from the wordlist, appends the base domain to it, and then sends an HTTP request to the target URL with that modified `Host` header. By analyzing the server's responses (e.g., status codes, response size), `Gobuster` can identify valid `vhosts` that might not be publicly advertised or documented.

Running the command will execute a `vhost scan` against the target:

```
        shellsession
hiimeins@htb[/htb]$ gobuster vhost -u http://inlanefreight.htb:81 -w /usr/share/seclists/Discovery/Web-Content/common.txt --append-domain

===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:             http://inlanefreight.htb:81
[+] Method:          GET
[+] Threads:         10
[+] Wordlist:        /usr/share/SecLists/Discovery/Web-Content/common.txt
[+] User Agent:      gobuster/3.6
[+] Timeout:         10s
[+] Append Domain:   true
===============================================================
Starting gobuster in VHOST enumeration mode
===============================================================
Found: .git/logs/.inlanefreight.htb:81 Status: 400 [Size: 157]
...
Found: admin.inlanefreight.htb:81 Status: 200 [Size: 100]
Found: android/config.inlanefreight.htb:81 Status: 400 [Size: 157]
...
Progress: 4730 / 4730 (100.00%)
===============================================================
Finished
===============================================================
```

After the scan has been completed, we see a list of the results. Of particular interest are the vhosts with the `200` status code. In HTTP, a 200 status indicates a successful response, suggesting that the vhost is valid and accessible. For instance, the line `Found: admin.inlanefreight.htb:81 Status: 200 [Size: 100]` indicates that the vhost `admin.inlanefreight.htb` was found and responded to successfully.

### Gobuster Subdomain Fuzzing

While often associated with vhost and directory discovery, `Gobuster` also excels at subdomain enumeration, a crucial step in mapping the attack surface of a target domain. By systematically testing variations of potential subdomain names, `Gobuster` can uncover hidden or forgotten subdomains that might host valuable information or vulnerabilities.

Let's break down the `Gobuster` subdomain fuzzing command:

```
        shellsession
hiimeins@htb[/htb]$ gobuster dns -d inlanefreight.com -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt
```

- `gobuster dns`: Activates `Gobuster's` DNS fuzzing mode, directing it to focus on discovering subdomains.
- `-d inlanefreight.com`: Specifies the target domain (e.g., `inlanefreight.com`) for which you want to discover subdomains.
- `-w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt`: This points to the wordlist file that `Gobuster` will use to generate potential subdomain names. In this example, we're using a wordlist containing the top 5000 most common subdomains.

Under the hood, `Gobuster` works by generating subdomain names based on the wordlist, appending them to the target domain, and then attempting to resolve those subdomains using DNS queries. If a subdomain resolves to an IP address, it is considered valid and included in the output.

Running this command, `Gobuster` might produce output similar to:

```
        shellsession
hiimeins@htb[/htb]$ gobuster dns -d inlanefreight.com -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt 

===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Domain:     inlanefreight.com
[+] Threads:    10
[+] Timeout:    1s
[+] Wordlist:   /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt
===============================================================
Starting gobuster in DNS enumeration mode
===============================================================
Found: www.inlanefreight.com

Found: blog.inlanefreight.com

...

Progress: 4989 / 4990 (99.98%)
===============================================================
Finished
===============================================================
```

In the output, each line prefixed with "Found:" indicates a valid subdomain discovered by Gobuster.

Note: In the latest Gobuster release, `-d` now sets the delay between requests, not the domain. Use `--do` or `--domain` to specify the target domain if you are using the latest version.
