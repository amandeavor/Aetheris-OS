<!-- File: velocitystore/src/components/AppDetail.svelte -->
<!-- Tauri/Svelte App Detail Page with Flatpak Permission Manager overrides -->

<script>
  import { onMount, createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  const { invoke } = window.__TAURI__.core;

  export let app;

  let installPercent = 0;
  let isInstalling = false;
  let isInstalled = app.installed;
  let actionText = "";

  // Flatpak Permission overrides data structure
  let permissions = {
    filesystems: {
      "home": true,
      "host": false
    },
    sockets: {
      "wayland": true,
      "x11": false,
      "network": true
    }
  };

  onMount(async () => {
    // Listen to libxbps background progress events streamed from Rust
    window.__TAURI__.event.listen('xbps-progress', (event) => {
      const payload = event.payload;
      if (payload.package === app.id) {
        actionText = `${payload.action}...`;
        installPercent = payload.percentage;
      }
    });

    window.__TAURI__.event.listen('xbps-complete', (event) => {
      if (event.payload === app.id) {
        isInstalling = false;
        isInstalled = true;
        app.installed = true;
      }
    });

    // Query flatpak permission overrides if it's a flatpak package
    if (app.source === 'flatpak') {
      try {
        const result = await invoke('get_flatpak_permissions', {
          appId: app.id,
          isSystem: false
        });
        // Merge returned permissions into local overrides map if found
        if (result && Object.keys(result.filesystems).length > 0) {
          permissions = {
            filesystems: { ...permissions.filesystems, ...result.filesystems },
            sockets: { ...permissions.sockets, ...result.sockets }
          };
        }
      } catch (e) {
        console.error("Flatpak override query failed", e);
      }
    }
  });

  async function triggerInstall() {
    isInstalling = true;
    installPercent = 0;
    actionText = "Queuing transaction...";

    if (app.source === 'flatpak') {
      // Simulate Flatpak transaction progress stream
      setTimeout(() => { actionText = "Downloading runtime dependencies..."; installPercent = 30; }, 500);
      setTimeout(() => { actionText = "Installing flatpak application..."; installPercent = 70; }, 1500);
      setTimeout(() => {
        isInstalling = false;
        isInstalled = true;
        app.installed = true;
      }, 2500);
    } else {
      // Call direct C libxbps FFI binding command in Rust
      try {
        await invoke('install_package', { pkgName: app.id });
      } catch (e) {
        isInstalling = false;
        alert(`Installation failed: ${e}`);
      }
    }
  }

  async function triggerRemove() {
    isInstalling = true;
    actionText = "Removing application...";
    if (app.source === 'flatpak') {
      setTimeout(() => {
        isInstalling = false;
        isInstalled = false;
        app.installed = false;
      }, 1500);
    } else {
      try {
        await invoke('remove_package', { pkgName: app.id });
      } catch (e) {
        isInstalling = false;
        alert(`Removal failed: ${e}`);
      }
    }
  }

  async function togglePermission(category, key, currentValue) {
    if (app.source !== 'flatpak') return;

    permissions[category][key] = !currentValue;

    try {
      await invoke('save_flatpak_permissions', {
        perms: {
          app_id: app.id,
          filesystems: permissions.filesystems,
          sockets: permissions.sockets,
          devices: {}
        },
        isSystem: false
      });
    } catch (e) {
      console.error("Failed to save flatpak permissions", e);
    }
  }
</script>

<div class="detail-page">
  <button class="back-link" on:click={() => dispatch('back')}>
    ← Back to Curation
  </button>

  <section class="app-header">
    <div class="app-icon-large">{app.icon}</div>
    <div class="app-meta">
      <h1>{app.name}</h1>
      <p class="summary">{app.summary}</p>
      <div class="badges">
        <span class="badge source">{app.source}</span>
        <span class="badge size">{app.size}</span>
      </div>
    </div>

    <div class="action-btn-wrapper">
      {#if isInstalling}
        <div class="install-progress-state">
          <span class="status-lbl">{actionText}</span>
          <div class="prog-bar"><div class="fill" style="width: {installPercent}%"></div></div>
        </div>
      {:else if isInstalled}
        <button class="btn btn-danger" on:click={triggerRemove}>Uninstall</button>
      {:else}
        <button class="btn btn-primary" on:click={triggerInstall}>Install</button>
      {/if}
    </div>
  </section>

  <!-- Description Section -->
  <section class="app-body">
    <h3>About this Application</h3>
    <p class="description">{app.description}</p>
  </section>

  <!-- Flatpak Sandbox Override Panel -->
  {#if app.source === 'flatpak'}
    <section class="sandbox-override-panel">
      <h3>🔒 Flatpak Sandbox Access Permissions (Flatseal-style)</h3>
      <p class="description-sub">Configure direct access rules for this application sandbox. Adjusting options updates host configuration INI dynamically.</p>

      <div class="permission-group">
        <h4>Filesystems Access</h4>
        <div class="toggle-row" on:click={() => togglePermission('filesystems', 'home', permissions.filesystems.home)}>
          <span class="perm-title">User Home Directory</span>
          <span class="perm-desc">Allow read/write access to /home/user/</span>
          <span class="toggle-switch {permissions.filesystems.home ? 'on' : 'off'}"></span>
        </div>
        <div class="toggle-row" on:click={() => togglePermission('filesystems', 'host', permissions.filesystems.host)}>
          <span class="perm-title">All Host System Files</span>
          <span class="perm-desc">Allow accessing root filesystem paths (/usr, /etc)</span>
          <span class="toggle-switch {permissions.filesystems.host ? 'on' : 'off'}"></span>
        </div>
      </div>

      <div class="permission-group">
        <h4>Graphics and Network Sockets</h4>
        <div class="toggle-row" on:click={() => togglePermission('sockets', 'wayland', permissions.sockets.wayland)}>
          <span class="perm-title">Wayland Display Socket</span>
          <span class="perm-desc">Allows presenting windows using modern graphics display server</span>
          <span class="toggle-switch {permissions.sockets.wayland ? 'on' : 'off'}"></span>
        </div>
        <div class="toggle-row" on:click={() => togglePermission('sockets', 'x11', permissions.sockets.x11)}>
          <span class="perm-title">Legacy X11 server</span>
          <span class="perm-desc">Allows fallback legacy rendering window compatibility</span>
          <span class="toggle-switch {permissions.sockets.x11 ? 'on' : 'off'}"></span>
        </div>
        <div class="toggle-row" on:click={() => togglePermission('sockets', 'network', permissions.sockets.network)}>
          <span class="perm-title">Internet network access</span>
          <span class="perm-desc">Allow application to create network connections</span>
          <span class="toggle-switch {permissions.sockets.network ? 'on' : 'off'}"></span>
        </div>
      </div>
    </section>
  {/if}
</div>

<style>
  .detail-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .back-link {
    background: none;
    border: none;
    outline: none;
    color: #6366F1;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    align-self: flex-start;
    padding: 0;
    margin-bottom: 8px;
  }

  .app-header {
    display: flex;
    gap: 20px;
    align-items: center;
    border-bottom: 1px solid #1E293B;
    padding-bottom: 24px;
  }

  .app-icon-large {
    font-size: 54px;
    background-color: #080A0F;
    border: 1px solid #1E293B;
    width: 80px;
    height: 80px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .app-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .app-meta h1 {
    margin: 0;
    font-size: 22px;
    color: #F4F6F9;
  }

  .summary {
    margin: 0;
    font-size: 14px;
    color: #94A3B8;
  }

  .badges {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  .badge {
    font-size: 10px;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .badge.source {
    background-color: #1E293B;
    color: #6366F1;
  }

  .badge.size {
    background-color: #1E293B;
    color: #94A3B8;
  }

  .action-btn-wrapper {
    width: 160px;
    display: flex;
    justify-content: flex-end;
  }

  .btn {
    padding: 10px 24px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    outline: none;
    width: 100%;
    text-align: center;
  }

  .btn-primary {
    background-color: #6366F1;
    color: #FFFFFF;
  }

  .btn-danger {
    background-color: #EF4444;
    color: #FFFFFF;
  }

  .install-progress-state {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }

  .status-lbl {
    font-size: 11px;
    color: #94A3B8;
  }

  .prog-bar {
    height: 6px;
    background-color: #080A0F;
    border-radius: 3px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background-color: #10B981;
    transition: width 0.2s ease-out;
  }

  h3 {
    font-size: 16px;
    margin-top: 0;
    margin-bottom: 12px;
    color: #F4F6F9;
    border-bottom: 1px solid #1E293B;
    padding-bottom: 8px;
  }

  .description {
    font-size: 14px;
    line-height: 1.6;
    color: #94A3B8;
  }

  .description-sub {
    font-size: 12px;
    color: #94A3B8;
    margin-bottom: 16px;
  }

  .sandbox-override-panel {
    background-color: #080A0F;
    border: 1px solid #1E293B;
    border-radius: 8px;
    padding: 20px;
    margin-top: 12px;
  }

  .permission-group {
    margin-bottom: 20px;
  }

  .permission-group h4 {
    font-size: 13px;
    color: #6366F1;
    margin-top: 0;
    margin-bottom: 12px;
    font-weight: 600;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    border: 1px solid #1E293B;
    background-color: #0F172A;
    padding: 10px 14px;
    border-radius: 6px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toggle-row:hover {
    border-color: #6366F1;
  }

  .perm-title {
    font-size: 13px;
    font-weight: 500;
    color: #F4F6F9;
    width: 180px;
  }

  .perm-desc {
    flex: 1;
    font-size: 11px;
    color: #94A3B8;
  }

  .toggle-switch {
    width: 32px;
    height: 18px;
    border-radius: 9px;
    position: relative;
    transition: background-color 0.2s;
  }

  .toggle-switch.on {
    background-color: #10B981;
  }

  .toggle-switch.off {
    background-color: #334155;
  }

  .toggle-switch::after {
    content: "";
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background-color: #FFFFFF;
    top: 2px;
    transition: left 0.2s;
  }

  .toggle-switch.on::after {
    left: 16px;
  }

  .toggle-switch.off::after {
    left: 2px;
  }
</style>
