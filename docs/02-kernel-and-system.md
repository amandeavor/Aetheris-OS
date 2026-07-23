# Kernel & System Architecture Optimization

Achieving high responsiveness on systems limited to 1 GB of RAM requires structural changes to the operating system kernel, virtual memory manager, and system services. Standard kernel builds prioritize high-throughput enterprise servers or powerful desktop environments, which can exhaust physical memory on older or resource-constrained hardware. Implementing highly optimized, custom-compiled kernels is critical to reducing physical memory overhead and scheduler latency.

---

## Kernel Configurations and Compilation Optimization

The base operating system kernel must be compiled using Clang with Thin Link-Time Optimization (ThinLTO) enabled. Clang's ThinLTO yields highly optimized machine code by performing cross-module optimizations while maintaining manageable compilation times. To maximize instruction-level efficiency on target CPUs, compile flags must target x86-64-v3 or x86-64-v4 execution environments. These microarchitecture baselines mandate the presence of Advanced Vector Extensions (AVX2), Fused Multiply-Accumulate (FMA3), and BMI1/2 instructions, significantly reducing execution cycles for system libraries and kernel routines.

Additionally, compiling the kernel with Profile-Guided Optimization (PGO) or AutoFDO (Feedback-Directed Optimization) allows the compiler to reorganize code layouts based on real-world execution profiles. This optimizes the instruction cache (I-cache) hit rate by placing frequently executed hot code paths in contiguous memory addresses while relegating cold code paths to peripheral blocks. The kernel must be configured with a dynamic preemption model (`CONFIG_PREEMPT_DYNAMIC`) and a hardware timer frequency set to 1000 Hz. This configuration ensures a low-latency tick rate, reducing the worst-case scheduling latency to 1 ms, which is crucial for input event processing and high-refresh-rate display synchronization.

### Key Compilation Parameters

| Parameter | Value | Purpose |
|---|---|---|
| Compiler | Clang (latest stable) | Cross-module optimization via ThinLTO |
| LTO Mode | ThinLTO | Optimal balance of compile time and code quality |
| Target Architecture | x86-64-v3 / x86-64-v4 | Mandates AVX2, FMA3, BMI1/2 instruction sets |
| Optimization Profile | PGO / AutoFDO | Real-world execution profile-driven code layout |
| Preemption Model | `CONFIG_PREEMPT_DYNAMIC` | Runtime-selectable preemption granularity |
| Timer Frequency | 1000 Hz (`CONFIG_HZ_1000`) | 1 ms worst-case scheduling latency |

### Instruction Cache Optimization via PGO/AutoFDO

PGO and AutoFDO work by collecting execution traces from representative workloads and feeding them back into the compiler. The compiler then uses this data to:

1. **Reorder basic blocks** — frequently executed (hot) code paths are placed in contiguous memory regions, maximizing I-cache locality.
2. **Inline hot functions** — small, frequently-called functions are inlined at call sites, eliminating call/return overhead.
3. **Segregate cold code** — rarely executed error-handling and fallback paths are moved to peripheral memory blocks, preventing them from polluting the I-cache.
4. **Optimize branch prediction** — branch probabilities derived from real execution data allow the compiler to lay out branches in the direction most likely to be taken.

This results in measurably lower instruction cache miss rates and improved instructions-per-cycle (IPC) throughput, which is particularly impactful on resource-constrained systems where every cycle counts.

---

## CPU Scheduler Selection and Configuration

For resource-constrained environments, standard EEVDF (Earliest Eligible Virtual Deadline First) or CFS (Completely Fair Scheduler) architectures can lead to window frame drops under heavy CPU contention, such as during application startup.

### Scheduler Comparison

| CPU Scheduler | Architecture | Latency Characteristics | Target Workloads | Low-Memory Suitability |
|---|---|---|---|---|
| EEVDF | Virtual deadline-based, standard mainline | Moderate latency under heavy multi-tasking | Generalized throughput and desktop tasks | Poor under extreme memory/CPU contention |
| BORE | Burst-Oriented Response Enhancer; priority scaling | Ultra-low latency for interactive tasks | Modern desktop sessions and desktop gaming | Excellent; protects UI tasks from disk bottlenecks |
| BMQ | BitMap Queue; Project C by Alfred Chen | Constant-time O(1) runqueue selection | Lightweight, low-core count systems | Moderate; lacks modern sched-ext compatibility |
| TT | Task Type; categorization-driven heuristics | Low jitter, predictable task dispatching | Multi-threaded client-side interfaces | Moderate; requires manual profiling of task types |

