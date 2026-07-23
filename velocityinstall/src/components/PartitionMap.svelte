<!-- File: velocityinstall/src/components/PartitionMap.svelte -->
<!-- Visual Drive Partition Map Preview for Aetheris OS Installer -->

<script>
  export let selectedDisk = "";
  export let partitionStrategy = "btrfs";
  export let useEncryption = false;
</script>

<div class="partition-map-container">
  <h4>Planned Partition Map ({selectedDisk || 'No disk selected'}):</h4>

  <div class="map-visual">
    <!-- ESP Partition -->
    <div class="partition-block esp">
      <span class="part-label">/boot/efi</span>
      <span class="part-size">512 MB</span>
      <span class="part-fs">FAT32</span>
    </div>

    <!-- Root Partition -->
    <div class="partition-block root {partitionStrategy}">
      {#if useEncryption}
        <span class="lock-icon">🔒</span>
      {/if}
      <span class="part-label">/</span>
      <span class="part-size">Remaining Space</span>
      <span class="part-fs">
        {#if useEncryption}LUKS2 ({partitionStrategy}){:else}{partitionStrategy}{/if}
      </span>
    </div>

    <!-- Swap Partition -->
    <div class="partition-block swap">
      <span class="part-label">[swap]</span>
      <span class="part-size">4 GB</span>
      <span class="part-fs">Linux Swap</span>
    </div>
  </div>

  <div class="legend">
    <div class="legend-item"><span class="legend-color esp"></span> ESP System</div>
    <div class="legend-item"><span class="legend-color btrfs"></span> Btrfs Pool</div>
    <div class="legend-item"><span class="legend-color ext4"></span> EXT4 Root</div>
    <div class="legend-item"><span class="legend-color swap"></span> Linux Swap</div>
  </div>
</div>

<style>
  .partition-map-container {
    background-color: #080A0F;
    border: 1px solid #1E293B;
    border-radius: 6px;
    padding: 16px;
    margin-top: 16px;
    margin-bottom: 24px;
  }

  h4 {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 14px;
    color: #94A3B8;
  }

  .map-visual {
    height: 60px;
    background-color: #0F172A;
    border: 1px solid #1E293B;
    border-radius: 4px;
    display: flex;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .partition-block {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 4px;
    font-size: 11px;
    text-align: center;
    color: #FFFFFF;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .esp {
    width: 15%;
    background-color: #4F46E5;
    border-right: 1px solid #1E293B;
  }

  .root {
    flex: 1;
    position: relative;
  }

  .root.btrfs {
    background-color: #0D9488;
    border-right: 1px solid #1E293B;
  }

  .root.ext4-simple {
    background-color: #2563EB;
    border-right: 1px solid #1E293B;
  }

  .swap {
    width: 20%;
    background-color: #D97706;
  }

  .part-label {
    font-weight: 600;
    margin-bottom: 2px;
  }

  .part-size {
    opacity: 0.8;
  }

  .part-fs {
    font-size: 10px;
    opacity: 0.6;
    margin-top: 2px;
  }

  .lock-icon {
    font-size: 12px;
    margin-bottom: 2px;
  }

  .legend {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #94A3B8;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    display: inline-block;
  }

  .legend-color.esp { background-color: #4F46E5; }
  .legend-color.btrfs { background-color: #0D9488; }
  .legend-color.ext4 { background-color: #2563EB; }
  .legend-color.swap { background-color: #D97706; }
</style>
