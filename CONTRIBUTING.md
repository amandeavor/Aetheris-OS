# Contributing to Aetheris OS

Thanks for helping build Aetheris. The project is early enough that a focused contribution can shape a whole component, but system-level changes also carry real risk. This guide keeps changes reviewable and safe.

## Before you start

- For small fixes, comment on the issue you plan to address.
- For a new component or architectural change, start a GitHub Discussion first.
- Do not test destructive installer, partitioning, package-management, or firewall changes on a machine containing important data. Use a disposable virtual machine.
- Do not include generated activity, copied code without a compatible license, secrets, private keys, or binary build output.

If no issue covers your idea, use the feature proposal form. A maintainer will help narrow it into a testable change.

## Good first contributions

Useful entry points include:

- add unit-test fixtures for PCI or USB profile matching;
- document a component's dependencies and expected output;
- improve error messages without changing system behavior;
- validate package templates against current Void Linux conventions;
- add accessibility labels and keyboard behavior to an existing interface;
- reproduce and document one item from the technical-debt register.

Issues labeled `good first issue` should include the relevant files, acceptance criteria, and a validation command. Ask on the issue if any of those are missing.

## Development setup

A Linux host or VM is recommended. Some Rust code can be checked elsewhere, but components that link GTK, WebKitGTK, libxbps, or other system libraries require Linux development packages.

Clone your fork and create a topic branch:

```bash
git clone https://github.com/YOUR-USERNAME/Aetheris-OS.git
cd Aetheris-OS
git switch -c fix/short-description
```

### Hardware utility

```bash
cargo fmt --manifest-path chwd_port/Cargo.toml -- --check
cargo check --manifest-path chwd_port/Cargo.toml
```

Running or linking `chwd_port` requires libxbps on the target system. Prefer unit tests and fixtures for matching logic.

### Preloader daemon

Install a C compiler, Make, pthreads, and SQLite development headers, then run:

```bash
make -C velocitymind
```

### Installer, store, and first-boot setup

These components currently need additional build-environment work. Read [docs/component-status.md](docs/component-status.md) before changing them and include the exact host and dependencies used in your pull request.

## Pull requests

Keep each pull request focused on one problem. A useful pull request includes:

- the user-visible or technical problem;
- why the chosen change is safe;
- tests or a reproducible manual validation;
- screenshots for interface changes;
- documentation updates when behavior or dependencies change.

Draft pull requests are welcome for early technical feedback. Mark the pull request ready only after completing the template and checking the diff for unrelated changes.

## Commit messages

Use a short imperative subject. A prefix is helpful but not mandatory:

```text
fix(chwd): reject malformed PCI class identifiers
docs(build): explain the Void Linux host dependencies
test(store): cover empty AppStream metadata
```

Do not split one logical change into empty or cosmetic commits. Maintainers may squash a pull request when merging.

## Review and merge

A maintainer checks correctness, safety, scope, validation, and licensing. Changes that can modify partitions, boot state, firewall rules, package databases, or credentials require especially careful review and should fail closed.

Approval does not guarantee immediate merge. A change may wait for a compatible build environment or another reviewer.

## Becoming a maintainer

People who repeatedly contribute and review a component can be nominated to maintain it. The expectations and decision process are documented in [GOVERNANCE.md](GOVERNANCE.md).
