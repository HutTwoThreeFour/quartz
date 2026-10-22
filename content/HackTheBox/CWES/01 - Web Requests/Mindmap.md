# Web Requests

## 🎯 Main Idea
- Understand how web traffic works at the HTTP level: the anatomy of requests and responses, how clients and servers communicate.
- Learn to send and manipulate web requests manually with `cURL` and inspect them with browser DevTools.
- Foundation for all web penetration testing — knowing URLs, headers, methods, status codes, and APIs.

## 💥 Attack / Exploit Vectors
### URL Structure
- A URL has: scheme, user info, host, port, path, query string, fragment. Only scheme + host are mandatory.
- `User Info` (`admin:password@`) can carry basic-auth credentials in the URL.
- Query string (`?param=value&...`) is the common injection/parameter-tampering surface.

### HTTP Flow
- Client resolves domain via DNS (local `/etc/hosts` checked first), then sends GET to port 80, server returns index + status code.
- `/etc/hosts` can be edited to manually map an IP to a domain (useful for vhosts / lab targets).

### HTTP Requests & Responses
- Request line = Method + Path + Version; followed by headers, then optional body.
- Response line = Version + Status code; followed by headers, then optional body (HTML/JSON/binary).
- HTTP/1.x = clear-text, newline-separated; HTTP/2.x = binary dictionary form.
- **Commands**
  - `curl inlanefreight.com -v` — print full HTTP request/response details
  - `curl -i https://www.inlanefreight.com` — print response headers and body

### HTTP Headers
- Categories: General, Entity (representation), Request, Response, Security headers.
- Security-relevant headers: `Host` (host header injection, vhost enum), `Referer`/`X-Forwarded-For` (spoofable, bypass IP controls), `Authorization` (Basic/Bearer/Digest), `Set-Cookie` (`Secure`/`HttpOnly`/`SameSite`).
- `Transfer-Encoding` vs `Content-Length` mismatch → HTTP request smuggling.
- **Commands**
  - `curl -I https://www.inlanefreight.com` — HEAD request, only response headers
  - `curl https://www.inlanefreight.com -A 'Mozilla/5.0'` — set User-Agent
  - `curl -H 'Authorization: Basic YWRtaW46YWRtaW4=' http://<SERVER_IP>:<PORT>/` — set request header
  - `curl -b 'PHPSESSID=c1nsa6op7vtk7kdis7bcnbadf1' http://<SERVER_IP>:<PORT>/` — set request cookies

### HTTP Methods & Status Codes
- Methods: `GET`, `POST`, `HEAD`, `PUT` (create — abuse to upload), `DELETE` (remove — abuse for DoS), `OPTIONS` (enumerate allowed methods), `PATCH`.
- Status classes: 1xx info, 2xx success, 3xx redirect, 4xx client error, 5xx server error.
- Key codes: `200 OK`, `302 Found`, `400`, `403 Forbidden`, `404`, `500`.

### GET Requests
- Pass data via query strings in the URL; used for authentication (basic auth) and parameter passing.
- **Commands**
  - `curl 'http://<SERVER_IP>:<PORT>/search.php?search=le'` — pass GET parameters
  - `curl -u admin:admin http://<SERVER_IP>:<PORT>/` — set HTTP basic auth credentials
  - `curl http://admin:admin@<SERVER_IP>:<PORT>/` — pass basic-auth creds in URL
  - `curl -k https://inlanefreight.com` — skip SSL certificate validation

### POST Requests
- Sends data in the request body; handles forms, logins, file uploads, JSON.
- **Commands**
  - `curl -X POST -d 'username=admin&password=admin' http://<SERVER_IP>:<PORT>/` — send POST form data
  - `curl -X POST -d '{"search":"london"}' -H 'Content-Type: application/json' http://<SERVER_IP>:<PORT>/search.php` — POST JSON data

### CRUD APIs
- APIs map HTTP methods to DB operations: Create=POST, Read=GET, Update=PUT (PATCH for partial), Delete=DELETE.
- Unrestricted write/delete access to API entities is a vulnerability; access control + cookie/JWT auth required.
- **Commands**
  - `curl http://<SERVER_IP>:<PORT>/api.php/city/london` — Read entry
  - `curl -s http://<SERVER_IP>:<PORT>/api.php/city/ | jq` — Read all entries
  - `curl -X POST http://<SERVER_IP>:<PORT>/api.php/city/ -d '{"city_name":"HTB_City", "country_name":"HTB"}' -H 'Content-Type: application/json'` — Create entry
  - `curl -X PUT http://<SERVER_IP>:<PORT>/api.php/city/london -d '{"city_name":"New_HTB_City", "country_name":"HTB"}' -H 'Content-Type: application/json'` — Update entry
  - `curl -X DELETE http://<SERVER_IP>:<PORT>/api.php/city/New_HTB_City` — Delete entry

## 🛠️ Key Tools & Concepts
- `cURL` — command-line HTTP client for scripting and manual request crafting.
- `jq` — pretty-prints / parses JSON API responses.
- Browser DevTools — Network tab (`CTRL+SHIFT+E`), Console (`CTRL+SHIFT+K`), open with `F12` / `CTRL+SHIFT+I`.
- HTTPS — HTTP over TLS, default port 443; `-k` skips cert validation.

## 🛡️ Mitigations
- Use HTTPS + `Strict-Transport-Security` to prevent sniffing.
- Set cookie flags `Secure`, `HttpOnly`, `SameSite` to mitigate theft and CSRF.
- Apply security headers (CSP, X-Content-Type-Options, X-Frame-Options) and genericize the `Server` header.
- Restrict dangerous methods (PUT/DELETE) and enforce per-user access control on API operations.
