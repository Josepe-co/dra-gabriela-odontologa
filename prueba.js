/* ═══════════════════════════════════════════════════════════
   DRA. GABRIELA — PANEL PRUEBA (solo memoria RAM)
   Clón exacto de admin.js SIN Firebase.
   Los datos solo existen mientras la pestaña esté abierta.
═══════════════════════════════════════════════════════════ */
"use strict";

/* ─── NÚMERO DE WHATSAPP DE LA DOCTORA ──────────────────── */
const DOCTOR_WA = "5219611354691";

/* ═══════════════════════════════════════════════════════════
   MODO PRUEBA — Sin Firebase, solo memoria RAM
   No se lee ni escribe ninguna base de datos real.
═══════════════════════════════════════════════════════════ */

/* ─── UUID simple ────────────────────────────────────────── */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ─── Arrays en memoria (se borran al cerrar o recargar) ─── */
let citas     = [];
let pacientes = [];

/* ─── No-ops: las "helper" de Firebase no hacen nada ──────── */
function _saveCita(cita)         { /* PRUEBA: solo RAM, sin Firebase */ }
function _updateCita(id, fields) { /* PRUEBA: solo RAM, sin Firebase */ }
function _deleteCita(id)         { /* PRUEBA: solo RAM, sin Firebase */ }
function _savePaciente(pac)      { /* PRUEBA: solo RAM, sin Firebase */ }

/* ═══════════════════════════════════════════════════════════
   CALENDARIO — Estado
═══════════════════════════════════════════════════════════ */
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-based
let selectedDate = null;             // "YYYY-MM-DD"
let citaEnEdicion = null;            // id de la cita abierta en el modal de detalle

/* ─ Meses y días en español ─ */
const MESES_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];
const DIAS_ES_LARGO = [
  "domingo","lunes","martes","miércoles","jueves","viernes","sábado"
];
const DIAS_ES_SEMANA = ["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"];

/* ─ Vista del calendario ─ */
let vistaCalendario = "mes"; // "mes" | "semana"
let semanaActual    = new Date(); // cualquier día de la semana a mostrar

/* ═══════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════ */
const toastEl  = document.getElementById("toast");
const toastMsg = document.getElementById("toastMsg");
let toastTimer = null;

function showToast(msg, duration = 2800) {
  toastMsg.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), duration);
}


/* ═══════════════════════════════════════════════════════════
   NAVEGACIÓN DE VISTAS
═══════════════════════════════════════════════════════════ */
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    btn.classList.add("active");
    const vista = btn.dataset.view;
    document.getElementById(`view-${vista}`).classList.add("active");

    // Cerrar sidebar móvil
    document.getElementById("sidebar").classList.remove("open");

    // Renderizar la vista correspondiente
    if (vista === "pacientes")  renderPacientes();
    if (vista === "ingresos")   renderIngresos("dia");
    if (vista === "reportes")   inicializarReportes();
  });
});

/* Topbar hamburguesa móvil */
document.getElementById("topbarHamburger").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});


/* ─ Renderiza la vista activa (mes o semana) ─────────────── */
function reRenderCalendario() {
  if (vistaCalendario === "semana") renderSemana(); else renderCalendario();
}

/* ─ Renderizado ─────────────────────────────────── */
function renderCalendario() {
  const grid     = document.getElementById("calGrid");
  const titulo   = document.getElementById("calMesTitulo");
  titulo.textContent = `${MESES_ES[calMonth]} ${calYear}`;
  grid.innerHTML = "";

  const primerDia  = new Date(calYear, calMonth, 1).getDay();
  const diasMes    = new Date(calYear, calMonth + 1, 0).getDate();
  const hoy        = new Date();
  const hoyStr     = fechaStr(hoy);

  // Celdas de días previos del mes anterior
  const diasPrevios = primerDia;
  const diasMesAnt  = new Date(calYear, calMonth, 0).getDate();
  for (let i = diasPrevios - 1; i >= 0; i--) {
    const d   = diasMesAnt - i;
    const mes = calMonth === 0 ? 11 : calMonth - 1;
    const anio= calMonth === 0 ? calYear - 1 : calYear;
    grid.appendChild(crearCeldaDia(d, anio, mes, true));
  }

  // Días del mes actual
  for (let d = 1; d <= diasMes; d++) {
    const cell = crearCeldaDia(d, calYear, calMonth, false);
    const dStr = fechaStr(new Date(calYear, calMonth, d));

    if (dStr === hoyStr)       cell.classList.add("hoy");
    if (dStr === selectedDate) cell.classList.add("selected");

    cell.addEventListener("click", () => seleccionarDia(dStr, d));
    grid.appendChild(cell);
  }

  // Completar hasta 42 celdas (6 filas × 7)
  const totalCeldas = grid.children.length;
  const restantes   = totalCeldas < 35 ? 35 - totalCeldas : (42 - totalCeldas);
  for (let d = 1; d <= restantes; d++) {
    const mes = calMonth === 11 ? 0 : calMonth + 1;
    const anio= calMonth === 11 ? calYear + 1 : calYear;
    grid.appendChild(crearCeldaDia(d, anio, mes, true));
  }
}

function crearCeldaDia(dia, anio, mes, otroMes) {
  const cell = document.createElement("div");
  cell.className = "cal-day" + (otroMes ? " otro-mes" : "");
  const dStr = fechaStr(new Date(anio, mes, dia));

  const numEl = document.createElement("span");
  numEl.className = "cal-day-num";
  numEl.textContent = dia;
  cell.appendChild(numEl);

  // Mostrar hasta 2 citas del día
  const citasDia = citas.filter(c => c.fecha === dStr)
    .sort((a,b) => a.hora.localeCompare(b.hora));

  const badgesEl = document.createElement("div");
  badgesEl.className = "cal-day-citas";

  citasDia.slice(0, 2).forEach(c => {
    const b = document.createElement("span");
    b.className = `cita-badge-cal ${c.estado || "pendiente"}`;
    b.textContent = `${c.hora} ${c.pacienteNombre.split(" ")[0]}`;
    badgesEl.appendChild(b);
  });
  if (citasDia.length > 2) {
    const mas = document.createElement("span");
    mas.className = "citas-mas";
    mas.textContent = `+${citasDia.length - 2} más`;
    badgesEl.appendChild(mas);
  }
  cell.appendChild(badgesEl);
  return cell;
}

function seleccionarDia(dStr, numDia) {
  selectedDate = dStr;
  renderCalendario(); // Re-renderiza para mostrar el selected
  abrirDayPanel(dStr);
}

