# Technical Debt Register

This document registers known design compromises and technical workarounds implemented in Aetheris OS components, along with their long-term migration paths.

---

## 1. VelocityInstall: parted CLI Wrapper Workaround

### Context
The partition management backend for the installer (`velocityinstall/src-tauri/src/partition.rs`) currently executes subprocess command invocations to the command-line `parted` utility (via `std::process::Command`) to create partition tables, format layouts, and resize filesystems.

### Debt Details
* **Spawning Overhead:** Spawning subprocess shells consumes more CPU context shifts than direct library calls.
* **Fragile Output Parsing:** Interacting with parted via standard CLI arguments is prone to variations across program versions, requiring fragile string parsing of standard outputs.
* **FFI Complexity:** Direct Rust FFI bindings to C-based `libparted` (e.g. via raw bindings or `parted-rs`) were deferred to maintain rapid development velocity and avoid unstable native header compilation issues in live boot environments.

### Long-term Migration Path
* **Target:** Port the partition management logic to use native `libparted` Rust FFI bindings directly.
* **Approach:** Enforce schema validation at compile time, bind to `libparted`'s device and geometry struct pointers, and utilize async Rust channels to receive block allocation updates.
* **Blocked by:** Resolving static linking configuration conflicts for `libparted-sys` when building static release targets.
