<!-- File: velocitystore/src/components/UpdateManager.svelte -->
<!-- Updates management panel for VelocityStore featuring delta update support -->

<script>
  import { onMount } from 'svelte';

  let updates = [
    {
      id: "linux-aetheris",
      name: "Aetheris Optimized Linux Kernel",
      version: "6.12.12_1",
      old_version: "6.12.11_1",
      full_size: "185 MB",
      delta_size: "24 MB", // Shows XBPS delta updates support
      type: "system",
      updating: false,
      progress: 0,
      status: "ready"
    },
    {
      id: "org.freedesktop.Platform",
      name: "Freedesktop Common Platform Runtime",
      version: "24.08.3",
      old_version: "24.08.2",
      full_size: "340 MB",
      delta_size: "45 MB", // Shows OSTree static delta layers
      type: "flatpak",
      updating: false,
      progress: 0,
      status: "ready"
    }
  ];

  let updateAllProgress = 0;
  let isUpdatingAll = false;
  let currentUpdatingIndex = 0;

  function performUpdateAll() {
    isUpdatingAll = true;
    currentUpdatingIndex = 0;
    executeUpdateStep();
  }

  function executeUpdateStep() {
    if (currentUpdatingIndex >= updates.length) {
      isUpdatingAll = false;
      updates = []; // Clear updates list when complete
      return;
    }

    let activeUpdate = updates[currentUpdatingIndex];
    activeUpdate.updating = true;
    activeUpdate.status = "updating";
    updates = [...updates];

    let val = 0;
    let timer = setInterval(() => {
      val += 5;
      activeUpdate.progress = val;
      updates = [...updates];

      // Update global percentage bar
      updateAllProgress = Math.round(((currentUpdatingIndex * 100) + val) / updates.length);

      if (val >= 100) {
        clearInterval(timer);
        activeUpdate.updating = false;
        activeUpdate.status = "completed";
        updates = [...updates];

        // Proceed to next update step
        currentUpdatingIndex++;
        executeUpdateStep();
      }
    }, 100);
  }
</script>

<div class="update-manager">
  <header class="panel-header">
    <div>
      <h2>Software Updates</h2>
      <p class="subtitle">Keep Aetheris OS packages and containers secure and up to date.</p>
    </div>
    {#if updates.length > 0 && !isUpdatingAll}
      <button class="btn btn-primary" on:click={performUpdateAll}>Update All</button>
    {/if}
  </header>

  {#if isUpdatingAll}
    <div class="global-progress-card">
      <div class="progress-info">
        <span class="title">Applying Updates...</span>
        <span class="percent">{updateAllProgress}%</span>
      </div>
      <div class="progress-bar"><div class="fill" style="width: {updateAllProgress}%"></div></div>
    </div>
  {/if}

  <div class="updates-list">
    {#if updates.length === 0}
      <div class="empty-state">
        <span class="checkmark">✓</span>
        <h3>All Systems Operational</h3>
        <p>Aetheris OS is fully updated. Checked today at {new Date().toLocaleDateString()}</p>
      </div>
    {:else}
      {#each updates as item}
        <div class="update-item {item.status}">
          <div class="item-info">
            <span class="item-name">{item.name}</span>
            <span class="item-versions">Version {item.old_version} → {item.version}</span>
            <div class="size-meta">
              <span class="badge type">{item.type}</span>
              <span class="size-lbl">Download size: </span>
              <span class="delta-size">{item.delta_size}</span>
              <span class="full-size">(saved {item.full_size} via delta update)</span>
            </div>
          </div>

          <div class="item-status">
            {#if item.status === 'updating'}
              <div class="item-progress">
                <span class="progress-percent">{item.progress}%</span>
                <div class="mini-bar"><div class="fill" style="width: {item.progress}%"></div></div>
              </div>
            {:else if item.status === 'completed'}
              <span class="complete-lbl">Completed</span>
            {:else}
              <span class="ready-lbl">Pending Update</span>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .update-manager {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1E293B;
    padding-bottom: 16px;
  }

  .panel-header h2 {
    margin: 0;
    font-size: 18px;
    color: #F4F6F9;
  }

  .subtitle {
    margin: 4px 0 0 0;
    font-size: 12px;
    color: #94A3B8;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    outline: none;
  }

  .btn-primary {
    background-color: #6366F1;
    color: #FFFFFF;
  }

  .global-progress-card {
    background-color: #080A0F;
    border: 1px solid #1E293B;
    border-radius: 6px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }

  .progress-info .title {
    color: #6366F1;
    font-weight: 500;
  }

  .progress-info .percent {
    color: #94A3B8;
  }

  .progress-bar {
    height: 6px;
    background-color: #1E293B;
    border-radius: 3px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background-color: #10B981;
    transition: width 0.1s linear;
  }

  .updates-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .update-item {
    background-color: #080A0F;
    border: 1px solid #1E293B;
    border-radius: 6px;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .update-item.updating {
    border-color: #6366F1;
  }

  .item-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .item-name {
    font-size: 14px;
    font-weight: 600;
    color: #F4F6F9;
  }

  .item-versions {
    font-size: 12px;
    color: #94A3B8;
  }

  .size-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    font-size: 11px;
  }

  .badge.type {
    font-size: 9px;
    font-weight: bold;
    background-color: #1E293B;
    color: #6366F1;
    padding: 1px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .size-lbl {
    color: #475569;
  }

  .delta-size {
    color: #10B981;
    font-weight: bold;
  }

  .full-size {
    color: #475569;
    text-decoration: line-through;
  }

  .item-status {
    width: 140px;
    text-align: right;
  }

  .ready-lbl {
    font-size: 12px;
    color: #D97706;
  }

  .complete-lbl {
    font-size: 12px;
    color: #10B981;
    font-weight: 500;
  }

  .item-progress {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .progress-percent {
    font-size: 11px;
    color: #94A3B8;
  }

  .mini-bar {
    height: 4px;
    background-color: #1E293B;
    border-radius: 2px;
    overflow: hidden;
  }

  .empty-state {
    text-align: center;
    padding: 60px 0;
  }

  .checkmark {
    font-size: 48px;
    color: #10B981;
    display: block;
    margin-bottom: 16px;
  }

  .empty-state h3 {
    margin: 0;
    font-size: 16px;
    color: #F4F6F9;
  }

  .empty-state p {
    margin: 4px 0 0 0;
    font-size: 12px;
    color: #94A3B8;
  }
</style>
