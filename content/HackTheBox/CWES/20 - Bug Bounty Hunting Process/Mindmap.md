# Bug Bounty Hunting Process

## 🎯 Main Idea
- A bug bounty program (VRP) is continuous, crowdsourced, proactive security testing that supplements internal audits and pentests.
- This module is process/reporting-focused (no command cheatsheet): how programs are structured, how to write and score a good report, how to interact professionally, with worked report examples.
- Success = balance of technical capability and professionalism (clear reports, policy adherence, calm communication).

## 💥 Attack / Exploit Vectors
(Process stages and report structure — this is a concept-only module, so branches are workflow/documentation rather than exploits.)

### Stage 1 — Understand Bug Bounty Programs
- Program types: Private (invite-only, based on track record/consistency/violation history; may need background check), Public (open to all), Parent/Child (shared bounty pool across a company and subsidiaries).
- BBP ≠ VDP: a Vulnerability Disclosure Program only gives guidance on receiving third-party vuln reports; a Bug Bounty Program adds monetary incentives/rewards.
- Code of Conduct: read thoroughly — violation record matters; adhering makes you more effective and avoids disqualification.
- Program policy elements to read before testing: Vendor Response SLAs, Access, Eligibility Criteria, Responsible Disclosure Policy, Rules of Engagement, Scope, Out of Scope, Reporting Format, Rewards, Safe Harbor, Legal Terms, Contact Info.
- Finding programs: HackerOne Directory / bug-bounty program list; study real policies (e.g. Alibaba BBP, Amazon VRP).

### Stage 2 — Write a Good Report
- Goal: clear, concise, reproducible step-by-step; translate technical issues into business terms for less mature orgs.
- Essential report elements:
  - **Vulnerability Title** — type + affected domain/parameter/endpoint + impact
  - **CWE & CVSS score** — standardized weakness classification + severity
  - **Vulnerability Description** — root cause
  - **Proof of Concept (PoC)** — clear reproduction steps
  - **Impact** — what an attacker achieves; business impact / max damage
  - **Remediation** — optional in BBPs but valued
- Well-formatted reports minimize reproduction time and time-to-triage.

### Stage 3 — Score Severity with CVSS v3.1 (Base Score)
- **Attack Vector**: Network / Adjacent / Local / Physical
- **Attack Complexity**: Low / High
- **Privileges Required**: None / Low / High
- **User Interaction**: None / Required
- **Scope**: Unchanged / Changed (whether impact crosses security authorities, e.g. webserver → browser)
- **Confidentiality / Integrity / Availability**: None / Low / High each
- Use CWE (MITRE community weakness list; pick the initial vuln in a chain) + CVSS (FIRST.org standard) together.

### Stage 4 — Interact with the Organization / Triage Team
- Do not interact immediately — allow time to validate; check response SLAs; never spam.
- If no timely response and via a platform, escalate to Mediation.
- Tag the assigned triage member; only use official channels (never social media).
- On severity/bounty disagreement: justify your CVSS metric choices, re-check policy/scope compliance, then escalate to mediation if unresolved.

### Worked Report Example — Stored XSS
- CWE-79, CVSS 5.5 (Medium). Unsanitized uploaded filename reflected and stored → script runs when another admin views the file.
- PoC filename payload: `"><svg onload = alert(document.cookie)>.docx`
- Scoring rationale: AV:Network, AC:Low, PR:High (admin panel), UI:None, Scope:Changed (webserver→browser), C:Low, I:Low, A:None.

### Worked Report Example — CSRF
- CWE-352, CVSS 5.4 (Medium). No anti-CSRF token on consumer/fintech-app registration → craft malicious HTML form that submits as the victim.
- PoC: capture the POST in an intercepting proxy, build auto-submitting HTML page, deliver to a victim with an active session; can chain with XSS to run silently.
- Scoring rationale: AV:Network, AC:Low, PR:None, UI:Required (victim visits link), Scope:Unchanged, C:Low, I:Low, A:None.

### Worked Report Example — RCE (Java Deserialization)
- CWE-502, CVSS 9.8 (Critical). IBM WebSphere insecure Java object deserialization via base64 serialized objects (identified by the `rO0` header) over HTTPS port 8880.
- PoC: craft a SOAP request with a malicious serialized Java object (Apache Commons Collections gadget) carrying a `ping` command; confirm callback in Wireshark.
- Scoring rationale: AV:Network, AC:Low, PR:None, UI:None, Scope:Unchanged, C/I/A all High.

## 🛠️ Key Tools & Concepts
- HackerOne — bug bounty platform, program directory, Mediation, submitting-reports docs
- CWE (MITRE) — common weakness classification language
- CVSS v3.1 Calculator (FIRST.org) — standardized severity scoring (Base Score)
- Intercepting proxy (Burp Suite) + Wireshark — PoC capture/crafting and validating callbacks
- Core terms: VRP, BBP vs VDP, Safe Harbor, Scope / Out of Scope, Responsible Disclosure, SLA, triage, mediation

## 🛡️ Mitigations
- (Per worked examples, from a defender's view) XSS: sanitize/escape user-supplied data including filenames before reflecting or storing.
- CSRF: implement anti-CSRF tokens on state-changing requests.
- RCE/Deserialization: never deserialize untrusted data; validate input against allow-lists; keep libraries (e.g. Apache Commons Collections) patched.