### BORE Scheduler Architecture

The BORE (Burst-Oriented Response Enhancer) scheduler is the recommended choice for AetherisOS. BORE dynamically adjusts task priorities based on burst behavior — tasks that wake up after sleeping (interactive tasks like compositors, input handlers, and UI renderers) receive a temporary priority boost, ensuring they are scheduled ahead of CPU-bound background work.

```
               +--------------------------------------+
               |    CPU Task Queue (BORE Scheduler)   |
               +--------------------------------------+
                                  |
         +------------------------+------------------------+
         |                                                 |
         v (Interactive, Short Bursts)                     v (Continuous, CPU-Bound)
+--------------------------------+                +--------------------------------+
|  Wayland Compositor / UI Task  |                |   Background DB / Compilation  |
|      (High Dynamic Priority)   |                |      (Scaled Penalized Priority)|
+--------------------------------+                +--------------------------------+
```

BORE's priority scaling mechanism works as follows:

- **Short-burst tasks** (compositors, input daemons, window managers) that frequently sleep and wake receive elevated dynamic priority. These tasks are latency-sensitive and must be dispatched within a single tick (≤1 ms at 1000 Hz).
- **Long-running CPU-bound tasks** (compilation, database indexing, media encoding) accumulate CPU time and receive a scaled penalty to their dynamic priority, preventing them from monopolizing the runqueue.
- **Starvation prevention** ensures that even penalized background tasks eventually receive CPU time, maintaining forward progress across all workloads.

This architecture is critical on 1 GB RAM systems where disk I/O contention from swap activity can cause CFS/EEVDF to stall compositor frames. BORE explicitly protects UI tasks from these disk bottlenecks by ensuring interactive bursts always preempt background computation.

### sched-ext Integration

The Linux kernel's `sched-ext` framework allows BPF-based schedulers to be loaded dynamically at runtime without kernel recompilation. AetherisOS leverages two key sched-ext schedulers:

#### scx_rusty

`scx_rusty` is a multi-domain, BPF-driven scheduler written in Rust. It partitions CPUs into scheduling domains based on cache topology (L3 cache groups) and uses load balancing heuristics to distribute tasks across domains. Key properties:

- **Cache-aware task placement** — tasks are preferentially scheduled on CPUs sharing the same L3 cache, reducing cross-domain cache coherency traffic.
- **Dynamic load balancing** — work stealing between domains is governed by load imbalance thresholds, preventing unnecessary task migration.
- **Tunable latency/throughput knobs** — runtime parameters allow trading throughput for latency sensitivity.

#### scx_lavd

`scx_lavd` (Latency-Aware Virtual Deadline) is specifically designed for latency-critical desktop workloads. It combines virtual deadline scheduling with latency-awareness heuristics:

- **Latency criticality detection** — tasks are classified by their wakeup patterns and CPU usage profiles. Tasks exhibiting interactive behavior (short bursts, frequent sleeps) are flagged as latency-critical.
- **Virtual deadline assignment** — latency-critical tasks receive tighter virtual deadlines, ensuring they are dispatched before throughput-oriented tasks.
- **Core compaction** — on systems with few active tasks, `scx_lavd` compacts tasks onto fewer cores, allowing remaining cores to enter deep C-states for power savings.

Both `scx_rusty` and `scx_lavd` can be hot-swapped at runtime via the sched-ext framework, allowing AetherisOS to adapt its scheduling policy to the current workload without rebooting.

---

## Memory Compression and Swap Optimization

On systems with only 1 GB of physical RAM, traditional disk-backed swap is prohibitively slow — even on SSDs, the latency of swap I/O is orders of magnitude higher than RAM access. ZRAM provides a compressed block device in RAM that acts as a swap target, trading CPU cycles for memory capacity.

### ZRAM with zstd Compression

ZRAM creates a compressed swap device backed entirely by physical RAM. When memory pressure triggers page eviction, pages are compressed and stored in the ZRAM device rather than written to disk. The compression algorithm choice is critical:

| Algorithm | Compression Ratio | Speed (Compress/Decompress) | CPU Overhead | Recommendation |
|---|---|---|---|---|
| lzo | ~2:1 | Very fast / Very fast | Minimal | Legacy default, lower ratio |
| lz4 | ~2.1:1 | Extremely fast / Extremely fast | Minimal | Best for mechanical drives (Zswap) |
| zstd | ~3:1 | Moderate / Fast | Moderate | **Optimal for ZRAM** — best ratio |

