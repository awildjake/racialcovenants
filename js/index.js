import { loadLayers } from './layers.js';

let activeRace = 'asian';
let activeYear = '1940';
let activeYearFrom = '1940';
let activeYearTo = '2020';
let activeMode = 'snapshot';
let activeDistrict = null;

document.addEventListener('districtSelected', function(e) {
    activeDistrict = e.detail.enumdist;
    console.log('Active district:', activeDistrict);
});

function dispatchSelection() {
    document.dispatchEvent(new CustomEvent('selectionChanged', {
        detail: {
            mode: activeMode,
            race: activeRace,
            year: activeYear,
            yearFrom: activeYearFrom,
            yearTo: activeYearTo
        }
    }));
};

function initMap() {
    const map = L.map('map').setView([37.33, -121.89], 13);
    const info = L.control({ position: 'topright' });

    // load map tiles and add to map
    var tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 17
    }).addTo(map);

    map.createPane('labels');
    map.getPane('labels').style.zIndex = 650;
    map.getPane('labels').style.pointerEvents = 'none';

    var tileLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
        pane: 'labels',
        subdomains: 'abcd',
        maxZoom: 17
    }).addTo(map);

    return map;
};

function initSidebar(map) {
    var sidebar = L.control.sidebar('sidebar', {
    position: 'right'   // or 'right'
    });
    map.addControl(sidebar);
    // Optionally open a tab on load
    setTimeout(function() {
    sidebar.open('home');
    }, 500);
};

function initDropdown(toggleId, panelId, onSelect) {
    const toggle = document.getElementById(toggleId);
    const panel = document.getElementById(panelId);

    // Toggle panel open/close
    toggle.addEventListener('click', function() {

        // Before opening, close all other panels first
        document.querySelectorAll('.dropdown-panel').forEach(p => {
            if (p !== panel) p.classList.remove('open');
        });

        panel.classList.toggle('open');
    });

    // Handle option selection
    panel.addEventListener('click', function(e) {
        if (!e.target.classList.contains('dropdown-item')) return;

        panel.querySelectorAll('.dropdown-item').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        // Update toggle button text
        toggle.textContent = e.target.textContent + ' ▾';

        // Closes the dropdown panel after selection by removing open class
        panel.classList.remove('open');

        onSelect(e.target.dataset.value);
    });
}

function updateChangeToOptions() {
    document.querySelectorAll('#change-to-buttons .dropdown-item').forEach(function(item) {
        const disabled = parseInt(item.dataset.value) <= parseInt(activeYearFrom);
        item.classList.toggle('disabled', disabled);
    });
}

function updateChangeFromOptions() {
    document.querySelectorAll('#change-from-buttons .dropdown-item').forEach(function(item) {
        const disabled = parseInt(item.dataset.value) >= parseInt(activeYearTo);
        item.classList.toggle('disabled', disabled);
    });
}

// Close any open dropdown when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown-group')) {
        document.querySelectorAll('.dropdown-panel').forEach(p => p.classList.remove('open'));
    }
});

initDropdown('race-select', 'race-buttons', function(value) {
    activeRace = value;
    dispatchSelection();
});

initDropdown('snapshot-year-select', 'snapshot-year-buttons', function(value) {
    activeYear = value;
    dispatchSelection();
});

initDropdown('change-from-select', 'change-from-buttons', function(value) {
    activeYearFrom = value;
    updateChangeToOptions();
    dispatchSelection();
});

initDropdown('change-to-select', 'change-to-buttons', function(value) {
    activeYearTo = value;
    updateChangeFromOptions();
    dispatchSelection();
});

updateChangeToOptions();
updateChangeFromOptions();

function setModeVisibility(mode) {
    document.getElementById('snapshot-controls').style.display = mode === 'snapshot' ? 'flex' : 'none';
    document.getElementById('change-controls').style.display = mode === 'change' ? 'flex' : 'none';
}

document.getElementById('mode').querySelectorAll('.btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.getElementById('mode').querySelectorAll('.btn').forEach(function(b) {
            b.classList.remove('active');
        });
        this.classList.add('active');
        activeMode = this.id;
        setModeVisibility(activeMode); // ← toggle visibility

        dispatchSelection();
    });
});

// Set initial visibility on load
setModeVisibility('snapshot');

const map = initMap();
const enumDistricts = await loadLayers(map, function() {
    return { mode: activeMode, race: activeRace, year: activeYear, yearFrom: activeYearFrom, yearTo: activeYearTo };
});
initSidebar(map);
