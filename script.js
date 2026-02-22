/* ═══════════════════════════════════════════════════════════
   DRA. GABRIELA DE LEON SALAZAR — SCRIPT PRINCIPAL
   Modal de Cita · WhatsApp · Scroll Reveal · Navbar
═══════════════════════════════════════════════════════════ */

"use strict";

/* ─── CONFIGURACIÓN ─────────────────────────────────────── */
const WA_NUMBER = "5219611354691"; // Número de WhatsApp (Con código de país)


/* ─── ELEMENTOS DEL DOM ─────────────────────────────────── */
const citaOverlay   = document.getElementById("citaOverlay");
const citaModal     = document.getElementById("citaModal");
const btnCerrar     = document.getElementById("btnCerrarModal");
const citaForm      = document.getElementById("citaForm");
const mascotaImg    = document.getElementById("mascotaImg");
const mascotaBurbuja = document.getElementById("mascotaBurbuja");

const inputNombre   = document.getElementById("nombrePaciente");
const selectServicio= document.getElementById("servicioCita");
const inputDia      = document.getElementById("diaCita");
const selectHorario = document.getElementById("horarioCita");

const errNombre     = document.getElementById("errorNombre");
const errServicio   = document.getElementById("errorServicio");
const errDia        = document.getElementById("errorDia");
const errHorario    = document.getElementById("errorHorario");

const navbar        = document.getElementById("navbar");
const hamburger     = document.getElementById("hamburger");
const navLinks      = document.getElementById("navLinks");


/* ═══════════════════════════════════════════════════════════
   MODAL DE CITA — ABRIR / CERRAR
═══════════════════════════════════════════════════════════ */

/**
 * Abre el overlay del modal de cita.
 * Resetea el formulario y pone a la mascota en estado normal.
 */
function abrirModalCita() {
  citaForm.reset();
  limpiarErrores();
  setMascota("normal", "¡Déjanos cuidar tu sonrisa! 😊");
  citaOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
  // Foco accesible al primer campo
  setTimeout(() => inputNombre.focus(), 320);
}

/**
 * Cierra el overlay del modal de cita.
 */
function cerrarModalCita() {
  citaOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

// Botones que abren el modal
const botonesCita = [
  document.getElementById("btnAgendarNav"),
  document.getElementById("btnAgendarHero"),
  document.getElementById("btnAgendarPerfil"),
  document.getElementById("btnAgendarContacto"),
];
botonesCita.forEach(btn => {
  if (btn) btn.addEventListener("click", abrirModalCita);
});

// Cerrar con la X
btnCerrar.addEventListener("click", cerrarModalCita);

// Cerrar al hacer clic en el fondo oscuro
citaOverlay.addEventListener("click", (e) => {
  if (e.target === citaOverlay) cerrarModalCita();
});

// Cerrar con ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && citaOverlay.classList.contains("open")) {
    cerrarModalCita();
  }
});


/* ═══════════════════════════════════════════════════════════
   MASCOTA — ESTADOS
═══════════════════════════════════════════════════════════ */

let mascotaTimer = null;

/**
 * Cambia el estado de la mascota en el modal.
 * @param {"normal"|"feliz"} estado
 * @param {string} [mensaje]
 */
function setMascota(estado, mensaje) {
  mascotaImg.classList.remove("feliz");

  if (mensaje) {
    mascotaBurbuja.textContent = mensaje;
  }

  if (estado === "feliz") {
    // Forzar re-flow para reiniciar animación
    void mascotaImg.offsetWidth;
    mascotaImg.classList.add("feliz");
  }
}

/**
 * Pone a la mascota "feliz" durante `ms` milisegundos,
 * luego la regresa a "normal".
 */
function mascotaFelizTemporal(mensaje, ms = 3000) {
  clearTimeout(mascotaTimer);
  setMascota("feliz", mensaje);
  mascotaTimer = setTimeout(() => {
    setMascota("normal", "¡Déjanos cuidar tu sonrisa! 😊");
  }, ms);
}


/* ═══════════════════════════════════════════════════════════
   VALIDACIÓN DEL FORMULARIO
═══════════════════════════════════════════════════════════ */

/** Limpia todos los errores del formulario */
function limpiarErrores() {
  [inputNombre, selectServicio, inputDia, selectHorario].forEach(el => {
    el.classList.remove("error");
  });
  [errNombre, errServicio, errDia, errHorario].forEach(el => {
    el.classList.remove("visible");
  });
}

/** Muestra error en un campo específico */
function mostrarError(campo, errEl) {
  campo.classList.add("error");
  errEl.classList.add("visible");
  campo.focus();
}

