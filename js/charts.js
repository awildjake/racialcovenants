import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const RACES = [
    { key: 'share_white', label: 'White', color: '#378ADD' },
    { key: 'share_black', label: 'Black', color: '#D85A30' },
    { key: 'share_asian', label: 'Asian', color: '#1D9E75' },
    { key: 'share_other', label: 'Other', color: '#888780' },
];

const gridLineColor = '#dcd8c0'

export function renderBarChart(rows, year) {
    if (!rows || !year) return;

    if (!document.querySelector('#ed-bar-chart')) {
        const edBarChart = document.createElement('div');
        edBarChart.id = 'ed-bar-chart';
        edBarChart.classList.add('chart-wrapper');
        document.querySelector('#home').appendChild(edBarChart);
    }

    const container = document.getElementById('ed-bar-chart');
    container.style.position = 'relative';

    const row = rows.find(function(r) { return r.year === year; });

    if (!row) {
        container.innerHTML = '<p class="chart-placeholder">No data for selected year.</p>';
        return;
    }

    const races = [
        { label: 'Asian', key: 'share_asian', value: row.share_asian },
        { label: 'Black', key: 'share_black', value: row.share_black },
        { label: 'Other', key: 'share_other', value: row.share_other },
        { label: 'White', key: 'share_white', value: row.share_white }
    ].filter(function(d) { return d.value !== null && !isNaN(d.value); });

    const raceGroups = [
        { label: 'Asian', key: 'share_asian', color: '#BC5215' },
        { label: 'Black', key: 'share_black', color: '#24837B' },
        { label: 'Other', key: 'share_other', color: '#66800B' },
        { label: 'White', key: 'share_white', color: '#5E409D' }
    ];

    container.innerHTML = '';

    const title = document.createElement('p');
    title.className = 'chart-title';
    title.textContent = 'Percent of Population by Race, ' + year;
    container.appendChild(title);

    const totalWidth = container.clientWidth;
    const margin = { top: 10, right: 16, bottom: 32, left: 48 };
    const width  = totalWidth - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svgEl = d3.select('#ed-bar-chart')
        .append('svg')
        .attr('width', '100%')
        .attr('viewBox', '0 0 ' + totalWidth + ' ' + (height + margin.top + margin.bottom))
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const svg = svgEl.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    const x = d3.scaleBand()
        .domain(races.map(function(d) { return d.label; }))
        .range([0, width])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    svg.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(x))
        .call(function(g) { g.select('.domain').remove(); })
        .call(function(g) { g.selectAll('.tick line').remove(); })
        .style('font-size', '0.8rem');

    svg.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat(function(d) { return d + '%'; }))
        .call(function(g) { g.selectAll('.tick line').remove(); })
        .call(function(g) { g.select('.domain').remove(); })
        .selectAll('text')
        .style('font-size', '0.8rem');

    // Faint Horizontal gridlines (y-axis)
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat('').tickValues(y.ticks(5).slice(0, -1)))
        .call(function(g) { g.select('.domain').remove(); })
        .selectAll('line').style('stroke', gridLineColor);

    // Faint Vertical gridlines (x-axis)
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(x).tickSize(-height).tickFormat('').tickValues(x.domain().slice(0, 4)))
        .call(function(g) { g.select('.domain').remove(); })
        .selectAll('line').style('stroke', gridLineColor);

    svg.selectAll('.bar')
        .data(races)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x',      function(d) { return x(d.label); })
        .attr('y',      function(d) { return y(d.value); })
        .attr('width',  x.bandwidth())
        .attr('height', function(d) { return height - y(d.value); })
        .attr('fill', function(d) {
            const group = raceGroups.find(function(r) { return r.key === d.key; });
            return group ? group.color : '#cccccc';
        })
        .style('pointer-events', 'none');

    // --- Vertical guideline ---
    const guideLine = svg.append('line')
        .attr('y1', 0).attr('y2', height)
        .attr('stroke', '#333').attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
        .style('opacity', 0).style('pointer-events', 'none');

    // --- Tooltip ---
    const tooltip = d3.select('#ed-bar-chart')
        .append('div')
        .style('position', 'absolute')
        .style('background', 'rgba(255,255,255,0.97)')
        .style('border', '1px solid rgba(0,0,0,0.25)')
        .style('border-radius', '4px')
        .style('padding', '6px 10px')
        .style('font-size', '0.75rem')
        .style('font-family', 'Arial, sans-serif')
        .style('pointer-events', 'none')
        .style('box-shadow', '0 2px 6px rgba(0,0,0,0.15)')
        .style('opacity', 0)
        .style('z-index', 9999);

    // --- Invisible overlay rect covering the full chart area ---
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'none')
        .style('pointer-events', 'all')
        .on('mousemove', function(event) {
            const svgNode = svgEl.node();
            const bbox = svgNode.getBoundingClientRect();
            const scale = bbox.width / totalWidth;
            const [rawX] = d3.pointer(event, svgNode);
            const mouseX = rawX - margin.left;

            // Find nearest bar by band center
            const barCenters = races.map(function(d) {
                return { d: d, px: x(d.label) + x.bandwidth() / 2 };
            });
            let nearest = barCenters[0];
            let minDist = Math.abs(mouseX - barCenters[0].px);
            barCenters.forEach(function(entry) {
                const dist = Math.abs(mouseX - entry.px);
                if (dist < minDist) { minDist = dist; nearest = entry; }
            });

            const snappedX = nearest.px;
            const hovered = nearest.d;

            guideLine.attr('x1', snappedX).attr('x2', snappedX).style('opacity', 1);

            const html =
                '<table style="border-spacing:0;border-collapse:collapse">' +
                '<tr>' +
                '<td style="padding:2px 8px 2px 0;color:#333">' + hovered.label + '</td>' +
                '<td style="padding:2px 0;font-weight:bold;text-align:right">' + hovered.value.toFixed(1) + '%</td>' +
                '</tr></table>';

            tooltip.html(html).style('opacity', 1);

            const tipWidth  = tooltip.node().offsetWidth;
            const tipHeight = tooltip.node().offsetHeight;
            const svgOffsetLeft = bbox.left - container.getBoundingClientRect().left;
            const svgOffsetTop  = bbox.top  - container.getBoundingClientRect().top;

            let tipX = svgOffsetLeft + (margin.left + snappedX) * scale + 10;
            const tipY = svgOffsetTop + (margin.top + height / 2 - tipHeight / 2) * scale;

            if (tipX + tipWidth + 12 > container.clientWidth) {
                tipX = svgOffsetLeft + (margin.left + snappedX) * scale - tipWidth - 10;
            }

            tooltip.style('left', tipX + 'px').style('top', tipY + 'px');
        })
        .on('mouseleave', function() {
            guideLine.style('opacity', 0);
            tooltip.style('opacity', 0);
        });
}

