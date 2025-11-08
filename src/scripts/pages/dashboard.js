import L from 'leaflet';
import { fetchStories } from '../api/api.js';
// PushHelper functionality moved to service worker
import { favoritesDB } from '../utils/favorites-db.js';
import CONFIG from '../config.js';

export default class DashboardPage {
  async render() {
    return `
      <button id="hamburger" class="hamburger" aria-label="Buka Sidebar">
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <h2>Menu</h2>
          <button id="close-sidebar" aria-label="Tutup Sidebar">&times;</button>
        </div>
        <div class="sidebar-content">
          <div class="sidebar-item">
            <label for="sidebar-notif-switch">Aktifkan Notifikasi</label>
            <label class="switch">
              <input type="checkbox" id="sidebar-notif-switch">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
      
      <section class="container dashboard">
        <h1>Halaman Beranda</h1>
        <p>Selamat datang di My Story App! Di sini, kamu dapat jelajahi cerita berdasarkan peta dan lokasi.</p>

        <div class="controls">
          <div class="search-sort-container">
            <div class="search-box">
              <label for="search-input">Cari cerita:</label>
               <input type="text" id="search-input" placeholder="🔍 Cari cerita..." />
            </div>
            <div class="sort-box">
              <label for="sort-select">Urutkan:</label>
              <select id="sort-select" aria-label="Urutkan cerita">
                <option value="newest">⬇️ Terbaru</option>
                <option value="oldest">⬆️ Terlama</option>
              </select>
            </div>
          </div>

          <div class="filter-notification-container">
            <label class="filter-label">
              <input type="checkbox" id="filter-location" />
              Tampilkan hanya cerita dengan lokasi
            </label>

            <div class="notification-toggle">
              <label for="notif-switch">Notifikasi</label>
              <label class="switch">
                <input type="checkbox" id="notif-switch">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="story-section">
          <div id="story-list" class="story-list" aria-live="polite"></div>
          <div id="map" class="map" role="application" aria-label="Peta lokasi cerita"></div>
        </div>

        <style>
          .hamburger {
            position: fixed;
            top: 45px;
            right: 20px;
            z-index: 10001;
            width: 36px;
            height: 36px;
            background: white;
            border: none;
            border-radius: 8px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            transition: all 0.2s;
            padding: 8px;
          }
          .hamburger:hover {
            box-shadow: 0 3px 8px rgba(0,0,0,0.15);
            background: #f8f8f8;
          }
          .hamburger span {
            display: block;
            width: 20px;
            height: 2.5px;
            background: #333;
            border-radius: 2px;
            transition: all 0.2s;
          }
          
          .sidebar {
            position: fixed;
            top: 0;
            left: -320px;
            width: 320px;
            height: 100vh;
            background: #fff;
            box-shadow: 2px 0 12px rgba(0,0,0,0.15);
            z-index: 10002;
            transition: left 0.3s ease-in-out;
            display: flex;
            flex-direction: column;
          }
          .sidebar.open {
            left: 0;
          }
          .sidebar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 2px solid #f0f0f0;
          }
          .sidebar-header h2 {
            margin: 0;
            font-size: 20px;
            color: #333;
            font-weight: 600;
          }
          #close-sidebar {
            background: none;
            border: none;
            font-size: 32px;
            color: #666;
            cursor: pointer;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
          }
          #close-sidebar:hover {
            background: #f0f0f0;
            color: #333;
          }
          .sidebar-content {
            padding: 24px;
            flex: 1;
            overflow-y: auto;
          }
          .sidebar-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            background: #f9f9f9;
            border-radius: 8px;
            margin-bottom: 12px;
          }
          .sidebar-item label:first-child {
            font-size: 15px;
            color: #333;
            font-weight: 500;
          }
          
          .controls {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 25px;
          }

          .search-sort-container {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            flex-wrap: wrap;
          }

          .search-box {
            flex: 1;
            min-width: 250px;
          }

          .search-box input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 15px;
            transition: border-color 0.3s, box-shadow 0.3s;
            outline: none;
          }

          .search-box input:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          .sort-box {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .sort-box label {
            font-weight: 600;
            color: #555;
            font-size: 14px;
          }

          .sort-box select {
            padding: 10px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            background: white;
            cursor: pointer;
            transition: border-color 0.3s, box-shadow 0.3s;
            outline: none;
            min-width: 150px;
          }

          .sort-box select:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          .filter-notification-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
          }

          .filter-label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-size: 14px;
            color: #555;
          }

          .filter-label input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
          }

          .notification-toggle {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .notification-toggle > label:first-child {
            font-size: 14px;
            color: #555;
            font-weight: 600;
          }

          .switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
          }
          .switch input {
            opacity: 0;
            width: 0;
            height: 0;
          }
          .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 24px;
          }
          .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
          }
          input:checked + .slider {
            background-color: #4caf50;
          }
          input:checked + .slider:before {
            transform: translateX(26px);
          }

          .story-item {
            position: relative;
          }

          .like-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255, 255, 255, 0.95);
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 10;
          }

          .like-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          }

          .like-btn.liked {
            background: #ff4757;
            animation: likeAnimation 0.3s ease;
          }

          @keyframes likeAnimation {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
          }

          @media (max-width: 768px) {
            .hamburger {
              top: 40px;
              right: 16px;
              width: 34px;
              height: 34px;
              padding: 6px;
            }
            .hamburger span {
              width: 18px;
              height: 2px;
            }
            .sidebar {
              width: 280px;
              left: -280px;
            }
            .search-sort-container {
              flex-direction: column;
            }

            .search-box, .sort-box {
              width: 100%;
            }

            .sort-box {
              justify-content: space-between;
            }

            .filter-notification-container {
              flex-direction: column;
              align-items: flex-start;
            }
          }
        </style>
      </section>
    `;
  }

