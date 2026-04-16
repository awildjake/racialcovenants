import { renderBarChart, renderLineChart, renderChangeChart } from './charts.js';

export async function loadLayers(map, getState) {
    const response = await fetch('data/output_long.geojson');
    const data = await response.json();
    const districtGroup = L.layerGroup().addTo(map);
    const overlayMaps = { 'Enumeration Districts': districtGroup };

    const longByDistrict = {};
    data.features.forEach(f => {
        const id = f.properties.ENUMDIST;
        if (!longByDistrict[id]) longByDistrict[id] = [];
        longByDistrict[id].push(f.properties);
    });

    const wideFeatures = Object.entries(longByDistrict).map(([id, rows]) => {
        const match = data.features.find(f => f.properties.ENUMDIST === id);
        return {
            type: 'Feature',
            geometry: match.geometry,
            properties: { ENUMDIST: id, rows }
        };
    });

    const divergingColors = ['#d7191c', '#fdae61', '#ffffbf', '#abd9e9', '#2c7bb6'];
    const labels = ['Very low', 'Low', 'Average', 'High', 'Very high'];

    function getColor(value, mean, sd) {
        if (value === null || isNaN(value) || sd === null || isNaN(sd)) return '#cccccc';
        const z = (value - mean) / sd;
        if (z > 2)  return divergingColors[4];
        if (z > 1)  return divergingColors[3];
        if (z > -1) return divergingColors[2];
        if (z > -2) return divergingColors[1];
        return divergingColors[0];
    }

    const changeColors = [
        '#67000d',
        '#a50026',
        '#d73027',
        '#f46d43',
        '#fdae61',
        '#ffffbf',
        '#a6d96a',
        '#66bd63',
        '#1a9641',
        '#006837',
        '#004529'
    ];

    const changeLabels = [
        '< -50pp',
        '-50 to -40pp',
        '-40 to -30pp',
        '-30 to -20pp',
        '-20 to -10pp',
        '-10 to +10pp',
        '+10 to +20pp',
        '+20 to +30pp',
        '+30 to +40pp',
        '+40 to +50pp',
        '> +50pp'
    ];

    function getChangeColor(value) {
        if (value === null || isNaN(value)) return '#cccccc';
        if (value < -50) return changeColors[0];
        if (value < -40) return changeColors[1];
        if (value < -30) return changeColors[2];
        if (value < -20) return changeColors[3];
        if (value < -10) return changeColors[4];
        if (value <  10) return changeColors[5];
        if (value <  20) return changeColors[6];
        if (value <  30) return changeColors[7];
        if (value <  40) return changeColors[8];
        if (value <  50) return changeColors[9];
        return changeColors[10];
    }

    function computeStats(values) {
        const valid = values.filter(function(v) { return v !== null && !isNaN(v); });
        const mean = valid.reduce(function(sum, v) { return sum + v; }, 0) / valid.length;
        const sd = Math.sqrt(
            valid.reduce(function(sum, v) { return sum + Math.pow(v - mean, 2); }, 0) / valid.length
        );
        return { mean, sd };
    }

    function getFeatureStyle(feature) {
        const { mode, race, year, yearFrom, yearTo } = getState();

        if (mode === 'snapshot') {
            const row = feature.properties.rows.find(function(r) { return r.year === year; });
            const value = row ? row['share_' + race] : null;
            const mean  = row ? row['mean_'  + race] : null;
            const sd    = row ? row['sd_'    + race] : null;
            return {
                fillColor: getColor(value, mean, sd),
                fillOpacity: 0.7,
                color: '#949bff',
                weight: 2
            };
        } else if (mode === 'change'){
            const rowFrom = feature.properties.rows.find(function(r) { return r.year === yearFrom; });
            const rowTo   = feature.properties.rows.find(function(r) { return r.year === yearTo; });
            const shareFrom = rowFrom ? rowFrom['share_' + race] : null;
            const shareTo   = rowTo   ? rowTo['share_'   + race] : null;
            const change = (shareFrom !== null && shareTo !== null && !isNaN(shareFrom) && !isNaN(shareTo))
                ? shareTo - shareFrom : null;
            return {
                fillColor: getChangeColor(change),
                fillOpacity: 0.7,
                color: '#949bff',
                weight: 2
            };
        } else if (mode === 'covenant') {
            const row = feature.properties.rows.find(function(r) { return r.year === year; });
            const covenantValue = row ? row['covenant'] : null;
            return {
                fillColor: covenantValue === 1 ? 'red' : 'blue',
                fillOpacity: 0.7,
                color: '#949bff',
                weight: 2
            };
        }
    }

    let selectedRows = null;

    function selectDistrict(enumdist, layer, rows) {
        selectedRows = rows;
        document.getElementById('district-info').innerHTML =
            '<p>Details for enumeration district ' + enumdist + '.</p>' +
            '<p><strong>Covenant Status:</strong> ' + rows[0].covenant_present + '</p>';

        const { mode, year, yearFrom, yearTo } = getState();

        if (mode === 'snapshot') {
            renderBarChart(selectedRows, year);
        } else {
            renderChangeChart(selectedRows, yearFrom, yearTo);
        }
        renderLineChart(selectedRows);

        document.dispatchEvent(new CustomEvent('districtSelected', {
            detail: { enumdist: enumdist, rows: rows }
        }));
    }

    // Track which layer is currently hovered at the map level
    let hoveredLayer = null;

    const enumDistricts = L.geoJSON({ type: 'FeatureCollection', features: wideFeatures }, {
        style: function(feature) {
            return getFeatureStyle(feature);
        },
        onEachFeature: function(feature, layer) {
            layer.on({
                click: function() {
                    selectDistrict(feature.properties.ENUMDIST, layer, feature.properties.rows);
                }
            });
        }
    }).addTo(districtGroup);

    // Handle hover at the map level to avoid missed mouseout events on fast movement
    map.on('mousemove', function(e) {
        let foundLayer = null;

        enumDistricts.eachLayer(function(layer) {
            if (layer.getBounds().contains(e.latlng)) {
                foundLayer = layer;
            }
        });

        if (foundLayer === hoveredLayer) return;

        // Reset the previously hovered layer
        if (hoveredLayer) {
            hoveredLayer._isHovered = false;
            hoveredLayer.setStyle(getFeatureStyle(hoveredLayer.feature));
        }

        // Apply hover style to the new layer
        if (foundLayer) {
            foundLayer._isHovered = true;
            foundLayer.setStyle({
                weight: 4,
                color: '#666',
                fillOpacity: 0.9
            });
            foundLayer.bringToFront();
        }

        hoveredLayer = foundLayer;
    });

    // Clear hover when mouse leaves the map entirely
    map.on('mouseout', function() {
        if (hoveredLayer) {
            hoveredLayer._isHovered = false;
            hoveredLayer.setStyle(getFeatureStyle(hoveredLayer.feature));
            hoveredLayer = null;
        }
    });

    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function() {
        this._div = L.DomUtil.create('div', 'legend');
        return this._div;
    };

    legend.update = function(detail) {
        const { mode, race, year, yearFrom, yearTo } = detail;
        const raceName = race.charAt(0).toUpperCase() + race.slice(1);

        let title, colors, legendLabels;

        if (mode === 'snapshot') {
            title = raceName + ' population share, ' + year;
            colors = divergingColors;
            legendLabels = labels;
        } else if (mode === 'change') {
            title = raceName + ' population change, <span style="white-space: nowrap">' + yearFrom + '–' + yearTo + '</span>';
            colors = changeColors;
            legendLabels = changeLabels;
        } else if (mode === 'covenant') {
            title = 'Covenant Status';
            colors = ['blue', 'red'];
            legendLabels = ['No Covenants', 'Has Covenants'];
        }

        this._div.innerHTML = '<h4>' + title + '</h4>' +
            '<div class="legend-rows">' +
                colors.slice().reverse().map(function(color, i) {
                    return '<div class="legend-row">' +
                        '<span class="legend-swatch" style="background:' + color + '"></span>' +
                        legendLabels[colors.length - 1 - i] +
                    '</div>';
                }).join('') +
            '</div>';
    };

    legend.addTo(map);
    legend.update(getState());

    document.addEventListener('selectionChanged', function(e) {
        const { mode, year, yearFrom, yearTo } = e.detail;

        legend.update(e.detail);

        if (mode === 'snapshot') {
            renderBarChart(selectedRows, year);
        } else if (mode === 'change') {
            renderChangeChart(selectedRows, yearFrom, yearTo);
        }

        // Skip the currently hovered layer so we don't clobber its hover style
        enumDistricts.eachLayer(function(layer) {
            if (!layer._isHovered) {
                layer.setStyle(getFeatureStyle(layer.feature));
            }
        });
    });

    const layerControl = L.control.layers(null, overlayMaps, { position: 'topleft' });

    window.addEventListener('resize', function() {
        const { year } = getState();
        renderBarChart(selectedRows, year);
        renderLineChart(selectedRows);
    });

    return enumDistricts;
};