**zstd** is the recommended compression algorithm for ZRAM because its superior compression ratio (~3:1 vs ~2:1 for lzo/lz4) effectively triples the usable swap capacity within the allocated RAM. On a 1 GB system with a ZRAM device sized to 100% of physical RAM, zstd compression yields approximately 3 GB of effective swap space while consuming only the allocated RAM plus CPU overhead for compression/decompression.

### Swappiness and Virtual Memory Tuning

The Linux kernel's virtual memory subsystem must be aggressively tuned for ZRAM-backed swap. The following sysctl configuration is applied:

```ini
# /etc/sysctl.d/90-memory-optimization.conf
vm.swappiness = 150
vm.vfs_cache_pressure = 50
vm.dirty_background_bytes = 16777216
vm.dirty_bytes = 33554432
vm.dirty_writeback_centisecs = 1500
kernel.nmi_watchdog = 0
```

#### Parameter Explanation

| Parameter | Value | Explanation |
|---|---|---|
| `vm.swappiness` | `150` | Controls the kernel's tendency to swap anonymous pages versus reclaiming file-backed page cache. The default value is 60 (range 0–200). Setting this to 150 aggressively encourages the kernel to swap anonymous pages into ZRAM, which is appropriate because ZRAM swap is RAM-backed and compressed — accessing compressed pages in ZRAM is significantly faster than re-reading file pages from disk. This frees physical RAM for file cache, improving application load times. |
| `vm.vfs_cache_pressure` | `50` | Controls the kernel's tendency to reclaim inode and dentry cache entries. The default is 100. Reducing to 50 makes the kernel prefer retaining filesystem metadata caches, which reduces disk I/O for directory traversals and file lookups — critical for responsive file managers and application launchers. |
| `vm.dirty_background_bytes` | `16777216` (16 MB) | Sets the threshold at which the kernel begins background writeback of dirty pages to disk. Using a fixed byte value (16 MB) instead of the default percentage-based `dirty_background_ratio` ensures predictable writeback behavior on low-memory systems where percentage-based thresholds could trigger too late. |
| `vm.dirty_bytes` | `33554432` (32 MB) | Sets the threshold at which a process generating dirty pages is forced to perform synchronous writeback. Capping at 32 MB prevents any single process from accumulating excessive dirty pages, which could cause sudden I/O storms and UI stalls on systems with limited RAM. |
| `vm.dirty_writeback_centisecs` | `1500` (15 seconds) | Interval between periodic writeback daemon (pdflush/flush) wake-ups. Extending to 15 seconds (default is 5 seconds) reduces unnecessary disk wake-ups, saving I/O bandwidth and allowing dirty pages to coalesce for more efficient sequential writes. |
| `kernel.nmi_watchdog` | `0` | Disables the NMI (Non-Maskable Interrupt) watchdog, which periodically fires hardware interrupts to detect kernel lockups. Disabling this saves one hardware performance counter and reduces interrupt overhead. On desktop systems, the NMI watchdog provides negligible benefit compared to its resource cost. |

### Zswap Fallback for Mechanical Drives

For systems equipped with mechanical hard drives (HDDs), where disk-backed swap I/O is catastrophically slow, Zswap provides a compressed write-back cache in front of the disk swap device. Unlike ZRAM (which is entirely RAM-backed), Zswap acts as a compressed staging area — pages are first compressed into a RAM pool, and only evicted to disk swap when the pool reaches capacity.

The following kernel command-line parameters configure Zswap:

```
zswap.enabled=1 zswap.shrinker_enabled=1 zswap.compressor=lz4 zswap.max_pool_percent=30
```

| Parameter | Value | Explanation |
|---|---|---|
| `zswap.enabled` | `1` | Activates the Zswap compressed cache. |
| `zswap.shrinker_enabled` | `1` | Enables the Zswap shrinker, which allows the kernel to reclaim pages from the Zswap pool under extreme memory pressure by writing them back to the disk swap device. Without the shrinker, the Zswap pool can become full and stop accepting new pages, falling back to direct disk swap. |
| `zswap.compressor` | `lz4` | Uses LZ4 compression for the Zswap pool. LZ4 is chosen over zstd for Zswap because Zswap's role as a cache demands minimal compression/decompression latency — pages may be frequently moved in and out of the pool. LZ4's near-zero latency is optimal for this use case. |
| `zswap.max_pool_percent` | `30` | Limits the Zswap pool to 30% of total physical RAM. On a 1 GB system, this allocates up to ~307 MB for compressed swap caching, leaving the remaining 70% for active applications, page cache, and kernel structures. |

