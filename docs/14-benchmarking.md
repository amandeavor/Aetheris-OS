# Performance Benchmarking Strategy

To ensure performance targets are met, the distribution must undergo automated benchmarking against Ubuntu, Fedora, Linux Mint, and Windows 11 on identical hardware profiles (1 GB and 4 GB RAM baselines).

## Benchmarking Metrics and System Instrumentation

- **Boot Time**: systemd-analyze or custom timing daemon on runit
- **Idle Memory**: ps_mem (VmRSS, Private, Shared)
- **Application Launch Time**: hyperfine (warm/cold cache, statistical variance)
- **Compositor Frame Pacing**: Wayland presentation-time records, PresentMon on Windows
- **Thermal Output and CPU Load**: s-tui / lm_sensors

## Benchmark Script

```bash
#!/usr/bin/env bash
OUTPUT_DIR="/tmp/benchmarks_results"
mkdir -p "$OUTPUT_DIR"

# 1. Measure Shell Command and App Launch Time via Hyperfine
hyperfine --warmup 3 \
          --prepare "sync && sysctl vm.drop_caches=3" \
          --export-json "$OUTPUT_DIR/launch_results.json" \
          'firefox --headless' \
          'libreoffice --headless --writer'

# 2. Measure Interactivity Latency via Interbench
interbench -t 30 -l -c > "$OUTPUT_DIR/interbench_results.txt"

# 3. Measure Disk I/O Performance via IOzone
iozone -e -I -s 512m -r 4k -i 0 -i 1 -i 2 -f "$OUTPUT_DIR/iozone.tmp"
```

## Benchmarking Tools

| Evaluated Subsystem | Benchmarking Tool | Metric Measured | Rationale for Selection |
|---|---|---|---|
| User Space Startup | hyperfine | App launch times (10 runs minimum) | Automatically factors out shell startup overhead |
| Scheduler Interactivity | interbench | Wakeup latency under high load | Simulates background write-stress |
| Boot Execution Flow | systemd-analyze | Device driver initialization times | Plots boot phases to identify bottlenecks |
| Disk Input / Output | iozone | Sequential & random 4 KiB performance | Simulates app database operations |
| GPU / Compositor | glxinfo / custom hooks | Render frame pacing & 1% lows | Verifies HW-accelerated rendering |

---

# Recommended Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER INTERFACE                            │
│              Labwc (Compositor) + Sfwbar (Panel)                │
├─────────────────────────────────────────────────────────────────┤
│                       COMPATIBILITY                             │
│             Exec Guard + Wine/Proton (Windows Apps)             │
├─────────────────────────────────────────────────────────────────┤
│                      SYSTEM SERVICES                            │
│       Runit (Init) + Preloader + Nohang (OOM) + chwd (HW)      │
├─────────────────────────────────────────────────────────────────┤
│                       LINUX KERNEL                              │
│          Custom 1000Hz + BORE Scheduler + ZRAM (zstd)           │
├─────────────────────────────────────────────────────────────────┤
│                      HARDWARE LAYER                             │
│            x86-64-v3/v4 · GPU · NVMe · WiFi · BT               │
└─────────────────────────────────────────────────────────────────┘
```

---

# Technical Implementation Roadmap

## Phase 1: Core Toolchain and Kernel Synthesis

- **Milestone 1.1**: Configure xbps-src for x86-64-v3/v4
- **Milestone 1.2**: Custom kernel patchset (BORE + sched-ext + Waydroid Binder)
- **Milestone 1.3**: Clang/ThinLTO + AutoFDO runtime profile
- **Milestone 1.4**: Build + register signed kernel packages

## Phase 2: Base System Setup and Performance Tuning

- **Milestone 2.1**: Base Void system with runit
- **Milestone 2.2**: zram-generator + zstd + sysctl tuning
- **Milestone 2.3**: nohang-desktop OOM daemon + regex overrides
- **Milestone 2.4**: Rust driver manager + WiFi pre-bundling

## Phase 3: Desktop Shell Development and Compatibility Layer

- **Milestone 3.1**: labwc theme engine (rounded corners, shadows, display pacing)
- **Milestone 3.2**: sfwbar panel (network, volume, Bluetooth)
- **Milestone 3.3**: zorin-exec-guard + Windows MIME associations
- **Milestone 3.4**: Predictive preloading daemon (quantized transition matrix)

## Phase 4: Rigorous Quality Assurance and System Validation

- **Milestone 4.1**: Phoronix Test Suite on 1GB + 4GB targets
- **Milestone 4.2**: Boot times + hyperfine app launch profiling
- **Milestone 4.3**: Long-session VRAM leak profiling
- **Milestone 4.4**: Security auditing (CVE-2026-48831 containment)
