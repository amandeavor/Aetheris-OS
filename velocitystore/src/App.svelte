<!-- File: velocitystore/src/App.svelte -->
<!-- Tauri/Svelte App Store Interface for Aetheris OS (VelocityStore) -->

<script>
  import { onMount } from 'svelte';
  import AppDetail from './components/AppDetail.svelte';
  import UpdateManager from './components/UpdateManager.svelte';

  const { invoke } = window.__TAURI__.core;

  let activeTab = 'home'; // home, updates
  let searchQuery = '';
  let selectedApp = null;

  // Mock database representing local curation database index
  const appsData = [
    {
      id: "org.gimp.GIMP",
      name: "GIMP",
      summary: "GNU Image Manipulation Program",
      icon: "🎨",
      category: "Graphics",
      source: "flatpak",
      installed: false,
      size: "128 MB",
      description: "GIMP is a cross-platform image editor available for GNU/Linux, macOS, Windows and more operating systems. It is free software, you can change its source code and distribute your changes."
    },
    {
      id: "transmission-gtk",
      name: "Transmission",
      summary: "Fast, easy, and free BitTorrent client",
      icon: "📥",
      category: "Network",
      source: "xbps",
      installed: false,
      size: "14 MB",
      description: "Transmission is a lightweight BitTorrent client. It features a simple, clutter-free user interface and is designed to perform tasks quickly with low resource consumption."
    },
    {
      id: "com.usebottles.bottles",
      name: "Bottles",
      summary: "Run Windows software easily on Linux",
      icon: "🍷",
      category: "Utility",
      source: "flatpak",
      installed: true,
      size: "82 MB",
      description: "Bottles is an easy-to-use tool that allows you to manage and run Windows prefixes and applications inside secure environments on Linux."
    }
  ];

  let currentApps = [...appsData];

  function handleSearch() {
    if (searchQuery.trim() === '') {
      currentApps = [...appsData];
    } else {
      currentApps = appsData.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.summary.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  }

  function viewAppDetails(app) {
    selectedApp = app;
  }

  function goBackHome() {
    selectedApp = null;
    currentApps = [...appsData];
  }
</script>

<main class="store-window">
  <!-- Sidebar Navigation -->
  <aside class="sidebar">
    <div class="brand">✦ VelocityStore</div>
    <nav class="nav-links">
      <button class="nav-btn {activeTab === 'home' && !selectedApp ? 'active' : ''}" on:click={() => { activeTab = 'home'; selectedApp = null; }}>
        <span>🏠</span> Explore
      </button>
      <button class="nav-btn {activeTab === 'updates' ? 'active' : ''}" on:click={() => { activeTab = 'updates'; selectedApp = null; }}>
        <span>🔄</span> Updates
      </button>
    </nav>
  </aside>

  <!-- Main View Area -->
  <div class="view-panel">
    <header class="search-bar">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search applications..."
          bind:value={searchQuery}
          on:input={handleSearch}
          disabled={activeTab === 'updates'}
        />
      </div>
    </header>

    <div class="scroll-content">
      {#if selectedApp}
        <AppDetail app={selectedApp} on:back={goBackHome} />
      {:else if activeTab === 'home'}
        <section class="explore-section">
          <h2>Curated Apps</h2>
          <div class="apps-grid">
            {#each currentApps as app}
              <div class="app-card" on:click={() => viewAppDetails(app)}>
                <div class="app-icon">{app.icon}</div>
                <div class="app-info">
                  <h3>{app.name}</h3>
                  <p>{app.summary}</p>
                  <span class="source-badge">{app.source}</span>
                </div>
              </div>
            {/each}
          </div>
        </section>
      {:else if activeTab === 'updates'}
        <UpdateManager />
      {/if}
    </div>
  </div>
</main>

<style>
  .store-window {
    width: 900px;
    height: 650px;
    margin: 40px auto;
    background-color: #0F172A;
    border: 1px solid #1E293B;
    border-top: 1px solid #6366F1;
    border-radius: 8px;
    display: flex;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  }

  .sidebar {
    width: 200px;
    background-color: #080A0F;
    border-right: 1px solid #1E293B;
    display: flex;
    flex-direction: column;
    padding: 20px 0;
  }

  .brand {
    font-size: 16px;
    font-weight: 700;
    color: #6366F1;
    padding: 0 20px;
    margin-bottom: 32px;
  }

  .nav-links {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 8px;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    background: none;
    border: none;
    outline: none;
    color: #94A3B8;
    padding: 10px 16px;
    border-radius: 6px;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s ease;
  }

  .nav-btn:hover {
    background-color: #1E293B;
    color: #F4F6F9;
  }

  .nav-btn.active {
    background-color: #6366F1;
    color: #FFFFFF;
    font-weight: 600;
  }

  .view-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .search-bar {
    height: 60px;
    padding: 0 24px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #1E293B;
    background-color: #080A0F;
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
    background-color: #0F172A;
    border: 1px solid #1E293B;
    border-radius: 6px;
    padding: 6px 12px;
    width: 320px;
  }

  .search-input-wrapper input {
    background: none;
    border: none;
    outline: none;
    color: #F4F6F9;
    font-size: 13px;
    width: 100%;
  }

  .search-icon {
    font-size: 14px;
    color: #475569;
  }

  .scroll-content {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
  }

  h2 {
    font-size: 18px;
    margin-top: 0;
    margin-bottom: 16px;
    color: #F4F6F9;
  }

  .apps-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .app-card {
    background-color: #080A0F;
    border: 1px solid #1E293B;
    border-radius: 6px;
    padding: 16px;
    display: flex;
    gap: 16px;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .app-card:hover {
    border-color: #6366F1;
    transform: translateY(-2px);
  }

  .app-icon {
    font-size: 32px;
    background-color: #1E293B;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .app-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .app-info h3 {
    margin: 0;
    font-size: 15px;
    color: #F4F6F9;
  }

  .app-info p {
    margin: 0;
    font-size: 12px;
    color: #94A3B8;
  }

  .source-badge {
    align-self: flex-start;
    font-size: 9px;
    text-transform: uppercase;
    font-weight: bold;
    background-color: #1E293B;
    color: #6366F1;
    padding: 2px 6px;
    border-radius: 4px;
    margin-top: 2px;
  }
</style>
