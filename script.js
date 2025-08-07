// --- Parsear y formatear números ---
function parseNumber(str) {
  if (!str) return 0;
  return Number(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatNumber(num) {
  return num
    .toFixed(2) // fuerza 2 decimales
    .replace('.', ',') // cambia el punto decimal por coma
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // agrega puntos como separadores de miles
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

  for (let i = 0; i < filas.length; i++) {
    const celdas = filas[i].cells;
    const valorAnterior = parseNumber(celdas[1].textContent); // Gastos Mes Anterior
    let nuevoValor = valorAnterior;

    for (let mes = 1; mes <= 12; mes++) {
      nuevoValor = nuevoValor * (1 + inflacion[mes - 1]);
      celdas[mes + 1].textContent = formatNumber(nuevoValor); // columna 2 en adelante
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

    celda.addEventListener('blur', () => {
      let val = celda.textContent.trim().replace('%', '').replace(/[^\d,\.]/g, '');
      if (val === '') val = '0';
      val = val.replace('.', ',');
      celda.textContent = val + '%';
      guardarInflacionDesdeTabla();
      calcularPresupuesto();
      savePresupuestoBase();
    });

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
    if (datosGuardados[i - 1] !== undefined) {
      inflacionFila.cells[i].textContent = datosGuardados[i - 1].replace('.', ',') + '%';
    }
  }
}

// --- Presupuesto: permitir editar columna "Mes Anterior" ---
function habilitarGastoMesAnterior() {
  const tabla = document.getElementById('presupuesto-table');
  const filas = tabla.tBodies[0].rows;

  const saved = JSON.parse(localStorage.getItem('gastoMesAnterior')) || [];

  for (let i = 0; i < filas.length; i++) {
    const celda = filas[i].cells[1];
    celda.contentEditable = 'true';
    celda.title = "Editar gasto mes anterior";

    if (saved[i]) celda.textContent = saved[i];

    celda.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        celda.blur();
      }
    });

    celda.addEventListener('blur', () => {
      celda.textContent = formatCellValue(celda.textContent);
      savePresupuestoBase();
      calcularPresupuesto();
    });
  }
}

// --- Guardar columna "Gasto Mes Anterior" ---
function savePresupuestoBase() {
  const tabla = document.getElementById('presupuesto-table');
  const filas = tabla.tBodies[0].rows;
  const valores = [];

  for (let i = 0; i < filas.length; i++) {
    const celda = filas[i].cells[1];
    valores.push(celda.textContent);
  }

  localStorage.setItem('gastoMesAnterior', JSON.stringify(valores));
}

// --- Gastos reales editables ---
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
  calcularDiferencias(); // <-- Recalcular diferencias al guardar
}


// --- Inicialización ---
window.addEventListener('DOMContentLoaded', () => {
  cargarInflacionGuardada();
  habilitarEdicionInflacion();
  habilitarGastoMesAnterior();
  calcularPresupuesto();
  loadRealTable();
  calcularDiferencias(); // <-- Agregado para calcular diferencias al inicio
});


// --- Exportar e importar Excel (igual que antes) ---
document.getElementById('exportarExcel').addEventListener('click', () => {
  // ...
  // este bloque no cambió
});

document.getElementById('importarExcel').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', e => {
  // ...
  // este bloque tampoco cambió
});
function calcularDiferencias() {
  const tablaPresupuesto = document.getElementById('presupuesto-table');
  const tablaReal = document.getElementById('real-table');
  const tablaDiferencia = document.getElementById('diferencia-table');
  
  const filasPresupuesto = tablaPresupuesto.tBodies[0].rows;
  const filasReal = tablaReal.tBodies[0].rows;
  const filasDiferencia = tablaDiferencia.tBodies[0].rows;

  for (let i = 0; i < filasPresupuesto.length; i++) {
    const celdasPresupuesto = filasPresupuesto[i].cells;
    const celdasReal = filasReal[i].cells;
    const celdasDiferencia = filasDiferencia[i].cells;

    // Copiar nombre de cuenta
    celdasDiferencia[0].textContent = celdasPresupuesto[0].textContent;

    for (let mes = 1; mes <= 12; mes++) {
      const valPresupuesto = parseNumber(celdasPresupuesto[mes + 1].textContent);
      const valReal = parseNumber(celdasReal[mes].textContent);
      const diferencia = valPresupuesto - valReal;

      celdasDiferencia[mes].textContent = formatNumber(diferencia);

      // Limpiar clases anteriores
      celdasDiferencia[mes].classList.remove('positivo', 'negativo');

      if (diferencia > 0) {
        celdasDiferencia[mes].classList.add('positivo');
        celdasDiferencia[mes].style.backgroundColor = '#e6f4ea'; // verde tenue
      } else if (diferencia < 0) {
        celdasDiferencia[mes].classList.add('negativo');
        celdasDiferencia[mes].style.backgroundColor = '#fdecea'; // rojo tenue
      } else {
        celdasDiferencia[mes].style.backgroundColor = ''; // sin color
      }
    }
  }
}
if (diferencia > 0) {
  celdasDiferencia[mes].classList.add('positivo');
  celdasDiferencia[mes].classList.remove('negativo');
} else if (diferencia < 0) {
  celdasDiferencia[mes].classList.add('negativo');
  celdasDiferencia[mes].classList.remove('positivo');
} else {
  celdasDiferencia[mes].classList.remove('positivo');
  celdasDiferencia[mes].classList.remove('negativo');
}
