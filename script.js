// --- Parsear y formatear números ---
function parseNumber(str) {
  if (!str) return 0;
  return Number(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatNumber(num) {
  return num
    .toFixed(2)
    .replace(/\d(?=(\d{3})+\.)/g, '$&.')
    .replace('.', ',');
}

// --- Guardar / Cargar inflación editable ---
function saveInflacion(data) {
  localStorage.setItem('inflacionProyectada', JSON.stringify(data));
}

function loadInflacion() {
  return JSON.parse(localStorage.getItem('inflacionProyectada')) || null;
}

// --- Leer inflación desde tabla (editable) ---
function getInflacionMeses() {
  const premisasTable = document.getElementById('premisas-table');
  const inflacionFila = premisasTable.querySelectorAll('tbody tr')[0];
  const inflacionValores = [];

  for (let i = 1; i < inflacionFila.cells.length; i++) {
    let val = inflacionFila.cells[i].textContent.trim().replace('%', '').replace(',', '.');
    inflacionValores.push(parseFloat(val) / 100);
  }
  return inflacionValores;
}

// --- Aplicar inflación al presupuesto ---
function calcularPresupuesto() {
  const tabla = document.getElementById('presupuesto-table');
  const filas = tabla.tBodies[0].rows;
  const inflacion = getInflacionMeses();

  for (let fila of filas) {
    const celdas = fila.cells;
    let valorAnterior = parseNumber(celdas[1].textContent); // Enero fijo
    for (let mes = 2; mes <= 12; mes++) {
      let valorCalculado = valorAnterior * (1 + inflacion[mes - 1]);
      celdas[mes].textContent = formatNumber(valorCalculado);
      valorAnterior = valorCalculado;
    }
  }
}

// --- Hacer editable la fila inflación ---
function habilitarEdicionInflacion() {
  const premisasTable = document.getElementById('premisas-table');
  const inflacionFila = premisasTable.querySelectorAll('tbody tr')[0];

  for (let i = 1; i < inflacionFila.cells.length; i++) {
    const celda = inflacionFila.cells[i];
    celda.contentEditable = 'true';
    celda.title = "Editar inflación (%)";

    // Evento para validar y recalcular al perder foco
    celda.addEventListener('blur', () => {
      // Limpiar y validar input: permitir números y coma
      let val = celda.textContent.trim().replace('%', '').replace(/[^\d,\.]/g, '');
      if (val === '') val = '0';
      // Reemplazar punto por coma si hay, y asegurar formato
      val = val.replace('.', ',');
      celda.textContent = val + '%';

      // Guardar inflación modificada en localStorage
      guardarInflacionDesdeTabla();

      // Recalcular presupuesto
      calcularPresupuesto();
    });

    // Al presionar Enter, quitar foco para disparar blur
    celda.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        celda.blur();
      }
    });
  }
}

// --- Guardar inflación editada desde la tabla ---
function guardarInflacionDesdeTabla() {
  const premisasTable = document.getElementById('premisas-table');
  const inflacionFila = premisasTable.querySelectorAll('tbody tr')[0];
  const datosInflacion = [];

  for (let i = 1; i < inflacionFila.cells.length; i++) {
    let val = inflacionFila.cells[i].textContent.trim().replace('%', '').replace(',', '.');
    datosInflacion.push(val);
  }

  saveInflacion(datosInflacion);
}

// --- Cargar inflación guardada y actualizar tabla ---
function cargarInflacionGuardada() {
  const datosGuardados = loadInflacion();
  if (!datosGuardados) return;

  const premisasTable = document.getElementById('premisas-table');
  const inflacionFila = premisasTable.querySelectorAll('tbody tr')[0];

  for (let i = 1; i < inflacionFila.cells.length; i++) {
    if (datosGuardados[i-1] !== undefined) {
      inflacionFila.cells[i].textContent = datosGuardados[i-1].replace('.', ',') + '%';
    }
  }
}

// --- Gastos reales editables (igual que antes) ---
const realTable = document.querySelector('#real-table tbody');

function formatCellValue(value) {
  let num = parseFloat(value.replace(/\./g, '').replace(',', '.'));
  if (isNaN(num)) return '';
  return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function handleCellEdit(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const cell = e.target;
    cell.textContent = formatCellValue(cell.textContent);
    saveRealTable();
  }
}

function loadRealTable() {
  const saved = JSON.parse(localStorage.getItem('gastosReales')) || [];
  const rows = realTable.rows;
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].cells;
    for (let j = 1; j < cells.length; j++) {
      cells[j].contentEditable = 'true';
      if (saved[i] && saved[i][j]) cells[j].textContent = saved[i][j];
      cells[j].addEventListener('keydown', handleCellEdit);
      cells[j].addEventListener('blur', () => {
        cells[j].textContent = formatCellValue(cells[j].textContent);
        saveRealTable();
      });
    }
  }
}

function saveRealTable() {
  const rows = realTable.rows;
  const data = [];
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].cells;
    data[i] = [];
    for (let j = 1; j < cells.length; j++) {
      data[i][j] = cells[j].textContent;
    }
  }
  localStorage.setItem('gastosReales', JSON.stringify(data));
}

// --- Inicialización ---
window.addEventListener('DOMContentLoaded', () => {
  cargarInflacionGuardada();
  habilitarEdicionInflacion();
  calcularPresupuesto();
  loadRealTable();
});
