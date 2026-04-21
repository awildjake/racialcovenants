import { loadLayers } from './layers.js';
import { renderBarChart, renderLineChart, renderChangeChart} from './charts.js';

let activeRace = 'asian';
let activeYear = '1940';
let activeYearFrom = '1940';
let activeYearTo = '2020';
let activeMode = 'covenant';
let activeDistrict = null;
let lastRows = null;

document.addEventListener('districtSelected', function(e) {
    activeDistrict = e.detail.enumdist;
    lastRows = e.detail.rows;
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
    const map = L.map('map').setView([37.33644539259755, -121.8953672600045], 14);

    // Basemap
    var tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 17
    }).addTo(map);

    // Pane for basemap labels
    map.createPane('labels');
    map.getPane('labels').style.zIndex = 650;
    map.getPane('labels').style.pointerEvents = 'none';

    // Basemap labels
    var tileLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
        pane: 'labels',
        subdomains: 'abcd',
        maxZoom: 17
    }).addTo(map);

    return map;
};

function initSidebar(map) {

    var sidebar = L.control.sidebar('sidebar', {
        position: 'left'
    });

    map.addControl(sidebar);
    sidebar.open('home');
    return sidebar;
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
        toggle.textContent = e.target.textContent;

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

initDropdown('mode-select', 'mode-buttons', function(value) {
    activeMode = value;
    setModeVisibility(activeMode);
    dispatchSelection();
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
    document.getElementById('change-controls').style.display = (mode === 'change' || mode === 'covenant') ? 'flex' : 'none';
};

setModeVisibility('snapshot');

const map = initMap();
const enumDistricts = await loadLayers(map, function() {
    return { mode: activeMode, race: activeRace, year: activeYear, yearFrom: activeYearFrom, yearTo: activeYearTo };
});
const sidebar = initSidebar(map);

L.easyButton('<img src="icons/home.svg" class="icon">', function(btn, map){
    map.setView([37.33644539259755, -121.8953672600045], 14);
}).addTo(map);

// add searchbar and reset easybutton
var geocoder = L.Control.Geocoder.nominatim({
    geocodingQueryParams: {
        countrycodes: 'us'
    }
})
L.Control.geocoder({
        geocoder: geocoder,
        position: 'topleft'
    }).addTo(map);

sidebar.on('opening', function() {
    if (!lastRows) return;
    setTimeout(function() {
        if (activeMode === 'change') {
            renderChangeChart(lastRows, activeYearFrom, activeYearTo);
        } else {
            renderBarChart(lastRows, activeYear);
            renderLineChart(lastRows);
        }
    }, 300); // match your sidebar CSS transition duration
});