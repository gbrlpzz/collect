# Security Policy

## Threat Model and Scope

`collect` is an offline-first field data collection system designed for
trustworthy research evidence. It handles authentication, project membership,
Row-Level Security (RLS) enforcement, research observations, sensitive GPS
coordinates, private photo and audio media, participant consent records, local
IndexedDB storage, Supabase/PostgreSQL databases, private Supabase Storage
buckets, Edge Functions with service-role credentials, and FAIR research export
packages.

We treat security vulnerabilities with high priority, especially those that
affect data confidentiality, participant privacy, local storage durability, or
evidence integrity.

## What Constitutes a Security Vulnerability

The following issues should be reported privately under this security policy:

- **Authentication & session security**: Authentication bypass, token or
  session hijacking, magic-link leakage, or device-link code bypass.
- **Authorization & RLS**: Project membership bypass, administrator privilege
  escalation, allow-list bypass, cross-project data disclosure, or any RLS
  policy defect.
- **Data confidentiality**: Unauthorized read or write access to observations,
  drafts, participant consent records, or private media files in storage.
- **Credential exposure**: Exposure of service-role keys, database credentials,
  signing secrets, or external API keys.
- **Durability & sync integrity**: Synchronization behavior that marks
  unsynchronized data as `SYNCED` without a verified server receipt, silent loss
  or corruption of locally committed records, or bypass of server-side consent
  enforcement.
- **Evidence immutability**: Unauthorized modification or deletion of finalized
  submissions, audit logs, or published schema versions.
- **Export & provenance integrity**: Cryptographic hash forgery or provenance
  manipulation in FAIR checkpoint exports.
- **Injection & processing**: Unsafe processing, injection, or deserialization
  vulnerabilities in schema parsing, media handling, or Edge Functions.
- **Dependency vulnerabilities**: Known vulnerabilities in upstream
  dependencies with a demonstrable attack vector against the application.

### Ordinary Bugs

Non-sensitive issues should be filed through regular
[GitHub Issues](https://github.com/gbrlpzz/collect/issues):

- User interface rendering glitches, styling bugs, and minor UX issues.
- Ordinary network retry behavior that does not compromise receipts.
- Feature requests and schema extension proposals.
- Documentation typos or non-security link updates.

## Reporting a Vulnerability

> [!CAUTION]
> **Do not report security vulnerabilities in public GitHub issues or discussions.**

### Preferred Route: GitHub Private Vulnerability Reporting

Use GitHub's private vulnerability reporting feature to submit your report
directly to the maintainer:

👉 **[Submit a Private Security Advisory](https://github.com/gbrlpzz/collect/security/advisories/new)**

### Alternative Route

If you cannot access the GitHub advisory form, you may contact the maintainer,
Gabriele Pizzi, privately via GitHub ([@gbrlpzz](https://github.com/gbrlpzz)) or
through maintainer contact at [https://gabrielepizzi.com](https://gabrielepizzi.com).

### What to Include

To help us investigate and resolve the issue quickly, please provide:

1. A clear description of the vulnerability and its potential impact.
2. Step-by-step reproduction instructions or a minimal proof of concept.
   _Please strip any real research data, credentials, personal information, or live GPS coordinates from the report._
3. The affected component (React client, Edge Functions, Postgres/RLS migration, storage configuration, or export pipeline).
4. Any proposed remediations or patches, if available.

## Response Process

- **Acknowledgment**: You can expect confirmation that your report was received and is being evaluated.
- **Investigation**: We will investigate the issue privately to verify the vulnerability and assess impact.
- **Remediation**: A fix will be developed, tested against the test suite (`npm run check` and `deno check`), and prepared for release.
- **Disclosure**: Once a patched release is published, we will coordinate public disclosure through a GitHub Security Advisory, giving appropriate credit to the reporter.

## Supported Versions

`collect` is currently pre-1.0 software. Development moves quickly on the main branch.

| Version | Supported          | Notes                                                   |
| :------ | :----------------- | :------------------------------------------------------ |
| Latest  | :white_check_mark: | The most recent published release receives patches.     |
| `main`  | :white_check_mark: | Development mainline; fixes land here first.            |
| < 0.1.2 | :x:                | Older pre-1.0 releases do not receive backported fixes. |

Deployments should stay up to date with the latest published release.
