# Tooling

---

In this module, we will utilize four powerful tools designed for web application reconnaissance and vulnerability assessment. To streamline our setup, we'll install them all upfront.

### Installing Go, Python and PIPX

You will require Go and Python installed for these tools. Install them as follows if you don't have them installed already.

`pipx` is a command-line tool designed to simplify the installation and management of Python applications. It streamlines the process by creating isolated virtual environments for each application, ensuring that dependencies don't conflict. This means you can install and run multiple Python applications without worrying about compatibility issues. `pipx` also makes it easy to upgrade or uninstall applications, keeping your system organized and clutter-free.

If you are using a Debian-based system (like Ubuntu), you can install Go, Python, and PIPX using the APT package manager.

1. Open a terminal and update your package lists to ensure you have the latest information on the newest versions of packages and their dependencies.

   ```
           shellsession
   hiimeins@htb[/htb]$ sudo apt update
   ```
2. Use the following command to install Go:

   ```
           shellsession
   hiimeins@htb[/htb]$ sudo apt install -y golang
   ```
3. Use the following command to install Python:

   ```
           shellsession
   hiimeins@htb[/htb]$ sudo apt install -y python3 python3-pip
   ```
4. Use the following command to install and configure pipx:

   ```
           shellsession
   hiimeins@htb[/htb]$ sudo apt install pipx
   hiimeins@htb[/htb]$ pipx ensurepath
   hiimeins@htb[/htb]$ sudo pipx ensurepath --global
   ```
5. To ensure that Go and Python are installed correctly, you can check their versions:

   ```
           shellsession
   hiimeins@htb[/htb]$ go version
   hiimeins@htb[/htb]$ python3 --version
   ```

If the installations were successful, you should see the version information for both Go and Python.

## FFUF

`FFUF` (`Fuzz Faster U Fool`) is a fast web fuzzer written in Go. It excels at quickly enumerating directories, files, and parameters within web applications. Its flexibility, speed, and ease of use make it a favorite among security professionals and enthusiasts.

You can install `FFUF` using the following command:

```
        shellsession
hiimeins@htb[/htb]$ go install github.com/ffuf/ffuf/v2@latest
```

### Use Cases

| Use Case | Description |
| --- | --- |
| `Directory and File Enumeration` | Quickly identify hidden directories and files on a web server. |
| `Parameter Discovery` | Find and test parameters within web applications. |
| `Brute-Force Attack` | Perform brute-force attacks to discover login credentials or other sensitive information. |

## Gobuster

`Gobuster` is another popular web directory and file fuzzer. It's known for its speed and simplicity, making it a great choice for beginners and experienced users alike.

You can install `GoBuster` using the following command:

```
        shellsession
hiimeins@htb[/htb]$ go install github.com/OJ/gobuster/v3@latest
```

### Use Cases

| Use Case | Description |
| --- | --- |
| `Content Discovery` | Quickly scan and find hidden web content such as directories, files, and virtual hosts. |
| `DNS Subdomain Enumeration` | Identify subdomains of a target domain. |
| `WordPress Content Detection` | Use specific wordlists to find WordPress-related content. |

## FeroxBuster

`FeroxBuster` is a fast, recursive content discovery tool written in Rust. It's designed for brute-force discovery of unlinked content in web applications, making it particularly useful for identifying hidden directories and files. It's more of a "forced browsing" tool than a fuzzer like `ffuf`.

To install `FeroxBuster`, you can use the following command:

```
        shellsession
hiimeins@htb[/htb]$ curl -sL https://raw.githubusercontent.com/epi052/feroxbuster/main/install-nix.sh | sudo bash -s $HOME/.local/bin
```

### Use Cases

| Use Case | Description |
| --- | --- |
| `Recursive Scanning` | Perform recursive scans to discover nested directories and files. |
| `Unlinked Content Discovery` | Identify content that is not linked within the web application. |
| `High-Performance Scans` | Benefit from Rust's performance to conduct high-speed content discovery. |

## wfuzz/wenum

`wenum` is an actively maintained fork of `wfuzz`, a highly versatile and powerful command-line fuzzing tool known for its flexibility and customization options. It's particularly well-suited for parameter fuzzing, allowing you to test a wide range of input values against web applications and uncover potential vulnerabilities in how they process those parameters.

If you are using a penetration testing Linux distribution like PwnBox or Kali, `wfuzz` may already be pre-installed, allowing you to use it right away if desired. However, there are currently complications when installing `wfuzz`, so you can substitute it with `wenum` instead. The commands are interchangeable, and they follow the same syntax, so you can simply replace `wenum` commands with `wfuzz` if necessary.

The following commands will use `pipx`, a tool for installing and managing Python applications in isolated environments, to install `wenum`. This ensures a clean and consistent environment for `wenum`, preventing any possible package conflicts:

```
        shellsession
hiimeins@htb[/htb]$ pipx install git+https://github.com/WebFuzzForge/wenum
hiimeins@htb[/htb]$ pipx runpip wenum install setuptools
```

### Use Cases

| Use Case | Description |
| --- | --- |
| `Directory and File Enumeration` | Quickly identify hidden directories and files on a web server. |
| `Parameter Discovery` | Find and test parameters within web applications. |
| `Brute-Force Attack` | Perform brute-force attacks to discover login credentials or other sensitive information. |
