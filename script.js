let rawData = [];
let costos = JSON.parse(localStorage.getItem('costosUnitarios')) || {};
let clienteChart;

document.getElementById('excelFile').addEventListener('change', handleFile);
document.getElementById('searchInput').addEventListener('input', renderTable);

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
        document.getElementById(id).addEventListener('change', renderTable);
    });
}

function fillSelect(id, values) {
    const select = document.getElementById(id);
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
    tbody.innerHTML = '';

    const grupoSel = document.getElementById('filterGrupo').value;
    const clienteSel = document.getElementById('filterCliente').value;
    const codigoSel = document.getElementById('filterCodigo').value;
    const daySel = parseInt(document.getElementById('filterDay')?.value) || '';
    const monthSel = parseInt(document.getElementById('filterMonth')?.value) || '';
    const yearSel = parseInt(document.getElementById('filterYear')?.value) || '';
    const searchText = document.getElementById('searchInput').value.toLowerCase();

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
    let totalGeneral = 0;
    document.querySelectorAll('#dataTable tbody tr').forEach(tr => {
        const codigo = tr.querySelector('.costo-input').getAttribute('data-codigo');
        const cantidad = parseFloat(tr.children[4].textContent) || 0;
        const costo = costos[codigo] || 0;
        const total = cantidad * costo;
        tr.querySelector('.total-cell').textContent = formatNumber(total);
        totalGeneral += total;
    });
    const totalStr = formatNumber(totalGeneral);
    document.getElementById('totalGeneral').textContent = totalStr;
    document.getElementById('totalGeneralTop').textContent = `TOTAL GENERAL: ${totalStr}`;
}


function renderChart() {
    const totalsByCliente = {};
    document.querySelectorAll('#dataTable tbody tr').forEach(tr => {
        let cliente = tr.children[1].textContent;
        const total = parseFloat(tr.children[7].textContent.replace(/\./g,'').replace(',','.')) || 0;
        if (!totalsByCliente[cliente]) totalsByCliente[cliente] = 0;
        totalsByCliente[cliente] += total;
    });

    const labels = Object.keys(totalsByCliente).map(name => {
        return name.replace(/^LOGISTICA\s+/i,'').split(' ').slice(0,1).join(' '); 
    });
    const data = Object.values(totalsByCliente);

    if (clienteChart) clienteChart.destroy();
    const ctx = document.getElementById('clienteChart').getContext('2d');
    clienteChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Total por Cliente',
                data,
                backgroundColor: '#007acc'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}



