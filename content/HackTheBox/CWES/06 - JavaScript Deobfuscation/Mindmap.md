# JavaScript Deobfuscation

## 🎯 Main Idea
- Obfuscation rewrites JavaScript to be hard for humans to read while keeping identical functionality; it is common client-side because JS is sent to the browser in cleartext.
- As an attacker/analyst, the goal is to reverse the process (beautify, deobfuscate, decode) to understand what the script does and uncover hidden functionality, endpoints, and secrets.
- Obfuscated code often hides encoded text (base64/hex/rot13) that is decoded at runtime; recovered logic can reveal unreleased/undeployed server-side features worth probing.

## 💥 Attack / Exploit Vectors

### Understanding Obfuscation Techniques
- Know how code is obscured so it can be reversed, especially with custom obfuscators.
- Minification: whole code on one line (`.min.js`); packing: six-arg function `function(p,a,c,k,e,d)` rebuilds code from a word/symbol dictionary.
- Advanced tools (obfuscator.io with Base64 string arrays, JSFuck, JJ Encode, AA Encode) hide all cleartext strings but slow execution.
- **Commands**
  - `eval(function(p,a,c,k,e,d){...})` — packer signature (six arguments) to recognize packed code

### Beautifying & Deobfuscating
- First beautify/pretty-print minified code, then run it through a deobfuscator to recover readable logic; packing can also be undone by `console.log`-ing the packer's return value instead of executing it.
- Browser Dev Tools debugger (Firefox `CTRL+SHIFT+Z`) pretty-prints with the `{ }` button; online tools finish the job.
- Heavily encoded/encrypted or custom-obfuscated code may require manual reverse engineering.
- **Commands**
  - `ctrl+u` — show HTML source code in Firefox (find referenced scripts)

### Code Analysis for Hidden Functionality
- Read the recovered functions line by line to learn behavior (e.g., an `XMLHttpRequest` that POSTs to `/serial.php`).
- Unused/future functions often hold undeployed, buggy, or vulnerable server-side behavior worth replicating.

### Replicating Requests (cURL)
- Replay the script's discovered HTTP request manually to see how the server responds and trigger hidden logic.
- **Commands**
  - `curl http://SERVER_IP:PORT/` — GET request to view page/source
  - `curl -s http://SERVER_IP:PORT/ -X POST` — replicate an empty POST request
  - `curl -s http://SERVER_IP:PORT/ -X POST -d "param1=sample"` — POST request with data

### Decoding Encoded Payloads
- Obfuscated scripts embed base64/hex/rot13 strings; identify the encoding (padding `=` for base64, 0-9a-f for hex, letter-mapping for rot13) and decode.
- **Commands**
  - `echo hackthebox | base64` — base64 encode
  - `echo ENCODED_B64 | base64 -d` — base64 decode
  - `echo hackthebox | xxd -p` — hex encode
  - `echo ENCODED_HEX | xxd -p -r` — hex decode
  - `echo hackthebox | tr 'A-Za-z' 'N-ZA-Mn-za-m'` — rot13 encode
  - `echo ENCODED_ROT13 | tr 'A-Za-z' 'N-ZA-Mn-za-m'` — rot13 decode

## 🛠️ Key Tools & Concepts
- JSConsole (jsconsole.com) — run/verify JS code output.
- Prettier (prettier.io/playground) & Beautifier (beautifier.io) — pretty-print/beautify code.
- JSNice (jsnice.org) — deobfuscation/renaming.
- UnPacker (matthewfl.com/unPacker.html) — unpack packed JS.
- javascript-minifier.com / beautifytools.com / obfuscator.io / jsfuck.com — minify and obfuscate.
- Cipher Identifier (boxentriq.com) — detect encoding types.
- Concepts: minification vs packing vs advanced obfuscation; Source/Sink; encoding vs encryption (key stored in-script or not).
