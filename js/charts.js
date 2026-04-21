import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const gridLineColor = '#dcd8c0';

const raceColors = [
    { label: 'Asian', key: 'share_asian', color: '#BC5215' },
    { label: 'Black', key: 'share_black', color: '#24837B' },
    { label: 'Other', key: 'share_other', color: '#66800B' },
    { label: 'White', key: 'share_white', color: '#5E409D' }
];

const YEARS = ['1940', '1950', '1960', '1970', '1980', '1990', '2000', '2010', '2020'];
const CHART_HEIGHT = 200;
const MARGIN = { top: 10, right: 16, bottom: 32, left: 48 };

// Get chart container or create if it doesn't exist
function getOrCreateContainer(id, parentSelector = '#home') {
    let el = document.querySelector('#' + id);
    if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.classList.add('chart-wrapper');
        document.querySelector(parentSelector).appendChild(el);
    }
    return el;
}

// Create svg canvas
function createSvg(container, margin = MARGIN) {
    const totalWidth = container.clientWidth;
    const width  = totalWidth - margin.left - margin.right;
    const height = CHART_HEIGHT - margin.top - margin.bottom;

    const svgEl = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('viewBox', `0 0 ${totalWidth} ${height + margin.top + margin.bottom}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const svg = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    return { svgEl, svg, width, height, totalWidth };
}

// Style axes and gridlines
function addAxes(svg, x, y, { isPoint = false, width, height }) {
    // X axis
    const xTickFormat = isPoint ? d => `'${d.slice(2)}` : null;
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(xTickFormat ? d3.axisBottom(x).tickFormat(xTickFormat) : d3.axisBottom(x))
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').remove())
        .selectAll('text').style('font-size', '0.8rem');

    // Y axis
    svg.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'))
        .call(g => g.selectAll('.tick line').remove())
        .call(g => g.select('.domain').remove())
        .selectAll('text').style('font-size', '0.8rem');

    // Horizontal gridlines
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat('').tickValues(y.ticks(5).slice(1, -1)))
        .call(g => g.select('.domain').remove())
        .selectAll('line').style('stroke', gridLineColor);

    // Vertical gridlines
    const xGridDomain = isPoint ? x.domain().slice(1, -1) : x.domain().slice(0, 4);
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSize(-height).tickFormat('').tickValues(xGridDomain))
        .call(g => g.select('.domain').remove())
        .selectAll('line').style('stroke', gridLineColor);
}

// Style tooltip
function createTooltip(container) {
    return d3.select(container)
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
}

// Overlay for bar charts
function addGuidelineAndOverlay(svg, svgEl, container, { width, height, totalWidth, margin }, snapPoints, onHover) {
    const guideLine = svg.append('line')
        .attr('y1', 0).attr('y2', height)
        .attr('stroke', '#333').attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
        .style('opacity', 0).style('pointer-events', 'none');

    svg.append('rect')
        .attr('width', width).attr('height', height)
        .attr('fill', 'none')
        .style('pointer-events', 'all')
        .on('mousemove', function(event) {
            const bbox = svgEl.node().getBoundingClientRect();
            const scale = bbox.width / totalWidth;
            const [rawX] = d3.pointer(event, svgEl.node());
            const mouseX = rawX - margin.left;

            // Snap to nearest point
            let nearest = snapPoints[0];
            let minDist = Math.abs(mouseX - snapPoints[0].px);
            snapPoints.forEach(p => {
                const dist = Math.abs(mouseX - p.px);
                if (dist < minDist) { minDist = dist; nearest = p; }
            });

            guideLine.attr('x1', nearest.px).attr('x2', nearest.px).style('opacity', 1);
            onHover(nearest, bbox, scale);
        })
        .on('mouseleave', function() {
            guideLine.style('opacity', 0);
            onHover(null);
        });
}

// Locate tooltip
function positionTooltip(tooltip, container, svgEl, totalWidth, margin, height, snappedX, scale) {
    const bbox = svgEl.node().getBoundingClientRect();
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
}

// Renders single year racial composition chart
export function renderBarChart(rows, year) {
    if (!rows || !year) return;

    const container = getOrCreateContainer('ed-bar-chart');
    container.style.position = 'relative';

    const row = rows.find(r => r.year === year);
    if (!row) {
        container.innerHTML = '<p class="chart-placeholder">No data for selected year.</p>';
        return;
    }

    const data = raceColors
        .map(({ label, key, color }) => ({ label, key, color, value: row[key] }))
        .filter(d => d.value !== null && !isNaN(d.value));

    container.innerHTML = '';
    appendTitle(container, `Percent of Population by Race, ${year}`);

    const { svgEl, svg, width, height, totalWidth } = createSvg(container);
    const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, width]).padding(0.3);
    const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

    addAxes(svg, x, y, { width, height });

    svg.selectAll('.bar').data(data).enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.label))
        .attr('y', d => y(d.value))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.value))
        .attr('fill', d => d.color)
        .style('pointer-events', 'none');

    const tooltip = createTooltip(container);
    const snapPoints = data.map(d => ({ px: x(d.label) + x.bandwidth() / 2, d }));

    addGuidelineAndOverlay(svg, svgEl, container, { width, height, totalWidth, margin: MARGIN }, snapPoints,
        (nearest, bbox, scale) => {
            if (!nearest) { tooltip.style('opacity', 0); return; }
            const { d, px } = nearest;
            tooltip.html(tooltipSingleRow(d.label, d.value.toFixed(1) + '%')).style('opacity', 1);
            positionTooltip(tooltip, container, svgEl, totalWidth, MARGIN, height, px, scale);
        }
    );
}