/* ─ Navegación mes/semana ───────────────────────────────── */
document.getElementById("calPrev").addEventListener("click", () => {
  if (vistaCalendario === "mes") {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendario();
  } else {
    semanaActual = new Date(semanaActual);
    semanaActual.setDate(semanaActual.getDate() - 7);
    renderSemana();
  }
});
document.getElementById("calNext").addEventListener("click", () => {
  if (vistaCalendario === "mes") {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendario();
  } else {
    semanaActual = new Date(semanaActual);
    semanaActual.setDate(semanaActual.getDate() + 7);
    renderSemana();
  }
});
document.getElementById("btnHoy").addEventListener("click", () => {
  const hoy    = new Date();
  calYear      = hoy.getFullYear();
  calMonth     = hoy.getMonth();
  selectedDate = fechaStr(hoy);
  semanaActual = new Date(hoy);
  if (vistaCalendario === "mes") renderCalendario();
  else renderSemana();
  abrirDayPanel(selectedDate);
});

/* ─ Toggle vista mes / semana ───────────────────────────── */
document.getElementById("btnVistaMes").addEventListener("click", () => {
  vistaCalendario = "mes";
  document.getElementById("btnVistaMes").classList.add("active");
  document.getElementById("btnVistaSemana").classList.remove("active");
  document.getElementById("calSemanaHeaderWrap").style.display = "";
  document.getElementById("calGrid").style.display = "";
  document.getElementById("semanaGrid").style.display = "none";
  renderCalendario();
});
document.getElementById("btnVistaSemana").addEventListener("click", () => {
  vistaCalendario = "semana";
  document.getElementById("btnVistaSemana").classList.add("active");
  document.getElementById("btnVistaMes").classList.remove("active");
  document.getElementById("calSemanaHeaderWrap").style.display = "none";
  document.getElementById("calGrid").style.display = "none";
  document.getElementById("semanaGrid").style.display = "";
  renderSemana();
});


/* ═══════════════════════════════════════════════════════════
   VISTA SEMANAL
═══════════════════════════════════════════════════════════ */
function renderSemana() {
  const grid   = document.getElementById("semanaGrid");
  const titulo = document.getElementById("calMesTitulo");
  const lunes  = getLunes(semanaActual);

  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  const mismoMes = lunes.getMonth() === domingo.getMonth();
  if (mismoMes) {
    titulo.textContent = `${MESES_ES[lunes.getMonth()]} ${lunes.getFullYear()} · Semana ${getNumeroSemana(lunes)}`;
  } else {
    titulo.textContent =
      `${lunes.getDate()} ${MESES_ES[lunes.getMonth()]} — ${domingo.getDate()} ${MESES_ES[domingo.getMonth()]} ${domingo.getFullYear()}`;
  }

  grid.innerHTML = "";
  const hoyStr = fechaStr(new Date());

  for (let i = 0; i < 7; i++) {
    const dia  = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    const dStr = fechaStr(dia);

    const citasDia = citas
      .filter(c => c.fecha === dStr)
      .sort((a, b) => a.hora.localeCompare(b.hora));

    const col = document.createElement("div");
    col.className = "semana-col" +
      (dStr === hoyStr      ? " semana-col-hoy"      : "") +
      (dStr === selectedDate ? " semana-col-selected" : "");

    col.innerHTML = `
      <div class="semana-col-header">
        <span class="semana-dia-nombre">${DIAS_ES_SEMANA[i]}</span>
        <span class="semana-dia-num">${dia.getDate()}</span>
      </div>
      <div class="semana-col-citas"></div>
    `;

    const citasContainer = col.querySelector(".semana-col-citas");
    if (citasDia.length === 0) {
      citasContainer.innerHTML = `<div class="semana-sin-citas">Sin citas</div>`;
    } else {
      citasDia.forEach(c => {
        const card = document.createElement("div");
        card.className = `semana-cita-card ${c.estado || "pendiente"}`;
        card.innerHTML = `
          <div class="semana-cita-hora">🕐 ${formatHoraAmPm(c.hora)}</div>
          <div class="semana-cita-nombre">${c.pacienteNombre.split(" ")[0]}</div>
          <div class="semana-cita-motivo">${c.motivo}</div>
        `;
        card.addEventListener("click", e => { e.stopPropagation(); abrirDetalleCita(c.id); });
        citasContainer.appendChild(card);
      });
    }

    col.addEventListener("click", () => {
      selectedDate = dStr;
      renderSemana();
      abrirDayPanel(dStr);
    });

    grid.appendChild(col);
  }
}


/* ═══════════════════════════════════════════════════════════
   PANEL LATERAL DEL DÍA
═══════════════════════════════════════════════════════════ */
const dayPanel   = document.getElementById("dayPanel");
const dayPanelTitle = document.getElementById("dayPanelTitle");
const dayPanelCitas = document.getElementById("dayPanelCitas");

function abrirDayPanel(dStr) {
  const fecha = new Date(dStr + "T12:00:00");
  dayPanelTitle.textContent =
    `${DIAS_ES_LARGO[fecha.getDay()].replace(/^./, c => c.toUpperCase())} ${fecha.getDate()} de ${MESES_ES[fecha.getMonth()]} ${fecha.getFullYear()}`;

  const citasDia = citas
    .filter(c => c.fecha === dStr)
    .sort((a,b) => a.hora.localeCompare(b.hora));

  dayPanelCitas.innerHTML = "";

  if (citasDia.length === 0) {
    dayPanelCitas.innerHTML = `
      <div class="no-citas-msg">
        <span>📭</span>
        No hay citas agendadas para este día
      </div>`;
  } else {
    citasDia.forEach(c => {
      const item = document.createElement("div");
      item.className = `cita-panel-item ${c.estado || "pendiente"}`;
      item.innerHTML = `
        <div class="cita-panel-hora">🕐 ${c.hora}</div>
        <div class="cita-panel-nombre">${c.pacienteNombre}</div>
        <div class="cita-panel-motivo">🦷 ${c.motivo}</div>
        <div class="cita-panel-precio">💰 $${Number(c.precio).toLocaleString("es-MX")}</div>
      `;
      item.addEventListener("click", () => abrirDetalleCita(c.id));
      dayPanelCitas.appendChild(item);
    });
  }

  dayPanel.classList.add("open");
}

document.getElementById("btnCloseDayPanel").addEventListener("click", () => {
  dayPanel.classList.remove("open");
  selectedDate = null;
  reRenderCalendario();
});

/* Botón "Agendar cita este día" en el panel */
document.getElementById("btnAgendarDia").addEventListener("click", () => {
  abrirModalNuevaCita(selectedDate);
});

/* Botón "Nueva Cita" en el header */
document.getElementById("btnNuevaCitaTop").addEventListener("click", () => {
  abrirModalNuevaCita(null);
});


/* ═══════════════════════════════════════════════════════════
   MODAL NUEVA CITA
═══════════════════════════════════════════════════════════ */
const modalNuevaCita = document.getElementById("modalNuevaCita");

