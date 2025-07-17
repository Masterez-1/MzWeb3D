const simbolo = 'ARS $';
const valoresReferencia = {
  precioKg: 20000,
  precioKwh: 140,
  precioRepuestos: 50000,
  insumos: 0
};

function calcular() {
  const precioKg = parseFloat(document.getElementById("precioKg").value);
  const precioKwh = parseFloat(document.getElementById("precioKwh").value);
  const consumo = parseFloat(document.getElementById("consumo").value);
  const desgasteHoras = parseFloat(document.getElementById("desgasteHoras").value);
  const precioRepuestos = parseFloat(document.getElementById("precioRepuestos").value);
  const margenErrorPct = parseFloat(document.getElementById("margenError").value) / 100;

  const horas = parseFloat(document.getElementById("horasImpresionHoras").value || 0);
  const minutos = parseFloat(document.getElementById("horasImpresionMinutos").value || 0);
  const tiempoHoras = horas + minutos / 60;

  const gramos = parseFloat(document.getElementById("gramosFilamento").value);
  const insumos = parseFloat(document.getElementById("insumos").value) || 0;
  const ganancia = parseFloat(document.getElementById("ganancia").value);

  const precioMaterial = (precioKg / 1000) * gramos;
  const precioLuz = ((consumo / 1000) * precioKwh) * tiempoHoras;
  const desgasteMaquina = (precioRepuestos / desgasteHoras) * tiempoHoras;
  const margenDeError = (precioMaterial + precioLuz) * margenErrorPct;
  const costoLuzYMaterial = precioMaterial + precioLuz;
  const costoTotal = costoLuzYMaterial + desgasteMaquina + margenDeError;
  const totalCobrar = (costoTotal * ganancia) + insumos * 1.3;
  const precioML = totalCobrar + (costoTotal * 0.8);

  let resultadoHTML = `
    <div class="result-line"><span>Precio Material:</span><span>${simbolo} ${precioMaterial.toFixed(2)}</span></div>
    <div class="result-line"><span>Precio Luz:</span><span>${simbolo} ${precioLuz.toFixed(2)}</span></div>
    <div class="result-line"><span>Desgaste Máquina:</span><span>${simbolo} ${desgasteMaquina.toFixed(2)}</span></div>
    <div class="result-line"><span>Margen de Error:</span><span>${simbolo} ${margenDeError.toFixed(2)}</span></div>
    <div class="result-line"><span>INSUMOS:</span><span>${simbolo} ${insumos.toFixed(2)}</span></div>
    <div class="result-line highlight"><span>Costo Luz y Material:</span><span>${simbolo} ${costoLuzYMaterial.toFixed(2)}</span></div>
    <div class="result-line costo"><span>Costo Total (incluye insumos):</span><span>${simbolo} ${costoTotal.toFixed(2)}</span></div>
    <div class="result-line total"><span>TOTAL A COBRAR:</span><span>${simbolo} ${totalCobrar.toFixed(2)}</span></div>
    <div class="result-line ml"><span>PRECIO MERCADOLIBRE:</span><span>${simbolo} ${precioML.toFixed(2)}</span></div>
  `;

  document.getElementById("resultados").innerHTML = resultadoHTML;
}

function inicializarValores() {
  document.getElementById("precioKg").value = valoresReferencia.precioKg;
  document.getElementById("precioKwh").value = valoresReferencia.precioKwh;
  document.getElementById("precioRepuestos").value = valoresReferencia.precioRepuestos;
  document.getElementById("insumos").value = valoresReferencia.insumos;

  calcular();
}

window.onload = inicializarValores;
