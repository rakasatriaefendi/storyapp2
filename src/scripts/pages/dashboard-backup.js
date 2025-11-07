import L from 'leaflet';
import { fetchStories } from '../api/api.js';
import { PushHelper } from '../utils/sw-push.js';
import { favoritesDB } from '../utils/favorites-db.js';
import CONFIG from '../config.js'; 

export default class DashboardPage {
  async render() {
    return `
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
    const entries = await fetchStories();
    const listEl = document.getElementById('story-list');
    const filterCheckbox = document.getElementById('filter-location');
    const mapContainer = document.getElementById('map');
    const notifSwitch = document.getElementById('notif-switch');

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
      // Clear existing markers
      markersLayer.clearLayers();

      // Filter stories dengan lokasi
      const storiesWithLocation = stories.filter(s => s.lat && s.lon);

      if (storiesWithLocation.length === 0) {
        console.log('No stories with location found');
        return;
      }

      // Add markers untuk setiap story dengan lokasi
      storiesWithLocation.forEach((story) => {
        const marker = L.marker([story.lat, story.lon], {
          title: story.name
        });

        // Popup dengan info story
        const popupContent = `
          <div style="min-width: 200px;">
            <img src="${story.photoUrl}" alt="${story.name}" 
                 style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
            <h4 style="margin: 8px 0 4px; font-size: 16px;">${story.name}</h4>
            <p style="margin: 4px 0; font-size: 14px; color: #666;">${story.description}</p>
            <small style="color: #999;">📅 ${story.createdAt ? new Date(story.createdAt).toLocaleString('id-ID') : '—'}</small>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 300,
          className: 'story-popup'
        });

        marker.addTo(markersLayer);
      });

      // Auto-fit map bounds jika ada markers
      if (storiesWithLocation.length > 0) {
        const bounds = L.latLngBounds(storiesWithLocation.map(s => [s.lat, s.lon]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
      }
    };

    const render = (filtered) => {
      listEl.innerHTML = filtered.map((it) => {
        const created = it.createdAt ? new Date(it.createdAt).toLocaleString('id-ID') : '—';
        const hasLocation = it.lat && it.lon;
        return `
          <article class="story-item ${hasLocation ? 'has-location' : ''}" tabindex="0" data-lat="${it.lat || ''}" data-lon="${it.lon || ''}" data-story-id="${it.id || ''}">
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

      // Add click event to story items untuk zoom ke marker
      document.querySelectorAll('.story-item.has-location').forEach(item => {
        item.addEventListener('click', () => {
          const lat = parseFloat(item.dataset.lat);
          const lon = parseFloat(item.dataset.lon);
          if (lat && lon) {
            map.setView([lat, lon], 12);
            // Open popup untuk marker tersebut
            markersLayer.eachLayer(layer => {
              if (layer.getLatLng().lat === lat && layer.getLatLng().lng === lon) {
                layer.openPopup();
              }
            });
          }
        });
      });

      // Render markers
      renderMarkers(filtered);
    };

    render(entries);
    
    filterCheckbox.addEventListener('change', () => {
      const filtered = filterCheckbox.checked ? entries.filter(e => e.lat && e.lon) : entries;
      render(filtered);
    });

    // === Push Notification Toggle Logic ===
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      notifSwitch.checked = !!sub;

      notifSwitch.addEventListener('change', async () => {
        if (notifSwitch.checked) {
          try {
            await PushHelper.subscribeUser(reg);
            alert('Push Notification diaktifkan!');
          } catch (err) {
            console.error(err);
            notifSwitch.checked = false;
            alert('Gagal mengaktifkan notifikasi.');
          }
        } else {
          await PushHelper.unsubscribeUser(reg);
          alert('Push Notification dimatikan.');
        }
      });
    } else {
      notifSwitch.disabled = true;
      alert('Browser tidak mendukung Push Notification.');
    }
  }
}