function abrirModalNuevaCita(fechaPrellena) {
  document.getElementById("formNuevaCita").reset();
  limpiarErroresForm();

  if (fechaPrellena) {
    document.getElementById("citaFecha").value = fechaPrellena;
  } else {
    document.getElementById("citaFecha").value = fechaStr(new Date());
  }

  document.getElementById("modalNuevaCitaTitulo").textContent = "Nueva Cita";
  citaEnEdicion = null;
  autocompleteList.classList.remove("open");

  modalNuevaCita.classList.add("open");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("citaPacienteNombre").focus(), 300);
}

function cerrarModalNuevaCita() {
  modalNuevaCita.classList.remove("open");
  document.body.style.overflow = "";
  autocompleteList.classList.remove("open");
}

document.getElementById("btnCerrarNuevaCita").addEventListener("click",   cerrarModalNuevaCita);
document.getElementById("btnCancelarNuevaCita").addEventListener("click", cerrarModalNuevaCita);
modalNuevaCita.addEventListener("click", e => { if (e.target === modalNuevaCita) cerrarModalNuevaCita(); });

/* ─ Autocomplete de pacientes ────────────────────────────── */
const inputNombreCita = document.getElementById("citaPacienteNombre");
const autocompleteList = document.getElementById("autocompleteList");

inputNombreCita.addEventListener("input", () => {
  const q = inputNombreCita.value.trim().toLowerCase();
  autocompleteList.innerHTML = "";
  if (q.length < 2) { autocompleteList.classList.remove("open"); return; }

  const matches = pacientes.filter(p =>
    p.nombre.toLowerCase().includes(q) || (p.telefono || "").includes(q)
  ).slice(0, 6);

  if (!matches.length) { autocompleteList.classList.remove("open"); return; }

  matches.forEach(p => {
    const li = document.createElement("li");
    li.className = "autocomplete-item";
    li.innerHTML = `<div>${p.nombre}</div><div class="ac-sub">📞 ${p.telefono || "—"} · ${p.edad ? p.edad + " años" : "edad no registrada"}</div>`;
    li.addEventListener("mousedown", () => {
      inputNombreCita.value = p.nombre;
      document.getElementById("citaEdad").value      = p.edad    || "";
      document.getElementById("citaTelefono").value  = p.telefono || "";
      autocompleteList.classList.remove("open");
    });
    autocompleteList.appendChild(li);
  });
  autocompleteList.classList.add("open");
});

document.addEventListener("click", e => {
  if (!inputNombreCita.contains(e.target)) autocompleteList.classList.remove("open");
});

/* ─ Submit del formulario de cita ────────────────────────── */
document.getElementById("formNuevaCita").addEventListener("submit", e => {
  e.preventDefault();

  const nombre   = document.getElementById("citaPacienteNombre").value.trim();
  const edad     = document.getElementById("citaEdad").value.trim();
  const telefono = document.getElementById("citaTelefono").value.trim();
  const fecha    = document.getElementById("citaFecha").value;
  const hora     = document.getElementById("citaHora").value;
  const precio   = document.getElementById("citaPrecio").value;
  const motivo   = document.getElementById("citaMotivo").value;
  const notas    = document.getElementById("citaNotas").value.trim();

  // Validación básica
  let valido = true;
  if (!nombre)  { marcarError("citaPacienteNombre"); valido = false; }
  if (!fecha)   { marcarError("citaFecha");          valido = false; }
  if (!hora)    { marcarError("citaHora");           valido = false; }
  if (!motivo)  { marcarError("citaMotivo");         valido = false; }

  if (!valido) return;

  // Guardar o actualizar paciente
  upsertPaciente({ nombre, edad: edad || null, telefono: telefono || null });

  if (citaEnEdicion) {
    // Editar cita existente
    const idx = citas.findIndex(c => c.id === citaEnEdicion);
    if (idx !== -1) {
      citas[idx] = { ...citas[idx], pacienteNombre: nombre, edad, telefono, fecha, hora, precio: precio || 0, motivo, notas };
      _saveCita(citas[idx]);
      showToast("Cita actualizada ✓");
    }
  } else {
    // Nueva cita
    const nuevaCita = {
      id: uid(),
      pacienteNombre: nombre,
      edad,
      telefono,
      fecha,
      hora,
      precio: precio || 0,
      motivo,
      notas,
      notasClinnicas: "",
      adjuntos: [],
      estado: "pendiente",
      creadaEn: new Date().toISOString(),
    };
    citas.push(nuevaCita);
    _saveCita(nuevaCita);
    showToast("Cita agendada ✓");

    // Abrir detalle inmediatamente
    cerrarModalNuevaCita();
    if (dayPanel.classList.contains("open")) abrirDayPanel(fecha);
    reRenderCalendario();
    setTimeout(() => abrirDetalleCita(nuevaCita.id), 300);
    return;
  }

  cerrarModalNuevaCita();
  if (dayPanel.classList.contains("open") && selectedDate) abrirDayPanel(selectedDate);
  reRenderCalendario();
});

function upsertPaciente({ nombre, edad, telefono }) {
  const idx = pacientes.findIndex(p => p.nombre.toLowerCase() === nombre.toLowerCase());
  let pac;
  if (idx !== -1) {
    if (edad)     pacientes[idx].edad     = edad;
    if (telefono) pacientes[idx].telefono = telefono;
    pac = pacientes[idx];
  } else {
    pac = { id: uid(), nombre, edad: edad || null, telefono: telefono || null, creadoEn: new Date().toISOString() };
    pacientes.push(pac);
  }
  _savePaciente(pac);
}


/* ═══════════════════════════════════════════════════════════
   MODAL DETALLE DE CITA
═══════════════════════════════════════════════════════════ */
const modalDetalle = document.getElementById("modalDetalleCita");

