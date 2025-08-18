// --- Funciones de parseo y formateo ---
function parseNumber(str) {
  if (!str) return 0;
  return Number(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatNumber(num) {
  return Number(num || 0)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// --- Inflación ---
function saveInflacion(data) { localStorage.setItem('inflacionProyectada', JSON.stringify(data)); }
function loadInflacion() { return JSON.parse(localStorage.getItem('inflacionProyectada')) || null; }

function getInflacionMeses() {
  const inflacionFila = document.querySelector('#premisas-table tbody tr:first-child');
  const inflacionValores = [];
  for (let i = 1; i < inflacionFila.cells.length; i++) {
    let val = inflacionFila.cells[i].textContent.trim().replace('%','').replace(',', '.');
    inflacionValores.push(parseFloat(val)/100);
  }
  return inflacionValores;
}

function calcularPresupuesto() {
  const filas = document.querySelectorAll('#presupuesto-table tbody tr');
  const inflacion = getInflacionMeses();
  filas.forEach(fila => {
    const celdas = fila.cells;
    let nuevoValor = parseNumber(celdas[1].textContent); // Mes Anterior
    for (let mes = 1; mes <= 12; mes++) {
      nuevoValor = nuevoValor * (1 + inflacion[mes-1]);
      celdas[mes+1].textContent = formatNumber(nuevoValor); // escribe Enero..Dic
    }
  });

  // actualizar totales de presupuesto
  actualizarTotalesPresupuesto();
  // recalcular diferencias
  calcularDiferencias();
}

function habilitarEdicionInflacion() {
  const inflacionFila = document.querySelector('#premisas-table tbody tr:first-child');
  for (let i=1;i<inflacionFila.cells.length;i++) {
    const celda = inflacionFila.cells[i];
    celda.contentEditable='true';
    celda.title="Editar inflación (%)";
    celda.addEventListener('blur',()=>{
      let val = celda.textContent.trim().replace('%','').replace(/[^\d,\.]/g,'');
      if(val==='') val='0';
      celda.textContent = val.replace('.',',')+'%';
      guardarInflacionDesdeTabla();
      calcularPresupuesto();
      savePresupuestoBase();
    });
    celda.addEventListener('keydown', e=>{ if(e.key==='Enter'){e.preventDefault(); celda.blur();}});
  }
}

function guardarInflacionDesdeTabla() {
  const inflacionFila = document.querySelector('#premisas-table tbody tr:first-child');
  const datos = [];
  for(let i=1;i<inflacionFila.cells.length;i++){
    let val = inflacionFila.cells[i].textContent.trim().replace('%','').replace(',', '.');
    datos.push(val);
  }
  saveInflacion(datos);
}

function cargarInflacionGuardada() {
  const datos = loadInflacion();
  if(!datos) return;
  const inflacionFila = document.querySelector('#premisas-table tbody tr:first-child');
  for(let i=1;i<inflacionFila.cells.length;i++){
    if(datos[i-1]!==undefined)
      inflacionFila.cells[i].textContent = datos[i-1].replace('.',',')+'%';
  }
}

// --- Presupuesto Mes Anterior ---
function habilitarGastoMesAnterior() {
  const filas = document.querySelectorAll('#presupuesto-table tbody tr');
  const saved = JSON.parse(localStorage.getItem('gastoMesAnterior'))||[];
  filas.forEach((fila,i)=>{
    const celda=fila.cells[1];
    celda.contentEditable='true';
    celda.title="Editar gasto mes anterior";
    if(saved[i]) celda.textContent=saved[i];
    celda.addEventListener('keydown', e=>{ if(e.key==='Enter'){e.preventDefault(); celda.blur();}});
    celda.addEventListener('blur', ()=>{
      celda.textContent=formatCellValue(celda.textContent);
      savePresupuestoBase();
      calcularPresupuesto();
    });
  });
}

function savePresupuestoBase() {
  const filas = document.querySelectorAll('#presupuesto-table tbody tr');
  const valores = Array.from(filas).map(f=>f.cells[1].textContent);
  localStorage.setItem('gastoMesAnterior', JSON.stringify(valores));
}

// --- Gastos Reales ---
function formatCellValue(value) {
  let num = parseFloat(value.replace(/\./g,'').replace(',', '.'));
  if(isNaN(num)) return '';
  return num.toLocaleString('es-AR',{minimumFractionDigits:2, maximumFractionDigits:2});
}

const realTable = document.querySelector('#real-table tbody');

function loadRealTable(){
  const saved = JSON.parse(localStorage.getItem('gastosReales'))||[];
  Array.from(realTable.rows).forEach((row,i)=>{
    Array.from(row.cells).forEach((cell,j)=>{
      if(j>0 && j<=12){ // solo meses editables
        cell.contentEditable='true';
        if(saved[i]&&saved[i][j]) cell.textContent=saved[i][j];
        cell.addEventListener('keydown', e=>{if(e.key==='Enter'){e.preventDefault(); cell.blur();}});
        cell.addEventListener('blur', ()=>{
          cell.textContent=formatCellValue(cell.textContent);
          saveRealTable();
          actualizarTotalesReales();
        });
      }
    });
  });

  // actualizar totales al cargar
  actualizarTotalesReales();
}

function saveRealTable(){
  // guardar solo meses 1..12
  const data = Array.from(realTable.rows).map(row=>{
    const arr = [];
    for(let j=1;j<=12;j++){
      arr[j] = row.cells[j].textContent;
    }
    return arr;
  });
  localStorage.setItem('gastosReales', JSON.stringify(data));
  calcularDiferencias();
}

// --- Totales por tabla ---
function actualizarTotalesPresupuesto(){
  const filas = document.querySelectorAll('#presupuesto-table tbody tr');
  filas.forEach(fila=>{
    const celdas = fila.cells;
    let suma = 0;
    // sumar Enero..Diciembre (índices 2..13)
    for(let j=2;j<=13;j++){
      suma += parseNumber(celdas[j].textContent);
    }
    const idxTotal = celdas.length - 1; // última celda
    celdas[idxTotal].textContent = formatNumber(suma);
  });
}

function actualizarTotalesReales(){
  const filas = document.querySelectorAll('#real-table tbody tr');
  filas.forEach(fila=>{
    const celdas = fila.cells;
    let suma = 0;
    // meses 1..12
    for(let j=1;j<=12;j++){
      suma += parseNumber(celdas[j].textContent);
    }
    const idxTotal = celdas.length - 1;
    celdas[idxTotal].textContent = formatNumber(suma);
  });
}

// --- Diferencias ---
function calcularDiferencias() {
  const filasPresupuesto = document.querySelectorAll('#presupuesto-table tbody tr');
  const filasReal = document.querySelectorAll('#real-table tbody tr');
  const filasDif = document.querySelectorAll('#diferencia-table tbody tr');

  filasPresupuesto.forEach((filaPres,i)=>{
    const filaReal = filasReal[i];
    const filaDif = filasDif[i];
    filaDif.cells[0].textContent = filaPres.cells[0].textContent;

    let suma = 0;
    for(let mes=1;mes<=12;mes++){
      const valPres=parseNumber(filaPres.cells[mes+1].textContent); // 2..13
      const valReal=parseNumber(filaReal.cells[mes].textContent);   // 1..12
      const dif=valPres-valReal;
      suma += dif;

      filaDif.cells[mes].textContent=formatNumber(dif);
      filaDif.cells[mes].style.backgroundColor=dif>0?'#d0f0c0':dif<0?'#f8d7da':'';
    }

    // escribir total de diferencias (última celda)
    const idxTotal = filaDif.cells.length - 1;
    filaDif.cells[idxTotal].textContent = formatNumber(suma);
    filaDif.cells[idxTotal].style.backgroundColor = suma>0?'#d0f0c0':suma<0?'#f8d7da':'';
  });
}

// --- Comentarios por mes ---
const listaComentarios = document.getElementById('lista-comentarios');
const selectMes = document.getElementById('mes-comentario');

function cargarComentarios(){
  const mes = selectMes.value;
  listaComentarios.innerHTML = localStorage.getItem(`comentarios-${mes}`)||'';
  Array.from(listaComentarios.children).forEach(li=>{
    li.contentEditable='true';
    li.addEventListener('blur', guardarComentarios);
  });
}

function guardarComentarios(){
  const mes = selectMes.value;
  localStorage.setItem(`comentarios-${mes}`, listaComentarios.innerHTML);
}

selectMes.addEventListener('change', cargarComentarios);

document.getElementById('agregar-comentario').addEventListener('click',()=>{
  const li=document.createElement('li');
  li.textContent="Nuevo comentario";
  li.contentEditable='true';
  li.style.padding="5px"; li.style.border="1px solid #ccc"; li.style.marginBottom="4px";
  li.addEventListener('blur', guardarComentarios);
  listaComentarios.appendChild(li);
  guardarComentarios();
});

document.getElementById('eliminar-comentario').addEventListener('click',()=>{
  if(listaComentarios.lastElementChild) listaComentarios.removeChild(listaComentarios.lastElementChild);
  guardarComentarios();
});

listaComentarios.addEventListener('input', guardarComentarios);

// --- Inicialización ---
window.addEventListener('DOMContentLoaded', ()=>{
  cargarInflacionGuardada();
  habilitarEdicionInflacion();
  habilitarGastoMesAnterior();
  calcularPresupuesto();      // esto también actualiza totales y diferencias
  loadRealTable();            // setea editables y totales en reales
  calcularDiferencias();      // asegura inicial
  cargarComentarios();
});

// --- Exportar configuración ---
document.getElementById('export-config').addEventListener('click', () => {
  const dataStr = JSON.stringify(localStorage, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "Presupuesto.json"; // se mantiene como lo tenías
  a.click();
  URL.revokeObjectURL(url);
});

// --- Importar configuración ---
document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-config').click();
});

document.getElementById('import-config').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const importedData = JSON.parse(event.target.result);
      localStorage.clear();
      for(const key in importedData){
        localStorage.setItem(key, importedData[key]);
      }
      alert("Configuración importada correctamente. Recarga la página.");
      location.reload();
    } catch(err) {
      alert("Error al importar la configuración: "+err);
    }
  };
  reader.readAsText(file);
});
