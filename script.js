let rawData = [];
let costos = JSON.parse(localStorage.getItem('costosUnitarios')) || {};
let clienteChart;

// --- Solo si existe input de Excel ---
const excelInput = document.getElementById('excelFile');
if (excelInput) {
    excelInput.addEventListener('change', handleFile);
}

// --- Solo si existe input de búsqueda ---
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', renderTable);
}

function handleFile(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' })
            .filter(r => parseFloat(r.Cantidad) > 0)
            .map(r => {
                r.FechaObj = r.Fecha ? XLSX.SSF.parse_date_code(r.Fecha) : null;
                if (r.FechaObj) r.FechaObj = new Date(r.FechaObj.y, r.FechaObj.m - 1, r.FechaObj.d);
                if (costos[r.Código]) r.CostoUnitario = costos[r.Código];
                return r;
            });

        populateFilters();
        renderTable();
    };

    reader.readAsArrayBuffer(file);
}

function populateFilters() {
    if (!rawData.length) return;

    const grupos = [...new Set(rawData.map(r => r.Grupo))];
    const clientes = [...new Set(rawData.map(r => r.Cliente))];
    const codigos = [...new Set(rawData.map(r => r.Código))];

    fillSelect('filterGrupo', grupos);
    fillSelect('filterCliente', clientes);
    fillSelect('filterCodigo', codigos);

    const days = [...new Set(rawData.map(r => r.FechaObj?.getDate()))].sort((a,b)=>a-b);
    const months = [...new Set(rawData.map(r => r.FechaObj?.getMonth()+1))].sort((a,b)=>a-b);
    const years = [...new Set(rawData.map(r => r.FechaObj?.getFullYear()))].sort((a,b)=>a-b);

    fillSelect('filterDay', days);
    fillSelect('filterMonth', months);
    fillSelect('filterYear', years);

    ['filterGrupo','filterCliente','filterCodigo','filterDay','filterMonth','filterYear'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', renderTable);
    });
}

function fillSelect(id, values) {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '<option value="">Todos</option>';
    values.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
    });
}

function formatNumber(num) {
    return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderTable() {
    const tbody = document.querySelector('#dataTable tbody');
    if (!tbody) return;

    const grupoSel = document.getElementById('filterGrupo')?.value || '';
    const clienteSel = document.getElementById('filterCliente')?.value || '';
    const codigoSel = document.getElementById('filterCodigo')?.value || '';
    const daySel = parseInt(document.getElementById('filterDay')?.value) || '';
    const monthSel = parseInt(document.getElementById('filterMonth')?.value) || '';
    const yearSel = parseInt(document.getElementById('filterYear')?.value) || '';
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || '';

    let filtered = rawData.filter(r => 
        (grupoSel === '' || r.Grupo === grupoSel) &&
        (clienteSel === '' || r.Cliente === clienteSel) &&
        (codigoSel === '' || r.Código === codigoSel) &&
        (daySel === '' || r.FechaObj?.getDate() === daySel) &&
        (monthSel === '' || (r.FechaObj?.getMonth()+1) === monthSel) &&
        (yearSel === '' || r.FechaObj?.getFullYear() === yearSel) &&
        (
            r.Código.toString().toLowerCase().includes(searchText) ||
            r.Detalle.toLowerCase().includes(searchText) ||
            r.Cliente.toLowerCase().includes(searchText) ||
            r.Grupo.toLowerCase().includes(searchText)
        )
    );

    tbody.innerHTML = '';
    filtered.forEach(row => {
        const tr = document.createElement('tr');
        const fechaStr = row.FechaObj ? row.FechaObj.toLocaleDateString() : '';
        tr.innerHTML = `
            <td>${fechaStr}</td>
            <td>${row.Cliente}</td>
            <td>${row.Código}</td>
            <td>${row.Detalle}</td>
            <td>${row.Cantidad}</td>
            <td>${row.Grupo}</td>
            <td><input type="number" min="0" step="0.01" class="costo-input" 
                value="${row.CostoUnitario || costos[row.Código] || ''}" 
                data-codigo="${row.Código}"></td>
            <td class="total-cell"></td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.costo-input').forEach(input => {
        input.addEventListener('input', e => {
            const codigo = e.target.getAttribute('data-codigo');
            const valor = parseFloat(e.target.value) || 0;
            costos[codigo] = valor;
            localStorage.setItem('costosUnitarios', JSON.stringify(costos));
            document.querySelectorAll(`.costo-input[data-codigo="${codigo}"]`).forEach(inp => inp.value = valor);
            updateTotals();
        });
    });

    updateTotals();
    renderChart();
}

function updateTotals() {
    const tbodyRows = document.querySelectorAll('#dataTable tbody tr');
    if (!tbodyRows.length) return;

    let totalGeneral = 0;
    tbodyRows.forEach(tr => {
        const codigo = tr.querySelector('.costo-input')?.getAttribute('data-codigo');
        const cantidad = parseFloat(tr.children[4].textContent) || 0;
        const costo = costos[codigo] || 0;
        const total = cantidad * costo;
        const totalCell = tr.querySelector('.total-cell');
        if(totalCell) totalCell.textContent = formatNumber(total);
        totalGeneral += total;
    });

    const totalStr = formatNumber(totalGeneral);
    const totalEl = document.getElementById('totalGeneral');
    if(totalEl) totalEl.textContent = totalStr;

    const totalTopEl = document.getElementById('totalGeneralTop');
    if(totalTopEl) totalTopEl.textContent = `TOTAL GENERAL: ${totalStr}`;
}

function renderChart() {
    const canvas = document.getElementById('clienteChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (clienteChart) clienteChart.destroy();

    const clientes = [...new Set(rawData.map(r => r.Cliente))];
    const totals = clientes.map(c => {
        return rawData
            .filter(r => r.Cliente === c)
            .reduce((sum, r) => sum + ((r.CostoUnitario || 0) * r.Cantidad), 0);
    });

    clienteChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: clientes,
            datasets: [{
                label: 'Total por Cliente',
                data: totals,
                backgroundColor: '#007acc'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

