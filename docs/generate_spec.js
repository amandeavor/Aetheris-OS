const fs = require('fs');
const path = require('path');

const CSS_STYLES = `
  :root {
    --dark-000:    #080A0F;
    --dark-100:    #0E121A;
    --dark-200:    #141A26;
    --dark-300:    #1C2436;
    --dark-400:    #26324D;

    --light-000:   #F4F6F9;
    --light-100:   #FFFFFF;
    --light-200:   #EAEFF5;
    --light-300:   #D9E2EC;
    --light-400:   #BCCCDC;

    --violet-100:  #EEF2FF;
    --violet-400:  #A5B4FC;
    --violet-500:  #818CF8;
    --violet-600:  #6366F1;
    --violet-700:  #4F46E5;
    --violet-900:  #312E81;

    --green:       #37A3A3;
    --amber:       #F5921B;
    --red:         #F0561D;

    --text-dark:   #080A0F;
    --text-muted:  #5C5951;
    --text-light:  #F4F6F9;
    --text-dim:    #818CF8;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: 'Archivo', sans-serif;
    font-size: 14px;
    line-height: 1.75;
    background-color: #111827;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    height: 297mm;
    padding: 22mm 20mm 20mm 20mm;
    position: relative;
    overflow: hidden;
    margin: 20px auto;
    background-color: var(--light-000);
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  }

  .page.dark {
    background-color: var(--dark-000);
    color: var(--text-light);
  }

  .page.light {
    background-color: var(--light-000);
    color: var(--text-dark);
  }

  /* Footer configurations */
  .footer {
    position: absolute;
    bottom: 12mm;
    left: 20mm;
    right: 20mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding-top: 10px;
  }

  .page.light .footer {
    border-top: 1px solid var(--light-300);
    color: var(--text-muted);
  }

  .page.dark .footer {
    border-top: 1px solid var(--dark-200);
    color: var(--text-dim);
  }

  /* Section headers */
  .section-eyebrow {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--violet-600);
    margin-bottom: 4px;
    display: inline-block;
  }

  .section-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-dark);
    margin: 0 0 12px 0;
    letter-spacing: -0.02em;
  }

  .section-title-line {
    height: 2px;
    background: linear-gradient(to right, var(--violet-600), transparent);
    margin-bottom: 20px;
    width: 100%;
  }

  /* Stat blocks */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  .stat-block {
    background-color: var(--light-100);
    border: 1px solid var(--light-300);
    border-top: 3px solid var(--violet-600);
    padding: 12px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .stat-number {
    font-size: 22px;
    font-weight: 700;
    color: var(--violet-600);
    line-height: 1.2;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.02em;
    line-height: 1.3;
  }

  /* Spec cards */
  .spec-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }

  .spec-card {
    background-color: var(--light-100);
    border: 1px solid var(--light-300);
    border-left: 4px solid var(--violet-600);
    padding: 14px 16px;
    border-radius: 8px;
  }

  .spec-card-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-dark);
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .spec-card-body {
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  /* Code blocks */
  .code-block {
    background-color: var(--dark-100);
    border-left: 3px solid var(--violet-700);
    padding: 14px 16px;
    border-radius: 8px;
    margin: 0 0 20px 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    line-height: 1.6;
    color: var(--text-light);
    overflow: hidden;
    white-space: pre;
  }

  .code-comment { color: #6B7280; font-style: italic; }
  .code-keyword { color: var(--violet-400); font-weight: 600; }
  .code-string  { color: var(--green); }
  .code-number  { color: var(--amber); }

  /* Tables */
  table.data-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin-bottom: 20px;
    font-size: 12.5px;
    border: 1px solid var(--light-300);
    border-radius: 8px;
    overflow: hidden;
  }

  table.data-table th {
    background-color: var(--dark-300);
    color: var(--light-000);
    text-align: left;
    padding: 8px 12px;
    font-weight: 600;
    border-bottom: 1px solid var(--dark-400);
    border-right: 1px solid var(--dark-400);
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.05em;
  }

  table.data-table th:last-child {
    border-right: none;
  }

  table.data-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--light-300);
    border-right: 1px solid var(--light-300);
    color: var(--text-dark);
  }

  table.data-table td:last-child {
    border-right: none;
  }

  table.data-table tr:last-child td {
    border-bottom: none;
  }

  table.data-table tr:nth-child(even) {
    background-color: var(--light-200);
  }

  table.data-table tr:nth-child(odd) {
    background-color: var(--light-100);
  }

  /* Chips */
  .chip {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1.2;
  }

  .chip-green { background-color: #E6F4F1; color: var(--green); }
  .chip-amber { background-color: #FEF3C7; color: var(--amber); }
  .chip-red   { background-color: #FEE2E2; color: var(--red); }
  .chip-violet { background-color: #EEF2FF; color: var(--violet-600); }

  /* Quote blocks */
  .quote-block {
    background-color: var(--violet-100);
    border-left: 4px solid var(--violet-600);
    padding: 16px 20px;
    border-radius: 0 4px 4px 0;
    margin-bottom: 20px;
    font-style: italic;
    color: var(--violet-900);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.6;
  }

  /* Column Layouts */
  .two-col {
    display: table;
    width: 100%;
    table-layout: fixed;
    margin-bottom: 20px;
  }

  .col {
    display: table-cell;
    vertical-align: top;
  }

  .col-left {
    padding-right: 15px;
  }

  .col-right {
    padding-left: 15px;
  }

  /* Color swatch styling */
  .swatch-container {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .swatch-card {
    flex: 1;
    min-width: 80px;
    background-color: var(--light-100);
    border: 1px solid var(--light-300);
    border-radius: 8px;
    overflow: hidden;
    text-align: center;
    padding-bottom: 8px;
  }

  .swatch-color {
    height: 40px;
    width: 100%;
  }

  .swatch-label {
    font-size: 9px;
    font-weight: 700;
    color: var(--text-dark);
    margin-top: 6px;
    text-transform: uppercase;
  }

  .swatch-hex {
    font-size: 9px;
    color: var(--text-muted);
    font-family: 'JetBrains Mono', monospace;
  }

  /* Cover page styling */
  .cover-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    align-items: center;
    padding: 60mm 0;
  }

  .cover-header {
    text-align: center;
  }

  .cover-title {
    font-size: 64px;
    font-weight: 800;
    color: var(--text-light);
    line-height: 1.1;
    margin: 0 0 10px 0;
    letter-spacing: -0.03em;
  }

  .cover-title span {
    color: var(--violet-600);
  }

  .cover-tagline {
    font-size: 15px;
    font-weight: 300;
    color: var(--violet-500);
    margin-bottom: 30px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-style: italic;
  }

  .cover-line {
    width: 60px;
    height: 2px;
    background-color: var(--violet-600);
    margin: 0 auto 30px auto;
  }

  .cover-badges {
    display: flex;
    gap: 12px;
    margin-bottom: 40px;
  }

  .cover-badge {
    background-color: var(--dark-200);
    border: 1px solid var(--dark-400);
    color: var(--text-light);
    font-size: 10px;
    font-weight: 600;
    padding: 6px 16px;
    border-radius: 20px;
    letter-spacing: 0.05em;
  }

  .cover-decor-top {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(to right, transparent, var(--violet-600), transparent);
  }

  .cover-decor-bottom {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(to right, transparent, var(--violet-600), transparent);
  }

  /* Chapter Opener styling */
  .chapter-opener {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    height: 100%;
    padding-bottom: 40mm;
  }

  .chapter-num {
    font-size: 96px;
    font-weight: 800;
    color: var(--dark-200);
    line-height: 1;
    margin: 0 0 10px 0;
    letter-spacing: -0.05em;
    font-family: 'Archivo', sans-serif;
  }

  .chapter-line {
    width: 50px;
    height: 2.5px;
    background-color: var(--violet-600);
    margin-bottom: 24px;
  }

  .chapter-title {
    font-size: 32px;
    font-weight: 700;
    color: var(--text-light);
    margin: 0 0 12px 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .chapter-subtitle {
    font-size: 13px;
    font-weight: 500;
    color: var(--violet-500);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  /* Page Watermark */
  .page-watermark {
    position: absolute;
    top: 10mm;
    right: 20mm;
    font-size: 11px;
    font-weight: 600;
    color: var(--violet-600);
    text-decoration: none;
    letter-spacing: 0.02em;
    font-family: 'Archivo', sans-serif;
    z-index: 1000;
    transition: color 0.2s ease;
  }
  .page-watermark:hover {
    color: var(--violet-700);
    text-decoration: underline;
  }
  .page.dark .page-watermark {
    color: var(--violet-500);
  }
  .page.dark .page-watermark:hover {
    color: var(--violet-400);
  }

  /* macOS Terminal styles */
  .terminal-container {
    background-color: var(--dark-100);
    border: 1px solid var(--dark-400);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 20px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  }
  .terminal-titlebar {
    height: 24px;
    background-color: var(--dark-200);
    border-bottom: 1px solid var(--dark-300);
    display: flex;
    align-items: center;
    padding: 0 12px;
    position: relative;
    user-select: none;
  }
  .terminal-dots {
    display: flex;
    gap: 6px;
    margin-right: 10px; /* Padding to the right of the green button */
  }
  .terminal-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
  .terminal-dot.red    { background-color: #FF5F56; }
  .terminal-dot.yellow { background-color: #FFBD2E; }
  .terminal-dot.green  { background-color: #27C93F; }
  .terminal-title {
    margin-left: auto;
    font-family: 'Archivo', sans-serif;
    font-size: 9.5px;
    font-weight: 500;
    color: var(--text-dim);
    text-transform: lowercase;
  }
  /* Re-style code-block inside terminal-container to prevent code obstruction */
  .terminal-container .code-block {
    border: none;
    margin: 0;
    border-radius: 0;
    font-size: 8px;
    line-height: 1.45;
    white-space: pre-wrap;
    word-break: break-all;
  }

  /* Print overrides */
  @page {
    size: A4;
    margin: 0;
  }
  @media print {
    body {
      background-color: transparent;
      margin: 0;
      padding: 0;
    }
    .page {
      margin: 0 !important;
      border: none !important;
      box-shadow: none !important;
      width: 210mm !important;
      height: 297mm !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      position: relative !important;
    }
    .page-watermark {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .terminal-container {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .terminal-dot {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

const PAGES = [];

// ==========================================
// PAGE 1: COVER
// ==========================================
PAGES.push(`
  <div class="page dark">
    <div class="cover-decor-top"></div>
    <div class="cover-container">
      <div class="cover-header">
        <span class="section-eyebrow" style="color: var(--violet-500);">DEFINITIVE ARCHITECTURAL SPECIFICATION — v1.0</span>
        <div style="margin-top: 40px;"></div>
        <h1 class="cover-title">Aetheris <span>OS</span></h1>
        <div class="cover-tagline">Lightweight. Intelligent. Precise.</div>
        <div class="cover-line"></div>
      </div>
      <div class="cover-badges">
        <span class="cover-badge">Void Linux Base</span>
        <span class="cover-badge">Wayland Native</span>
        <span class="cover-badge">1 GB RAM Target</span>
      </div>
      <div style="height: 20px;"></div>
    </div>
    <div class="cover-decor-bottom"></div>
    <div class="footer">
      <span>Aetheris OS &middot; Product White Paper</span>
      <span>June 2026</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 2: TABLE OF CONTENTS
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Navigation</span>
    <h2 class="section-title">Table of Contents</h2>
    <div class="section-title-line"></div>
    <div style="margin-top: 40px;">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 15%;">Chapter</th>
            <th>Title</th>
            <th style="text-align: right; width: 25%;">Reference Section</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong style="color: var(--violet-600);">01</strong></td>
            <td><strong>Executive Summary & Core Mission</strong></td>
            <td style="text-align: right; color: var(--text-muted);">ARCH-01</td>
          </tr>
          <tr>
            <td><strong style="color: var(--violet-600);">02</strong></td>
            <td><strong>Base Distribution & Init Infrastructure</strong></td>
            <td style="text-align: right; color: var(--text-muted);">DIST-02</td>
          </tr>
          <tr>
            <td><strong style="color: var(--violet-600);">03</strong></td>
            <td><strong>RAM Reduction & Memory Management</strong></td>
            <td style="text-align: right; color: var(--text-muted);">MEM-03</td>
          </tr>
          <tr>
            <td><strong style="color: var(--violet-600);">04</strong></td>
            <td><strong>Visual Identity & Desktop Environment</strong></td>
            <td style="text-align: right; color: var(--text-muted);">SHELL-04</td>
          </tr>
          <tr>
            <td><strong style="color: var(--violet-600);">05</strong></td>
            <td><strong>Intelligent Driver Management</strong></td>
            <td style="text-align: right; color: var(--text-muted);">DRV-05</td>
          </tr>
          <tr>
            <td><strong style="color: var(--violet-600);">06</strong></td>
            <td><strong>Gaming Optimisations</strong></td>
            <td style="text-align: right; color: var(--text-muted);">GAME-06</td>
          </tr>
          <tr>
            <td><strong style="color: var(--violet-600);">07</strong></td>
            <td><strong>Windows Compatibility & ExecGuard</strong></td>
            <td style="text-align: right; color: var(--text-muted);">COMPAT-07</td>
          </tr>
          <tr>
            <td><strong style="color: var(--violet-600);">08</strong></td>
            <td><strong>Custom Tauri System Utilities</strong></td>
            <td style="text-align: right; color: var(--text-muted);">UTIL-08</td>
          </tr>
          <tr>
            <td><strong style="color: var(--violet-600);">09</strong></td>
            <td><strong>Security Engineering & Hardening</strong></td>
            <td style="text-align: right; color: var(--text-muted);">SEC-09</td>
          </tr>
          <tr>
            <td><strong style="color: var(--violet-600);">10</strong></td>
            <td><strong>Implementation Status & Audit</strong></td>
            <td style="text-align: right; color: var(--text-muted);">AUD-10</td>
          </tr>
          <tr>
            <td><strong style="color: var(--violet-600);">11</strong></td>
            <td><strong>v1.1 Research Highlights</strong></td>
            <td style="text-align: right; color: var(--text-muted);">RES-11</td>
          </tr>
          <tr>
            <td><strong style="color: var(--violet-600);">12</strong></td>
            <td><strong>v1.1 Release Candidate Specification</strong></td>
            <td style="text-align: right; color: var(--text-muted);">RC-12</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>TABLE OF CONTENTS</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 3: CHAPTER 01 OPENER