// Renders racial composition from 1940 to 2020 chart
export function renderLineChart(rows) {
    if (!rows) return;

    const container = getOrCreateContainer('ed-line-chart');
    container.style.position = 'relative';
    container.innerHTML = '';

    appendTitle(container, 'Population Share by Race, 1940–2020');

    const { svgEl, svg, width, height, totalWidth } = createSvg(container, { ...MARGIN, right: 10 });
    const x = d3.scalePoint().domain(YEARS).range([0, width]);
    const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

    addAxes(svg, x, y, { isPoint: true, width, height });

    // Pre-build data lookup
    const dataByYear = Object.fromEntries(
        YEARS.map(yr => {
            const row = rows.find(r => r.year === yr);
            return [yr, Object.fromEntries(raceColors.map(({ key }) => [key, row ? row[key] : null]))];
        })
    );

    const lineGen = d3.line()
        .defined(d => d.value !== null && !isNaN(d.value))
        .x(d => x(d.year))
        .y(d => y(d.value));

    const activeRaces = new Set(raceColors.map(r => r.key));
    const paths = {};
    const pointGroups = {};
    const dots = {};

    raceColors.forEach(({ key, color }) => {
        const lineData = YEARS.map(yr => ({ year: yr, value: dataByYear[yr][key] }))
                              .filter(d => d.value !== null && !isNaN(d.value));

        paths[key] = svg.append('path').datum(lineData)
            .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2).attr('d', lineGen);

        pointGroups[key] = svg.append('g');
        pointGroups[key].selectAll('circle').data(lineData).enter().append('circle')
            .attr('cx', d => x(d.year)).attr('cy', d => y(d.value))
            .attr('r', 2.5).attr('fill', color)
            .attr('stroke', '#fff').attr('stroke-width', 1).style('pointer-events', 'none');

        dots[key] = svg.append('circle')
            .attr('r', 4).attr('fill', color)
            .attr('stroke', '#fff').attr('stroke-width', 1.5)
            .style('opacity', 0).style('pointer-events', 'none');
    });

    const tooltip = createTooltip(container);
    const snapPoints = YEARS.map(yr => ({ px: x(yr), year: yr }));

    addGuidelineAndOverlay(svg, svgEl, container, { width, height, totalWidth, margin: { ...MARGIN, right: 10 } }, snapPoints,
        (nearest, bbox, scale) => {
            if (!nearest) {
                tooltip.style('opacity', 0);
                raceColors.forEach(({ key }) => dots[key].style('opacity', 0));
                return;
            }
            const { year, px } = nearest;
            raceColors.forEach(({ key, color }) => {
                const val = dataByYear[year][key];
                dots[key].attr('cx', px).attr('cy', y(val))
                    .style('opacity', val !== null && !isNaN(val) && activeRaces.has(key) ? 1 : 0);
            });

            let html = `<div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid #eee;padding-bottom:3px">${year}</div>`;
            html += '<table style="border-spacing:0;border-collapse:collapse">';
            raceColors.forEach(({ key, color, label }) => {
                if (!activeRaces.has(key)) return;
                const val = dataByYear[year][key];
                if (val === null || isNaN(val)) return;
                html += `<tr>
                    <td style="padding:2px 4px 2px 0"><div style="width:12px;height:12px;background:${color};border:1px solid rgba(0,0,0,0.2);display:inline-block;vertical-align:middle;border-radius:2px"></div></td>
                    <td style="padding:2px 8px 2px 2px;color:#333">${label}</td>
                    <td style="padding:2px 0;font-weight:bold;text-align:right">${val.toFixed(1)}%</td>
                </tr>`;
            });
            html += '</table>';
            tooltip.html(html).style('opacity', 1);
            positionTooltip(tooltip, container, svgEl, totalWidth, { ...MARGIN, right: 10 }, height, px, scale);
        }
    );

    // Legend
    const legendRow = document.createElement('div');
    legendRow.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:5px;margin-top:4px;';
    container.appendChild(legendRow);

    raceColors.forEach(({ key, color, label }) => {
        const { btn, tick } = makeLegendButton(label, color);
        let active = true;
        btn.addEventListener('click', () => {
            active = !active;
            activeRaces[active ? 'add' : 'delete'](key);
            btn.style.background = active ? color : 'transparent';
            btn.style.color = active ? '#fff' : color;
            tick.setAttribute('stroke', active ? '#fff' : color);
            tick.setAttribute('stroke-opacity', active ? '1' : '0');
            paths[key].style('opacity', active ? 1 : 0);
            pointGroups[key].style('opacity', active ? 1 : 0);
            if (!active) dots[key].style('opacity', 0);
        });
        legendRow.appendChild(btn);
    });
}