function abrirDetalleCita(citaId) {
  const cita = citas.find(c => c.id === citaId);
  if (!cita) return;
  citaEnEdicion = citaId;

  // Título
  document.getElementById("detalleTitulo").textContent =
    `${cita.pacienteNombre} — ${formatFechaLarga(cita.fecha)} ${cita.hora}`;

  // Info card
  const fecha = new Date(cita.fecha + "T12:00:00");
  document.getElementById("detalleInfoCard").innerHTML = `
    <div class="detalle-fila"><span class="df-label">👤 Paciente</span><span class="df-val">${cita.pacienteNombre}</span></div>
    <div class="detalle-fila"><span class="df-label">🎂 Edad</span><span class="df-val">${cita.edad || "—"} años</span></div>
    <div class="detalle-fila"><span class="df-label">📞 Teléfono</span><span class="df-val">${cita.telefono || "—"}</span></div>
    <div class="detalle-fila"><span class="df-label">📅 Fecha</span><span class="df-val">${formatFechaLarga(cita.fecha)}</span></div>
    <div class="detalle-fila"><span class="df-label">🕐 Hora</span><span class="df-val">${cita.hora}</span></div>
    <div class="detalle-fila"><span class="df-label">🦷 Motivo</span><span class="df-val">${cita.motivo}</span></div>
    <div class="detalle-fila"><span class="df-label">💰 Precio</span><span class="df-val">$${Number(cita.precio).toLocaleString("es-MX")}</span></div>
    ${cita.notas ? `<div class="detalle-fila"><span class="df-label">📝 Notas</span><span class="df-val">${cita.notas}</span></div>` : ""}
  `;

  // Notas clínicas
  document.getElementById("notasClinnicas").value = cita.notasClinnicas || "";

  // Estado
  actualizarBotonesEstado(cita.estado || "pendiente");

  // Adjuntos
  renderAdjuntos(cita.adjuntos || []);

  // Botones WhatsApp
  document.getElementById("btnWaConfirmar").onclick   = () => enviarWaConfirmacion(cita);
  document.getElementById("btnWaRecordatorio").onclick = () => enviarWaRecordatorio(cita);

  // Guardar notas
  document.getElementById("btnGuardarNotas").onclick = () => {
    const idx = citas.findIndex(c => c.id === citaId);
    if (idx !== -1) {
      citas[idx].notasClinnicas = document.getElementById("notasClinnicas").value;
      _updateCita(citaId, { notasClinnicas: citas[idx].notasClinnicas });
      showToast("Notas clínicas guardadas 💾");
    }
  };

  // Estados
  document.querySelectorAll(".estado-btn").forEach(btn => {
    btn.onclick = () => {
      const nuevoEstado = btn.dataset.estado;
      const idx = citas.findIndex(c => c.id === citaId);
      if (idx !== -1) {
        citas[idx].estado = nuevoEstado;
        _updateCita(citaId, { estado: nuevoEstado });
        actualizarBotonesEstado(nuevoEstado);
        if (dayPanel.classList.contains("open") && selectedDate) abrirDayPanel(selectedDate);
        reRenderCalendario();
        showToast(`Estado actualizado: ${nuevoEstado} ✓`);
      }
    };
  });

  // Eliminar cita
  document.getElementById("btnEliminarCita").onclick = () => {
    if (!confirm(`¿Eliminar la cita de ${cita.pacienteNombre}?\nEsta acción no se puede deshacer.`)) return;
    citas = citas.filter(c => c.id !== citaId);
    _deleteCita(citaId);
    cerrarModalDetalle();
    if (dayPanel.classList.contains("open") && selectedDate) abrirDayPanel(selectedDate);
    reRenderCalendario();
    showToast("Cita eliminada 🗑");
  };

  // File input
  document.getElementById("fileInput").onchange = (e) => manejarArchivos(e.target.files, citaId);
  document.getElementById("dropZone").ondragover = (e) => { e.preventDefault(); };
  document.getElementById("dropZone").ondrop = (e) => {
    e.preventDefault();
    manejarArchivos(e.dataTransfer.files, citaId);
  };

  modalDetalle.classList.add("open");
  document.body.style.overflow = "hidden";
}

function cerrarModalDetalle() {
  modalDetalle.classList.remove("open");
  document.body.style.overflow = "";
  citaEnEdicion = null;
}
document.getElementById("btnCerrarDetalle").addEventListener("click",  cerrarModalDetalle);
modalDetalle.addEventListener("click", e => { if (e.target === modalDetalle) cerrarModalDetalle(); });

function actualizarBotonesEstado(estado) {
  document.querySelectorAll(".estado-btn").forEach(btn => {
    btn.classList.toggle("activo", btn.dataset.estado === estado);
  });
}


