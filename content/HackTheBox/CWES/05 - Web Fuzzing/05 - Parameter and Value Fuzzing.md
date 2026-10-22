# Parameter and Value Fuzzing

---

Building upon the discovery of hidden directories and files, we now delve into parameter and value fuzzing. This technique focuses on manipulating the parameters and their values within web requests to uncover vulnerabilities in how the application processes input.

Parameters are the messengers of the web, carrying vital information between your browser and the server that hosts the web application. They're like variables in programming, holding specific values that influence how the application behaves.

## GET Parameters: Openly Sharing Information

You'll often spot `GET` parameters right in the URL, following a question mark (`?`). Multiple parameters are strung together using ampersands (`&`). For example:

```
        http
https://example.com/search?query=fuzzing&category=security
```

In this URL:

- `query` is a parameter with the value "fuzzing"
- `category` is another parameter with the value "security"

`GET` parameters are like postcards – their information is visible to anyone who glances at the URL. They're primarily used for actions that don't change the server's state, like searching or filtering.

## POST Parameters: Behind-the-Scenes Communication

While `GET` parameters are like open postcards, POST parameters are more like sealed envelopes, carrying their information discreetly within the body of the HTTP request. They are not visible directly in the URL, making them the preferred method for transmitting sensitive data like login credentials, personal information, or financial details.

When you submit a form or interact with a web page that uses POST requests, the following happens:

1. `Data Collection`: The information entered into the form fields is gathered and prepared for transmission.
2. `Encoding`: This data is encoded into a specific format, typically `application/x-www-form-urlencoded` or `multipart/form-data`:
   - `application/x-www-form-urlencoded`: This format encodes the data as key-value pairs separated by ampersands (`&`), similar to GET parameters but placed within the request body instead of the URL.
   - `multipart/form-data`: This format is used when submitting files along with other data. It divides the request body into multiple parts, each containing a specific piece of data or a file.
3. `HTTP Request`: The encoded data is placed within the body of an HTTP POST request and sent to the web server.
4. `Server-Side Processing`: The server receives the POST request, decodes the data, and processes it according to the application's logic.

Here's a simplified example of how a POST request might look when submitting a login form:

```
        http
POST /login HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

username=your_username&password=your_password
```

- `POST`: Indicates the HTTP method (POST).
- `/login`: Specifies the URL path where the form data is sent.
- `Content-Type`: Specifies how the data in the request body is encoded (`application/x-www-form-urlencoded` in this case).
- `Request Body`: Contains the encoded form data as key-value pairs (`username` and `password`).

## Why Parameters Matter for Fuzzing

Parameters are the gateways through which you can interact with a web application. By manipulating their values, you can test how the application responds to different inputs, potentially uncovering vulnerabilities. For instance:

- Altering a product ID in a shopping cart URL could reveal pricing errors or unauthorized access to other users' orders.
- Modifying a hidden parameter in a request might unlock hidden features or administrative functions.
- Injecting malicious code into a search query could expose vulnerabilities like Cross-Site Scripting (XSS) or SQL Injection (SQLi).

## wenum

In this section, we'll leverage `wenum` to explore both GET and POST parameters within our target web application, ultimately aiming to uncover hidden values that trigger unique responses, potentially revealing vulnerabilities.

To follow along, start the target system via the question section at the bottom of the page, replacing the uses of IP:PORT with the `IP`:`PORT` for your spawned instance. We will be using the `/usr/share/seclists/Discovery/Web-Content/common.txt` wordlists for these fuzzing tasks.

Let's first ready our tools by installing `wenum` to our attack host:

```
        shellsession
hiimeins@htb[/htb]$ pipx install git+https://github.com/WebFuzzForge/wenum
hiimeins@htb[/htb]$ pipx runpip wenum install setuptools
```

Then to begin, we will use `curl` to manually interact with the endpoint and gain a better understanding of its behavior:

```
        shellsession
hiimeins@htb[/htb]$ curl http://IP:PORT/get.php

Invalid parameter value
x:
```

The response tells us that the parameter `x` is missing. Let's try adding a value:

```
        shellsession
hiimeins@htb[/htb]$ curl http://IP:PORT/get.php?x=1

Invalid parameter value
x: 1
```

The server acknowledges the `x` parameter this time but indicates that the provided value (`1`) is invalid. This suggests that the application is indeed checking the value of this parameter and producing different responses based on its validity. We aim to find the specific value to trigger a different and hopefully more revealing response.