/** Elimina error cuando el usuario empieza a escribir */
[inputNombre, inputDia].forEach(el => {
  el.addEventListener("input", () => {
    el.classList.remove("error");
    const errId = el.id === "nombrePaciente" ? errNombre : errDia;
    errId.classList.remove("visible");
  });
});
[selectServicio, selectHorario].forEach(el => {
  el.addEventListener("change", () => {
    el.classList.remove("error");
    const errId = el.id === "servicioCita" ? errServicio : errHorario;
    errId.classList.remove("visible");
  });
});

/**
 * Valida el formulario. Devuelve true si es válido.
 */
function validarFormulario() {
  limpiarErrores();
  let valido = true;

  if (!inputNombre.value.trim()) {
    mostrarError(inputNombre, errNombre);
    valido = false;
  }
  if (!selectServicio.value) {
    if (valido) selectServicio.focus();
    selectServicio.classList.add("error");
    errServicio.classList.add("visible");
    valido = false;
  }
  if (!inputDia.value.trim()) {
    if (valido) mostrarError(inputDia, errDia);
    else { inputDia.classList.add("error"); errDia.classList.add("visible"); }
    valido = false;
  }
  if (!selectHorario.value) {
    selectHorario.classList.add("error");
    errHorario.classList.add("visible");
    valido = false;
  }

  return valido;
}


/* ═══════════════════════════════════════════════════════════
   GENERAR MENSAJE Y ENVIAR POR WHATSAPP
═══════════════════════════════════════════════════════════ */

citaForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!validarFormulario()) return;

  const nombre   = inputNombre.value.trim();
  const servicio = selectServicio.value;
  const dia      = inputDia.value.trim();
  const horario  = selectHorario.value;

  /* ─── Formato del mensaje ──────────────────────────────
     "¡Hola, doctora! Soy [Nombre], me interesa agendar
      una cita para [Servicio] este [Día] [Horario].
      ¿Tiene espacio disponible?"
  ─────────────────────────────────────────────────────── */
  const mensaje =
    `¡Hola, doctora! 😊 Soy *${nombre}*, me interesa agendar una cita para *${servicio}* ` +
    `este *${dia}* ${horario}. ¿Tiene espacio disponible?`;

  // Feedback visual de la mascota
  mascotaFelizTemporal("¡Perfecto! Preparando tu mensaje… 🚀", 2200);

  // Abrir WhatsApp después de un pequeño delay (para que el usuario vea la animación)
  setTimeout(() => {
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank", "noopener,noreferrer");

    // Mensaje de éxito en la burbuja
    mascotaBurbuja.textContent = "¡Listo! Ya se abrió WhatsApp. ¡Nos vemos pronto! 🦷✨";

    // Cerrar el modal tras otro momento
    setTimeout(() => {
      cerrarModalCita();
    }, 1800);

  }, 900);
});


/* ═══════════════════════════════════════════════════════════
   NAVBAR — SCROLL & HAMBURGUESA
═══════════════════════════════════════════════════════════ */

window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 30);
  marcaNavActivo();
});

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("open");
  navLinks.classList.toggle("open");
  document.body.style.overflow = navLinks.classList.contains("open") ? "hidden" : "";
});

// Cerrar menú móvil al hacer clic en un enlace
document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => {
    hamburger.classList.remove("open");
    navLinks.classList.remove("open");
    document.body.style.overflow = "";
  });
});

/** Marca el enlace activo del nav según la sección visible */
function marcaNavActivo() {
  const secciones = document.querySelectorAll("section[id], div[id]");
  const links     = document.querySelectorAll(".nav-link");
  let actual      = "";

  secciones.forEach(sec => {
    const top = sec.getBoundingClientRect().top;
    if (top <= 100) actual = sec.id;
  });

  links.forEach(link => {
    link.classList.toggle(
      "active",
      link.getAttribute("href") === `#${actual}`
    );
  });
}


/* ═══════════════════════════════════════════════════════════
   SMOOTH SCROLL
═══════════════════════════════════════════════════════════ */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    const target = document.querySelector(this.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});


/* ═══════════════════════════════════════════════════════════
   SCROLL REVEAL — IntersectionObserver
═══════════════════════════════════════════════════════════ */

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target); // Solo se anima una vez
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));


/* ═══════════════════════════════════════════════════════════
   INIT — Al cargar la página
═══════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
  // Aplicar estado inicial del navbar
  navbar.classList.toggle("scrolled", window.scrollY > 30);
  marcaNavActivo();
});