export function renderLineChart(rows) {
    if (!rows) return;

    if (!document.querySelector('#ed-line-chart')) {
        const div = document.createElement('div');
        div.id = 'ed-line-chart';
        div.classList.add('chart-wrapper');
        document.querySelector('#home').appendChild(div);
    }

    const container = document.getElementById('ed-line-chart');
    
    container.innerHTML = '';

    const title = document.createElement('p');
    title.className = 'chart-title';
    title.textContent = 'Population Share by Race, 1940–2020';
    container.appendChild(title);

    const years = ['1940', '1950', '1960', '1970', '1980', '1990', '2000', '2010', '2020'];
    const raceGroups = [
        { label: 'Asian', key: 'share_asian', color: '#BC5215' },
        { label: 'Black', key: 'share_black', color: '#24837B' },
        { label: 'Other', key: 'share_other', color: '#66800B' },
        { label: 'White', key: 'share_white', color: '#5E409D' }
    ];

    const totalWidth = container.clientWidth;
    const margin = { top: 10, right: 10, bottom: 32, left: 48 };
    const width  = totalWidth - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svgEl = d3.select('#ed-line-chart')
        .append('svg')
        .attr('width', '100%')
        .attr('viewBox', '0 0 ' + totalWidth + ' ' + (height + margin.top + margin.bottom))
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const svg = svgEl.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    const x = d3.scalePoint().domain(years).range([0, width]);
    const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

    svg.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(x).tickFormat(d => "'" + d.slice(2)))
        .call(function(g) { g.select('.domain').remove(); })
        .call(function(g) { g.selectAll('.tick line').remove(); })
        .selectAll('text').style('font-size', '0.8rem');

    svg.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'))
        .call(function(g) { g.selectAll('.tick line').remove(); })
        .call(function(g) { g.select('.domain').remove(); })
        .selectAll('text').style('font-size', '0.8rem');

    // Faint Horizontal gridlines (y-axis)
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat('').tickValues(y.ticks(5).slice(0, -1)))
        .call(function(g) { g.select('.domain').remove(); })
        .selectAll('line').style('stroke', gridLineColor);

    // Faint Vertical gridlines (x-axis)
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(x).tickSize(-height).tickFormat('').tickValues(x.domain().slice(1, -1)))
        .call(function(g) { g.select('.domain').remove(); })
        .selectAll('line').style('stroke', gridLineColor);

    const lineGen = d3.line()
        .defined(d => d.value !== null && !isNaN(d.value))
        .x(d => x(d.year))
        .y(d => y(d.value));

    // Pre-build data lookup
    const dataByYear = {};
    years.forEach(year => {
        const row = rows.find(r => r.year === year);
        dataByYear[year] = {};
        raceGroups.forEach(race => {
            dataByYear[year][race.key] = row ? row[race.key] : null;
        });
    });

    const paths = {};
    const pointGroups = {};
    const activeRaces = new Set(raceGroups.map(r => r.key));

    raceGroups.forEach(function(race) {
        const data = years.map(year => ({ year, value: dataByYear[year][race.key] }))
                          .filter(d => d.value !== null && !isNaN(d.value));

        paths[race.key] = svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', race.color)
            .attr('stroke-width', 2)
            .attr('d', lineGen);

        pointGroups[race.key] = svg.append('g');
        pointGroups[race.key].selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.year))
            .attr('cy', d => y(d.value))
            .attr('r', 2.5)
            .attr('fill', race.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .style('pointer-events', 'none');
    });

    // --- Vertical guideline ---
    const guideLine = svg.append('line')
        .attr('y1', 0).attr('y2', height)
        .attr('stroke', '#333').attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
        .style('opacity', 0).style('pointer-events', 'none');

    // --- Hover intersection dots ---
    const dots = {};
    raceGroups.forEach(race => {
        dots[race.key] = svg.append('circle')
            .attr('r', 4)
            .attr('fill', race.color)
            .attr('stroke', '#fff').attr('stroke-width', 1.5)
            .style('opacity', 0).style('pointer-events', 'none');
    });

    // --- Tooltip ---
    container.style.position = 'relative';

    const tooltip = d3.select('#ed-line-chart')
        .append('div')
        .style('position', 'absolute')
        .style('background', 'rgba(255,255,255,0.97)')
        .style('border', '1px solid rgba(0,0,0,0.25)')
        .style('border-radius', '4px')
        .style('padding', '6px 10px')
        .style('font-size', '0.75rem')
        .style('font-family', 'Arial, sans-serif')
        .style('pointer-events', 'none')
        .style('box-shadow', '0 2px 6px rgba(0,0,0,0.15)')
        .style('opacity', 0)
        .style('z-index', 9999);

    // --- Mouse overlay ---
    svg.append('rect')
        .attr('width', width).attr('height', height)
        .attr('fill', 'none')
        .style('pointer-events', 'all')
        .on('mousemove', function(event) {
            const svgNode = svgEl.node();
            const bbox = svgNode.getBoundingClientRect();
            const scale = bbox.width / totalWidth;
            const [rawX] = d3.pointer(event, svgNode);
            const mouseX = rawX - margin.left;

            const xPositions = years.map(yr => ({ year: yr, px: x(yr) }));
            let nearest = xPositions[0];
            let minDist = Math.abs(mouseX - xPositions[0].px);
            xPositions.forEach(entry => {
                const dist = Math.abs(mouseX - entry.px);
                if (dist < minDist) { minDist = dist; nearest = entry; }
            });

            const snappedX = nearest.px;
            const year = nearest.year;

            guideLine.attr('x1', snappedX).attr('x2', snappedX).style('opacity', 1);

            raceGroups.forEach(race => {
                const val = dataByYear[year][race.key];
                if (val !== null && !isNaN(val) && activeRaces.has(race.key)) {
                    dots[race.key].attr('cx', snappedX).attr('cy', y(val)).style('opacity', 1);
                } else {
                    dots[race.key].style('opacity', 0);
                }
            });

            let html = '<div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid #eee;padding-bottom:3px">' + year + '</div>';
            html += '<table style="border-spacing:0;border-collapse:collapse">';
            raceGroups.forEach(race => {
                if (!activeRaces.has(race.key)) return;
                const val = dataByYear[year][race.key];
                if (val === null || isNaN(val)) return;
                html += '<tr>' +
                    '<td style="padding:2px 4px 2px 0"><div style="width:12px;height:12px;background:' + race.color + ';border:1px solid rgba(0,0,0,0.2);display:inline-block;vertical-align:middle;border-radius:2px"></div></td>' +
                    '<td style="padding:2px 8px 2px 2px;color:#333">' + race.label + '</td>' +
                    '<td style="padding:2px 0;font-weight:bold;text-align:right">' + val.toFixed(1) + '%</td>' +
                '</tr>';
            });
            html += '</table>';

            tooltip.html(html).style('opacity', 1);

            const tipWidth  = tooltip.node().offsetWidth;
            const tipHeight = tooltip.node().offsetHeight;
            const svgOffsetLeft = bbox.left - container.getBoundingClientRect().left;
            const svgOffsetTop  = bbox.top  - container.getBoundingClientRect().top;

            let tipX = svgOffsetLeft + (margin.left + snappedX) * scale + 10;
            let tipY = svgOffsetTop  + (margin.top  + height / 2 - tipHeight / 2) * scale;

            if (tipX + tipWidth + 12 > container.clientWidth) {
                tipX = svgOffsetLeft + (margin.left + snappedX) * scale - tipWidth - 10;
            }

            tooltip.style('left', tipX + 'px').style('top', tipY + 'px');
        })
        .on('mouseleave', function() {
            guideLine.style('opacity', 0);
            raceGroups.forEach(race => dots[race.key].style('opacity', 0));
            tooltip.style('opacity', 0);
        });

    // --- Legend as HTML below the SVG ---
    // Each item is a pill button: colored background, checkmark + label
    const legendRow = document.createElement('div');
    legendRow.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:5px;margin-top:4px;';
    container.appendChild(legendRow);

    raceGroups.forEach(race => {
        const btn = document.createElement('button');
        btn.style.cssText = [
            'display:inline-flex',
            'align-items:center',
            'gap:4px',
            'padding:2px 8px 2px 5px',
            'border-radius:3px',
            'border:2px solid ' + race.color,
            'background:' + race.color,
            'color:#fff',
            'font-size:0.72rem',
            'font-weight:600',
            'font-family:Arial,sans-serif',
            'cursor:pointer',
            'line-height:1.4',
            'white-space:nowrap',
        ].join(';');

        // Checkmark SVG icon
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('width', '10');
        icon.setAttribute('height', '10');
        icon.setAttribute('viewBox', '0 0 10 10');
        icon.style.flexShrink = '0';

        const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        box.setAttribute('x', '0.5'); box.setAttribute('y', '0.5');
        box.setAttribute('width', '9'); box.setAttribute('height', '9');
        box.setAttribute('rx', '1');
        box.setAttribute('fill', 'none');
        box.setAttribute('stroke', '#fff');
        box.setAttribute('stroke-width', '1.5');

        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tick.setAttribute('d', 'M1.5,5 L4,7.5 L8.5,2');
        tick.setAttribute('fill', 'none');
        tick.setAttribute('stroke', '#fff');
        tick.setAttribute('stroke-width', '1.8');
        tick.setAttribute('stroke-linecap', 'round');
        tick.setAttribute('stroke-linejoin', 'round');

        icon.appendChild(box);
        icon.appendChild(tick);

        const label = document.createTextNode(race.label);
        btn.appendChild(icon);
        btn.appendChild(label);

        let active = true;
        btn.addEventListener('click', () => {
            active = !active;
            if (active) {
                activeRaces.add(race.key);
                btn.style.background = race.color;
                btn.style.color = '#fff';
                tick.setAttribute('stroke', '#fff');
                tick.setAttribute('stroke-opacity', '1');
                paths[race.key].style('opacity', 1);
                pointGroups[race.key].style('opacity', 1);
            } else {
                activeRaces.delete(race.key);
                btn.style.background = 'transparent';
                btn.style.color = race.color;
                tick.setAttribute('stroke', race.color);
                tick.setAttribute('stroke-opacity', '0');
                paths[race.key].style('opacity', 0);
                pointGroups[race.key].style('opacity', 0);
                dots[race.key].style('opacity', 0);
            }
        });

        legendRow.appendChild(btn);
    });
}