Manually guessing parameter values would be tedious and time-consuming. This is where `wenum` comes in handy. It allows us to automate the process of testing many potential values, significantly increasing our chances of finding the correct one.

Let's use `wenum` to fuzz the "`x`" parameter's value, starting with the `common.txt` wordlist from SecLists:

```
        shellsession
hiimeins@htb[/htb]$ wenum -w /usr/share/seclists/Discovery/Web-Content/common.txt --hc 404 -u "http://IP:PORT/get.php?x=FUZZ"

...
 Code    Lines     Words        Size  Method   URL 
...
 200       1 L       1 W        25 B  GET      http://IP:PORT/get.php?x=OA... 

Total time: 0:00:02
Processed Requests: 4731
Filtered Requests: 4730
Requests/s: 1681
```

- `-w`: Path to your wordlist.
- `--hc 404`: Hides responses with the 404 status code (Not Found), since `wenum` by default will log every request it makes.
- `http://IP:PORT/get.php?x=FUZZ`: This is the target URL. `wenum` will replace the parameter value `FUZZ` with words from the wordlist.

Analyzing the results, you'll notice that most requests return the "Invalid parameter value" message and the incorrect value you tried. However, one line stands out:

```
        bash
 200       1 L       1 W        25 B  GET      http://IP:PORT/get.php?x=OA...
```

This indicates that when the parameter `x` was set to the value "`OA...`," the server responded with a `200 OK` status code, suggesting a valid input.

If you try accessing `http://IP:PORT/get.php?x=OA...`, you'll see the flag.

```
        shellsession
hiimeins@htb[/htb]$ curl http://IP:PORT/get.php?x=OA...

HTB{...}
```

### POST

Fuzzing POST parameters requires a slightly different approach than fuzzing GET parameters. Instead of appending values directly to the URL, we'll use `ffuf` to send the payloads within the request body. This enables us to test how the application handles data submitted through forms or other POST mechanisms.

Our target application also features a POST parameter named "`y`" within the `post.php` script. Let's probe it with `curl` to see its default behavior:

```
        shellsession
hiimeins@htb[/htb]$ curl -d "" http://IP:PORT/post.php

Invalid parameter value
y:
```

The `-d` flag instructs `curl` to make a POST request with an empty body. The response tells us that the parameter `y` is expected but not provided.

As with GET parameters, manually testing POST parameter values would be inefficient. We'll use `ffuf` to automate this process:

```
        shellsession
hiimeins@htb[/htb]$ ffuf -u http://IP:PORT/post.php -X POST -H "Content-Type: application/x-www-form-urlencoded" -d "y=FUZZ" -w /usr/share/seclists/Discovery/Web-Content/common.txt -mc 200 -v

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__/\ /\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          /_/    /_/   /___/    /_/       

       v2.1.0-dev
________________________________________________

 :: Method           : POST
 :: URL              : http://IP:PORT/post.php
 :: Wordlist         : FUZZ: /usr/share/seclists/Discovery/Web-Content/common.txt
 :: Header           : Content-Type: application/x-www-form-urlencoded
 :: Data             : y=FUZZ
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200
________________________________________________

[Status: 200, Size: 26, Words: 1, Lines: 2, Duration: 7ms]
| URL | http://IP:PORT/post.php
    * FUZZ: SU...

:: Progress: [4730/4730] :: Job [1/1] :: 5555 req/sec :: Duration: [0:00:01] :: Errors: 0 ::
```

The main difference here is the use of the `-d` flag, which tells `ffuf` that the payload ("`y=FUZZ`") should be sent in the request body as `POST` data.

Again, you'll see mostly invalid parameter responses. The correct value ("`SU...`") will stand out with its `200 OK` status code:

```
        bash
000000326:  200     1 L      1 W     26 Ch     "SU..."
```

Similarly, after identifying "`SU...`" as the correct value, validate it with `curl`:

```
        shellsession
hiimeins@htb[/htb]$ curl -d "y=SU..." http://IP:PORT/post.php

HTB{...}
```

In a real-world scenario, these flags would not be present, and identifying valid parameter values might require a more nuanced analysis of the responses. However, this exercise provides a simplified demonstration of how to leverage `ffuf` to automate the process of testing many potential parameter values.
