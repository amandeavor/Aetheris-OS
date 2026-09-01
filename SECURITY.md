# Security Policy

## Supported versions

Aetheris OS has not published a supported release. Security fixes currently target the default branch and may change interfaces without notice.

## Reporting a vulnerability

Please do not open a public issue for a vulnerability that could expose users, credentials, signing keys, package integrity, installer data, or host security.

Use the repository's **Security** tab to submit a private vulnerability report. Include:

- the affected file or component;
- the impact and conditions required to trigger it;
- reproduction steps or a minimal proof of concept;
- any suggested mitigation;
- whether the issue is already public.

You should receive an acknowledgement within seven days. Because the project is maintained on a best-effort basis, a complete fix timeline cannot be guaranteed, but confirmed reports will be prioritized and coordinated before public disclosure.

## High-risk areas

Please treat findings in these areas as security-sensitive:

- disk partitioning, encryption, and boot configuration;
- repository signing and package installation;
- privileged helpers and runit services;
- AppArmor, Landlock, Bubblewrap, and firewall rules;
- Windows executable handling;
- telemetry, crash reporting, and credentials.

Never commit real private keys, passwords, machine identifiers, or production signing material to this repository.
