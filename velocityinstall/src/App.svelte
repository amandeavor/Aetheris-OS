<!-- File: velocityinstall/src/App.svelte -->
<!-- Tauri/Svelte OS Installer Screen Flow for Aetheris OS -->

<script>
  import { onMount } from 'svelte';
  import PartitionMap from './components/PartitionMap.svelte';
  import ProgressTracker from './components/ProgressTracker.svelte';

  // Tauri invoke binding
  const { invoke } = window.__TAURI__.core;

  let currentStep = 'welcome'; // welcome, partition, user, progress, done
  let systemDisks = [];
  let selectedDisk = null;
  let useEncryption = false;
  let luksPassword = '';
  let partitionStrategy = 'btrfs'; // btrfs or ext4-simple

  // User Account Details
  let fullName = '';
  let username = '';
  let password = '';
  let hostname = 'aetheris-workstation';
  let autologin = true;

  let installError = null;
  let statusLog = [];

  onMount(async () => {
    try {
      systemDisks = await invoke('get_disks');
      if (systemDisks.length > 0) {
        selectedDisk = systemDisks[0].path;
      }
    } catch (e) {
      console.error("Failed to query system drives", e);
    }
  });

  function startInstallation() {
    currentStep = 'progress';
    statusLog = [...statusLog, "Starting Aetheris OS installation..."];
  }

  function handleInstallComplete() {
    currentStep = 'done';
  }

  function rebootSystem() {
    invoke('reboot_system').catch(() => {
      alert("Please restart your system manually.");
    });
  }
</script>

