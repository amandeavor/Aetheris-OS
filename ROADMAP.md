# Roadmap

The roadmap prioritizes a verifiable developer preview over feature count. Dates will be added only when the required work and maintainers are known.

## Now: make the repository reproducible

- [x] Select a repository license after reviewing the origin and compatibility of existing files (GNU GPL-3.0).
- [ ] Document one supported Void Linux development environment.
- [ ] Add fixture-based tests for PCI and USB profile matching.
- [ ] Make Rust formatting and non-linking checks pass in CI.
- [ ] Compile VelocityMind with warnings treated as errors.
- [ ] Reconcile the implementation manifest with the actual component state.
- [ ] Define a safe, non-destructive ISO build dry run.

## Next: prove the system components

- [ ] Validate package templates with `xbps-src` in a clean build environment.
- [ ] Replace placeholder or simulated progress in installer and store flows.
- [ ] Add failure-injection tests for partition and package operations.
- [ ] Test driver-profile selection against a curated hardware fixture set.
- [ ] Document and benchmark the preloader against a no-preload baseline.
- [ ] Complete keyboard-only and screen-reader review of graphical flows.

## Later: developer preview

- [ ] Produce a bootable artifact from a documented commit and clean builder.
- [ ] Publish checksums, signing information, known limitations, and rollback guidance.
- [ ] Run installation tests across a small VM matrix.
- [ ] Tag a clearly labeled developer-preview release.

## Projects that need owners

These are good candidates for contributors who want deeper responsibility:

1. **Hardware fixture suite:** define a stable fixture format and cover common GPU, Wi-Fi, and hybrid-laptop cases.
2. **Build reproducibility:** create a documented Void Linux container or VM path for component checks.
3. **Installer safety:** separate planning from execution so partition layouts can be tested without touching disks.
4. **Package validation:** check Aetheris templates against current Void package policy and surface actionable errors.
5. **Accessibility:** create and maintain an accessibility checklist for the installer, store, and setup wizard.

Open a Discussion if you want to own one of these areas. Ownership starts with a scoped design and reviewed implementation, then can grow into component maintainership under [GOVERNANCE.md](GOVERNANCE.md).
