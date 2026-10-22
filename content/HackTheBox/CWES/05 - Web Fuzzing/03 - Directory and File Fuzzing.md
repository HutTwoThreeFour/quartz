# Directory and File Fuzzing

---

Web applications often have directories and files that are not directly linked or visible to users. These hidden resources may contain sensitive information, backup files, configuration files, or even old, vulnerable application versions. Directory and file fuzzing aims to uncover these hidden assets, providing attackers with potential entry points or valuable information for further exploitation.

## Uncovering Hidden Assets

Web applications often house a treasure trove of hidden resources — directories, files, and endpoints that aren't readily accessible through the main interface. These concealed areas might hold valuable information for attackers, including:

- `Sensitive data`: Backup files, configuration settings, or logs containing user credentials or other confidential information.
- `Outdated content`: Older versions of files or scripts that may be vulnerable to known exploits.
- `Development resources`: Test environments, staging sites, or administrative panels that could be leveraged for further attacks.
- `Hidden functionalities`: Undocumented features or endpoints that could expose unexpected vulnerabilities.

Discovering these hidden assets is crucial for security researchers and penetration testers. It provides a deeper understanding of a web application's attack surface and potential vulnerabilities.

### The Importance of Finding Hidden Assets

Uncovering these hidden gems is far from trivial. Each discovery contributes to a complete picture of the web application's structure and functionality, essential for a thorough security assessment. These hidden areas often lack the robust security measures found in public-facing components, making them prime targets for exploitation. By proactively identifying these vulnerabilities, you can stay one step ahead of malicious actors.

Even if a hidden asset doesn't immediately reveal a vulnerability, the information gleaned can prove invaluable in the later stages of a penetration test. This could include anything from understanding the underlying technology stack to discovering sensitive data that can be used for further attacks.

`Directory and file fuzzing` are among the most effective methods for uncovering these hidden assets. This involves systematically probing the web application with a list of potential directory and file names and analyzing the server's responses to identify valid resources.

## Wordlists

Wordlists are the lifeblood of directory and file fuzzing. They provide the potential directory and file names your chosen tool will use to probe the web application. Effective wordlists can significantly increase your chances of discovering hidden assets.

Wordlists are typically compiled from various sources. This often includes scraping the web for common directory and file names, analyzing publicly available data breaches, and extracting directory information from known vulnerabilities. These wordlists are then meticulously curated, removing duplicates and irrelevant entries to ensure optimal efficiency and effectiveness during fuzzing operations. The goal is to create a comprehensive list of potential directories and file names that will likely be found on web servers, allowing you to thoroughly probe a target application for hidden assets.

The tools we've discussed – `ffuf`, `wfuzz`, etc – don't have built-in wordlists, but they are designed to work seamlessly with external wordlist files. This flexibility allows you to use pre-existing wordlists or create your own to tailor your fuzzing efforts to specific targets and scenarios.