<main class="installer-window">
  <!-- Titlebar Banner -->
  <header class="titlebar">
    <div class="logo">✦ Aetheris OS</div>
    <div class="window-controls">
      <span class="control close"></span>
      <span class="control minimize"></span>
      <span class="control maximize"></span>
    </div>
  </header>

  <!-- Content Area -->
  <div class="content-container">
    {#if currentStep === 'welcome'}
      <section class="step welcome-screen">
        <div class="hero">
          <h1>Welcome to Aetheris OS</h1>
          <p class="tagline">Elegant. Fast. Wayland-Native. Designed for low-resource hardware.</p>
        </div>

        <div class="system-checks">
          <h3>Pre-installation System Checks:</h3>
          <ul>
            <li class="check pass">Intel Core i5 (Haswell) or compatible processor detected</li>
            <li class="check pass">1 GB RAM Target Check: System has sufficient memory</li>
            <li class="check pass">UEFI Boot Mode confirmed</li>
          </ul>
        </div>

        <div class="actions">
          <button class="btn btn-primary" on:click={() => currentStep = 'partition'}>
            Continue to Partitioning
          </button>
        </div>
      </section>
    {/if}

    {#if currentStep === 'partition'}
      <section class="step partition-screen">
        <h2>Prepare Installation Disk</h2>
        <p class="subtitle">Choose where you want to install Aetheris OS. Btrfs with snapshots is recommended.</p>

        <div class="form-group">
          <label for="disk-select">Target Drive:</label>
          <select id="disk-select" bind:value={selectedDisk}>
            {#each systemDisks as disk}
              <option value={disk.path}>
                {disk.model} ({disk.name}) - {(disk.size_bytes / 1e9).toFixed(1)} GB
              </option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label>Partition Scheme Layout:</label>
          <div class="radio-group">
            <label class="radio-card">
              <input type="radio" name="strategy" value="btrfs" bind:group={partitionStrategy}>
              <div class="radio-info">
                <strong>Btrfs Pool (Recommended)</strong>
                <span>Automatic snapshot rollback points using Snapper</span>
              </div>
            </label>
            <label class="radio-card">
              <input type="radio" name="strategy" value="ext4-simple" bind:group={partitionStrategy}>
              <div class="radio-info">
                <strong>Simple EXT4 Layout</strong>
                <span>Standard single partition root partition. Low overhead.</span>
              </div>
            </label>
          </div>
        </div>

        <div class="form-group toggle-group">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={useEncryption}>
            Enable Full Disk Encryption (LUKS2 + TPM2 Auto-Unlock)
          </label>
        </div>

        {#if useEncryption}
          <div class="form-group slide-in">
            <label for="luks-pass">LUKS Encryption Password:</label>
            <input type="password" id="luks-pass" bind:value={luksPassword} placeholder="Enter secure key phrase">
          </div>
        {/if}

        <PartitionMap {selectedDisk} {partitionStrategy} {useEncryption} />

        <div class="actions">
          <button class="btn btn-secondary" on:click={() => currentStep = 'welcome'}>Back</button>
          <button class="btn btn-primary" on:click={() => currentStep = 'user'}>Next</button>
        </div>
      </section>
    {/if}

    {#if currentStep === 'user'}
      <section class="step user-screen">
        <h2>Setup User Account</h2>
        <p class="subtitle">Create the primary user account for the desktop workstation.</p>

        <div class="grid-form">
          <div class="form-group">
            <label for="fullname">Display Name:</label>
            <input type="text" id="fullname" bind:value={fullName} placeholder="Jane Doe">
          </div>

          <div class="form-group">
            <label for="username">Username:</label>
            <input type="text" id="username" bind:value={username} placeholder="janedoe">
          </div>

          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" bind:value={password} placeholder="••••••••">
          </div>

          <div class="form-group">
            <label for="hostname">Computer Host Name:</label>
            <input type="text" id="hostname" bind:value={hostname}>
          </div>
        </div>

        <div class="form-group toggle-group">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={autologin}>
            Enable Automatic Login on Desktop Boot
          </label>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" on:click={() => currentStep = 'partition'}>Back</button>
          <button class="btn btn-primary btn-success" on:click={startInstallation}>
            Start Installation
          </button>
        </div>
      </section>
    {/if}

    {#if currentStep === 'progress'}
      <ProgressTracker
        {selectedDisk}
        {partitionStrategy}
        {useEncryption}
        {luksPassword}
        {fullName}
        {username}
        {password}
        {hostname}
        {autologin}
        on:complete={handleInstallComplete}
      />
    {/if}

    {#if currentStep === 'done'}
      <section class="step done-screen">
        <div class="success-icon">✦</div>
        <h2>Aetheris OS Installed Successfully!</h2>
        <p>Your installation completed without errors. You can now reboot into your new, optimized system.</p>

        <div class="actions">
          <button class="btn btn-primary" on:click={rebootSystem}>Reboot Now</button>
        </div>
      </section>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    background-color: #080A0F;
    color: #F4F6F9;
    font-family: "Nacelle Variable", sans-serif;
    margin: 0;
    padding: 0;
  }

  .installer-window {
    width: 800px;
    height: 600px;
    margin: 40px auto;
    background-color: #0F172A;
    border: 1px solid #1E293B;
    border-top: 1px solid #6366F1;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  }

  .titlebar {
    height: 32px;
    background-color: #080A0F;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid #1E293B;
    font-size: 13px;
    color: #6366F1;
    font-weight: 500;
  }

  .window-controls {
    display: flex;
    gap: 8px;
  }

  .control {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
  }

  .close { background-color: #EF4444; }
  .minimize { background-color: #F59E0B; }
  .maximize { background-color: #10B981; }

  .content-container {
    flex: 1;
    padding: 32px;
    overflow-y: auto;
  }

  .step {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  h1 {
    font-size: 28px;
    margin-bottom: 8px;
    color: #F4F6F9;
  }

  h2 {
    font-size: 22px;
    margin-bottom: 4px;
    color: #F4F6F9;
  }

  .subtitle, .tagline {
    color: #94A3B8;
    margin-bottom: 24px;
    font-size: 14px;
  }

  .hero {
    text-align: center;
    margin-top: 40px;
    margin-bottom: 40px;
  }

  .system-checks {
    background-color: #080A0F;
    border: 1px solid #1E293B;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 32px;
  }

  .system-checks h3 {
    margin-top: 0;
    font-size: 15px;
    color: #6366F1;
  }

  .system-checks ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .check {
    padding-left: 24px;
    position: relative;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .check::before {
    content: "✓";
    position: absolute;
    left: 0;
    color: #10B981;
    font-weight: bold;
  }

  .form-group {
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-size: 14px;
    font-weight: 500;
    color: #94A3B8;
  }

  select, input[type="text"], input[type="password"] {
    background-color: #080A0F;
    border: 1px solid #1E293B;
    color: #F4F6F9;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
  }

  select:focus, input:focus {
    border-color: #6366F1;
  }

  .radio-group {
    display: flex;
    gap: 16px;
  }

  .radio-card {
    flex: 1;
    border: 1px solid #1E293B;
    background-color: #080A0F;
    padding: 16px;
    border-radius: 6px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    cursor: pointer;
  }

  .radio-card input {
    margin-top: 4px;
  }

  .radio-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .radio-info strong {
    font-size: 14px;
    color: #F4F6F9;
  }

  .radio-info span {
    font-size: 12px;
    color: #94A3B8;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #F4F6F9;
    font-size: 14px;
    cursor: pointer;
  }

  .grid-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .actions {
    margin-top: auto;
    padding-top: 24px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .btn {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    outline: none;
  }

  .btn-primary {
    background-color: #6366F1;
    color: #FFFFFF;
  }

  .btn-secondary {
    background-color: #1E293B;
    color: #F4F6F9;
  }

  .btn-success {
    background-color: #10B981;
    color: #FFFFFF;
  }

  .done-screen {
    align-items: center;
    justify-content: center;
    text-align: center;
    margin-top: 40px;
  }

  .success-icon {
    font-size: 64px;
    color: #10B981;
    margin-bottom: 24px;
  }
</style>