/* ─ WhatsApp mensajes ────────────────────────────────────── */
function enviarWaConfirmacion(cita) {
  if (!cita.telefono) { alert("Esta cita no tiene número de teléfono registrado."); return; }

  const telDest = `52${cita.telefono.replace(/\D/g,"")}`;
  const msg =
    `¡Hola, ${cita.pacienteNombre}! 😊\n\n` +
    `Le escribimos del consultorio de la *Dra. Gabriela de León* para confirmarle que su cita ha sido agendada con éxito.\n\n` +
    `📋 *Detalles de su cita:*\n` +
    `📅 Fecha: *${formatFechaLarga(cita.fecha)}*\n` +
    `🕐 Hora: *${formatHoraAmPm(cita.hora)}*\n` +
    `🦷 Motivo: *${cita.motivo}*\n` +
    `📍 Consultorio Dra. Gabriela De Leon\n` +
    `Calle 15pte Nte entre 10ma y 9na Nte #1060A🦷\n\n` +
    `Tuxtla Gutiérrez, Chiapas\n\n` +
    `Por favor, llegue puntual. Contamos con 10 min de tolerancia a su favor. Si necesita cancelar o reagendar, comuníquese con anticipación.\n\n` +
    `¡La esperamos! 🦷✨`;

  window.open(`https://wa.me/${telDest}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
}

function enviarWaRecordatorio(cita) {
  if (!cita.telefono) { alert("Esta cita no tiene número de teléfono registrado."); return; }

  const telDest = `52${cita.telefono.replace(/\D/g,"")}`;
  const msg =
    `Estimado/a *${cita.pacienteNombre}*, buenos días/tardes. 👋\n\n` +
    `Le recordamos su cita del día *${formatFechaLarga(cita.fecha)} a las ${formatHoraAmPm(cita.hora)}* en el consultorio de la *Dra. Gabriela De Leon*, para su tratamiento de *${cita.motivo}*.\n\n` +
    `📍 Calle 15pte Nte entre 10ma y 9na Nte #1060A, Tuxtla Gutiérrez, Chiapas\n\n` +
    `¿Contamos con su asistencia? Si tuviera algún inconveniente, avísenos con tiempo para reprogramar.\n\n` +
    `¡Hasta pronto! 🦷`;

  window.open(`https://wa.me/${telDest}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
}


/* ─ Adjuntos ─────────────────────────────────────────────── */
function manejarArchivos(files, citaId) {
  const idx = citas.findIndex(c => c.id === citaId);
  if (idx === -1) return;

  Array.from(files).forEach(file => {
    if (file.size > 8 * 1024 * 1024) {
      showToast(`"${file.name}" supera 8 MB y no se guardará`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const adjunto = {
        id:    uid(),
        nombre: file.name,
        tipo:   file.type,
        size:   file.size,
        data:   e.target.result,
      };
      if (!citas[idx].adjuntos) citas[idx].adjuntos = [];
      citas[idx].adjuntos.push(adjunto);
      _updateCita(citaId, { adjuntos: citas[idx].adjuntos });
      renderAdjuntos(citas[idx].adjuntos, adjunto.id);
      showToast(`"${file.name}" adjuntado — ponle un nombre ✏️`);
    };
    reader.readAsDataURL(file);
  });
  // Limpiar input
  document.getElementById("fileInput").value = "";
}

function renderAdjuntos(adjuntos, autoRenameId = null) {
  const lista = document.getElementById("adjuntosLista");
  lista.innerHTML = "";
  if (!adjuntos || adjuntos.length === 0) return;

  adjuntos.forEach(adj => {
    const item = document.createElement("div");
    item.className = "adjunto-item";
    item.dataset.adjId = adj.id;

    const esImagen = adj.tipo.startsWith("image/");
    const icono    = esImagen ? "🖼️" : adj.tipo.includes("pdf") ? "📄" : "📁";

    item.innerHTML = `
      ${esImagen
        ? `<img src="${adj.data}" class="adjunto-preview" alt="${adj.nombre}" />`
        : `<span class="adjunto-icono">${icono}</span>`}
      <div class="adjunto-nombre-wrap">
        <span class="adjunto-nombre" title="${adj.nombre}">${adj.nombre}</span>
        <button class="adjunto-rename-btn" title="Renombrar">✏️</button>
      </div>
      <span class="adjunto-size">${formatBytes(adj.size)}</span>
      <button class="adjunto-btn-del" data-id="${adj.id}" title="Eliminar">✕</button>
    `;

    // Click en imagen para verla
    if (esImagen) {
      item.querySelector(".adjunto-preview").style.cursor = "zoom-in";
      item.querySelector(".adjunto-preview").addEventListener("click", () => {
        abrirLightbox(adj.data, adj.nombre);
      });
    }

    // Renombrar
    item.querySelector(".adjunto-rename-btn").addEventListener("click", () => {
      activarRenombre(item, adj, citaEnEdicion);
    });
    item.querySelector(".adjunto-nombre").addEventListener("dblclick", () => {
      activarRenombre(item, adj, citaEnEdicion);
    });

    item.querySelector(".adjunto-btn-del").addEventListener("click", () => {
      if (!citaEnEdicion) return;
      const citaIdx = citas.findIndex(c => c.id === citaEnEdicion);
      if (citaIdx === -1) return;
      citas[citaIdx].adjuntos = citas[citaIdx].adjuntos.filter(a => a.id !== adj.id);
      _updateCita(citaEnEdicion, { adjuntos: citas[citaIdx].adjuntos });
      renderAdjuntos(citas[citaIdx].adjuntos);
      showToast("Archivo eliminado");
    });

    lista.appendChild(item);
  });

  // Auto-activar renombre para archivo recién subido
  if (autoRenameId) {
    const targetItem = lista.querySelector(`[data-adj-id="${autoRenameId}"]`);
    if (targetItem) {
      const adj = adjuntos.find(a => a.id === autoRenameId);
      if (adj) activarRenombre(targetItem, adj, citaEnEdicion);
    }
  }
}

function activarRenombre(item, adj, citaId) {
  const wrap    = item.querySelector(".adjunto-nombre-wrap");
  const nombreEl = item.querySelector(".adjunto-nombre");
  const btnEl   = item.querySelector(".adjunto-rename-btn");
  if (wrap.querySelector(".adjunto-nombre-input")) return; // ya está en edición

  nombreEl.style.display = "none";
  btnEl.style.display    = "none";

  const input   = document.createElement("input");
  input.type    = "text";
  input.className = "adjunto-nombre-input";
  input.value   = adj.nombre;
  wrap.appendChild(input);
  input.focus();
  // Seleccionar solo el nombre sin extensión
  const match = adj.nombre.match(/^(.+?)(\.[^.]+)?$/);
  if (match && match[2]) input.setSelectionRange(0, match[1].length);
  else input.select();

  const guardar = () => {
    const nuevoNombre = input.value.trim();
    if (!nuevoNombre) { input.focus(); return; }
    if (!citaId) return;
    const citaIdx = citas.findIndex(c => c.id === citaId);
    if (citaIdx === -1) return;
    const adjIdx = citas[citaIdx].adjuntos.findIndex(a => a.id === adj.id);
    if (adjIdx === -1) return;
    citas[citaIdx].adjuntos[adjIdx].nombre = nuevoNombre;
    _updateCita(citaId, { adjuntos: citas[citaIdx].adjuntos });
    renderAdjuntos(citas[citaIdx].adjuntos);
    showToast("Nombre actualizado ✓");
  };

  input.addEventListener("keydown", e => {
    if (e.key === "Enter")  { e.preventDefault(); guardar(); }
    if (e.key === "Escape") {
      const citaIdx = citas.findIndex(c => c.id === citaId);
      if (citaIdx !== -1) renderAdjuntos(citas[citaIdx].adjuntos);
    }
  });
  input.addEventListener("blur", guardar);
}

function formatBytes(bytes) {
  if (bytes < 1024)        return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}


/* ═══════════════════════════════════════════════════════════
   PACIENTES — Renderizado
═══════════════════════════════════════════════════════════ */
function renderPacientes(filtro = "") {
  const grid = document.getElementById("pacientesGrid");
  const p    = filtro.toLowerCase();

  const resultado = filtro
    ? pacientes.filter(pa =>
        pa.nombre.toLowerCase().includes(p) ||
        (pa.telefono || "").includes(p)
      )
    : pacientes;

  grid.innerHTML = "";

  if (resultado.length === 0) {
    grid.innerHTML = `<div class="no-resultados"><span>🔍</span>${filtro ? "Sin resultados para " + filtro : "Aún no hay pacientes registrados"}</div>`;
    return;
  }

  resultado
    .slice()
    .sort((a,b) => a.nombre.localeCompare(b.nombre))
    .forEach(p => {
      const numCitas = citas.filter(c => c.pacienteNombre.toLowerCase() === p.nombre.toLowerCase()).length;
      const card = document.createElement("div");
      card.className = "paciente-card";
      card.innerHTML = `
        <div class="paciente-avatar">👤</div>
        <div class="paciente-nombre">${p.nombre}</div>
        <div class="paciente-meta">
          ${p.edad ? `🎂 ${p.edad} años` : ""}
          ${p.telefono ? `<span>📞 ${p.telefono}</span>` : ""}
        </div>
        <span class="paciente-citas-count">${numCitas} cita${numCitas !== 1 ? "s" : ""}</span>
      `;
      card.addEventListener("click", () => abrirPerfilPaciente(p.id));
      grid.appendChild(card);
    });
}

document.getElementById("buscadorPacientes").addEventListener("input", e => {
  renderPacientes(e.target.value);
});


/* ─ Modal perfil de paciente ─────────────────────────────── */
const modalPaciente = document.getElementById("modalPaciente");

function abrirPerfilPaciente(pacienteId) {
  const paciente = pacientes.find(p => p.id === pacienteId);
  if (!paciente) return;

  document.getElementById("pacienteTitulo").textContent = paciente.nombre;

  const historial = citas
    .filter(c => c.pacienteNombre.toLowerCase() === paciente.nombre.toLowerCase())
    .sort((a,b) => b.fecha.localeCompare(a.fecha));

  const totalGastado = historial.reduce((s, c) => s + Number(c.precio || 0), 0);

  let html = `
    <div class="paciente-header">
      <div class="paciente-avatar-grande">👤</div>
      <div>
        <div style="font-size:1.1rem;font-weight:800;color:var(--navy)">${paciente.nombre}</div>
        ${paciente.edad ? `<div style="font-size:.85rem;color:var(--gray)">🎂 ${paciente.edad} años</div>` : ""}
        ${paciente.telefono ? `<div style="font-size:.85rem;color:var(--gray)">📞 ${paciente.telefono}</div>` : ""}
        <div style="font-size:.85rem;color:var(--mint);font-weight:700;margin-top:4px">💰 Total invertido: $${totalGastado.toLocaleString("es-MX")}</div>
      </div>
    </div>
    <div class="historial-citas-titulo">📋 Historial de citas (${historial.length})</div>
    <div class="historial-lista">`;

  if (historial.length === 0) {
    html += `<div style="color:var(--gray);font-size:.86rem;text-align:center;padding:24px">Sin citas registradas</div>`;
  } else {
    historial.forEach(c => {
      html += `
        <div class="historial-item ${c.estado || 'pendiente'}" data-id="${c.id}" style="cursor:pointer">
          <strong>${formatFechaLarga(c.fecha)} ${c.hora}</strong> — ${c.motivo}
          <span style="float:right;color:var(--mint);font-weight:700">$${Number(c.precio).toLocaleString("es-MX")}</span>
          <div style="font-size:.75rem;color:var(--gray);margin-top:3px">Estado: ${c.estado || "pendiente"}</div>
        </div>`;
    });
  }

  html += `</div>`;
  document.getElementById("pacienteContenido").innerHTML = html;

  // Click en cita del historial
  document.querySelectorAll(".historial-item[data-id]").forEach(item => {
    item.addEventListener("click", () => {
      cerrarModalPaciente();
      setTimeout(() => abrirDetalleCita(item.dataset.id), 200);
    });
  });

  modalPaciente.classList.add("open");
  document.body.style.overflow = "hidden";
}

function cerrarModalPaciente() {
  modalPaciente.classList.remove("open");
  document.body.style.overflow = "";
}
document.getElementById("btnCerrarPaciente").addEventListener("click",  cerrarModalPaciente);
modalPaciente.addEventListener("click", e => { if (e.target === modalPaciente) cerrarModalPaciente(); });


/* ═══════════════════════════════════════════════════════════
   INGRESOS — Renderizado
═══════════════════════════════════════════════════════════ */
let filtroIngresosActivo = "dia";

function renderIngresos(filtro, fechaEspecifica = null) {
  filtroIngresosActivo = filtro;
  const hoy   = new Date();
  let citasFiltradas;

  if (fechaEspecifica) {
    citasFiltradas = citas.filter(c => c.fecha === fechaEspecifica);
  } else if (filtro === "dia") {
    const hoyStr = fechaStr(hoy);
    citasFiltradas = citas.filter(c => c.fecha === hoyStr);
  } else if (filtro === "semana") {
    const lunes  = getLunes(hoy);
    const domingo= new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    citasFiltradas = citas.filter(c => c.fecha >= fechaStr(lunes) && c.fecha <= fechaStr(domingo));
  } else if (filtro === "mes") {
    const mesStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}`;
    citasFiltradas = citas.filter(c => c.fecha.startsWith(mesStr));
  }

  citasFiltradas = (citasFiltradas || []).sort((a,b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));

  const total    = citasFiltradas.reduce((s, c) => s + Number(c.precio || 0), 0);
  const conteo   = citasFiltradas.length;
  const promedio = conteo > 0 ? total / conteo : 0;

  document.getElementById("ingresoTotal").textContent    = `$${total.toLocaleString("es-MX", {minimumFractionDigits:2})}`;
  document.getElementById("ingresoCitas").textContent    = conteo;
  document.getElementById("ingresoPromedio").textContent = `$${promedio.toLocaleString("es-MX", {minimumFractionDigits:2})}`;

  const tbody = document.getElementById("ingresosTablaBody");
  tbody.innerHTML = "";

  if (citasFiltradas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="tabla-vacia">🔍 No hay citas en este período</td></tr>`;
    return;
  }

  citasFiltradas.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatFechaLarga(c.fecha)}<br><small style="color:var(--gray)">${c.hora}</small></td>
      <td style="font-weight:600">${c.pacienteNombre}</td>
      <td>${c.motivo}</td>
      <td style="font-weight:700;color:var(--navy)">$${Number(c.precio).toLocaleString("es-MX")}</td>
      <td><span class="estado-chip ${c.estado || 'pendiente'}">${c.estado || 'pendiente'}</span></td>
    `;
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => {
      abrirDetalleCita(c.id);
    });
    tbody.appendChild(tr);
  });
}

