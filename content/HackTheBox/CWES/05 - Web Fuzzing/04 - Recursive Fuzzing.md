# Recursive Fuzzing

---

So far, we've focused on fuzzing directories directly under the web root and files within a single directory. But what if our target has a complex structure with multiple nested directories? Manually fuzzing each level would be tedious and time-consuming. This is where recursive fuzzing comes in handy.

## How Recursive Fuzzing Works

Recursive fuzzing is an automated way to delve into the depths of a web application's directory structure. It's a pretty basic 3 step process:

1. `Initial Fuzzing`:
   - The fuzzing process begins with the top-level directory, typically the web root (`/`).
   - The fuzzer starts sending requests based on the provided wordlist containing the potential directory and file names.
   - The fuzzer analyzes server responses, looking for successful results (e.g., HTTP 200 OK) that indicate the existence of a directory.
2. `Directory Discovery and Expansion`:
   - When a valid directory is found, the fuzzer doesn't just note it down. It creates a new branch for that directory, essentially appending the directory name to the base URL.
   - For example, if the fuzzer finds a directory named `admin` at the root level, it will create a new branch like `http://localhost/admin/`.
   - This new branch becomes the starting point for a fresh fuzzing process. The fuzzer will again iterate through the wordlist, appending each entry to the new branch's URL (e.g., `http://localhost/admin/FUZZ`).
3. `Iterative Depth`:
   - The process repeats for each discovered directory, creating further branches and expanding the fuzzing scope deeper into the web application's structure.
   - This continues until a specified depth limit is reached (e.g., a maximum of three levels deep) or no more valid directories are found.

Imagine a tree structure where the web root is the trunk, and each discovered directory is a branch. Recursive fuzzing systematically explores each branch, going deeper and deeper until it reaches the leaves (files) or encounters a predetermined stopping point.

### Why Use Recursive Fuzzing?

Recursive fuzzing is a practical necessity when dealing with complex web applications:

- `Efficiency`: Automating the discovery of nested directories saves significant time compared to manual exploration.
- `Thoroughness`: It systematically explores every branch of the directory structure, reducing the risk of missing hidden assets.
- `Reduced Manual Effort`: You don't need to input each new directory to fuzz manually; the tool handles the entire process.
- `Scalability`: It's particularly valuable for large-scale web applications where manual exploration would be impractical.

In essence, recursive fuzzing is about `working smarter, not harder`. It allows you to efficiently and comprehensively probe the depths of a web application, uncovering potential vulnerabilities that might be lurking in its hidden corners.

## Recursive Fuzzing with ffuf

**To follow along, start the target system via the question section at the bottom of the page, replacing the uses of IP:PORT with the IP:PORT for your spawned instance. We will be using the /usr/share/seclists/Discovery/Web-Content/DirBuster-2007\_directory-list-2.3-medium.txt wordlists for these fuzzing tasks.**

Let's use `ffuf` to demonstrate recursive fuzzing:

```
        shellsession
hiimeins@htb[/htb]$ ffuf -w /usr/share/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt -ic -v -u http://IP:PORT/FUZZ -e .html -recursion 

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
 :: Extensions       : .html 
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
________________________________________________

[Status: 301, Size: 0, Words: 1, Lines: 1, Duration: 0ms]
| URL | http://IP:PORT/level1
| --> | /level1/
    * FUZZ: level1

[INFO] Adding a new job to the queue: http://IP:PORT/level1/FUZZ

[INFO] Starting queued job on target: http://IP:PORT/level1/FUZZ

[Status: 200, Size: 96, Words: 6, Lines: 2, Duration: 0ms]
| URL | http://IP:PORT/level1/index.html
    * FUZZ: index.html

[Status: 301, Size: 0, Words: 1, Lines: 1, Duration: 0ms]
| URL | http://IP:PORT/level1/level2
| --> | /level1/level2/
    * FUZZ: level2

[INFO] Adding a new job to the queue: http://IP:PORT/level1/level2/FUZZ

[Status: 301, Size: 0, Words: 1, Lines: 1, Duration: 0ms]
| URL | http://IP:PORT/level1/level3
| --> | /level1/level3/
    * FUZZ: level3

[INFO] Adding a new job to the queue: http://IP:PORT/level1/level3/FUZZ

[INFO] Starting queued job on target: http://IP:PORT/level1/level2/FUZZ

[Status: 200, Size: 96, Words: 6, Lines: 2, Duration: 0ms]
| URL | http://IP:PORT/level1/level2/index.html
    * FUZZ: index.html

[INFO] Starting queued job on target: http://IP:PORT/level1/level3/FUZZ

[Status: 200, Size: 126, Words: 8, Lines: 2, Duration: 0ms]
| URL | http://IP:PORT/level1/level3/index.html
    * FUZZ: index.html

:: Progress: [441088/441088] :: Job [4/4] :: 100000 req/sec :: Duration: [0:00:06] :: Errors: 0 ::
```

Notice the addition of the `-recursion` flag. This tells `ffuf` to fuzz any directories it finds recursively. For example, if `ffuf` discovers an admin directory, it will automatically start a new fuzzing process on `http://localhost/admin/FUZZ`. In fuzzing scenarios where wordlists contain comments (lines starting with #), the `ffuf -ic` option proves invaluable. By enabling this option, `ffuf` intelligently ignores commented lines during fuzzing, preventing them from being treated as valid inputs.

The fuzzing commences at the web root (`http://IP:PORT/FUZZ`). Initially, `ffuf` identifies a directory named `level1`, indicated by a `301 (Moved Permanently)` response. This signifies a redirection and prompts the tool to initiate a new fuzzing process within this directory, effectively branching out its search.

As `ffuf` recursively explores `level1`, it uncovers two additional directories: `level2` and `level3`. Each is added to the fuzzing queue, expanding the search depth. Furthermore, an `index.html` file is discovered within `level1`.

The fuzzer systematically works through its queue, identifying `index.html` files in both `level2` and `level3`. Notably, the `index.html` file within `level3` stands out due to its larger file size than the others.

Further analysis reveals this file contains the flag `HTB{r3curs1v3_fuzz1ng_w1ns}`, signifying a successful exploration of the nested directory structure.

### Be Responsible

While recursive fuzzing is a powerful technique, it can also be resource-intensive, especially on large web applications. Excessive requests can overwhelm the target server, potentially causing performance issues or triggering security mechanisms.

To mitigate these risks, `ffuf` provides options for fine-tuning the recursive fuzzing process:

- `-recursion-depth`: This flag allows you to set a maximum depth for recursive exploration. For example, `-recursion-depth 2` limits fuzzing to two levels deep (the starting directory and its immediate subdirectories).
- `-rate`: You can control the rate at which `ffuf` sends requests per second, preventing the server from being overloaded.
- `-timeout`: This option sets the timeout for individual requests, helping to prevent the fuzzer from hanging on unresponsive targets.

```
        shellsession
hiimeins@htb[/htb]$ ffuf -w /usr/share/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt -ic -u http://IP:PORT/FUZZ -e .html -recursion -recursion-depth 2 -rate 500
```