---

## Advanced Out-Of-Memory (OOM) Prevention Daemons

The Linux kernel's built-in OOM killer is a last-resort mechanism that activates only when the system has completely exhausted all memory, including swap. By this point, the system is typically unresponsive — the OOM killer's intervention comes too late to prevent user-perceived hangs. Proactive userspace OOM prevention daemons monitor memory pressure and take action before the kernel OOM killer is invoked.

### OOM Daemon Comparison

| Feature | earlyoom | systemd-oomd | nohang-desktop |
|---|---|---|---|
| **Written In** | C | C++ (systemd component) | Python |
| **Idle VmRSS Memory** | ~0.5 MB | ~1.5 MB (integrated into systemd) | ~2.5 MB |
| **Primary Trigger** | Available memory and swap percentage thresholds | PSI (Pressure Stall Information) memory pressure | Available memory percentage, PSI, and per-process RSS limits |
| **Default Action** | Send SIGTERM, then SIGKILL after timeout | Kill cgroup with highest memory pressure | Send SIGTERM with configurable grace period, desktop notification, then SIGKILL |
| **Desktop Notifications** | No | No | **Yes** — notifies the user before and after killing processes |
| **Victim Customization** | Basic: `--prefer` and `--avoid` regex on process names | cgroup-based priority via `ManagedOOMPreference=` | **Extensive**: per-process rules, regex matching, cgroup awareness, and badness score customization |
| **Configuration Granularity** | Command-line flags only | systemd unit properties and cgroup attributes | Comprehensive configuration file with per-process rules, thresholds, and actions |
| **Corrective Action Options** | Kill only | Kill only | Kill, SIGTERM with grace period, or execute arbitrary corrective commands |
| **Integration with Desktop** | None | None | **Full** — integrates with desktop notification daemons (notify-send) |

### Why nohang-desktop is Optimal

**nohang-desktop** is the recommended OOM prevention daemon for AetherisOS for the following reasons:

1. **Desktop notification integration** — Before killing any process, nohang-desktop sends a desktop notification to the user, informing them which process will be terminated and why. After the kill, a confirmation notification is sent. This transparency is critical for a desktop operating system where users need to understand why an application was closed.

2. **Extensive victim customization** — nohang-desktop supports per-process rules that can match on process name, cgroup, command-line arguments, and oom_score_adj. This allows AetherisOS to define protected processes (compositor, session manager, audio daemon) that must never be killed, and preferred victims (browser tabs, media players) that should be killed first under memory pressure.

3. **Graduated response** — Unlike earlyoom and systemd-oomd, which jump directly to killing, nohang-desktop supports a graduated response: first sending SIGTERM with a configurable grace period (allowing applications to save state), then escalating to SIGKILL only if the process fails to terminate.

4. **Multiple trigger mechanisms** — nohang-desktop can trigger on available memory percentage thresholds, PSI (Pressure Stall Information) metrics, and per-process RSS limits simultaneously, providing defense-in-depth against OOM conditions.

5. **Corrective commands** — nohang-desktop can execute arbitrary commands as corrective actions, such as clearing filesystem caches (`echo 3 > /proc/sys/vm/drop_caches`), restarting services, or sending notifications to monitoring systems.

The 2 MB additional memory overhead compared to earlyoom is a worthwhile trade-off for the significantly enhanced desktop integration and process management capabilities.

---

## Boot-Time Optimization and Service Minimization

Minimizing boot time and reducing the memory footprint of the init system and initramfs are critical for a responsive low-memory operating system.

### Stripped Initramfs with dracut

The initramfs (initial RAM filesystem) is loaded into memory at boot and must be as small as possible to minimize early-boot memory consumption. dracut is used to generate a host-only initramfs that includes only the modules necessary for the specific hardware:

```ini
# /etc/dracut.conf.d/stripped-initramfs.conf
hostonly="yes"
compress="zstd"
omit_dracutmodules=" lvm mdraid dm crypt btrfs plymouth network cifs nfs "
```

#### Configuration Explanation

