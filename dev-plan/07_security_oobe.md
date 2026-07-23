# Sub-Plan 07: Security Hardening & First-Boot Experience (OOBE)

This plan details Mandatory Access Control (MAC), Secure Boot integration, nftables firewall setup, and the custom GTK4 setup wizard.

---

## 1. Mandatory Access Control (AppArmor)

Aetheris OS uses AppArmor (under 10MB memory usage) instead of SELinux (85MB+ overhead and high file-open latencies) to confine desktop applications.
- Default path-centric profiles confine standard network browsers and media utilities.
- Flatpak global overrides located at `/var/lib/flatpak/overrides/global` drop access to user data (`~/.ssh`) and system metrics (`/sys`) by default.

---

## 2. Secure Boot Integration

- **Signed Unified Kernel Images (UKI):** Combines the kernel, initramfs, cmdline, and standard boot stub into a single EFI executable.
- **MOK Signing:** Signs UKIs with custom Machine Owner Keys (MOK) on every package update.
- **TPM2 auto-unlock:** Bounds the cryptsetup volume key to PCR 7 (Secure Boot) and PCR 15 (initramfs measurement), preventing filesystem confusion attacks.

---

## 3. Workstation Firewall (nftables)

Stateful firewall rules are applied at `/etc/nftables.conf`:
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

---

## 4. First-Boot Setup Wizard (VelocitySetup)

### Core Technologies:
- **UI:** Native GTK4 + Libadwaita compiled binary (under 16MB active RAM, launches in under 0.4s).
- **Accessibility:** Offers immediate Orca screen reader, large text, and color-blindness filter overrides on the welcome screen.
- **Background Drivers:** Spawns a background thread running `chwd --autoconfigure` throttled with `ionice -c 3` and `nice -n 19` to silently configure GPU/Wi-Fi drivers without causing interface lag.
- **Theme Exporter:** Compiles theme choice and writes configuration variables to GTK4, Qt6, and Labwc stylesheets simultaneously.
