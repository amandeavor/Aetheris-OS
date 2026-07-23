# Sub-Plan 01: Kernel & Core System Optimization

This plan covers the compilation of the performance-tuned Linux kernel, runit service supervision templates, virtual memory configuration, and out-of-memory protections.

---

## 1. Kernel Compilation Targets

### Build Environment Requirements
- **Compiler:** LLVM/Clang 19 with `ld.lld`
- **Compiler Optimizations:** ThinLTO (Thin Link-Time Optimization) + AutoFDO (Auto Feedback-Directed Optimization)
- **Target CPU Flags:** `x86-64-v3` or `x86-64-v4` (requires AVX2, FMA3, BMI1/2)

### Core Kernel Configuration Overrides (`.config`):
```ini
# Low Latency Scheduling Tick and Preemption
CONFIG_HZ_1000=y
CONFIG_HZ=1000
CONFIG_PREEMPT=y
CONFIG_PREEMPT_DYNAMIC=y

# Compiler Toolchain Customizations
CONFIG_CC_IS_CLANG=y
CONFIG_LD_IS_LLD=y
CONFIG_LTO_CLANG_THIN=y
CONFIG_AUTOFDO_CLANG=y
CONFIG_CLANG_AUTOFDO_PROFILE="/var/cache/aetheris/kernel.afdo"

# Extensible Scheduler Class (sched-ext)
CONFIG_SCHED_CLASS_EXT=y
CONFIG_BPF=y
CONFIG_BPF_SYSCALL=y
CONFIG_BPF_JIT=y
CONFIG_BPF_JIT_ALWAYS_ON=y
CONFIG_DEBUG_INFO_BTF=y
CONFIG_PAHOLE_HAS_SPLIT_BTF=y
CONFIG_PAHOLE_HAS_BTF_TAG=y

# Burst-Oriented Response Enhancer (BORE) CPU Scheduler
CONFIG_SCHED_BORE=y
```

### Void Linux `srcpkgs` Build Template:
Location: `srcpkgs/linux-aetheris/template`
- Downloads vanilla Linux kernel and applies BORE scheduler patches.
- Compiles the custom binary using `make LLVM=1 LLVM_IAS=1 -j$(nproc)`.
- Installs compiled binaries (`vmlinuz`, `System.map`, modules) directly into target boot directories.

---

## 2. Non-Systemd ZRAM Lifecycle Management

Aetheris OS utilizes a custom `runit` service instead of systemd's zram-generator configuration.

### Runit Service Initialization script (`/etc/sv/zram-init/run`):
- Checks for kernel `zram` module availability.
- Triggers ZRAM device setup using the fast `zstd` compression algorithm.
- Computes `MemTotal` from `/proc/meminfo` and allocates **150% ZRAM target size**.
- Mounts `/dev/zram0` as compressed swap space with high priority (`-p 100`).

### Runit Service Teardown script (`/etc/sv/zram-init/finish`):
- Disables active swap space (`swapoff /dev/zram0`).
- Resets ZRAM disk cache allocations to release memory page tables.

---

## 3. Anti-Thrashing Optimization Configuration

To prevent older mechanical disks (HDDs) or hybrid SSHDs from locking up under high write queues:
Location: `/etc/sysctl.d/99-aetheris-memory.conf`

```ini
# Force anonymous allocations into compressed ZRAM early
vm.swappiness = 150

# Maintain directory indices cached in memory
vm.vfs_cache_pressure = 50

# Keep dirty background flushes restricted to 16MB of system writes
vm.dirty_background_bytes = 16777216

# Force active write serialization once dirty pages hit 32MB
vm.dirty_bytes = 33554432

# Set dirty page maximum age before writeback to 30 seconds
vm.dirty_expire_centisecs = 3000

# Flush unwritten pages to disk every 15 seconds
vm.dirty_writeback_centisecs = 1500

# Zero-out page cluster operations to maximize zstd CPU throughput
vm.page-cluster = 0
```

---

## 4. nohang-desktop Configuration (PSI OOM Safeguards)

To monitor system load Stall Info and protect the user shell:
Location: `/etc/nohang/nohang-desktop.conf`

```ini
# Enable Pressure Stall Information checks
psi_checking_enabled = True
psi_path = /proc/pressure/memory
psi_metrics = some_avg10
psi_threshold_some_avg10 = 40.0

# Memory Threshold bounds
soft_threshold_min_mem = 6 %
hard_threshold_min_mem = 3 %
soft_threshold_min_swap = 8 %
hard_threshold_min_swap = 4 %

# Badness Adjustments (SIGKILL targets vs protected services)
@BADNESS_ADJ_RE_REALPATH -1000 /// ^(/usr/bin/labwc|/usr/bin/sfwbar|/usr/bin/dbus-daemon)$
@BADNESS_ADJ_RE_NAME -1000 /// ^(labwc|sfwbar|dbus-daemon)$
@BADNESS_ADJ_RE_REALPATH -900 /// ^(/usr/sbin/runsvdir|/usr/sbin/runsv|/usr/sbin/udevd)$

# Eviction targets
@BADNESS_ADJ_RE_NAME 500 /// ^(chrome|firefox|brave|chromium|Web Content|Privileged Cont)$
@BADNESS_ADJ_RE_NAME 600 /// ^(wine-preloader|wine64-preloader|wineserver)$
```