  async afterRender() {
    let allStories = await fetchStories();
    const listEl = document.getElementById('story-list');
    const filterCheckbox = document.getElementById('filter-location');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const mapContainer = document.getElementById('map');
    const notifSwitch = document.getElementById('notif-switch');
    
    // Sidebar elements
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger');
    const closeSidebar = document.getElementById('close-sidebar');
    const sidebarNotifSwitch = document.getElementById('sidebar-notif-switch');

    // Hamburger toggle sidebar
    hamburger.addEventListener('click', () => {
      sidebar.classList.add('open');
    });
    
    closeSidebar.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
    
    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && 
          !sidebar.contains(e.target) && 
          !hamburger.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });

    // State untuk filtering/sorting
    let currentFilter = {
      search: '',
      sortBy: 'newest',
      locationOnly: false
    };

    // Clear existing map instance if any
    if (mapContainer._leaflet_id) {
      mapContainer._leaflet_id = null;
    }

    // Initialize map with dragging enabled
    const map = L.map('map', {
      center: [-2.5489, 118.0149],
      zoom: 5,
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      zoomControl: true
    });

    // Add tile layer with attribution
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    // Layer group untuk markers
    const markersLayer = L.layerGroup().addTo(map);

    const renderMarkers = (stories) => {
      markersLayer.clearLayers();
      const storiesWithLocation = stories.filter(s => s.lat && s.lon);
      if (storiesWithLocation.length === 0) return;

      storiesWithLocation.forEach((story) => {
        const marker = L.marker([story.lat, story.lon], { title: story.name });
        const popupContent = `
          <div style="min-width: 200px;">
            <img src="${story.photoUrl}" alt="${story.name}" 
                 style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
            <h4 style="margin: 8px 0 4px; font-size: 16px;">${story.name}</h4>
            <p style="margin: 4px 0; font-size: 14px; color: #666;">${story.description}</p>
            <small style="color: #999;">📅 ${story.createdAt ? new Date(story.createdAt).toLocaleString('id-ID') : '—'}</small>
          </div>
        `;
        marker.bindPopup(popupContent, { maxWidth: 300, className: 'story-popup' });
        marker.addTo(markersLayer);
      });

      if (storiesWithLocation.length > 0) {
        const bounds = L.latLngBounds(storiesWithLocation.map(s => [s.lat, s.lon]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
      }
    };

    const applyFilters = () => {
      let filtered = [...allStories];
      if (currentFilter.search) {
        const searchLower = currentFilter.search.toLowerCase();
        filtered = filtered.filter(story =>
          story.name.toLowerCase().includes(searchLower) ||
          story.description.toLowerCase().includes(searchLower)
        );
      }
      if (currentFilter.locationOnly) {
        filtered = filtered.filter(s => s.lat && s.lon);
      }
      filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return currentFilter.sortBy === 'newest' ? dateB - dateA : dateA - dateB;
      });
      return filtered;
    };

    const render = async (stories) => {
      if (stories.length === 0) {
        listEl.innerHTML = `<div style="text-align: center; padding: 40px; color: #999; grid-column: 1/-1;"><p style="font-size: 18px;">Tidak ada cerita yang sesuai dengan pencarian.</p></div>`;
        renderMarkers([]);
        return;
      }

      const favorites = await favoritesDB.getAllFavorites();
      const favoriteIds = new Set(favorites.map(f => f.id));

      listEl.innerHTML = stories.map((it) => {
        const created = it.createdAt ? new Date(it.createdAt).toLocaleString('id-ID') : '—';
        const hasLocation = it.lat && it.lon;
        const isFavorited = favoriteIds.has(it.id);
        return `
          <article class="story-item ${hasLocation ? 'has-location' : ''}" tabindex="0" data-lat="${it.lat || ''}" data-lon="${it.lon || ''}" data-story-id="${it.id || ''}">
            <button class="like-btn ${isFavorited ? 'liked' : ''}" data-story='${JSON.stringify(it).replace(/'/g, "&apos;")}' aria-label="Tambah ke favorit">
              ${isFavorited ? '❤️' : '🤍'}
            </button>
            <img src="${it.photoUrl}" alt="${it.name}" loading="lazy" />
            <div>
              <h3>${it.name}</h3>
              <p>${it.description}</p>
              <small>📅 ${created}</small>
              ${hasLocation ? '<small style="color: #4caf50; display: block; margin-top: 4px;">📍 Memiliki lokasi</small>' : ''}
            </div>
          </article>
        `;
      }).join('');

      document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const storyData = JSON.parse(e.target.dataset.story.replace(/&apos;/g, "'"));
          const isLiked = e.target.classList.contains('liked');
          if (isLiked) {
            await favoritesDB.deleteFavorite(storyData.id);
            e.target.classList.remove('liked');
            e.target.textContent = '🤍';
          } else {
            try {
              await favoritesDB.addFavorite(storyData);
              e.target.classList.add('liked');
              e.target.textContent = '❤️';
              const toast = document.createElement('div');
              toast.textContent = '✅ Ditambahkan ke favorit';
              toast.style.cssText = `position: fixed; bottom: 20px; right: 20px; background: #4caf50; color: white; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000;`;
              document.body.appendChild(toast);
              setTimeout(() => toast.remove(), 2000);
            } catch (error) {
              alert(error.name === 'ConstraintError' ? 'Cerita sudah ada di favorit' : 'Gagal menambahkan ke favorit');
            }
          }
        });
      });

      document.querySelectorAll('.story-item.has-location').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.classList.contains('like-btn')) return;
          const lat = parseFloat(item.dataset.lat);
          const lon = parseFloat(item.dataset.lon);
          if (lat && lon) {
            map.setView([lat, lon], 12);
            markersLayer.eachLayer(layer => {
              if (layer.getLatLng().lat === lat && layer.getLatLng().lng === lon) {
                layer.openPopup();
              }
            });
          }
        });
      });

      renderMarkers(stories);
    };

    await render(applyFilters());

    searchInput.addEventListener('input', async (e) => {
      currentFilter.search = e.target.value;
      await render(applyFilters());
    });

    sortSelect.addEventListener('change', async (e) => {
      currentFilter.sortBy = e.target.value;
      await render(applyFilters());
    });

    filterCheckbox.addEventListener('change', async () => {
      currentFilter.locationOnly = filterCheckbox.checked;
      await render(applyFilters());
    });

    // Push Notification Toggle Logic
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      notifSwitch.checked = !!sub;
      sidebarNotifSwitch.checked = !!sub;

      // Sync both switches
      const handleNotifToggle = async (isChecked, sourceSwitch) => {
        if (isChecked) {
          try {
            await PushHelper.subscribeUser(reg);
            notifSwitch.checked = true;
            sidebarNotifSwitch.checked = true;
            Swal.fire({
              icon: 'success',
              title: 'Notifikasi Diaktifkan',
              text: 'Anda akan menerima pemberitahuan push.',
              timer: 2000,
              showConfirmButton: false,
            });
          } catch (err) {
            console.error(err);
            notifSwitch.checked = false;
            sidebarNotifSwitch.checked = false;
            Swal.fire({
              icon: 'error',
              title: 'Gagal Mengaktifkan Notifikasi',
              text: 'Silakan coba lagi atau periksa pengaturan browser.',
              confirmButtonColor: '#dc2626',
            });
          }
        } else {
          await PushHelper.unsubscribeUser(reg);
          notifSwitch.checked = false;
          sidebarNotifSwitch.checked = false;
          Swal.fire({
            icon: 'info',
            title: 'Notifikasi Dimatikan',
            text: 'Anda tidak akan menerima pemberitahuan push.',
            timer: 2000,
            showConfirmButton: false,
          });
        }
      };

      notifSwitch.addEventListener('change', async () => {
        await handleNotifToggle(notifSwitch.checked, 'main');
      });

      sidebarNotifSwitch.addEventListener('change', async () => {
        await handleNotifToggle(sidebarNotifSwitch.checked, 'sidebar');
      });
    } else {
      notifSwitch.disabled = true;
      sidebarNotifSwitch.disabled = true;
    }
  }
}
