# API Fuzzing

---

API fuzzing is a specialized form of fuzzing tailored for web APIs. While the core principles of fuzzing remain the same – sending unexpected or invalid inputs to a target – API fuzzing focuses on the unique structure and protocols used by web APIs.

API fuzzing involves bombarding an API with a series of automated tests, where each test sends a slightly modified request to an API endpoint. These modifications might include:

- Altering parameter values
- Modifying request headers
- Changing the order of parameters
- Introducing unexpected data types or formats

The goal is to trigger API errors, crashes, or unexpected behavior, revealing potential vulnerabilities like input validation flaws, injection attacks, or authentication issues.

## Why Fuzz APIs?

API fuzzing is crucial for several reasons:

- `Uncovering Hidden Vulnerabilities`: APIs often have hidden or undocumented endpoints and parameters that can be susceptible to attacks. Fuzzing helps uncover these hidden attack surfaces.
- `Testing Robustness`: Fuzzing assesses the API's ability to gracefully handle unexpected or malformed input, ensuring it doesn't crash or expose sensitive data.
- `Automating Security Testing`: Manual testing of all possible input combinations is infeasible. Fuzzing automates this process, saving time and effort.
- `Simulating Real-World Attacks`: Fuzzing can mimic the actions of malicious actors, allowing you to identify vulnerabilities before attackers exploit them.

## Types of API Fuzzing

There are 3 primary types of API fuzzing

1. `Parameter Fuzzing` - One of the primary techniques in API fuzzing, parameter fuzzing focuses on systematically testing different values for API parameters. This includes query parameters (appended to the API endpoint URL), headers (containing metadata about the request), and request bodies (carrying the data payload). By injecting unexpected or invalid values into these parameters, fuzzers can expose vulnerabilities like injection attacks (e.g., SQL injection, command injection), cross-site scripting (XSS), and parameter tampering.
2. `Data Format Fuzzing` - Web APIs frequently exchange data in structured formats like JSON or XML. Data format fuzzing specifically targets these formats by manipulating the structure, content, or encoding of the data. This can reveal vulnerabilities related to parsing errors, buffer overflows, or improper handling of special characters.
3. `Sequence Fuzzing` - APIs often involve multiple interconnected endpoints, where the order and timing of requests are crucial. Sequence fuzzing examines how an API responds to sequences of requests, uncovering vulnerabilities like race conditions, insecure direct object references (IDOR), or authorization bypasses. By manipulating the order, timing, or parameters of API calls, fuzzers can expose weaknesses in the API's logic and state management.

## Exploring the API

**To follow along, start the target system via the question section at the bottom of the page, replacing the uses of IP:PORT with the IP:PORT for your spawned instance.**

This API provides automatically generated documentation via the `/docs` endpoint, `http://IP:PORT/docs`. The following page outlines the API's documented endpoint.

![FastAPI interface showing endpoints: GET /, GET /items/{item_id}, DELETE /items/{item_id}, PUT /items/{item_id}, POST /items/.](resources/apispec.png)

The specification details five endpoints, each with a specific purpose and method:

1. `GET /` (Read Root): This fetches the root resource. It likely returns a basic welcome message or API information.
2. `GET /items/{item_id}` (Read Item): Retrieves a specific item identified by `item_id`.
3. `DELETE /items/{item_id}` (Delete Item): Deletes an item identified by `item_id`.
4. `PUT /items/{item_id}` (Update Item): Updates an existing item with the provided data.
5. `POST /items/` (Create Or Update Item): This function creates a new item or updates an existing one if the `item_id` matches.

While the Swagger specification explicitly details five endpoints, it's crucial to acknowledge that APIs can contain undocumented or "hidden" endpoints that are intentionally omitted from the public documentation.

These hidden endpoints might exist to serve internal functions not meant for external use, as a misguided attempt at security through obscurity, or because they are still under development and not yet ready for public consumption.

## Fuzzing the API

We will use a fuzzer that will use a wordlist in an attempt to discover these undocumented endpoints. Run the commands to pull, install the requirements, and run the fuzzer:

```
        shellsession
hiimeins@htb[/htb]$ git clone https://github.com/PandaSt0rm/webfuzz_api.git
hiimeins@htb[/htb]$ cd webfuzz_api
hiimeins@htb[/htb]$ pip3 install -r requirements.txt
```

Then, run the fuzzer using the spawned target IP and PORT

```
        shellsession
hiimeins@htb[/htb]$ python3 api_fuzzer.py http://IP:PORT

[-] Invalid endpoint: http://localhost:8000/~webmaster (Status code: 404)
[-] Invalid endpoint: http://localhost:8000/~www (Status code: 404)

Fuzzing completed.
Total requests: 4730
Failed requests: 0
Retries: 0
Status code counts:
404: 4727
200: 2
405: 1
Found valid endpoints:
- http://localhost:8000/cz...
- http://localhost:8000/docs
Unusual status codes:
405: http://localhost:8000/items
```

- The fuzzer identifies numerous invalid endpoints (returning `404 Not Found` errors).
- Two valid endpoints are discovered:
  - `/cz...`: This is an undocumented endpoint as it doesn't appear in the API documentation.
  - `/docs`: This is the documented Swagger UI endpoint.
- The `405 Method Not Allowed` response for `/items` suggests that an incorrect HTTP method was used to access this endpoint (e.g., trying a `GET` request instead of a `POST`).

We can explore the undocumented endpoint via curl and it will return a flag:

```
        shellsession
hiimeins@htb[/htb]$ curl http://localhost:8000/cz...

{"flag":"<snip>"}
```

In addition to discovering endpoints, fuzzing can be applied to the parameters these endpoints accept. By systematically injecting unexpected values into parameters, you can trigger errors, crashes, or unexpected behavior that could expose a wide range of vulnerabilities. For example, consider the following scenarios:

- `Broken Object-Level Authorization`: Fuzzing could reveal instances where manipulating parameter values can allow unauthorized access to specific objects or resources.
- `Broken Function Level Authorization`: Fuzzing might uncover cases where unauthorized function calls can be made by manipulating parameters, allowing attackers to perform actions they cannot.
- `Server-Side Request Forgery (SSRF)`: Injections of malicious values into parameters could trick the server into making unintended requests to internal or external resources, potentially exposing sensitive information or facilitating further attacks.

To explore these and other web API vulnerabilities and attacks in more detail, [refer to the API Attacks module](https://academy.hackthebox.com/module/details/268). Understanding these risks is crucial for building secure and resilient APIs.