| Parameter | Value | Explanation |
|---|---|---|
| `hostonly` | `yes` | Generates an initramfs containing only the kernel modules and drivers required by the current host's hardware. A generic initramfs includes drivers for all possible hardware configurations (USB storage, SCSI, NVMe, various filesystems, network boot), consuming significantly more memory. Host-only mode can reduce the initramfs size from ~30-50 MB to ~5-10 MB. |
| `compress` | `zstd` | Compresses the initramfs using zstd, which provides a superior compression ratio compared to gzip while maintaining fast decompression. This further reduces the initramfs size on disk and the amount of data that must be read from the boot device. |
| `omit_dracutmodules` | (see below) | Explicitly omits dracut modules that are not needed for a simple desktop installation: |

**Omitted Modules:**

| Module | Purpose | Reason for Omission |
|---|---|---|
| `lvm` | Logical Volume Manager support | AetherisOS uses simple partition layouts without LVM |
| `mdraid` | Software RAID support | No RAID configurations on target hardware |
| `dm` | Device-mapper framework | Not needed without LVM, RAID, or full-disk encryption |
| `crypt` | LUKS/dm-crypt full-disk encryption | Omitted from base; can be re-enabled for encrypted installs |
| `btrfs` | Btrfs filesystem tools | AetherisOS uses ext4 or F2FS as the root filesystem |
| `plymouth` | Graphical boot splash screen | Consumes memory for a boot animation; replaced with silent boot |
| `network` | Network boot (PXE/iSCSI) | Desktop systems boot from local storage |
| `cifs` | SMB/CIFS network filesystem | Not needed at boot time |
| `nfs` | NFS network filesystem | Not needed at boot time |

### Init System: runit vs systemd

The init system is the first userspace process (PID 1) and manages all system services. Its memory footprint directly impacts available RAM for applications.

#### systemd

systemd is the standard init system on most modern Linux distributions. It is a comprehensive service management framework that includes:

- Service supervision and dependency management
- Socket and D-Bus activation
- Journal-based logging (systemd-journald)
- Device management (systemd-udevd)
- Timer-based scheduling (systemd-timerd)
- Network management (systemd-networkd)
- DNS resolution (systemd-resolved)
- Login session management (systemd-logind)

This comprehensive feature set comes at a significant memory cost. A typical systemd installation with its core daemons (PID 1 + journald + udevd + logind + resolved + networkd) consumes approximately **35–40 MB of resident memory**. On a 1 GB system, this represents 3.5–4% of total RAM consumed by the init system alone before any user applications are launched.

#### runit

runit is a minimalist, UNIX-philosophy init system that provides:

- Simple process supervision (runsvdir, runsv)
- Service directory-based management (`/etc/sv/`)
- Clean process lifecycle management (start, stop, restart)
- Log management via svlogd

runit's total memory footprint (PID 1 + runsv supervisors for all services) is typically **under 2 MB of resident memory** — an order of magnitude less than systemd. This is achieved by:

1. **No integrated logging daemon** — runit uses per-service log processors (svlogd) that write to plain text files, eliminating the binary journal and its associated memory buffers.
2. **No socket activation** — services are started directly based on the presence of a run script in the service directory.
3. **No D-Bus dependency** — runit does not require or use D-Bus for inter-process communication, eliminating the D-Bus daemon's memory overhead.
4. **No integrated network/DNS management** — network configuration is delegated to dedicated lightweight tools (e.g., dhcpcd, iwd).
5. **Minimal PID 1** — runit's PID 1 (runit-init) is an extremely simple process that performs only three stages: system initialization (stage 1), service supervision (stage 2), and system shutdown (stage 3).

#### Comparison Summary

| Aspect | systemd | runit |
|---|---|---|
| Resident Memory (total) | 35–40 MB | < 2 MB |
| Service Management | Dependency graph, socket/D-Bus activation | Directory-based, direct supervision |
| Logging | Binary journal (systemd-journald) | Plain text per-service logs (svlogd) |
| Configuration Format | INI-style unit files | Shell scripts (run files) |
| D-Bus Requirement | Yes (hard dependency) | No |
| Boot Speed | Fast (parallel activation) | Fast (parallel via runsvdir) |
| Complexity | High (200+ binaries) | Minimal (3 core binaries) |
| Memory Savings vs systemd | — | **33–38 MB freed** |

On a 1 GB system, the 33–38 MB savings from using runit over systemd is substantial — equivalent to the memory required to run a lightweight text editor or several terminal instances. AetherisOS uses runit as its init system to maximize the memory available for user-facing applications.