// Render change of time chart
export function renderChangeChart(rows, yearFrom, yearTo) {
    if (!rows || !yearFrom || !yearTo) return;

    const container = getOrCreateContainer('ed-bar-chart');
    container.style.position = 'relative';

    const rowFrom = rows.find(r => r.year === yearFrom);
    const rowTo   = rows.find(r => r.year === yearTo);
    if (!rowFrom || !rowTo) return;

    const data = raceColors.map(({ label, key, color }) => ({
        label, key, color,
        value: (rowFrom[key] != null && rowTo[key] != null && !isNaN(rowFrom[key]) && !isNaN(rowTo[key]))
            ? rowTo[key] - rowFrom[key]
            : null
    })).filter(d => d.value !== null);

    container.innerHTML = '';
    appendTitle(container, `Change in Population Share, ${yearFrom}–${yearTo}`);

    const { svgEl, svg, width, height, totalWidth } = createSvg(container, { ...MARGIN, top: 8 });
    const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, width]).padding(0.3);
    const y = d3.scaleLinear().domain([-100, 100]).range([height, 0]);

    addAxes(svg, x, y, { width, height });

    // Zero baseline
    svg.append('line')
        .attr('x1', 0).attr('x2', width)
        .attr('y1', y(0)).attr('y2', y(0))
        .attr('stroke', '#999').attr('stroke-width', 1);

    svg.selectAll('.bar').data(data).enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.label))
        .attr('y', d => d.value >= 0 ? y(d.value) : y(0))
        .attr('width', x.bandwidth())
        .attr('height', d => Math.abs(y(d.value) - y(0)))
        .attr('fill', d => d.color)
        .style('pointer-events', 'none');

    const tooltip = createTooltip(container);
    const snapPoints = data.map(d => ({ px: x(d.label) + x.bandwidth() / 2, d }));
    const margin = { ...MARGIN, top: 8 };

    addGuidelineAndOverlay(svg, svgEl, container, { width, height, totalWidth, margin }, snapPoints,
        (nearest, bbox, scale) => {
            if (!nearest) { tooltip.style('opacity', 0); return; }
            const { d, px } = nearest;
            const sign = d.value >= 0 ? '+' : '';
            tooltip.html(tooltipSingleRow(d.label, sign + d.value.toFixed(1) + '%')).style('opacity', 1);
            positionTooltip(tooltip, container, svgEl, totalWidth, margin, height, px, scale);
        }
    );
}

function appendTitle(container, text) {
    const p = document.createElement('p');
    p.className = 'chart-title';
    p.textContent = text;
    container.appendChild(p);
}

function tooltipSingleRow(label, value) {
    return `<table style="border-spacing:0;border-collapse:collapse">
        <tr>
            <td style="padding:2px 8px 2px 0;color:#333">${label}</td>
            <td style="padding:2px 0;font-weight:bold;text-align:right">${value}</td>
        </tr>
    </table>`;
}

function makeLegendButton(label, color) {
    const btn = document.createElement('button');
    btn.style.cssText = [
        'display:inline-flex', 'align-items:center', 'gap:4px',
        'padding:2px 8px 2px 5px', 'border-radius:3px',
        `border:2px solid ${color}`, `background:${color}`,
        'color:#fff', 'font-size:0.72rem', 'font-weight:600',
        'font-family:Arial,sans-serif', 'cursor:pointer',
        'line-height:1.4', 'white-space:nowrap',
    ].join(';');

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('width', '10'); icon.setAttribute('height', '10');
    icon.setAttribute('viewBox', '0 0 10 10');
    icon.style.flexShrink = '0';

    const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    Object.entries({ x: '0.5', y: '0.5', width: '9', height: '9', rx: '1',
        fill: 'none', stroke: '#fff', 'stroke-width': '1.5' })
        .forEach(([k, v]) => box.setAttribute(k, v));

    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    Object.entries({ d: 'M1.5,5 L4,7.5 L8.5,2', fill: 'none', stroke: '#fff',
        'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
        .forEach(([k, v]) => tick.setAttribute(k, v));

    icon.appendChild(box);
    icon.appendChild(tick);
    btn.appendChild(icon);
    btn.appendChild(document.createTextNode(label));

    return { btn, tick };
}