/* Botones de filtro de ingresos */
document.querySelectorAll(".filtro-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("filtroFechaEspecifica").value = "";
    renderIngresos(btn.dataset.filtro);
  });
});

document.getElementById("filtroFechaEspecifica").addEventListener("change", e => {
  if (!e.target.value) return;
  document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("active"));
  renderIngresos(null, e.target.value);
});


/* ═══════════════════════════════════════════════════════════
   REPORTES — PDF
═══════════════════════════════════════════════════════════ */
function inicializarReportes() {
  const hoy  = new Date();
  const anio = hoy.getFullYear();
  const sem  = getNumeroSemana(hoy);
  document.getElementById("reporteSemana").value = `${anio}-W${String(sem).padStart(2,"0")}`;
  actualizarPreviewReporte();
}

document.getElementById("reporteSemana").addEventListener("change", actualizarPreviewReporte);
["rIncluirCitas","rIncluirIngresos","rIncluirNotas"].forEach(id => {
  document.getElementById(id).addEventListener("change", actualizarPreviewReporte);
});

function actualizarPreviewReporte() {
  const semVal = document.getElementById("reporteSemana").value;
  if (!semVal) return;

  const { inicio, fin, citasSemana } = getDatosSemana(semVal);
  const total = citasSemana.reduce((s,c) => s + Number(c.precio||0), 0);
  const completadas = citasSemana.filter(c => c.estado === "completada").length;

  const preview = document.getElementById("reportePreview");
  preview.innerHTML = `
    <div class="preview-contenido">
      <div class="preview-titulo">📊 Reporte ${formatFechaLarga(inicio)} — ${formatFechaLarga(fin)}</div>
      <div class="preview-fila"><span>Total de citas</span><span>${citasSemana.length}</span></div>
      <div class="preview-fila"><span>Citas completadas</span><span>${completadas}</span></div>
      <div class="preview-fila"><span>Citas pendientes</span><span>${citasSemana.filter(c=>!c.estado||c.estado==="pendiente").length}</span></div>
      <div class="preview-fila"><span>Ingresos del período</span><span>$${total.toLocaleString("es-MX",{minimumFractionDigits:2})}</span></div>
      <div class="preview-fila"><span>Pacientes únicos</span><span>${new Set(citasSemana.map(c=>c.pacienteNombre)).size}</span></div>
    </div>`;
}