One of the most comprehensive and widely-used collections of wordlists is `SecLists`. This open-source project on GitHub (<https://github.com/danielmiessler/SecLists>) provides a vast repository of wordlists for various security testing purposes, including directory and file fuzzing.

**On pwnbox specifically, the seclists folder is located in /usr/share/seclists/, all lowercase, but other distributions might name it as per the repository, SecLists, so if a command doesn't work, double check the wordlist path.**

`SecLists` contains wordlists for:

- Common directory and file names
- Backup files
- Configuration files
- Vulnerable scripts
- And much more

The most commonly used wordlists for fuzzing web directories and files from `SecLists` are:

- `Discovery/Web-Content/common.txt`: This general-purpose wordlist contains a broad range of common directory and file names on web servers. It's an excellent starting point for fuzzing and often yields valuable results.
- `Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt`: This is a more extensive wordlist specifically focused on directory names. It's a good choice when you need a deeper dive into potential directories.
- `Discovery/Web-Content/raft-large-directories.txt`: This wordlist boasts a massive collection of directory names compiled from various sources. It's a valuable resource for thorough fuzzing campaigns.
- `Discovery/Web-Content/big.txt`: As the name suggests, this is a massive wordlist containing both directory and file names. It's useful when you want to cast a wide net and explore all possibilities.

## Actually Fuzzing

Now that you understand the concept of wordlists, let's dive into the fuzzing process. We'll use `ffuf`, a powerful and flexible fuzzing tool, to uncover hidden directories and files on our target web application.

**To follow along, start the target system via the question section at the bottom of the page, replacing the uses of IP:PORT with the IP:PORT for your spawned instance.**

### ffuf

We will use `ffuf` for this fuzzing task. Here's how `ffuf` generally works:

1. `Wordlist`: You provide `ffuf` with a wordlist containing potential directory or file names.
2. `URL with FUZZ keyword`: You construct a URL with the `FUZZ` keyword as a placeholder where the wordlist entries will be inserted.
3. `Requests`: `ffuf` iterates through the wordlist, replacing the `FUZZ` keyword in the URL with each entry and sending HTTP requests to the target web server.
4. `Response Analysis`: `ffuf` analyzes the server's responses (status codes, content length, etc.) and filters the results based on your criteria.

For example, if you want to fuzz for directories, you might use a URL like this:

```
        http
http://localhost/FUZZ
```

`ffuf` will replace `FUZZ` with words like "`admin`," "`backup`," "`uploads`," etc., from your chosen wordlist and then send requests to `http://localhost/admin`, `http://localhost/backup`, and so on.

### Directory Fuzzing

The first step is to perform directory fuzzing, which helps us discover hidden directories on the web server. Here's the ffuf command we'll use:

```
        shellsession
hiimeins@htb[/htb]$ ffuf -w /usr/share/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt -u http://IP:PORT/FUZZ

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__/\ /\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          /_/    /_/   /___/    /_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://IP:PORT/FUZZ
 :: Wordlist         : FUZZ: /usr/share/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-399
________________________________________________

[...]

w2ksvrus                [Status: 301, Size: 0, Words: 1, Lines: 1, Duration: 0ms]
:: Progress: [220559/220559] :: Job [1/1] :: 100000 req/sec :: Duration: [0:00:03] :: Errors: 0 ::
```

- `-w` (wordlist): Specifies the path to the wordlist we want to use. In this case, we're using a medium-sized directory list from SecLists.
- `-u` (URL): Specifies the base URL to fuzz. The `FUZZ` keyword acts as a placeholder where the fuzzer will insert words from the wordlist.

The output above shows that `ffuf` has discovered a directory called `w2ksvrus` on the target web server, as indicated by the 301 (Moved Permanently) status code. This could be a potential entry point for further investigation.

### File Fuzzing

While directory fuzzing focuses on finding folders, file fuzzing dives deeper into discovering specific files within those directories or even in the root of the web application. Web applications use various file types to serve content and perform different functions. Some common file extensions include:

- `.php`: Files containing PHP code, a popular server-side scripting language.
- `.html`: Files that define the structure and content of web pages.
- `.txt`: Plain text files, often storing simple information or logs.
- `.bak`: Backup files are created to preserve previous versions of files in case of errors or modifications.
- `.js`: Files containing JavaScript code add interactivity and dynamic functionality to web pages.

By fuzzing for these common extensions with a wordlist of common file names, we increase our chances of discovering files that might be unintentionally exposed or misconfigured, potentially leading to information disclosure or other vulnerabilities.

For example, if the website uses PHP, discovering a backup file like `config.php.bak` could reveal sensitive information such as database credentials or API keys. Similarly, finding an old or unused script like `test.php` might expose vulnerabilities that attackers could exploit.

Utilize `ffuf` and a wordlist of common file names to search for hidden files with specific extensions:

```
        shellsession
hiimeins@htb[/htb]$ ffuf -w /usr/share/seclists/Discovery/Web-Content/common.txt -u http://IP:PORT/w2ksvrus/FUZZ -e .php,.html,.txt,.bak,.js -v 

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__/\ /\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          /_/    /_/   /___/    /_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://IP:PORT/w2ksvrus/FUZZ.html
 :: Wordlist         : FUZZ: /usr/share/seclists/Discovery/Web-Content/common.txt
 :: Extensions       : .php .html .txt .bak .js 
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
________________________________________________

[Status: 200, Size: 111, Words: 2, Lines: 2, Duration: 0ms]
| URL | http://IP:PORT/w2ksvrus/dblclk.html
    * FUZZ: dblclk

[Status: 200, Size: 112, Words: 6, Lines: 2, Duration: 0ms]
| URL | http://IP:PORT/w2ksvrus/index.html
    * FUZZ: index

:: Progress: [28362/28362] :: Job [1/1] :: 0 req/sec :: Duration: [0:00:00] :: Errors: 0 ::
```

The `ffuf` output shows that it discovered two files within the `/w2ksvrus` directory:

- `dblclk.html`: This file is 111 bytes in size and consists of 2 words and 2 lines. Its purpose might not be immediately apparent, but it's a potential point of interest for further investigation. Perhaps it contains hidden content or functionality.
- `index.html`: This file is slightly larger at 112 bytes and contains 6 words and 2 lines. It's likely the default index page for the `w2ksvrus` directory.
