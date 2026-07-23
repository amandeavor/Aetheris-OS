# Security Hardening — VelocityShield

## Current State of the Art

Standard desktop Linux installations often leave critical attack vectors unmitigated.

**Mandatory Access Control (MAC):** While SELinux provides fine-grained security policies, it introduces substantial runtime complexity and memory overhead. SELinux implements 217 LSM hooks (compared to AppArmor's 80), resulting in up to an 87% performance penalty in file open operations during micro-benchmarks. This makes SELinux highly impractical for a 1GB RAM target.

**Application Isolation:** Flatpak offers secure app confinement via bubblewrap and namespaces, but many packages declare overly permissive access overrides. This allows malicious payloads to escape the sandbox and access the host file system.

**Boot Path Integrity:** Standard installations leave the `/boot` partition unencrypted, leaving the initramfs and kernel exposed to physical tampering. In automatic TPM2 unsealing configurations, this exposure makes the system vulnerable to filesystem confusion attacks, where an attacker can mount a fake partition to capture the master key.

The table below compares key Linux Security Modules (LSMs) across metrics relevant to a lightweight, hardened desktop:

| Security Module | Mediation Model | LSM Hooks Implemented | RAM Memory Overhead | Policy Complexity (for Desktop Admins) |
|---|---|---|---|---|
| SELinux | Label-centric (Multi-Level / Type Enforcement) | 217 hooks | High (85MB+ allocation) | Extremely High (requires `audit2allow` tools) |
| AppArmor | Path-centric (Application Profiles) | 80 hooks | Minimal (<10MB allocation) | Moderate (human-readable profiles) |
| Landlock | Process-centric (API sandbox rules) | Dynamic | Virtually Zero | High (un-integrated with global frameworks) |

Additionally, standard graphical authentication agents are often heavy and poorly optimized. To maintain low memory overhead, the system requires a lightweight, secure Polkit agent that can process authentication requests efficiently while protecting user credentials.

---

## Recommended Technology Stack

The distribution's security architecture is designed to enforce maximum hardening with minimal performance overhead.

**Mandatory Access Control: AppArmor.** Its path-centric approach keeps policy definitions clean, human-readable, and highly efficient. This design introduces virtually zero file-access latency, preserving CPU cycles on legacy hardware.

**Sandboxing Subsystem: Bubblewrap-backed Flatpak.** Default configurations are hardened by setting strict overrides in `/var/lib/flatpak/overrides/global`. This file blocks access to sensitive paths (such as `~/.ssh` and `/sys`) unless a sandboxed application explicitly requests authorization.

**Secure Boot Validation: Signed Unified Kernel Images (UKI).** The kernel, bootloader stub, and initramfs are combined into a single EFI executable and signed with a custom Machine Owner Key (MOK). This configuration is loaded directly by the motherboard firmware, preventing bootloader tampering.

**Local Cryptography Engine: `systemd-cryptenroll` paired with TPM2.**

**Graphical Authentication: Phylax Polkit Agent.** Written in GTK4 and Rust, Phylax provides a secure, minimal dialogue window. It zeroizes memory-mapped password buffers immediately after use, preventing credentials scraping.

**Network Firewall: nftables.** It replaces legacy iptables with a modern, stateful network filtering engine.

To enforce a strict network security policy, the system deploys a stateful firewall configuration at `/etc/nftables.conf`:

```nft
table inet workstation_firewall {
    chain inbound_protection {
        type filter hook input priority 0; policy drop;
        # Accept established and related connection states
        ct state established,related accept
        # Permit all local loopback traffic
        iif "lo" accept
        # Drop invalid packet flags
        ct state invalid drop
        # Allow standard ICMP and ICMPv6 queries
        ip protocol icmp accept
        ip6 nexthdr icmpv6 accept
    }
}
```

This default-drop posture blocks all unsolicited inbound packets, allowing only established loopback and outgoing connections.

---

## Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                                HARDENED OS DESKTOP                               |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  |                             USER APPLICATION LAYER                        |  |
|  |  +---------------------+  +-------------------------+  +---------------+  |  |
|  |  | Sandboxed Flatpak   |  | Phylax Polkit Agent     |  | Host User     |  |  |
|  |  | (Strict overrides)  |  | (Memory Zeroisation)    |  | Space Apps    |  |  |
|  |  +----------+----------+  +------------+------------+  +-------+-------+  |  |
|  +-------------|--------------------------|-----------------------|----------+  |
|                | xdg-desktop-portal       | Polkit D-Bus          |             |
|                v                          v                       |             |
|  +-------------+--------------------------+-----------------------v----------+  |
|  |                             LINUX KERNEL SPACE                            |  |
|  |  +---------------------+  +-------------------------+  +---------------+  |  |
|  |  | AppArmor Profile    |  | Netfilter Engine        |  | Hardened      |  |  |
|  |  | (Path-based rules)  |  | (nftables rule enforce) |  | Sysctl Config |  |  |
|  |  +----------+----------+  +-------------------------+  +-------+-------+  |  |
|  +-------------|--------------------------------------------------|----------+  |
|                | Encrypted LUKS2 Key                              | Verifies   |
|                v                                                  v            |
|  +-------------+--------------------------------------------------+----------+  |
|  |                                HARDWARE LAYER                             |  |
|  |  +-------------------------------------+  +----------------------------+  |  |
|  |  | TPM2 Chip (Sealed to PCR 7 and 15)  |  | UEFI Secure Boot (MOK)     |  |  |
|  |  +-------------------------------------+  +----------------------------+  |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
```

---

## Implementation Roadmap

**Phase 1: Sysctl Hardening and Exploit Mitigation (Milestone 1)**
Deploy a custom configuration at `/etc/sysctl.d/99-hardened.conf` to restrict access to kernel pointers, enable strict ptrace limitations, disable core dumps, and restrict dmesg to root.

**Phase 2: Secure Boot and Signed UKI Generation (Milestone 2)**
Configure the dracut environment to output a single Unified Kernel Image (UKI). Create a local script that utilizes `sbsign` to sign the UKI with a custom Machine Owner Key (MOK) on every kernel update.

**Phase 3: Secure TPM2 Auto-Unlock (Milestone 3)**
Use `systemd-cryptenroll` to bind the LUKS2 target root partition to both PCR 7 (Secure Boot) and PCR 15 (Filesystem measurement). Create custom dracut modules that measure the LUKS volume key into PCR 15 during early boot, mitigating filesystem confusion attacks.

**Phase 4: AppArmor Profile Synthesis and Sandbox Hardening (Milestone 4)**
Build strict AppArmor profiles for sensitive user-facing applications. Configure default flatpak policies to drop network access, home folder permissions, and host socket paths unless explicitly overridden.

---

## Trade-off Analysis

To secure system-wide processes against memory inspection, the distribution enforces a ptrace restriction via sysctl:

```ini
kernel.yama.ptrace_scope = 2
```

While this successfully mitigates memory-scraping malware, it interferes with Proton's crash reporting tools and gaming debuggers. To balance security and performance, the distribution applies a specialized capability wrapper (`cap_sys_ptrace`) to Steam and Proton executables, allowing debugger access while maintaining global system protection.

Additionally, to prevent system compromise from unauthenticated local packages, the distribution enforces strict XBPS signature checks on all local packages, rejecting unsigned repositories.

---

## Open Research Questions

Further investigation is needed to determine how to securely manage sandboxed applications that require low-level GPU acceleration (e.g., Vulkan layers) without exposing local host graphics sockets (`/dev/dri/*`) or introducing potential sandboxing escape routes.