export function renderChangeChart(rows, yearFrom, yearTo) {

    if (!rows || !yearFrom || !yearTo) return;

    if (!document.querySelector('#ed-bar-chart')) {
        const edBarChart = document.createElement('div');
        edBarChart.id = 'ed-bar-chart';
        edBarChart.classList.add('chart-wrapper');
        document.querySelector('#home').appendChild(edBarChart);
    }

    const container = document.getElementById('ed-bar-chart');
    container.style.position = 'relative';

    const rowFrom = rows.find(function(r) { return r.year === yearFrom; });
    const rowTo   = rows.find(function(r) { return r.year === yearTo; });

    if (!rowFrom || !rowTo) return;

    container.innerHTML = '';

    const title = document.createElement('p');
    title.className = 'chart-title';
    title.textContent = 'Change in Population Share, ' + yearFrom + '–' + yearTo;
    container.appendChild(title);

    const raceGroups = [
        { label: 'Asian', keyFrom: 'share_asian', keyTo: 'share_asian' },
        { label: 'Black', keyFrom: 'share_black', keyTo: 'share_black' },
        { label: 'Other', keyFrom: 'share_other', keyTo: 'share_other' },
        { label: 'White', keyFrom: 'share_white', keyTo: 'share_white' }
    ];

    const data = raceGroups.map(function(race) {
        const from = rowFrom[race.keyFrom];
        const to   = rowTo[race.keyTo];
        return {
            label: race.label,
            value: (from !== null && to !== null && !isNaN(from) && !isNaN(to))
                ? to - from
                : null
        };
    }).filter(function(d) { return d.value !== null; });

    const totalWidth = container.clientWidth;
    const margin = { top: 8, right: 16, bottom: 32, left: 48 };
    const width  = totalWidth - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svgEl = d3.select('#ed-bar-chart')
        .append('svg')
        .attr('width', '100%')
        .attr('viewBox', '0 0 ' + totalWidth + ' ' + (height + margin.top + margin.bottom))
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const svg = svgEl.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    const x = d3.scaleBand()
        .domain(data.map(function(d) { return d.label; }))
        .range([0, width])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([-100, 100])
        .range([height, 0]);

    svg.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(x))
        .call(function(g) { g.select('.domain').remove(); })
        .call(function(g) { g.selectAll('.tick line').remove(); })
        .selectAll('text')
        .style('font-size', '0.8rem');

    svg.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat(function(d) { return d + '%'; }))
        .call(function(g) { g.selectAll('.tick line').remove(); })
        .call(function(g) { g.select('.domain').remove(); })
        .selectAll('text')
        .style('font-size', '0.8rem');

    // Faint Horizontal gridlines (y-axis)
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat('').tickValues(y.ticks(5).slice(1, -1)))
        .call(function(g) { g.select('.domain').remove(); })
        .selectAll('line').style('stroke', gridLineColor);

    // Faint Vertical gridlines (x-axis)
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(x).tickSize(-height).tickFormat('').tickValues(x.domain().slice(0, 4)))
        .call(function(g) { g.select('.domain').remove(); })
        .selectAll('line').style('stroke', gridLineColor);

    svg.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(0))
        .attr('y2', y(0))
        .attr('stroke', '#999')
        .attr('stroke-width', 1);

    svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x',      function(d) { return x(d.label); })
        .attr('y',      function(d) { return d.value >= 0 ? y(d.value) : y(0); })
        .attr('width',  x.bandwidth())
        .attr('height', function(d) { return Math.abs(y(d.value) - y(0)); })
        .attr('fill',   function(d) { return d.value >= 0 ? '#2c7bb6' : '#d7191c'; })
        .style('pointer-events', 'none');

    // --- Vertical guideline ---
    const guideLine = svg.append('line')
        .attr('y1', 0).attr('y2', height)
        .attr('stroke', '#333').attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
        .style('opacity', 0).style('pointer-events', 'none');

    // --- Tooltip ---
    const tooltip = d3.select('#ed-bar-chart')
        .append('div')
        .style('position', 'absolute')
        .style('background', 'rgba(255,255,255,0.97)')
        .style('border', '1px solid rgba(0,0,0,0.25)')
        .style('border-radius', '4px')
        .style('padding', '6px 10px')
        .style('font-size', '0.75rem')
        .style('font-family', 'Arial, sans-serif')
        .style('pointer-events', 'none')
        .style('box-shadow', '0 2px 6px rgba(0,0,0,0.15)')
        .style('opacity', 0)
        .style('z-index', 9999);

    // --- Invisible overlay rect covering the full chart area ---
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'none')
        .style('pointer-events', 'all')
        .on('mousemove', function(event) {
            const svgNode = svgEl.node();
            const bbox = svgNode.getBoundingClientRect();
            const scale = bbox.width / totalWidth;
            const [rawX] = d3.pointer(event, svgNode);
            const mouseX = rawX - margin.left;

            // Find nearest bar by band center
            const barCenters = data.map(function(d) {
                return { d: d, px: x(d.label) + x.bandwidth() / 2 };
            });
            let nearest = barCenters[0];
            let minDist = Math.abs(mouseX - barCenters[0].px);
            barCenters.forEach(function(entry) {
                const dist = Math.abs(mouseX - entry.px);
                if (dist < minDist) { minDist = dist; nearest = entry; }
            });

            const snappedX = nearest.px;
            const hovered = nearest.d;

            guideLine.attr('x1', snappedX).attr('x2', snappedX).style('opacity', 1);

            const sign = hovered.value >= 0 ? '+' : '';
            const html =
                '<table style="border-spacing:0;border-collapse:collapse">' +
                '<tr>' +
                '<td style="padding:2px 8px 2px 0;color:#333">' + hovered.label + '</td>' +
                '<td style="padding:2px 0;font-weight:bold;text-align:right">' + sign + hovered.value.toFixed(1) + '%</td>' +
                '</tr></table>';

            tooltip.html(html).style('opacity', 1);

            const tipWidth  = tooltip.node().offsetWidth;
            const tipHeight = tooltip.node().offsetHeight;
            const svgOffsetLeft = bbox.left - container.getBoundingClientRect().left;
            const svgOffsetTop  = bbox.top  - container.getBoundingClientRect().top;

            let tipX = svgOffsetLeft + (margin.left + snappedX) * scale + 10;
            const tipY = svgOffsetTop + (margin.top + height / 2 - tipHeight / 2) * scale;

            if (tipX + tipWidth + 12 > container.clientWidth) {
                tipX = svgOffsetLeft + (margin.left + snappedX) * scale - tipWidth - 10;
            }

            tooltip.style('left', tipX + 'px').style('top', tipY + 'px');
        })
        .on('mouseleave', function() {
            guideLine.style('opacity', 0);
            tooltip.style('opacity', 0);
        });
}