document.getElementById("btnGenerarPDF").addEventListener("click", generarPDF);

function generarPDF() {
  const semVal = document.getElementById("reporteSemana").value;
  if (!semVal) { showToast("Selecciona una semana primero"); return; }

  const inclCitas    = document.getElementById("rIncluirCitas").checked;
  const inclIngresos = document.getElementById("rIncluirIngresos").checked;
  const inclNotas    = document.getElementById("rIncluirNotas").checked;

  const { inicio, fin, citasSemana } = getDatosSemana(semVal);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const NAVY  = [10, 61, 98];
  const AQUA  = [0, 180, 216];
  const GRAY  = [140, 153, 166];
  const BLACK = [26, 46, 59];
  const WHITE = [255, 255, 255];

  let y = 0;

  /* ── Encabezado ───────────────────────────────────────── */
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 216, 36, "F");

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Dra. Gabriela De Leon Salazar", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Odontología General · Tuxtla Gutiérrez, Chiapas · Tel: 961 135 4691", 14, 21);
  doc.setFontSize(9);
  doc.setTextColor(...AQUA);
  doc.text(`REPORTE SEMANAL · ${formatFechaLarga(inicio)} — ${formatFechaLarga(fin)}`, 14, 29);

  doc.setTextColor(...GRAY);
  doc.setFontSize(8);
  doc.text(`Generado: ${formatFechaLarga(fechaStr(new Date()))} ${new Date().toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"})}`, 130, 29);

  y = 44;

  /* ── Resumen ─────────────────────────────────────────── */
  const total       = citasSemana.reduce((s,c) => s + Number(c.precio||0), 0);
  const completadas = citasSemana.filter(c => c.estado === "completada").length;
  const pendientes  = citasSemana.filter(c => !c.estado || c.estado === "pendiente").length;
  const canceladas  = citasSemana.filter(c => c.estado === "cancelada").length;

  doc.setFillColor(245, 251, 252);
  doc.roundedRect(14, y, 188, 28, 3, 3, "F");
  doc.setDrawColor(...AQUA);
  doc.roundedRect(14, y, 188, 28, 3, 3, "S");

  const bloques = [
    { label: "Total citas", valor: citasSemana.length },
    { label: "Completadas", valor: completadas },
    { label: "Pendientes",  valor: pendientes },
    { label: "Canceladas",  valor: canceladas },
    { label: "Ingresos",    valor: `$${total.toLocaleString("es-MX",{minimumFractionDigits:2})}` },
  ];

  bloques.forEach((b, i) => {
    const x = 14 + (188 / bloques.length) * i + (188 / bloques.length) / 2;
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(b.label, x, y + 10, { align: "center" });

    doc.setTextColor(...NAVY);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(String(b.valor), x, y + 21, { align: "center" });
  });

  y += 36;

  /* ── Tabla de citas ─────────────────────────────────── */
  if (inclCitas && citasSemana.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text("Detalle de Citas", 14, y);
    y += 6;

    const cols   = ["Fecha", "Hora", "Paciente", "Motivo", "Precio", "Estado"];
    const colW   = [26, 16, 42, 52, 22, 24];
    const colX   = [14];
    for (let i = 1; i < cols.length; i++) colX.push(colX[i-1] + colW[i-1]);

    // Encabezado tabla
    doc.setFillColor(...NAVY);
    doc.rect(14, y, 188, 8, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    cols.forEach((col, i) => doc.text(col, colX[i] + 2, y + 5.5));
    y += 8;

    // Filas
    const citasOrden = citasSemana.slice().sort((a,b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));

    citasOrden.forEach((c, rowIdx) => {
      if (y > 240) { doc.addPage(); y = 20; }

      if (rowIdx % 2 === 0) {
        doc.setFillColor(245, 251, 252);
        doc.rect(14, y, 188, 7, "F");
      }

      doc.setTextColor(...BLACK);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");

      const vals = [
        formatFechaCorta(c.fecha),
        c.hora,
        c.pacienteNombre.slice(0,22),
        c.motivo.slice(0,28),
        `$${Number(c.precio).toLocaleString("es-MX")}`,
        c.estado || "pendiente",
      ];

      vals.forEach((v, i) => doc.text(String(v), colX[i] + 2, y + 5));

      // Color estado
      const estadoColor = c.estado === "completada" ? [46,204,113] : c.estado === "cancelada" ? [231,76,60] : [243,156,18];
      const estadoX = colX[5];
      doc.setFillColor(...estadoColor);
      doc.roundedRect(estadoX + 1, y + 1.5, 21, 4.5, 1, 1, "F");
      doc.setTextColor(...WHITE);
      doc.setFontSize(6.5);
      doc.text((c.estado || "pendiente"), estadoX + 11.5, y + 4.8, { align: "center" });

      y += 7;
    });

    y += 8;
  }

  /* ── Notas clínicas ─────────────────────────────────── */
  if (inclNotas) {
    const citasConNotas = citasSemana.filter(c => c.notasClinnicas && c.notasClinnicas.trim());
    if (citasConNotas.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...NAVY);
      doc.text("Notas Clínicas", 14, y);
      y += 6;

      citasConNotas.forEach(c => {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFillColor(239, 246, 249);
        doc.roundedRect(14, y, 188, 5, 1, 1, "F");
        doc.setTextColor(...NAVY);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(`${c.pacienteNombre} — ${formatFechaCorta(c.fecha)} ${c.hora}`, 16, y + 3.5);
        y += 5;

        const lineas = doc.splitTextToSize(c.notasClinnicas, 184);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...BLACK);
        lineas.forEach(l => {
          if (y > 255) { doc.addPage(); y = 20; }
          doc.text(l, 16, y + 4);
          y += 5;
        });
        y += 3;
      });
    }
  }

  /* ── Resumen financiero ─────────────────────────────── */
  if (inclIngresos) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text("Resumen Financiero", 14, y);
    y += 6;

    const motivos = {};
    citasSemana.forEach(c => {
      const m = c.motivo;
      if (!motivos[m]) motivos[m] = { cantidad: 0, total: 0 };
      motivos[m].cantidad++;
      motivos[m].total += Number(c.precio || 0);
    });

    doc.autoTable({
      startY: y,
      head: [["Servicio", "# Citas", "Total ($)"]],
      body: Object.entries(motivos).map(([m, v]) => [
        m,
        v.cantidad,
        `$${v.total.toLocaleString("es-MX", {minimumFractionDigits: 2})}`,
      ]).concat([["TOTAL SEMANA", citasSemana.length, `$${total.toLocaleString("es-MX", {minimumFractionDigits:2})}`]]),
      headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: BLACK },
      alternateRowStyles: { fillColor: [245,251,252] },
      footStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
      styles: { cellPadding: 3, lineColor: [210,225,235], lineWidth: 0.2 },
      columnStyles: { 0: {cellWidth: 100}, 1: {cellWidth: 40, halign:"center"}, 2: {cellWidth: 46, halign:"right"} },
    });
  }

  /* ── Footer ─────────────────────────────────────────── */
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(`Dra. Gabriela De Leon Salazar · Odontología General · Tuxtla Gutiérrez, Chiapas`, 14, 273);
    doc.text(`Página ${i} de ${pages}`, 202, 273, { align: "right" });
  }

  doc.save(`Reporte_Semana_${semVal}_DraGabriela.pdf`);
  showToast("📄 PDF generado y descargado ✓");
}

