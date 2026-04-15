import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const RACES = [
    { key: 'share_white', label: 'White', color: '#378ADD' },
    { key: 'share_black', label: 'Black', color: '#D85A30' },
    { key: 'share_asian', label: 'Asian', color: '#1D9E75' },
    { key: 'share_other', label: 'Other', color: '#888780' },
];

export function renderBarChart(rows, year) {
    const container = document.getElementById('ed-bar-chart');
    container.style.position = 'relative';

    if (!rows || !year) {
        container.innerHTML = '<p class="chart-placeholder">Click a district to view demographics.</p>';
        return;
    }

    const row = rows.find(function(r) { return r.year === year; });

    if (!row) {
        container.innerHTML = '<p class="chart-placeholder">No data for selected year.</p>';
        return;
    }

    const races = [
        { label: 'Asian', value: row.share_asian },
        { label: 'Black', value: row.share_black },
        { label: 'Other', value: row.share_other },
        { label: 'White', value: row.share_white }
    ].filter(function(d) { return d.value !== null && !isNaN(d.value); });

    container.innerHTML = '';

    const title = document.createElement('p');
    title.className = 'chart-title';
    title.textContent = 'Percent of Population by Race, ' + year;
    container.appendChild(title);

    const totalWidth = container.clientWidth;
    const margin = { top: 10, right: 16, bottom: 32, left: 48 };
    const width  = totalWidth - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = d3.select('#ed-bar-chart')
        .append('svg')
        .attr('width', '100%')
        .attr('viewBox', '0 0 ' + totalWidth + ' ' + (height + margin.top + margin.bottom))
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .append('g')
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
        .call(d3.axisBottom(x));

    svg.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat(function(d) { return d + '%'; }))
        .selectAll('text')
        .style('font-size', '0.7rem');

    const tooltip = d3.select('#ed-bar-chart')
        .append('div')
        .style('position', 'absolute')
        .style('background', '#fff')
        .style('border', '1px solid #ccc')
        .style('border-radius', '4px')
        .style('padding', '4px 8px')
        .style('font-size', '1rem')
        .style('pointer-events', 'none')
        .style('opacity', 0);

    svg.selectAll('.bar')
        .data(races)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x',      function(d) { return x(d.label); })
        .attr('y',      function(d) { return y(d.value); })
        .attr('width',  x.bandwidth())
        .attr('height', function(d) { return height - y(d.value); })
        .attr('fill', '#949bff')
        .on('mouseover', function(event, d) {
            tooltip
                .style('opacity', 1)
                .html(d.value.toFixed(1) + '%');
        })
        .on('mousemove', function(event) {
            const rect = container.getBoundingClientRect();
            tooltip
                .style('left', (event.clientX - rect.left + 8) + 'px')
                .style('top',  (event.clientY - rect.top  + 8) + 'px');
        })
        .on('mouseout', function() {
            tooltip.style('opacity', 0);
        });
}

export function renderLineChart(rows) {
    const container = document.getElementById('ed-line-chart');

    if (!rows) {
        container.innerHTML = '<p class="chart-placeholder">Click a district to view demographics.</p>';
        return;
    }

    container.innerHTML = '';

    const title = document.createElement('p');
    title.className = 'chart-title';
    title.textContent = 'Population Share by Race, 1940–2020';
    container.appendChild(title);

    const years = ['1940', '1950', '1960', '1970', '1980', '1990', '2000', '2010', '2020'];
    const raceGroups = [
        { label: 'Asian', key: 'share_asian', color: '#e41a1c' },
        { label: 'Black', key: 'share_black', color: '#377eb8' },
        { label: 'Other', key: 'share_other', color: '#4daf4a' },
        { label: 'White', key: 'share_white', color: '#984ea3' }
    ];

    const totalWidth = container.clientWidth;
    const margin = { top: 10, right: 10, bottom: 32, left: 48 };
    const width  = totalWidth - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = d3.select('#ed-line-chart')
        .append('svg')
        .attr('width', '100%')
        .attr('viewBox', '0 0 ' + totalWidth + ' ' + (height + margin.top + margin.bottom))
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    const x = d3.scalePoint()
        .domain(years)
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    svg.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(x).tickFormat(function(d) { return "'" + d.slice(2); }))
        .selectAll('text')
        .style('font-size', '0.7rem');

    svg.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat(function(d) { return d + '%'; }))
        .selectAll('text')
        .style('font-size', '0.7rem');

    const line = d3.line()
        .x(function(d) { return x(d.year); })
        .y(function(d) { return y(d.value); });

    raceGroups.forEach(function(race) {
        const data = years.map(function(year) {
            const row = rows.find(function(r) { return r.year === year; });
            return {
                year: year,
                value: row ? row[race.key] : null
            };
        }).filter(function(d) { return d.value !== null && !isNaN(d.value); });

        svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', race.color)
            .attr('stroke-width', 2)
            .attr('d', line);
    });

    const legend = document.createElement('div');
    legend.className = 'chart-legend';

    raceGroups.forEach(function(race) {
        const item = document.createElement('div');
        item.className = 'chart-legend-item';
        item.innerHTML = '<span class="chart-legend-swatch" style="background:' + race.color + '"></span>' + race.label;
        legend.appendChild(item);
    });

    container.appendChild(legend);
}

export function renderChangeChart(rows, yearFrom, yearTo) {
    const container = document.getElementById('ed-bar-chart');
    container.style.position = 'relative';

    if (!rows) {
        container.innerHTML = '<p class="chart-placeholder">Click a district to view demographics.</p>';
        return;
    }

    const rowFrom = rows.find(function(r) { return r.year === yearFrom; });
    const rowTo   = rows.find(function(r) { return r.year === yearTo; });

    if (!rowFrom || !rowTo) {
        container.innerHTML = '<p class="chart-placeholder">No data for selected years.</p>';
        return;
    }

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

    const svg = d3.select('#ed-bar-chart')
        .append('svg')
        .attr('width', '100%')
        .attr('viewBox', '0 0 ' + totalWidth + ' ' + (height + margin.top + margin.bottom))
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .append('g')
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
        .selectAll('text')
        .style('font-size', '0.7rem');

    svg.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat(function(d) { return d + '%'; }))
        .selectAll('text')
        .style('font-size', '0.7rem');

    svg.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(0))
        .attr('y2', y(0))
        .attr('stroke', '#999')
        .attr('stroke-width', 1);

    const tooltip = d3.select('#ed-bar-chart')
        .append('div')
        .style('position', 'absolute')
        .style('background', '#fff')
        .style('border', '1px solid #ccc')
        .style('border-radius', '4px')
        .style('padding', '4px 8px')
        .style('font-size', '1rem')
        .style('pointer-events', 'none')
        .style('opacity', 0);

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
        .on('mouseover', function(event, d) {
            const sign = d.value >= 0 ? '+' : '';
            tooltip
                .style('opacity', 1)
                .html(sign + d.value.toFixed(1) + '%');
        })
        .on('mousemove', function(event) {
            const rect = container.getBoundingClientRect();
            tooltip
                .style('left', (event.clientX - rect.left + 8) + 'px')
                .style('top',  (event.clientY - rect.top  + 8) + 'px');
        })
        .on('mouseout', function() {
            tooltip.style('opacity', 0);
        });
}