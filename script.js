let db;
const request = indexedDB.open("Gestor3DPrint", 1);

let paginaVentas = 0;
let paginaGastos = 0;
const porPagina = 3;

request.onupgradeneeded = event => {
    db = event.target.result;
    db.createObjectStore("ventas", { keyPath: "id", autoIncrement: true });
    db.createObjectStore("gastos", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = event => {
    db = event.target.result;
    cargarDatos();
    actualizarGraficoMensual();
};

document.getElementById("ventaForm").addEventListener("submit", e => {
    e.preventDefault();
    agregarVenta({
        producto: producto.value,
        precio: parseFloat(precioVenta.value),
        costo: parseFloat(costo.value),
        fecha: fechaVenta.value
    });
    e.target.reset();
});

document.getElementById("gastoForm").addEventListener("submit", e => {
    e.preventDefault();
    agregarGasto({
        categoria: categoria.value,
        descripcion: descripcion.value,
        monto: parseFloat(monto.value),
        fecha: fechaGasto.value
    });
    e.target.reset();
});

function agregarVenta(venta) {
    const tx = db.transaction("ventas", "readwrite");
    tx.objectStore("ventas").add(venta);
    tx.oncomplete = () => {
        paginaVentas = 0;
        cargarDatos();
    };
}

function agregarGasto(gasto) {
    const tx = db.transaction("gastos", "readwrite");
    tx.objectStore("gastos").add(gasto);
    tx.oncomplete = () => {
        paginaGastos = 0;
        cargarDatos();
    };
}

function cargarDatos() {
    let ingresos = 0, gastos = 0, ganancia = 0;
    const ventas = [];
    const gastosList = [];
    const mesActual = new Date().toISOString().slice(0, 7);

    const tx1 = db.transaction("ventas");
    tx1.objectStore("ventas").getAll().onsuccess = e => {
        e.target.result.forEach(v => {
            if (v.fecha.startsWith(mesActual)) {
                ventas.push(v);
                ingresos += v.precio;
                ganancia += (v.precio - v.costo);
            }
        });

        actualizarTabla("tablaVentas", ventas, paginaVentas);
        actualizarResumen(ingresos, gastos, ganancia);
        actualizarGrafico(ingresos, gastos, ganancia);
    };

    const tx2 = db.transaction("gastos");
    tx2.objectStore("gastos").getAll().onsuccess = e => {
        e.target.result.forEach(g => {
            if (g.fecha.startsWith(mesActual)) {
                gastosList.push(g);
                gastos += g.monto;
            }
        });

        actualizarTabla("tablaGastos", gastosList, paginaGastos);
        actualizarResumen(ingresos, gastos, ganancia);
        actualizarGrafico(ingresos, gastos, ganancia);
    };
}

function actualizarResumen(ingresos, gastos, ganancia) {
    const opcionesFormato = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

    document.getElementById("ingresos").textContent = ingresos.toLocaleString('es-AR', opcionesFormato);
    document.getElementById("gastos").textContent = gastos.toLocaleString('es-AR', opcionesFormato);
    document.getElementById("ganancia").textContent = ganancia.toLocaleString('es-AR', opcionesFormato);

    document.getElementById("rentabilidad").textContent = ingresos
        ? Math.round(ganancia * 100 / ingresos).toLocaleString('es-AR') + "%"
        : "0%";

    document.getElementById("recomendacion").textContent = (ganancia / ingresos < 0.3)
        ? "🔺 Considerá subir precios"
        : "✅ Rentabilidad saludable";
}


function actualizarTabla(tablaId, datos, pagina) {
    const tbody = document.querySelector(`#${tablaId} tbody`);
    tbody.innerHTML = "";

    const inicio = pagina * porPagina;
    const paginados = datos.slice().reverse().slice(inicio, inicio + porPagina);

    paginados.forEach(d => {
        const tr = document.createElement("tr");
        if (tablaId === "tablaVentas") {
            tr.innerHTML = `<td>${d.producto}</td><td>$${d.precio}</td><td>$${d.costo}</td><td>${d.fecha}</td>`;
        } else {
            tr.innerHTML = `<td>${d.categoria}</td><td>${d.descripcion}</td><td>$${d.monto}</td><td>${d.fecha}</td>`;
        }
        tbody.appendChild(tr);
    });
}

// Paginas de ventas/gastos
document.getElementById("prevVentas").addEventListener("click", () => {
    if (paginaVentas > 0) {
        paginaVentas--;
        cargarDatos();
    }
});

document.getElementById("nextVentas").addEventListener("click", () => {
    paginaVentas++;
    cargarDatos();
});

document.getElementById("prevGastos").addEventListener("click", () => {
    if (paginaGastos > 0) {
        paginaGastos--;
        cargarDatos();
    }
});

document.getElementById("nextGastos").addEventListener("click", () => {
    paginaGastos++;
    cargarDatos();
});

// Backup de la DB
function exportarBackup() {
    const exportData = { ventas: [], gastos: [] };
    const tx1 = db.transaction("ventas");
    tx1.objectStore("ventas").getAll().onsuccess = e => {
        exportData.ventas = e.target.result;
        const tx2 = db.transaction("gastos");
        tx2.objectStore("gastos").getAll().onsuccess = e2 => {
            exportData.gastos = e2.target.result;
            const blob = new Blob([JSON.stringify(exportData)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const fecha = new Date().toISOString().split("T")[0];
            a.download = `backup_3dprint_${fecha}.json`;
            a.click();
        };
    };
}
function cargarBackup() {
    const fileInput = document.getElementById("archivoBackup");
    const file = fileInput.files[0];
    if (!file) {
        alert("Seleccioná un archivo primero.");
        return;
    }

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            const tx1 = db.transaction("ventas", "readwrite");
            const store1 = tx1.objectStore("ventas");
            data.ventas.forEach(v => store1.put(v));

            const tx2 = db.transaction("gastos", "readwrite");
            const store2 = tx2.objectStore("gastos");
            data.gastos.forEach(g => store2.put(g));

            let completados = 0;
            const checkAndLoad = () => {
                completados++;
                if (completados === 2) {
                    cargarDatos();
                    actualizarGraficoMensual();
                    alert("✅ Datos del backup cargados correctamente.");
                }
            };

            tx1.oncomplete = checkAndLoad;
            tx2.oncomplete = checkAndLoad;
        } catch (err) {
            alert("❌ Error al leer el archivo. ¿Está en formato correcto?");
        }
    };
    reader.readAsText(file);
}

// gráficos
let chart;

function actualizarGrafico(ingresos, gastos, ganancia) {
    const ctx = document.getElementById("graficoResumen").getContext("2d");
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ["Ingresos", "Gastos", "Ganancia"],
            datasets: [{
                label: "Resumen mensual",
                backgroundColor: ["#3498db", "#e74c3c", "#2ecc71"],
                data: [ingresos, gastos, ganancia]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: context => {
                            let valor = context.raw.toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            });
                            return `$${valor}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: val => {
                            return `$${val.toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`;
                        }
                    }
                }
            }
        }
    });
}

let graficoMensual;
function actualizarGraficoMensual() {
    const ventasPorMes = Array(12).fill(0);
    const gastosPorMes = Array(12).fill(0);
    const gananciasPorMes = Array(12).fill(0);

    const promesas = [
        new Promise(resolve => {
            const tx = db.transaction("ventas");
            tx.objectStore("ventas").getAll().onsuccess = e => {
                e.target.result.forEach(v => {
                    const mes = new Date(v.fecha).getMonth();
                    ventasPorMes[mes] += v.precio;
                    gananciasPorMes[mes] += (v.precio - v.costo);
                });
                resolve();
            };
        }),
        new Promise(resolve => {
            const tx = db.transaction("gastos");
            tx.objectStore("gastos").getAll().onsuccess = e => {
                e.target.result.forEach(g => {
                    const mes = new Date(g.fecha).getMonth();
                    gastosPorMes[mes] += g.monto;
                });
                resolve();
            };
        })
    ];

    Promise.all(promesas).then(() => {
        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        const data = {
            labels: meses,
            datasets: [
                {
                    label: "Ventas",
                    data: ventasPorMes,
                    borderColor: "#27ae60",
                    backgroundColor: "rgba(39, 174, 96, 0.2)",
                    fill: true
                },
                {
                    label: "Gastos",
                    data: gastosPorMes,
                    borderColor: "#e74c3c",
                    backgroundColor: "rgba(231, 76, 60, 0.2)",
                    fill: true
                },
                {
                    label: "Ganancia",
                    data: gananciasPorMes,
                    borderColor: "#2980b9",
                    backgroundColor: "rgba(41, 128, 185, 0.2)",
                    fill: true
                }
            ]
        };

        if (graficoMensual) {
            graficoMensual.data = data;
            graficoMensual.update();
        } else {
            graficoMensual = new Chart(document.getElementById("graficoMensual"), {
                type: "line",
                data: data,
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: "top" },
                        title: { display: false },
                        tooltip: {
                            callbacks: {
                                label: context => {
                                    const label = context.dataset.label || "";
                                    const value = context.raw;
                                    return `${label}: $${value.toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: val => `$${val.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}`
                            }
                        }
                    }
                }
            });
        }
    });
}



function resetearDatos() {
    if (!confirm("¿Estás seguro de que querés borrar TODOS los datos? Esta acción no se puede deshacer.")) return;

    const tx1 = db.transaction("ventas", "readwrite");
    tx1.objectStore("ventas").clear();

    const tx2 = db.transaction("gastos", "readwrite");
    tx2.objectStore("gastos").clear();

    let completados = 0;
    const check = () => {
        completados++;
        if (completados === 2) {
            cargarDatos();
            actualizarGraficoMensual();
            alert("✅ Todos los datos fueron eliminados correctamente.");
        }
    };

    tx1.oncomplete = check;
    tx2.oncomplete = check;
}