/* ─── Helpers de fechas ──────────────────────────────────── */
function fechaStr(d) {
  const anio = d.getFullYear();
  const mes  = String(d.getMonth() + 1).padStart(2, "0");
  const dia  = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function formatFechaLarga(dStr) {
  if (!dStr) return "";
  const d = new Date(dStr + "T12:00:00");
  return `${d.getDate()} de ${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatFechaCorta(dStr) {
  if (!dStr) return "";
  const d = new Date(dStr + "T12:00:00");
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

function getLunes(d) {
  const dia  = d.getDay();
  const diff = (dia === 0 ? -6 : 1 - dia);
  const lunes = new Date(d);
  lunes.setDate(d.getDate() + diff);
  return lunes;
}

/* ─── Formato hora 12h AM/PM ─────────────────────────────── */
function formatHoraAmPm(hora24) {
  if (!hora24) return hora24 || "";
  const [h, m] = hora24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12    = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function getNumeroSemana(d) {
  const inicio = new Date(d.getFullYear(), 0, 1);
  const diff   = d - inicio;
  return Math.ceil(((diff / 86400000) + inicio.getDay() + 1) / 7);
}

function getDatosSemana(semVal) {
  // semVal = "YYYY-Www"
  const [anioStr, semStr] = semVal.split("-W");
  const anio  = parseInt(anioStr);
  const semNum = parseInt(semStr);

  const enero1   = new Date(anio, 0, 1);
  const diasDesde = (semNum - 1) * 7;
  const lunes = new Date(enero1);
  lunes.setDate(enero1.getDate() - enero1.getDay() + 1 + diasDesde);

  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  const iStr = fechaStr(lunes);
  const fStr = fechaStr(domingo);

  const citasSemana = citas.filter(c => c.fecha >= iStr && c.fecha <= fStr);
  return { inicio: iStr, fin: fStr, citasSemana };
}


/* ─── Validación básica del formulario ───────────────────── */
function marcarError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("error");
  el.addEventListener("input",  () => el.classList.remove("error"), { once: true });
  el.addEventListener("change", () => el.classList.remove("error"), { once: true });
}

function limpiarErroresForm() {
  document.querySelectorAll(".input-field.error").forEach(el => el.classList.remove("error"));
}


/* ─── Lightbox de imágenes ─────────────────────────────── */
let lbScale = 1;
const lightboxOverlay = document.getElementById("lightboxOverlay");
const lightboxImg     = document.getElementById("lightboxImg");

function abrirLightbox(src, nombre) {
  lightboxImg.src = src;
  document.getElementById("lbNombre").textContent = nombre || "";
  lbScale = 1;
  lightboxImg.style.transform = "scale(1)";
  lightboxImg.style.cursor = "grab";
  lightboxOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}
function cerrarLightbox() {
  lightboxOverlay.classList.remove("open");
  lightboxImg.src = "";
  document.body.style.overflow = "";
}
document.getElementById("lbClose").addEventListener("click", cerrarLightbox);
document.getElementById("lbZoomIn").addEventListener("click", () => {
  lbScale = Math.min(lbScale + 0.35, 7);
  lightboxImg.style.transform = `scale(${lbScale})`;
});
document.getElementById("lbZoomOut").addEventListener("click", () => {
  lbScale = Math.max(lbScale - 0.35, 0.2);
  lightboxImg.style.transform = `scale(${lbScale})`;
});
document.getElementById("lbReset").addEventListener("click", () => {
  lbScale = 1;
  lightboxImg.style.transform = "scale(1)";
});
lightboxOverlay.addEventListener("click", e => {
  if (e.target === lightboxOverlay || e.target === document.getElementById("lightboxImgWrap")) {
    cerrarLightbox();
  }
});
/* Rueda del ratón para zoom */
document.getElementById("lightboxImgWrap").addEventListener("wheel", e => {
  e.preventDefault();
  lbScale = e.deltaY < 0
    ? Math.min(lbScale + 0.15, 7)
    : Math.max(lbScale - 0.15, 0.2);
  lightboxImg.style.transform = `scale(${lbScale})`;
}, { passive: false });

/* ─── ESC cierra modales ─────────────────────────────────── */
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (lightboxOverlay.classList.contains("open")) { cerrarLightbox(); return; }
  if (modalDetalle.classList.contains("open"))   { cerrarModalDetalle();   return; }
  if (modalNuevaCita.classList.contains("open")) { cerrarModalNuevaCita(); return; }
  if (modalPaciente.classList.contains("open"))  { cerrarModalPaciente();  return; }
  if (dayPanel.classList.contains("open")) {
    dayPanel.classList.remove("open");
    selectedDate = null;
    if (vistaCalendario === "semana") renderSemana(); else renderCalendario();
  }
});


/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  renderCalendario();
  // Establecer fecha de hoy por defecto en el reporte
  const today = new Date();
  const semInput = document.getElementById("reporteSemana");
  if (semInput) {
    semInput.value = `${today.getFullYear()}-W${String(getNumeroSemana(today)).padStart(2,"0")}`;
  }
});