// ==========================================
PAGES.push(`
  <div class="page dark">
    <div class="chapter-opener">
      <div class="chapter-num">01</div>
      <div class="chapter-line"></div>
      <h2 class="chapter-title">Executive Summary &amp;<br>Core Mission</h2>
      <span class="chapter-subtitle">System Objectives and Core Architecture</span>
    </div>
    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>CHAPTER 01 OPENER</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 4: EXECUTIVE SUMMARY
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Introduction</span>
    <h2 class="section-title">Executive Summary</h2>
    <div class="section-title-line"></div>
    <p>
      Aetheris OS is a lightweight, high-performance operating system delivering a fluid, modern, Wayland-based visual desktop experience on hardware with a minimum of 1 GB of RAM, targeting an idle memory footprint under 213 MiB. By avoiding standard desktop dependencies and service managers, Aetheris OS runs efficiently where modern distributions stall.
    </p>

    <div class="stat-grid" style="margin-top: 30px; margin-bottom: 30px;">
      <div class="stat-block">
        <span class="stat-number">1 GB</span>
        <span class="stat-label">Minimum RAM Target</span>
      </div>
      <div class="stat-block">
        <span class="stat-number">&lt; 213 MB</span>
        <span class="stat-label">Idle Desktop Usage</span>
      </div>
      <div class="stat-block">
        <span class="stat-number">&lt; 6s</span>
        <span class="stat-label">SSD Boot Time Target</span>
      </div>
      <div class="stat-block">
        <span class="stat-number">8</span>
        <span class="stat-label">Development Phases</span>
      </div>
    </div>

    <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; color: var(--text-dark);">Core Identity Specification</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 35%;">Property</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Base Distribution</strong></td>
          <td>Void Linux (glibc edition), rolling release</td>
        </tr>
        <tr>
          <td><strong>Service Supervisor</strong></td>
          <td>runit &mdash; replaces systemd, saving ~35 MiB of RAM</td>
        </tr>
        <tr>
          <td><strong>CPU Architecture</strong></td>
          <td>x86-64-v3 / x86-64-v4 (AVX2, FMA3, BMI1/2 required)</td>
        </tr>
        <tr>
          <td><strong>Compiler Pipeline</strong></td>
          <td>Clang 19 + ThinLTO + AutoFDO for maximum IPC</td>
        </tr>
        <tr>
          <td><strong>CPU Scheduler</strong></td>
          <td>BORE + sched-ext (BPF-based dynamic runtime hot-swaps)</td>
        </tr>
        <tr>
          <td><strong>Compositor Shell</strong></td>
          <td>Labwc (wlroots Wayland compositor, ~50 MiB idle)</td>
        </tr>
        <tr>
          <td><strong>Memory Compression</strong></td>
          <td>ZRAM + zstd (150% target size, swappiness 150)</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>EXECUTIVE SUMMARY</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 5: CORE MISSION
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Mission Statement</span>
    <h2 class="section-title">Core Mission &amp; Choices</h2>
    <div class="section-title-line"></div>

    <div class="quote-block">
      "Weightless, frictionless, and secure operations on legacy and resource-constrained computers."
    </div>

    <div class="two-col" style="margin-top: 25px;">
      <div class="col col-left">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">Why Void Linux</h4>
        <ul style="padding-left: 18px; margin: 0; font-size: 12.5px; line-height: 1.7;">
          <li><strong>Rolling Release:</strong> Eliminates continuous version upgrade friction and package mismatches.</li>
          <li><strong>runit init:</strong> Operates at &lt; 2 MiB memory vs systemd's 35&ndash;40 MiB.</li>
          <li><strong>glibc Compatibility:</strong> Guarantees native support for Wine, Steam, Proton, and proprietary drivers.</li>
          <li><strong>XBPS Package Manager:</strong> Fast, robust, and supports signed custom repositories.</li>
          <li><strong>Alpine Rejection:</strong> musl libc breaks Steam and Wine; Alpine is not viable for gaming/Windows compat.</li>
        </ul>
      </div>
      <div class="col col-right" style="border-left: 1px solid var(--light-300); padding-left: 25px;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">Why runit over systemd</h4>
        <ul style="padding-left: 18px; margin: 0; font-size: 12.5px; line-height: 1.7;">
          <li><strong>Low Overhead:</strong> Entire supervision tree runs under 2 MiB VmRSS.</li>
          <li><strong>Simplicity:</strong> Services configured as basic shell scripts in <code style="font-family: 'JetBrains Mono', monospace; font-size: 11px;">/etc/sv/</code>.</li>
          <li><strong>Zero Dependencies:</strong> Isolated service lifecycle with no inter-process dbus activation loops.</li>
          <li><strong>Dynamic Activation:</strong> Activating services is as simple as creating a symlink in <code style="font-family: 'JetBrains Mono', monospace; font-size: 11px;">/var/service/</code>.</li>
          <li><strong>Supervision:</strong> Each daemon is supervised by a lightweight <code style="font-family: 'JetBrains Mono', monospace; font-size: 11px;">runsv</code> process (4KB).</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>CORE MISSION</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 6: CHAPTER 02 OPENER
// ==========================================
PAGES.push(`
  <div class="page dark">
    <div class="chapter-opener">
      <div class="chapter-num">02</div>
      <div class="chapter-line"></div>
      <h2 class="chapter-title">Base Distribution &amp;<br>Init Infrastructure</h2>
      <span class="chapter-subtitle">Base Package Control and System Boot Supervision</span>
    </div>
    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>CHAPTER 02 OPENER</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 7: BASE DISTRIBUTION
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Distribution Base</span>
    <h2 class="section-title">Base Distribution &amp; Init Infrastructure</h2>
    <div class="section-title-line"></div>

    <table class="data-table" style="margin-bottom: 20px;">
      <thead>
        <tr>
          <th>Distribution</th>
          <th>Init System</th>
          <th>C Library</th>
          <th>Package Manager</th>
          <th>Decision</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Void Linux</strong></td>
          <td>runit</td>
          <td>glibc</td>
          <td>xbps</td>
          <td><span class="chip chip-green">SELECTED</span></td>
        </tr>
        <tr>
          <td>Arch Linux</td>
          <td>systemd</td>
          <td>glibc</td>
          <td>pacman</td>
          <td><span class="chip chip-amber">systemd overhead</span></td>
        </tr>
        <tr>
          <td>Debian</td>
          <td>systemd</td>
          <td>glibc</td>
          <td>apt</td>
          <td><span class="chip chip-amber">Stale packages</span></td>
        </tr>
        <tr>
          <td>Alpine Linux</td>
          <td>OpenRC</td>
          <td>musl</td>
          <td>apk</td>
          <td><span class="chip chip-red">musl breaks Wine</span></td>
        </tr>
        <tr>
          <td>NixOS</td>
          <td>systemd</td>
          <td>glibc</td>
          <td>nix</td>
          <td><span class="chip chip-red">Declarative complexity</span></td>
        </tr>
        <tr>
          <td>Gentoo</td>
          <td>OpenRC</td>
          <td>glibc/musl</td>
          <td>portage</td>
          <td><span class="chip chip-red">Compile times on 1GB</span></td>
        </tr>
      </tbody>
    </table>

    <div class="spec-grid" style="margin-bottom: 15px;">
      <div class="spec-card">
        <div class="spec-card-title">XBPS Package Manager</div>
        <div class="spec-card-body">
          Interfaced via custom Rust FFI bindings to libxbps C API to avoid shell forks. Supports signed repo validation via openssl keys and xbps-rindex, and binary delta updates for low bandwidth usage.
        </div>
      </div>
      <div class="spec-card">
        <div class="spec-card-title">runit Service Tree</div>
        <div class="spec-card-body">
          Supervised daemons in /etc/sv/ activated by linking into /var/service/. Eliminates systemd-journald binary logs. Individual supervisors allocate under 4KB RAM.
        </div>
      </div>
    </div>

    <div class="two-col" style="margin-top: 15px;">
      <div class="col col-left" style="width: 50%;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 11px; text-transform: uppercase;">Repository Signing &amp; Configuration</h4>
        <div class="code-block" style="font-size: 8.5px; padding: 8px; line-height: 1.4; margin-bottom: 0;">
<span class="code-comment"># Generate signing key for Aetheris repository</span>
openssl genrsa -des3 -out aetheris_repo_privkey.pem <span class="code-number">4096</span>
xbps-rindex --sign --signedby <span class="code-string">'Aetheris OS &lt;packages@aetheris.org&gt;'</span> \\
    --privkey aetheris_repo_privkey.pem /var/www/html/repo/

<span class="code-comment"># /etc/xbps.d/aetheris-repo.conf</span>
repository=https://packages.aetheris.org/repo</div>
      </div>
      <div class="col col-right" style="border-left: 1px solid var(--light-300); padding-left: 20px; width: 50%;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 11px; text-transform: uppercase;">Runit Supervised Service Runners</h4>
        <div class="code-block" style="font-size: 8.2px; padding: 8px; line-height: 1.35; margin-bottom: 0;">
<span class="code-comment"># /etc/sv/scx_loader/run (with DBus socket check)</span>
#!/bin/sh
exec 2>&1
while [ ! -S /run/dbus/system_bus_socket ]; do
    sleep 0.5
done
exec /usr/bin/scx_loader --config /etc/scx_loader.toml

<span class="code-comment"># /etc/sv/velocitymind/run (with early boot monitor)</span>
#!/bin/sh
exec 2>&1
mkdir -p /var/lib/velocitymind
if pgrep -x "velocitymind" >/dev/null; then
    pid=$(pgrep -o -x "velocitymind")
    while kill -0 "$pid" 2>/dev/null; do sleep 2; done
fi
exec /usr/bin/velocitymind</div>
      </div>
    </div>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>BASE DISTRIBUTION &amp; INIT</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 8: CHAPTER 03 OPENER
// ==========================================
PAGES.push(`
  <div class="page dark">
    <div class="chapter-opener">
      <div class="chapter-num">03</div>
      <div class="chapter-line"></div>
      <h2 class="chapter-title">RAM Reduction &amp;<br>Memory Management</h2>
      <span class="chapter-subtitle">Virtual Memory Management and Swap Compression</span>
    </div>
    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>CHAPTER 03 OPENER</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 9: RAM REDUCTION PART 1
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Virtual Memory</span>
    <h2 class="section-title">Memory Compression &amp; Swap</h2>
    <div class="section-title-line"></div>
    <p>
      To achieve high responsiveness under 1 GB of physical memory, Aetheris OS deploys a multi-layered memory optimization model, utilizing swap compression, proactive kernel page cache management, and userspace OOM supervision.
    </p>

    <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">Section A: ZRAM + zstd Compression</h4>
    <p style="font-size: 13px; line-height: 1.6; margin-top: 0;">
      Instead of relying on slow mechanical disk-backed swap, Aetheris OS allocates a compressed swap area directly in RAM. We allocate 150% of physical memory as ZRAM. With zstd compression providing a ~3:1 compression ratio, this effectively yields 3 GB of virtual memory capacity on a 1 GB system.
    </p>

    <div class="code-block" style="font-size: 10.5px;">
<span class="code-comment">#!/bin/sh  # /etc/sv/zram-init/run</span>
<span class="code-keyword">exec</span> 2>&1
modprobe zram num_devices=<span class="code-number">1</span> || <span class="code-keyword">exit</span> <span class="code-number">1</span>
<span class="code-keyword">while</span> [ ! -b /dev/zram0 ]; <span class="code-keyword">do</span> sleep 0.1; <span class="code-keyword">done</span>
echo zstd > /sys/block/zram0/comp_algorithm
phys_mem=\$(grep MemTotal /proc/meminfo | awk <span class="code-string">'{print $2}'</span>)
zram_target=\$(( phys_mem * <span class="code-number">1536</span> ))
echo <span class="code-string">"\${zram_target}"</span> > /sys/block/zram0/disksize
mkswap -U clear /dev/zram0
swapon -p <span class="code-number">100</span> --discard /dev/zram0
<span class="code-keyword">exec</span> chpst -b zram-init-daemon pause</div>

    <h4 style="color: var(--violet-700); font-size: 13px; text-transform: uppercase; margin-bottom: 8px;">Section B: sysctl Memory Tuning</h4>
    <div class="code-block" style="font-size: 10.5px;">
<span class="code-comment"># /etc/sysctl.d/90-memory-optimization.conf</span>
vm.swappiness = <span class="code-number">150</span>          <span class="code-comment"># Aggressively swap anonymous allocations early</span>
vm.vfs_cache_pressure = <span class="code-number">50</span>   <span class="code-comment"># Prefer retaining directory index structures in memory</span>
vm.dirty_background_bytes = <span class="code-number">16777216</span>  <span class="code-comment"># Background writeback flushes at 16 MiB</span>
vm.dirty_bytes = <span class="code-number">33554432</span>             <span class="code-comment"># Force synchronous writes if dirty cache hits 32 MiB</span>
vm.dirty_writeback_centisecs = <span class="code-number">1500</span>   <span class="code-comment"># 15s interval to minimize CPU cache writebacks</span>
vm.page-cluster = <span class="code-number">0</span>                   <span class="code-comment"># Sequential allocations for compressed swap pages</span>
kernel.nmi_watchdog = <span class="code-number">0</span>              <span class="code-comment"># Disable NMI watchdogs to reduce hardware interrupts</span></div>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>RAM REDUCTION &amp; MEMORY</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 10: RAM REDUCTION PART 2
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Out-Of-Memory Supervision</span>
    <h2 class="section-title">OOM Prevention &amp; Preloading</h2>
    <div class="section-title-line"></div>

    <div class="spec-card" style="margin-bottom: 10px;">
      <div class="spec-card-title">Section C: nohang-desktop OOM Prevention</div>
      <div class="spec-card-body" style="font-size: 11.5px; line-height: 1.5;">
        Uses Pressure Stall Information (PSI) to track memory exhaustion. Instead of system stalls, it sends desktop notifications and uses a graduated SIGTERM &rarr; SIGKILL pipeline. Compositors and panels are shielded from being terminated, while background tabs and wine instances are prioritized.
      </div>
    </div>

    <div class="code-block" style="font-size: 9px; margin-bottom: 10px; padding: 10px;">
psi_threshold_some_avg10 = <span class="code-number">40.0</span>
<span class="code-comment"># Shield compositor and panels from being killed</span>
@BADNESS_ADJ_RE_REALPATH -1000 /// ^(/usr/bin/labwc|/usr/bin/sfwbar|/usr/bin/dbus-daemon)\$
<span class="code-comment"># Target browser renderer processes and Wine servers early</span>
@BADNESS_ADJ_RE_NAME 500 /// ^(chrome|firefox|brave|chromium)\$
@BADNESS_ADJ_RE_NAME 600 /// ^(wine-preloader|wine64-preloader|wineserver)\$</div>

    <table class="data-table" style="margin-bottom: 10px; font-size: 11.5px;">
      <thead>
        <tr>
          <th>Daemon</th>
          <th>Idle RAM</th>
          <th>Trigger Metric</th>
          <th>Notifications</th>
          <th>Verdict</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>nohang-desktop</strong></td>
          <td>10–17 MiB</td>
          <td>RAM% + PSI + ZRAM</td>
          <td><span class="chip chip-green">Yes</span></td>
          <td><span class="chip chip-green">SELECTED</span></td>
        </tr>
        <tr>
          <td>earlyoom</td>
          <td>&lt; 1 MiB</td>
          <td>RAM + Swap %</td>
          <td><span class="chip chip-red">No</span></td>
          <td><span class="chip chip-amber">Fallback only</span></td>
        </tr>
        <tr>
          <td>systemd-oomd</td>
          <td>~25 MiB</td>
          <td>cgroups v2 PSI</td>
          <td><span class="chip chip-red">No</span></td>
          <td><span class="chip chip-red">Kills cgroup</span></td>
        </tr>
      </tbody>
    </table>

    <div class="two-col" style="margin-top: 8px;">
      <div class="col col-left" style="width: 55%; padding-right: 15px;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 12.5px; text-transform: uppercase; margin-bottom: 6px;">Section D: VelocityMind Preloading</h4>
        <div class="stat-grid" style="grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
          <div class="stat-block" style="padding: 6px;"><span class="stat-number" style="font-size: 15px;">&lt; 1 MB</span><span class="stat-label" style="font-size: 9px;">VmRSS Footprint</span></div>
          <div class="stat-block" style="padding: 6px;"><span class="stat-number" style="font-size: 15px;">4 Bins</span><span class="stat-label" style="font-size: 9px;">Temporal Bins</span></div>
          <div class="stat-block" style="padding: 6px;"><span class="stat-number" style="font-size: 15px;">&lt; 2ms</span><span class="stat-label" style="font-size: 9px;">Inference Time</span></div>
          <div class="stat-block" style="padding: 6px;"><span class="stat-number" style="font-size: 15px;">DTMC</span><span class="stat-label" style="font-size: 9px;">Model Type</span></div>
        </div>
        <p style="font-size: 10.5px; line-height: 1.4; color: var(--text-muted); margin-top: 0; margin-bottom: 6px;">
          Discrete-Time Markov Chain logs transitions between applications and schedules <code style="font-family: 'JetBrains Mono'; font-size: 9.5px;">POSIX_FADV_WILLNEED</code> early page preloading.
        </p>
        <h5 style="margin-top: 0; margin-bottom: 2px; color: var(--violet-700); font-size: 10px; text-transform: uppercase;">SQLite History Schema &amp; Socket API</h5>
        <div class="code-block" style="font-size: 7.0px; padding: 5px; line-height: 1.25; margin-bottom: 0;">
CREATE TABLE transitions (
  from_app TEXT, to_app TEXT, time_bin INT,
  transition_count INT,
  PRIMARY KEY (from_app, to_app, time_bin)
);
CREATE TABLE app_libraries (
  app_name TEXT, library_path TEXT, rank INT,
  PRIMARY KEY (app_name, library_path)
);
<span class="code-comment">// Unix Socket: /tmp/velocitymind.sock
// Focus hook: echo "\${app_id}" | nc -U /tmp/velocitymind.sock</span></div>
      </div>
      <div class="col col-right" style="border-left: 1px solid var(--light-300); padding-left: 20px;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 12.5px; text-transform: uppercase; margin-bottom: 6px;">Section E: Memory Budget</h4>
        <table class="data-table" style="font-size: 11px; margin-bottom: 0;">
          <thead>
            <tr>
              <th>Component</th>
              <th style="text-align: right;">VmRSS Memory</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>runit supervision tree</td>
              <td style="text-align: right; font-weight: bold; color: var(--green);">&lt; 2 MiB</td>
            </tr>
            <tr>
              <td>Labwc compositor</td>
              <td style="text-align: right;">~50 MiB</td>
            </tr>
            <tr>
              <td>sfwbar panel</td>
              <td style="text-align: right;">~12 MiB</td>
            </tr>
            <tr>
              <td>VelocityMind daemon</td>
              <td style="text-align: right; font-weight: bold; color: var(--green);">&lt; 1 MiB</td>
            </tr>
            <tr>
              <td>nohang-desktop</td>
              <td style="text-align: right;">~10–17 MiB</td>
            </tr>
            <tr>
              <td>D-Bus daemon</td>
              <td style="text-align: right;">~8 MiB</td>
            </tr>
            <tr>
              <td>PipeWire audio</td>
              <td style="text-align: right;">~15 MiB</td>
            </tr>
            <tr style="background-color: var(--violet-100); font-weight: bold;">
              <td>Total desktop idle</td>
              <td style="text-align: right; color: var(--violet-700);">~213 MiB</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>OOM &amp; PRELOADING</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 11: CHAPTER 04 OPENER
// ==========================================
PAGES.push(`
  <div class="page dark">
    <div class="chapter-opener">
      <div class="chapter-num">04</div>
      <div class="chapter-line"></div>
      <h2 class="chapter-title">Visual Identity &amp;<br>Desktop Environment</h2>
      <span class="chapter-subtitle">Compositor Pipelines and Prismatic Ultraviolet UI</span>
    </div>
    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>CHAPTER 04 OPENER</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 12: VISUAL IDENTITY PART 1
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Interface Shell</span>
    <h2 class="section-title">Compositor &amp; Color Architecture</h2>
    <div class="section-title-line"></div>

    <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">Section A: Compositor Comparison</h4>
    <table class="data-table" style="margin-bottom: 25px;">
      <thead>
        <tr>
          <th>Compositor</th>
          <th>Base Library</th>
          <th>Idle RAM</th>
          <th>VRAM Leak</th>
          <th>Decision</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Labwc</strong></td>
          <td>wlroots</td>
          <td>~50 MiB</td>
          <td>None</td>
          <td><span class="chip chip-green">SELECTED</span></td>
        </tr>
        <tr>
          <td>Hyprland</td>
          <td>Custom</td>
          <td>~70 MiB</td>
          <td>100MB &rarr; 1.8GB</td>
          <td><span class="chip chip-red">VRAM leak</span></td>
        </tr>
        <tr>
          <td>KWin Wayland</td>
          <td>Qt6</td>
          <td>~140 MiB</td>
          <td>None</td>
          <td><span class="chip chip-red">Too heavy</span></td>
        </tr>
        <tr>
          <td>SwayFX</td>
          <td>wlroots</td>
          <td>~55 MiB</td>
          <td>None</td>
          <td><span class="chip chip-red">Limited anim</span></td>
        </tr>
      </tbody>
    </table>

    <h4 style="color: var(--violet-700); font-size: 13px; text-transform: uppercase; margin-bottom: 12px;">Section B: Colour Swatches (Prismatic Obsidian)</h4>
    <p style="font-size: 12px; margin-top: 0; margin-bottom: 12px; color: var(--text-muted);">
      Neutral Obsidian Slate base values combined with Prismatic Ultraviolet accent scale levels:
    </p>

    <div class="swatch-container">
      <div class="swatch-card"><div class="swatch-color" style="background-color:#080A0F;"></div><div class="swatch-label">dark-000</div><div class="swatch-hex">#080A0F</div></div>
      <div class="swatch-card"><div class="swatch-color" style="background-color:#0E121A;"></div><div class="swatch-label">dark-100</div><div class="swatch-hex">#0E121A</div></div>
      <div class="swatch-card"><div class="swatch-color" style="background-color:#141A26;"></div><div class="swatch-label">dark-200</div><div class="swatch-hex">#141A26</div></div>
      <div class="swatch-card"><div class="swatch-color" style="background-color:#1C2436;"></div><div class="swatch-label">dark-300</div><div class="swatch-hex">#1C2436</div></div>
      <div class="swatch-card"><div class="swatch-color" style="background-color:#26324D;"></div><div class="swatch-label">dark-400</div><div class="swatch-hex">#26324D</div></div>
    </div>

    <div class="swatch-container" style="margin-bottom: 30px;">
      <div class="swatch-card"><div class="swatch-color" style="background-color:#EEF2FF;"></div><div class="swatch-label">vi-100</div><div class="swatch-hex">#EEF2FF</div></div>
      <div class="swatch-card"><div class="swatch-color" style="background-color:#C7D2FE;"></div><div class="swatch-label">vi-300</div><div class="swatch-hex">#C7D2FE</div></div>
      <div class="swatch-card"><div class="swatch-color" style="background-color:#818CF8;"></div><div class="swatch-label">vi-500</div><div class="swatch-hex">#818CF8</div></div>
      <div class="swatch-card"><div class="swatch-color" style="background-color:#6366F1;"></div><div class="swatch-label">vi-600</div><div class="swatch-hex">#6366F1</div></div>
      <div class="swatch-card"><div class="swatch-color" style="background-color:#4F46E5;"></div><div class="swatch-label">vi-700</div><div class="swatch-hex">#4F46E5</div></div>
    </div>

    <h4 style="color: var(--violet-700); font-size: 13px; text-transform: uppercase; margin-bottom: 12px;">Section C: Typography Stack</h4>
    <div class="spec-grid" style="margin-bottom: 0;">
      <div class="spec-card">
        <div class="spec-card-title">Nacelle Variable</div>
        <div class="spec-card-body">
          Default Sans-Serif system UI font. Features wide counter apertures and high vertical x-height (0.70) to ensure legibility at 10px labels.
        </div>
      </div>
      <div class="spec-card">
        <div class="spec-card-title">Geist Mono Variable</div>
        <div class="spec-card-body">
          Monospace font built by Vercel for diagnostic terminals and editor configurations. Prominent l/1, 0/O disambiguation.
        </div>
      </div>
    </div>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>COMPOSITOR &amp; COLOR</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 13: VISUAL IDENTITY PART 2
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Desktop Design</span>
    <h2 class="section-title">Theming &amp; Asset Footprints</h2>
    <div class="section-title-line"></div>

    <div class="two-col" style="margin-bottom: 10px;">
      <div class="col col-left" style="width: 50%;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">Section D: GTK4 Font Config</h4>
        <div class="code-block" style="font-size: 10px; padding: 10px;">
<span class="code-comment"># ~/.config/gtk-4.0/settings.ini</span>
gtk-hint-font-metrics=1
gtk-font-rendering=manual
gtk-xft-hinting=1
gtk-xft-hintstyle=hintslight
gtk-xft-antialias=1
gtk-font-name=Nacelle 10
gtk-application-prefer-dark-theme=1</div>
      </div>
      <div class="col col-right" style="width: 50%;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">Section E: Labwc Window borders</h4>
        <div class="code-block" style="font-size: 10px; padding: 10px;">
<span class="code-comment"># Prismatic-Obsidian themerc</span>
window.active.title.bg.color: #080A0F
window.active.border.color: #6366F1
window.inactive.border.color: #1C2436
window.active.title.text.color: #F4F6F9
border.width: 1
padding.width: 4
cornerRadius: 8</div>
      </div>
    </div>

    <h4 style="color: var(--violet-700); font-size: 13px; text-transform: uppercase; margin-bottom: 8px; margin-top: 0;">Section F: Design Token Compilation System</h4>
    <p style="font-size: 12.5px; line-height: 1.6; margin-top: 0; margin-bottom: 12px;">
      Aetheris OS utilizes <strong>Style Dictionary v4</strong> to compile design variables into static stylesheets (GTK4 CSS, Qt6 QSS, Labwc XML) at build time, ensuring zero dynamic CPU load at runtime.
    </p>

    <h4 style="color: var(--violet-700); font-size: 13px; text-transform: uppercase; margin-bottom: 4px; margin-top: 0;">Section G: GPU Fallback Wrapper Script</h4>
    <div class="code-block" style="font-size: 8.2px; padding: 6px; line-height: 1.35; margin-bottom: 12px;">
<span class="code-comment"># /usr/bin/labwc-wrapper (swaps config profiles on GPU detection)</span>
#!/bin/bash
if [ -e "/dev/dri/card0" ]; then
    cp "/usr/share/aetheris/config/labwc/rc.xml" "$HOME/.config/labwc/rc.xml"
else
    cp "/usr/share/aetheris/config/labwc/rc-fallback.xml" "$HOME/.config/labwc/rc.xml"
fi
/usr/bin/velocitymind-focus-hook &
exec labwc "$@"</div>

    <h4 style="color: var(--violet-700); font-size: 13px; text-transform: uppercase; margin-bottom: 8px; margin-top: 0;">Section H: Sfwbar Consolidation Memory Savings</h4>
    <p style="font-size: 12.5px; line-height: 1.6; margin-top: 0; margin-bottom: 12px;">
      The panel (sfwbar) directly reads system parameters from D-Bus and sysfs nodes instead of spawning persistent desktop applet processes:
    </p>
    <table class="data-table" style="font-size: 12px;">
      <thead>
        <tr>
          <th>Replaced System Applet</th>
          <th style="text-align: right;">Original VmRSS</th>
          <th style="text-align: right;">sfwbar Module VmRSS</th>
          <th style="text-align: right; color: var(--green);">Net Saving</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NetworkManager-applet</td>
          <td style="text-align: right;">~32 MiB</td>
          <td style="text-align: right;">&lt; 2 MiB</td>
          <td style="text-align: right; font-weight: bold; color: var(--green);">30.0 MiB</td>
        </tr>
        <tr>
          <td>Blueman-applet</td>
          <td style="text-align: right;">~28 MiB</td>
          <td style="text-align: right;">&lt; 1 MiB</td>
          <td style="text-align: right; font-weight: bold; color: var(--green);">27.0 MiB</td>
        </tr>
        <tr>
          <td>Pavucontrol volume daemon</td>
          <td style="text-align: right;">~45 MiB</td>
          <td style="text-align: right;">&lt; 1.5 MiB</td>
          <td style="text-align: right; font-weight: bold; color: var(--green);">43.5 MiB</td>
        </tr>
        <tr style="background-color: var(--violet-100); font-weight: bold;">
          <td>Total Desktop Status bar</td>
          <td style="text-align: right; color: var(--red);">~105 MiB</td>
          <td style="text-align: right; color: var(--violet-700);">&lt; 4.5 MiB</td>
          <td style="text-align: right; color: var(--green);">~100.5 MiB</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>THEMING &amp; PANEL</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 14: CHAPTER 05 OPENER
// ==========================================
PAGES.push(`
  <div class="page dark">
    <div class="chapter-opener">
      <div class="chapter-num">05</div>
      <div class="chapter-line"></div>
      <h2 class="chapter-title">Intelligent Driver<br>Management</h2>
      <span class="chapter-subtitle">Auto-detection Engine and Module Loading Pipelines</span>
    </div>
    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>CHAPTER 05 OPENER</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 15: DRIVER MANAGEMENT
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Driver Detection</span>
    <h2 class="section-title">Driver Auto-Detection Engine (chwd)</h2>
    <div class="section-title-line"></div>
    <p>
      To deliver a seamless plug-and-play experience, Aetheris OS scans hardware buses on boot and links appropriate kernel modules.
    </p>

    <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">Section A: 3-Stage PCI/USB Detection Pipeline</h4>
    <table class="data-table" style="margin-bottom: 20px;">
      <thead>
        <tr>
          <th style="width: 20%;">Stage</th>
          <th>Action</th>
          <th>Identifier Key</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Class ID</strong></td>
          <td>Filters devices by category (e.g. graphics, network controllers)</td>
          <td>PCI Class ID (e.g., 0300, 0302)</td>
        </tr>
        <tr>
          <td><strong>2. Vendor</strong></td>
          <td>Identifies device manufacturer</td>
          <td>Vendor ID (e.g., 10de for NVIDIA, 8086 for Intel)</td>
        </tr>
        <tr>
          <td><strong>3. Device</strong></td>
          <td>Cross-references device ID and name against declarative profiles</td>
          <td>Device ID / Regular Expression pattern</td>
        </tr>
      </tbody>
    </table>

    <div class="two-col" style="margin-top: 15px; margin-bottom: 15px;">
      <div class="col col-left" style="width: 50%;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 11px; text-transform: uppercase;">Section B: GPU Profile TOML</h4>
        <div class="code-block" style="font-size: 8.5px; padding: 8px; line-height: 1.35; margin-bottom: 0;">
# /usr/share/chwd/profiles/pci/graphic_drivers.toml
[nvidia-open-dkms]
desc = 'Open source kernel-mode NVIDIA drivers'
priority = 10
class_ids = ["0300", "0302"]
vendor_ids = ["10de"]
device_name_pattern = '(AD)\\w+'
packages = "nvidia-open-dkms nvidia-utils egl-wayland"</div>
      </div>
      <div class="col col-right" style="border-left: 1px solid var(--light-300); padding-left: 20px; width: 50%;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 11px; text-transform: uppercase;">Section C: Rust PCI Bus Scanner</h4>
        <div class="code-block" style="font-size: 7.8px; padding: 6px; line-height: 1.25; margin-bottom: 0;">
pub fn scan_pci_bus() -> Result&lt;Vec&lt;PciDevice&gt;, std::io::Error&gt; {
    let mut devices = Vec::new();
    let sys_bus_pci = Path::new("/sys/bus/pci/devices");
    if sys_bus_pci.exists() {
        for entry in fs::read_dir(sys_bus_pci)? {
            let path = entry?.path();
            let vendor = fs::read_to_string(path.join("vendor"))?
                .trim().replace("0x", "");
            let device = fs::read_to_string(path.join("device"))?
                .trim().replace("0x", "");
            let class = fs::read_to_string(path.join("class"))?
                .trim().replace("0x", "");
            devices.push(PciDevice { vendor, device, class });
        }
    }
    Ok(devices)
}</div>
      </div>
    </div>

    <div class="two-col">
      <div class="col col-left" style="width: 48%;">
        <div class="spec-card">
          <div class="spec-card-title" style="font-size: 11px;">Section D: PRIME Hybrid Detection</div>
          <div class="spec-card-body" style="font-size: 11px; line-height: 1.5;">
            Reads DMI chassis type. Values 8, 9, 10, or 11 indicate notebook. Loader automatically swaps standard GPU configurations with <code style="font-family: 'JetBrains Mono'; font-size: 9.5px;">.prime</code> profiles, installing switcheroo-control and configuring on-demand PRIME rendering.
          </div>
        </div>
      </div>
      <div class="col col-right" style="border-left: 1px solid var(--light-300); padding-left: 20px;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 12px; text-transform: uppercase;">Section E: WiFi Module Coverage</h4>
        <ul style="padding-left: 14px; margin: 0; font-size: 11px; line-height: 1.6; color: var(--text-muted);">
          <li><strong>Intel AX210 / BE200:</strong> iwlwifi module (mainline kernel)</li>
          <li><strong>Realtek RTL8821CE / RTL8822CE:</strong> rtw88 module</li>
          <li><strong>Realtek RTL8812AU:</strong> rtl8812au-dkms (out-of-tree)</li>
          <li><strong>Broadcom BCM43602 / BCM43455:</strong> brcmfmac (open)</li>
          <li><strong>Broadcom BCM43142 / BCM4360:</strong> wl module (dkms)</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>DRIVER MANAGEMENT</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 16: CHAPTER 06 OPENER
// ==========================================
PAGES.push(`
  <div class="page dark">
    <div class="chapter-opener">
      <div class="chapter-num">06</div>
      <div class="chapter-line"></div>
      <h2 class="chapter-title">Gaming Optimisations</h2>
      <span class="chapter-subtitle">High-Refresh Rate compositor hooks and NT Synchronization</span>
    </div>
    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>CHAPTER 06 OPENER</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 17: GAMING OPTIMISATIONS
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Performance Gaming</span>
    <h2 class="section-title">Gaming Optimization Pipelines</h2>
    <div class="section-title-line"></div>

    <table class="data-table" style="margin-bottom: 20px;">
      <thead>
        <tr>
          <th>Optimization Layer</th>
          <th>Technology</th>
          <th>Key System Benefit</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>CPU Scheduler</strong></td>
          <td>BORE + sched-ext (scx)</td>
          <td>Prioritizes interactive UI threads under load, hot-swaps BPF profiles</td>
        </tr>
        <tr>
          <td><strong>NT Sync</strong></td>
          <td>ntsync kernel driver</td>
          <td>Eliminates wineserver socket RPC overhead, up to 678% FPS gain</td>
        </tr>
        <tr>
          <td><strong>Micro-compositor</strong></td>
          <td>Gamescope (nested)</td>
          <td>Hardware frame pacing, FSR upscaling, Vulkan HDR layers</td>
        </tr>
        <tr>
          <td><strong>Latency</strong></td>
          <td>tearing-control-v1</td>
          <td>Allows asynchronous page flips, drops input delay below 2ms</td>
        </tr>
        <tr>
          <td><strong>Performance Monitor</strong></td>
          <td>MangoHud (mangoapp)</td>
          <td>Real-time CPU/GPU loads and frame pacing overlays</td>
        </tr>
        <tr>
          <td><strong>Daemon Tuning</strong></td>
          <td>GameMode runit</td>
          <td>Swaps CPU governor to performance, disables VM memory compaction</td>
        </tr>
      </tbody>
    </table>

    <div class="two-col" style="margin-bottom: 15px;">
      <div class="col col-left" style="width: 48%;">
        <div class="code-block" style="font-size: 9.5px; padding: 10px; margin-bottom: 0;">
# /etc/sv/gamemoded/run
#!/bin/sh
exec 2>&1
echo "performance" > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
echo 0 > /proc/sys/vm/compaction_proactiveness
echo "always" > /sys/kernel/mm/transparent_hugepage/enabled
exec gamemoded -f</div>
      </div>
      <div class="col col-right" style="border-left: 1px solid var(--light-300); padding-left: 20px;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">Gaming Mode Profiles</h4>
        <table class="data-table" style="font-size: 10.5px;">
          <thead>
            <tr>
              <th>Profile</th>
              <th>VSync</th>
              <th>EPP State</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Low Latency</strong></td>
              <td>Off (Async)</td>
              <td>performance</td>
            </tr>
            <tr>
              <td><strong>Cinematic</strong></td>
              <td>On (V-Sync)</td>
              <td>balance_perf</td>
            </tr>
            <tr>
              <td><strong>Battery</strong></td>
              <td>On</td>
              <td>balance_power</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="quote-block" style="font-size: 13px; padding: 10px 16px;">
      ntsync replaces slow wineserver socket queries with kernel-level fast mutex locks &mdash; delivering up to 678% FPS improvement in synchronisation-heavy Windows games under Proton.
    </div>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>GAMING OPTIMISATIONS</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 18: CHAPTER 07 OPENER
// ==========================================
PAGES.push(`
  <div class="page dark">
    <div class="chapter-opener">
      <div class="chapter-num">07</div>
      <div class="chapter-line"></div>
      <h2 class="chapter-title">Windows Compatibility</h2>
      <span class="chapter-subtitle">Translation Layers and ExecGuard Confinement</span>
    </div>
    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>CHAPTER 07 OPENER</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 19: WINDOWS COMPATIBILITY
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Windows Compatibility</span>
    <h2 class="section-title">Translation &amp; Sandbox Pipelines</h2>
    <div class="section-title-line"></div>

    <div class="two-col" style="margin-bottom: 20px;">
      <div class="col col-left" style="width: 50%;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">Translation Architecture</h4>
        <div class="code-block" style="font-size: 9.5px; padding: 10px; line-height: 1.5; font-family: 'JetBrains Mono'; margin-bottom: 0;">
Windows Application (.exe / .msi)
        │
        ├── Direct3D 9/10/11 ──→ DXVK ──────┐
        └── Direct3D 12 ─────→ VKD3D-Proton ─┤
                                              ↓
                              Mesa Vulkan Driver (anv/radv)
                                   Native GPU Execution</div>
      </div>
      <div class="col col-right" style="border-left: 1px solid var(--light-300); padding-left: 20px;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">ExecGuard Security Pipeline</h4>
        <ol style="padding-left: 14px; margin: 0; font-size: 11px; line-height: 1.6; color: var(--text-muted);">
          <li>Intercept: binfmt_misc routes all executable binaries through exec-guard-wrapper.</li>
          <li>Redirect: Checks app_db.json for native alternatives (Photoshop &rarr; GIMP, uTorrent &rarr; Transmission).</li>
          <li>Sandbox: Unknown binaries run in hardened Bubblewrap, blocking host file system access.</li>
        </ol>
      </div>
    </div>

    <h4 style="color: var(--violet-700); font-size: 13px; text-transform: uppercase; margin-bottom: 8px;">Bubblewrap Sandbox Confinement Script</h4>
    <div class="code-block" style="font-size: 9.5px; margin-bottom: 15px;">
exec bwrap \\
    --unshare-all --share-net --die-with-parent \\
    --ro-bind /usr /usr --ro-bind /bin /bin --ro-bind /lib /lib --ro-bind /lib64 /lib64 \\
    --dev /dev --proc /proc \\
    --tmpfs /tmp --tmpfs /run --tmpfs "$HOME" \\
    --bind "$SANDBOX_HOME" "$HOME" \\
    --setenv WINEDEBUG "-all" \\
    /usr/bin/wine "$HOME/target_app.exe"</div>

    <div class="spec-card">
      <div class="spec-card-title">CVE-2026-48831 Mitigation</div>
      <div class="spec-card-body">
        Protects the host from sandbox escape vulnerabilities where malicious Windows executables attempt to write files to shared directories and trigger them via default host Wine MIME handlers. Bubblewrap namespace isolation stops directory escapes.
      </div>
    </div>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>WINDOWS COMPATIBILITY</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 20: CHAPTER 08 OPENER
// ==========================================
PAGES.push(`
  <div class="page dark">
    <div class="chapter-opener">
      <div class="chapter-num">08</div>
      <div class="chapter-line"></div>
      <h2 class="chapter-title">Tauri System Utilities</h2>
      <span class="chapter-subtitle">VelocityInstall, VelocityStore, and VelocitySetup</span>
    </div>
    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>CHAPTER 08 OPENER</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 21: TAURI SYSTEM UTILITIES
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Workstation Apps</span>
    <h2 class="section-title">Custom Tauri System Utilities</h2>
    <div class="section-title-line"></div>

    <div class="spec-grid" style="margin-bottom: 20px;">
      <div class="spec-card">
        <div class="spec-card-title">VelocityInstall</div>
        <div class="spec-card-body">
          <strong>Stack:</strong> Tauri v2 + Svelte + Rust | <strong>Idle RAM:</strong> &lt; 40 MiB<br>
          Features partition map previews using libparted bindings. Strips speculative cache via WEBKIT_CACHE_MODEL_DOCUMENT_VIEWER. Supports LUKS2/TPM2 encryption, Btrfs subvolumes, Snapper rollback points, and dual-boot partition resizes.
        </div>
      </div>
      <div class="spec-card">
        <div class="spec-card-title">VelocityStore</div>
        <div class="spec-card-body">
          <strong>Stack:</strong> Tauri v2 + Svelte + Rust | <strong>Idle RAM:</strong> ~35 MiB<br>
          Direct FFI bindings to libxbps C API to avoid subshell forks. Displays Flathub AppStream metadata using offline SQLite cache (search &lt; 5ms). Manages Flatpak overrides directly via INI config editing.
        </div>
      </div>
    </div>

    <div class="spec-card" style="margin-bottom: 20px;">
      <div class="spec-card-title">VelocitySetup (OOBE Welcome Wizard)</div>
      <div class="spec-card-body">
        <strong>Stack:</strong> GTK4 + Libadwaita + Rust | <strong>Idle RAM:</strong> ~16 MiB<br>
        A 6-screen onboarding wizard (Accessibility &rarr; Locale &rarr; Network &rarr; Account &rarr; Privacy &rarr; Theme). Triggers chwd hardware auto-detection in a throttled background thread (ionice -c 3 + nice -n 19). Compiles style tokens to target configurations simultaneously. Uses zeroize crate for credentials.
      </div>
    </div>

    <h4 style="color: var(--violet-700); font-size: 13px; text-transform: uppercase; margin-bottom: 8px;">Utility Performance Comparison</h4>
    <table class="data-table">
      <thead>
        <tr>
          <th>Utility</th>
          <th>Framework / Stack</th>
          <th>Active RAM</th>
          <th>Legacy Equivalent</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>VelocityInstall</strong></td>
          <td>Tauri v2 + Svelte + Rust</td>
          <td style="font-weight: bold; color: var(--green);">&lt; 40 MiB</td>
          <td>Calamares (250–450 MiB) / Anaconda (600 MiB)</td>
        </tr>
        <tr>
          <td><strong>VelocityStore</strong></td>
          <td>Tauri v2 + Svelte + Rust</td>
          <td style="font-weight: bold; color: var(--green);">~35 MiB</td>
          <td>GNOME Software (150 MiB) / Discover (120 MiB)</td>
        </tr>
        <tr>
          <td><strong>VelocitySetup</strong></td>
          <td>GTK4 + Libadwaita + Rust</td>
          <td style="font-weight: bold; color: var(--green);">~16 MiB</td>
          <td>GNOME Initial Setup (90 MiB) / KDE Welcome (110 MiB)</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>TAURI UTILITIES</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 22: CHAPTER 09 OPENER
// ==========================================
PAGES.push(`
  <div class="page dark">
    <div class="chapter-opener">
      <div class="chapter-num">09</div>
      <div class="chapter-line"></div>
      <h2 class="chapter-title">Security Engineering</h2>
      <span class="chapter-subtitle">Mandatory Access Control, signed UKI, and nftables</span>
    </div>
    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>CHAPTER 09 OPENER</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 23: SECURITY ENGINEERING
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Security Stack</span>
    <h2 class="section-title">Confinement &amp; Boot Attestation</h2>
    <div class="section-title-line"></div>

    <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">Section A: Security Modules Comparison</h4>
    <table class="data-table" style="margin-bottom: 20px;">
      <thead>
        <tr>
          <th>Module</th>
          <th>Model</th>
          <th>LSM Hooks</th>
          <th>Idle RAM</th>
          <th>Decision</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>AppArmor</strong></td>
          <td>Path-centric profiles</td>
          <td>80</td>
          <td style="color: var(--green); font-weight: bold;">&lt; 10 MiB</td>
          <td><span class="chip chip-green">SELECTED</span></td>
        </tr>
        <tr>
          <td>SELinux</td>
          <td>Label-centric MLS</td>
          <td>217</td>
          <td style="color: var(--red);">85+ MiB</td>
          <td><span class="chip chip-red">87% file-open penalty</span></td>
        </tr>
        <tr>
          <td>Landlock</td>
          <td>Process self-sandbox</td>
          <td>Dynamic</td>
          <td style="color: var(--green); font-weight: bold;">~0</td>
          <td><span class="chip chip-violet">Complementary</span></td>
        </tr>
      </tbody>
    </table>

    <div class="two-col" style="margin-bottom: 15px;">
      <div class="col col-left" style="width: 48%;">
        <div class="spec-card" style="margin-bottom: 10px; padding: 10px;">
          <div class="spec-card-title" style="font-size: 11px;">Signed UKI &amp; MOK</div>
          <div class="spec-card-body" style="font-size: 10.5px; line-height: 1.4;">
            Unified Kernel Image combines kernel, initramfs, and cmdline into a single PE binary signed with custom Machine Owner Keys.
          </div>
        </div>
        <div class="spec-card" style="padding: 10px;">
          <div class="spec-card-title" style="font-size: 11px;">TPM2 PCR 15 Binding</div>
          <div class="spec-card-body" style="font-size: 10.5px; line-height: 1.4;">
            Volume keys are sealed to PCR 7 (Secure Boot) and PCR 15 (initramfs measurement), preventing filesystem confusion attacks.
          </div>
        </div>
      </div>
      <div class="col col-right" style="border-left: 1px solid var(--light-300); padding-left: 15px; width: 52%;">
        <div class="two-col" style="margin-bottom: 0;">
          <div class="col col-left" style="width: 50%; padding-right: 8px;">
            <h4 style="margin-top: 0; color: var(--violet-700); font-size: 10px; text-transform: uppercase;">Section B: nftables Config</h4>
            <div class="code-block" style="font-size: 7.2px; padding: 6px; line-height: 1.3; margin-bottom: 0;">
table inet workstation_firewall {
  chain inbound_protection {
    type filter hook input priority 0;
    policy drop;
    ct state established,related accept
    iif "lo" accept
    ct state invalid drop
    ip protocol icmp accept
    ip6 nexthdr icmpv6 accept
  }
}</div>
          </div>
          <div class="col col-right" style="border-left: 1px solid var(--light-300); padding-left: 8px; width: 50%;">
            <h4 style="margin-top: 0; color: var(--violet-700); font-size: 10px; text-transform: uppercase;">Section C: sysctl Hardening</h4>
            <div class="code-block" style="font-size: 7.2px; padding: 6px; line-height: 1.3; margin-bottom: 0;">
<span class="code-comment"># /etc/sysctl.d/99-hardened.conf</span>
kernel.kptr_restrict = 2
kernel.dmesg_restrict = 1
kernel.unprivileged_bpf_disabled = 1
kernel.yama.ptrace_scope = 2
kernel.core_pattern = |/bin/false
kernel.randomize_va_space = 2
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
kernel.unprivileged_userns_clone = 0</div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>SECURITY ENGINEERING</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 24: CHAPTER 10 OPENER
// ==========================================
PAGES.push(`
  <div class="page dark">
    <div class="chapter-opener">
      <div class="chapter-num">10</div>
      <div class="chapter-line"></div>
      <h2 class="chapter-title">Implementation Status<br>&amp; Audit</h2>
      <span class="chapter-subtitle">Component Completion Metrics and Gap Analysis</span>
    </div>
    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>CHAPTER 10 OPENER</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 25: AUDIT SCORECARD
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Production Readiness</span>
    <h2 class="section-title">Final Audit Scorecard</h2>
    <div class="section-title-line"></div>

    <table class="data-table" style="margin-bottom: 20px;">
      <thead>
        <tr>
          <th>Subsystem Area</th>
          <th style="text-align: center; width: 20%;">Completion</th>
          <th style="text-align: right; width: 35%;">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Kernel &amp; Build System</strong></td>
          <td style="text-align: center; font-weight: bold;">100%</td>
          <td style="text-align: right;"><span class="chip chip-green">Complete</span></td>
        </tr>
        <tr>
          <td><strong>Memory &amp; Init System</strong></td>
          <td style="text-align: center; font-weight: bold;">100%</td>
          <td style="text-align: right;"><span class="chip chip-green">Complete</span></td>
        </tr>
        <tr>
          <td><strong>Desktop Shell</strong></td>
          <td style="text-align: center; font-weight: bold;">100%</td>
          <td style="text-align: right;"><span class="chip chip-green">Complete</span></td>
        </tr>
        <tr>
          <td><strong>Windows Compatibility</strong></td>
          <td style="text-align: center; font-weight: bold;">100%</td>
          <td style="text-align: right;"><span class="chip chip-green">Complete</span></td>
        </tr>
        <tr>
          <td><strong>chwd Driver Engine</strong></td>
          <td style="text-align: center; font-weight: bold;">100%</td>
          <td style="text-align: right;"><span class="chip chip-green">Complete</span></td>
        </tr>
        <tr>
          <td><strong>VelocityMind Preloader</strong></td>
          <td style="text-align: center; font-weight: bold;">100%</td>
          <td style="text-align: right;"><span class="chip chip-green">Complete</span></td>
        </tr>
        <tr>
          <td><strong>VelocityInstall App</strong></td>
          <td style="text-align: center; font-weight: bold;">100%</td>
          <td style="text-align: right;"><span class="chip chip-green">Complete</span></td>
        </tr>
        <tr>
          <td><strong>VelocityStore App</strong></td>
          <td style="text-align: center; font-weight: bold;">100%</td>
          <td style="text-align: right;"><span class="chip chip-green">Complete</span></td>
        </tr>
        <tr>
          <td><strong>VelocityShield Security</strong></td>
          <td style="text-align: center; font-weight: bold;">100%</td>
          <td style="text-align: right;"><span class="chip chip-green">Complete</span></td>
        </tr>
        <tr>
          <td><strong>VelocitySetup OOBE</strong></td>
          <td style="text-align: center; font-weight: bold;">100%</td>
          <td style="text-align: right;"><span class="chip chip-green">Complete</span></td>
        </tr>
        <tr style="background-color: var(--violet-100); font-weight: bold;">
          <td>OVERALL ARCHITECTURE</td>
          <td style="text-align: center; color: var(--violet-700);">100%</td>
          <td style="text-align: right; color: var(--green);"><span class="chip chip-green">Production Ready</span></td>
        </tr>
      </tbody>
    </table>

    <div class="two-col">
      <div class="col col-left" style="width: 50%;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">Completed Subsystems</h4>
        <ul style="padding-left: 14px; margin: 0; font-size: 11px; line-height: 1.6; color: var(--text-muted);">
          <li>All kernel config templates populated and version-locked.</li>
          <li>zram-init runit configurations tested and active.</li>
          <li>ExecGuard wrappers and bubblewrap sandbox profiles generated.</li>
          <li>chwd PCI/USB scan modules and profiles tested.</li>
          <li>VelocityMind pre-boot runit wrappers complete.</li>
        </ul>
      </div>
      <div class="col col-right" style="border-left: 1px solid var(--light-300); padding-left: 20px;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">Outstanding Gaps</h4>
        <ul style="padding-left: 14px; margin: 0; font-size: 11px; line-height: 1.6; color: var(--text-muted);">
          <li><span class="chip chip-amber" style="padding: 1px 6px; font-size: 8px;">Pending</span> UKI automatic GPG signing scripts (Phase 4).</li>
          <li><span class="chip chip-amber" style="padding: 1px 6px; font-size: 8px;">Pending</span> P2P local Flatpak sync updates for LAN (Research).</li>
          <li><span class="chip chip-amber" style="padding: 1px 6px; font-size: 8px;">Pending</span> s6-rc init system migration research (v1.2).</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>STATUS &amp; AUDIT</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 26: CHAPTER 11 OPENER
// ==========================================
PAGES.push(`
  <div class="page dark">
    <div class="chapter-opener">
      <div class="chapter-num">11</div>
      <div class="chapter-line"></div>
      <h2 class="chapter-title">v1.1 Research<br>Highlights</h2>
      <span class="chapter-subtitle">Evaluation of 87 Performance &amp; Security Enhancements</span>
    </div>
    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>CHAPTER 11 OPENER</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 27: RESEARCH HIGHLIGHTS 1
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Technical Advancements</span>
    <h2 class="section-title">Research Highlights (1 of 2)</h2>
    <div class="section-title-line"></div>
    <p>
      An audit of the v1.1 planning files outlines 87 discrete improvements identified across 10 major subsystems. 23 items are marked as critical priority, and 0 irreconcilable conflicts were found.
    </p>

    <div class="stat-grid" style="margin-top: 25px; margin-bottom: 25px;">
      <div class="stat-block"><span class="stat-number">87</span><span class="stat-label">Improvements</span></div>
      <div class="stat-block"><span class="stat-number">23</span><span class="stat-label">Critical Priority</span></div>
      <div class="stat-block"><span class="stat-number">0</span><span class="stat-label">Conflicts</span></div>
      <div class="stat-block"><span class="stat-number">2,840h</span><span class="stat-label">Total Effort</span></div>
    </div>

    <div class="two-col">
      <div class="col col-left" style="width: 50%;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">1. Dynamic Scheduler Switching</h4>
        <p style="font-size: 11.5px; line-height: 1.6; color: var(--text-muted); margin-top: 0; margin-bottom: 12px;">
          Using <code>scx_loader</code> with BPF dynamic runtime scheduler switches. Defaults to scx_bpfland for mixed desktop tasks, and scx_lavd for latency-critical gaming (+18% frame consistency).
        </p>

        <h4 style="color: var(--violet-700); font-size: 13px; text-transform: uppercase; margin-bottom: 4px;">2. MGLRU Watermarks</h4>
        <p style="font-size: 11.5px; line-height: 1.6; color: var(--text-muted); margin-top: 0; margin-bottom: 12px;">
          Tuning MGLRU watermark boost parameters to prevent page thrashing on 1 GB targets (+8–15% reclaim accuracy).
        </p>

        <h4 style="color: var(--violet-700); font-size: 13px; text-transform: uppercase; margin-bottom: 4px;">3. Explicit Sync Protocol</h4>
        <p style="font-size: 11.5px; line-height: 1.6; color: var(--text-muted); margin-top: 0; margin-bottom: 12px;">
          wlroots 0.18+ <code>linux-drm-syncobj-v1</code> integration. Fully eliminates compositor GPU-CPU timeline rendering stutters in Chromium and Electron apps.
        </p>
      </div>
      <div class="col col-right" style="border-left: 1px solid var(--light-300); padding-left: 20px;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">4. Landlock LSM Sandboxing</h4>
        <p style="font-size: 11.5px; line-height: 1.6; color: var(--text-muted); margin-top: 0; margin-bottom: 12px;">
          Self-imposed runtime sandboxing for browsers and high-risk network utilities, stackable with AppArmor path confinement.
        </p>

        <h4 style="color: var(--violet-700); font-size: 13px; text-transform: uppercase; margin-bottom: 4px;">5. Second-Order Markov Chain</h4>
        <p style="font-size: 11.5px; line-height: 1.6; color: var(--text-muted); margin-top: 0; margin-bottom: 12px;">
          Upgrading VelocityMind inference algorithms to consider the last two active windows, boosting prediction precision by +8–12% within <code>1MB</code> RAM.
        </p>
      </div>
    </div>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>RESEARCH HIGHLIGHTS (1/2)</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 28: RESEARCH HIGHLIGHTS 2
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Technical Advancements</span>
    <h2 class="section-title">Research Highlights (2 of 2)</h2>
    <div class="section-title-line"></div>

    <div class="two-col" style="margin-top: 10px;">
      <div class="col col-left" style="width: 50%;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">6. ntsync Adoption</h4>
        <p style="font-size: 11.5px; line-height: 1.6; color: var(--text-muted); margin-top: 0; margin-bottom: 15px;">
          Adopting the fast kernel-level synchronization primitives of Linux 6.14. Replaces slow userspace wineserver RPC calls, boosting Proton performance up to 678%.
        </p>

        <h4 style="color: var(--violet-700); font-size: 13px; text-transform: uppercase; margin-bottom: 4px;">7. DXVK GPL &amp; State Cache</h4>
        <p style="font-size: 11.5px; line-height: 1.6; color: var(--text-muted); margin-top: 0; margin-bottom: 15px;">
          Enabling Vulkan Graphics Pipeline Library globally to compile pipelines at load time. Pre-packages top 20 state caches, reducing first-play stutters by -90%.
        </p>

        <h4 style="color: var(--violet-700); font-size: 13px; text-transform: uppercase; margin-bottom: 4px;">8. AppArmor userns Allowlist</h4>
        <p style="font-size: 11.5px; line-height: 1.6; color: var(--text-muted); margin-top: 0; margin-bottom: 15px;">
          AppArmor 4.0 userns rules restrict user namespaces globally while granting explicit creation access to Chromium, Flatpak, and Steam wrappers.
        </p>
      </div>
      <div class="col col-right" style="border-left: 1px solid var(--light-300); padding-left: 20px;">
        <h4 style="margin-top: 0; color: var(--violet-700); font-size: 13px; text-transform: uppercase;">9. VelocityMind Pre-Boot</h4>
        <p style="font-size: 11.5px; line-height: 1.6; color: var(--text-muted); margin-top: 0; margin-bottom: 15px;">
          Starting the prediction engine before the desktop manager boots allows files to be pre-cached before user interactions, reducing first-app launch delay by -20–40%.
        </p>

        <h4 style="color: var(--violet-700); font-size: 13px; text-transform: uppercase; margin-bottom: 4px;">10. Shared Library Prefetch</h4>
        <p style="font-size: 11.5px; line-height: 1.6; color: var(--text-muted); margin-top: 0; margin-bottom: 15px;">
          Using fanotify to track and load the top 5 shared libraries (.so) of predicted applications, decreasing load times by -15–30% on mechanical disks.
        </p>
      </div>
    </div>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>RESEARCH HIGHLIGHTS (2/2)</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 29: CHAPTER 12 OPENER
// ==========================================
PAGES.push(`
  <div class="page dark">
    <div class="chapter-opener">
      <div class="chapter-num">12</div>
      <div class="chapter-line"></div>
      <h2 class="chapter-title">v1.1 Release Candidate<br>Specification</h2>
      <span class="chapter-subtitle">Release Planning and Target Milestones</span>
    </div>
    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>CHAPTER 12 OPENER</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 30: RELEASE CANDIDATE 1
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Release Planning</span>
    <h2 class="section-title">v1.1 Release Candidate Specs (1 of 2)</h2>
    <div class="section-title-line"></div>

    <table class="data-table" style="font-size: 11px; margin-bottom: 15px;">
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th>Planned Improvement</th>
          <th>Impact</th>
          <th>Effort</th>
          <th>Risk</th>
          <th>Subsystem Area</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td><strong>ntsync Full Adoption</strong></td>
          <td>10/10</td>
          <td>20h</td>
          <td><span class="chip chip-green">Low</span></td>
          <td>Gaming (RA3.1)</td>
        </tr>
        <tr>
          <td>2</td>
          <td><strong>sched-ext Dynamic Switching</strong></td>
          <td>9/10</td>
          <td>80h</td>
          <td><span class="chip chip-amber">Medium</span></td>
          <td>Kernel (RA1.1)</td>
        </tr>
        <tr>
          <td>3</td>
          <td><strong>Explicit Sync Integration</strong></td>
          <td>9/10</td>
          <td>120h</td>
          <td><span class="chip chip-amber">Medium</span></td>
          <td>Desktop (RA2.2)</td>
        </tr>
        <tr>
          <td>4</td>
          <td><strong>CI/CD Build Infrastructure</strong></td>
          <td>9/10</td>
          <td>120h</td>
          <td><span class="chip chip-amber">Medium</span></td>
          <td>Infrastructure (RA10.1)</td>
        </tr>
        <tr>
          <td>5</td>
          <td><strong>MGLRU + ZRAM Optimisation</strong></td>
          <td>8/10</td>
          <td>40h</td>
          <td><span class="chip chip-green">Low</span></td>
          <td>Memory (RA1.2)</td>
        </tr>
        <tr>
          <td>6</td>
          <td><strong>User Namespace Allowlist</strong></td>
          <td>8/10</td>
          <td>80h</td>
          <td><span class="chip chip-amber">Medium</span></td>
          <td>Security (RA4.4)</td>
        </tr>
        <tr>
          <td>7</td>
          <td><strong>DXVK/VKD3D GPL + State Cache</strong></td>
          <td>8/10</td>
          <td>30h</td>
          <td><span class="chip chip-green">Low</span></td>
          <td>Gaming (RA3.3)</td>
        </tr>
        <tr>
          <td>8</td>
          <td><strong>Second-Order Markov Chain</strong></td>
          <td>8/10</td>
          <td>40h</td>
          <td><span class="chip chip-green">Low</span></td>
          <td>Preloading (RA6.1)</td>
        </tr>
        <tr>
          <td>9</td>
          <td><strong>VelocityMind Pre-Boot Start</strong></td>
          <td>8/10</td>
          <td>20h</td>
          <td><span class="chip chip-green">Low</span></td>
          <td>Boot (RA9.2)</td>
        </tr>
        <tr>
          <td>10</td>
          <td><strong>Shared Library Prefetching</strong></td>
          <td>8/10</td>
          <td>30h</td>
          <td><span class="chip chip-green">Low</span></td>
          <td>Preloading (RA6.3)</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>RELEASE CANDIDATE (1/2)</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 31: RELEASE CANDIDATE 2
// ==========================================
PAGES.push(`
  <div class="page light">
    <span class="section-eyebrow">Release Planning</span>
    <h2 class="section-title">v1.1 Release Candidate Specs (2 of 2)</h2>
    <div class="section-title-line"></div>

    <table class="data-table" style="font-size: 11px; margin-bottom: 20px;">
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th>Planned Improvement</th>
          <th>Impact</th>
          <th>Effort</th>
          <th>Risk</th>
          <th>Subsystem Area</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>11</td>
          <td><strong>Documentation System (MkDocs)</strong></td>
          <td>8/10</td>
          <td>60h</td>
          <td><span class="chip chip-green">Low</span></td>
          <td>Community (RA10.4)</td>
        </tr>
        <tr>
          <td>12</td>
          <td><strong>Landlock LSM Integration</strong></td>
          <td>7/10</td>
          <td>60h</td>
          <td><span class="chip chip-amber">Medium</span></td>
          <td>Security (RA4.1)</td>
        </tr>
        <tr>
          <td>13</td>
          <td><strong>PREEMPT_DYNAMIC Audio</strong></td>
          <td>8/10</td>
          <td>20h</td>
          <td><span class="chip chip-green">Low</span></td>
          <td>Kernel (RA1.8)</td>
        </tr>
        <tr>
          <td>14</td>
          <td><strong>runit Parallelism Optimisation</strong></td>
          <td>7/10</td>
          <td>40h</td>
          <td><span class="chip chip-green">Low</span></td>
          <td>Boot (RA9.3)</td>
        </tr>
        <tr>
          <td>15</td>
          <td><strong>Fractional Scaling (wlroots 0.18+)</strong></td>
          <td>8/10</td>
          <td>40h</td>
          <td><span class="chip chip-amber">Medium</span></td>
          <td>Desktop (RA2.7)</td>
        </tr>
      </tbody>
    </table>

    <div class="stat-grid" style="margin-bottom: 20px;">
      <div class="stat-block"><span class="stat-number">3</span><span class="stat-label">Gaming Items</span></div>
      <div class="stat-block"><span class="stat-number">4</span><span class="stat-label">Desktop Items</span></div>
      <div class="stat-block"><span class="stat-number">3</span><span class="stat-label">Security Items</span></div>
      <div class="stat-block"><span class="stat-number">5</span><span class="stat-label">Infra Items</span></div>
    </div>

    <div class="quote-block" style="font-size: 12.5px; padding: 12px 18px; margin-bottom: 20px;">
      Estimated Total Workload: 750 Hours. Spanning 4 parallel workstreams: 5–6 weeks. Recommended release testing window: 6–8 weeks including integration audits.
    </div>

    <p style="font-size: 11px; color: var(--text-muted); margin: 0; line-height: 1.5;">
      <strong style="color: var(--text-dark);">DEFERRED TO v1.2:</strong> Propeller optimization &middot; Wine Wayland native driver &middot; Full HDR desktop pipeline &middot; s6-rc init system migration &middot; Privacy telemetry system &middot; 150 MiB idle panel target.
    </p>

    <div class="footer">
      <span>AETHERIS OS &mdash; DEFINITIVE SPECIFICATION</span>
      <span>RELEASE CANDIDATE (2/2)</span>
    </div>
  </div>
`);

// ==========================================
// PAGE 32: CLOSING
// ==========================================
PAGES.push(`
  <div class="page dark" style="padding-top: 50mm;">
    <div class="cover-decor-top"></div>
    <div class="cover-container" style="justify-content: center; gap: 40px; padding: 0;">
      <div style="margin-top: 10px;"></div>
      <div class="cover-header">
        <h2 style="font-size: 36px; font-weight: 700; color: var(--text-light); margin: 0 0 10px 0; letter-spacing: -0.02em;">Aetheris OS</h2>
        <div class="cover-tagline" style="color: var(--violet-500); font-size: 13px; letter-spacing: 0.15em; font-style: italic;">Lightweight &middot; Intelligent &middot; Precise</div>
        <div class="cover-line" style="margin-top: 20px; margin-bottom: 20px; width: 40px;"></div>
        <div style="height: 20px;"></div>
      </div>
      <p style="font-size: 10px; color: var(--text-dim); text-align: center; margin: 40px 0 0 0; font-family: 'Archivo', sans-serif;">
        Copyright &copy; 2026 Aetheris OS Development Team.<br>Released under the open-source MIT and GPL licenses.
      </p>
    </div>
    <div class="cover-decor-bottom"></div>
    <div class="footer">
      <span>Aetheris OS &middot; Product White Paper</span>
      <span>June 2026</span>
    </div>
  </div>
`);

// ==========================================
// BUILD EXECUTOR
// ==========================================
const watermarkHtml = `<a href="https://amandeavor.netlify.app" target="_blank" class="page-watermark">@amandeavor</a>`;
const pagesWithWatermark = PAGES.map(page => {
  let pageHtml = page;
  const lastIndex = pageHtml.lastIndexOf('</div>');
  if (lastIndex !== -1) {
    pageHtml = pageHtml.slice(0, lastIndex) + watermarkHtml + pageHtml.slice(lastIndex);
  }

  // Wrap code blocks in macOS terminal wrappers dynamically
  pageHtml = pageHtml.replace(/<div class="code-block"([^>]*)>([\s\S]*?)<\/div>/g, (match, attrs, codeContent) => {
    let title = "bash";
    if (codeContent.includes("repository=") || codeContent.includes("zram-init-daemon")) {
      title = "runit-service";
    } else if (codeContent.includes(".conf") || codeContent.includes("vm.swappiness")) {
      title = "sysctl.conf";
    } else if (codeContent.includes("table inet")) {
      title = "nftables.conf";
    } else if (codeContent.includes("scan_pci_bus")) {
      title = "pci_scan.rs";
    } else if (codeContent.includes("nvidia-open-dkms")) {
      title = "graphic_drivers.toml";
    } else if (codeContent.includes("CREATE TABLE")) {
      title = "sqlite3";
    } else if (codeContent.includes("labwc-wrapper")) {
      title = "labwc-wrapper";
    } else if (codeContent.includes("gamemoded")) {
      title = "gamemoded.run";
    } else if (codeContent.includes("exec bwrap")) {
      title = "bwrap-sandbox";
    }

    return `<div class="terminal-container"><div class="terminal-titlebar"><div class="terminal-dots"><span class="terminal-dot red"></span><span class="terminal-dot yellow"></span><span class="terminal-dot green"></span></div><span class="terminal-title">${title}</span></div><div class="code-block"${attrs}>${codeContent}</div></div>`;
  });

  return pageHtml;
});

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Aetheris OS &mdash; Definitive Specification</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    ${CSS_STYLES}
  </style>
</head>
<body>
  ${pagesWithWatermark.join('\n')}
</body>
</html>`;

const outputPath = path.join(__dirname, 'aetheris_spec.html');
fs.writeFileSync(outputPath, HTML_TEMPLATE);
console.log(`Successfully generated Aetheris OS Specification HTML at: ${outputPath}`);
