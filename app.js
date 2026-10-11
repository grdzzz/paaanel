const formulario = document.querySelector('form');
const listaPendientes = document.querySelector('#pendientes ul');
const listaCompletadas = document.querySelector('#completadas ul');

let tareas = JSON.parse(localStorage.getItem('tareas')) || [];

function guardar() {
  localStorage.setItem('tareas', JSON.stringify(tareas));
}

function formatearFecha(texto) {
  return new Date(texto + 'T00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

function dibujar() {
  listaPendientes.replaceChildren();
  listaCompletadas.replaceChildren();

  tareas.sort(function (a, b) {
    return a.fecha.localeCompare(b.fecha);
  });

  tareas.forEach(function (tarea) {

    const li = document.createElement('li');
    const negrita = document.createElement('strong');
    negrita.textContent = tarea.nombre;
    li.append(negrita, ', ' + tarea.asignatura + ', ' + formatearFecha(tarea.fecha));
    const borrar = document.createElement('button');
    borrar.textContent = '✕';
    borrar.addEventListener('click', function (evento) {
      evento.stopPropagation();
      tareas = tareas.filter(function (t) {
        return t !== tarea;
      });
      guardar();
      dibujar();
    });
    li.append(borrar);
    borrar.classList.add('btn-borrar');

    const calendario = document.createElement('button');
    calendario.textContent = '📅';
    calendario.addEventListener('click', function (evento) {
      evento.stopPropagation();
      enviarACalendar(tarea);
    });
    li.append(calendario);
    calendario.classList.add('btn-calendario');

    li.addEventListener('click', function () {
      tarea.completada = !tarea.completada;
      guardar();
      dibujar();
    });

    if (tarea.completada) {
      listaCompletadas.append(li);
    } else {
      listaPendientes.append(li);
    }
  });
}

formulario.addEventListener('submit', function (evento) {
  evento.preventDefault();

  const select = document.querySelector('#as');
  tareas.push({
    nombre: document.querySelector('#nb').value,
    asignatura: select.options[select.selectedIndex].text,
    fecha: document.querySelector('#fe').value,
    completada: false
  });

  guardar();
  dibujar();
  formulario.reset();
});

dibujar();

const CLIENT_ID = '87626998455-mq15q6su2b5von4s0mmvg3fn9cpciasf.apps.googleusercontent.com';
const PERMISO = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient = null;
let accessToken = null;
let tareaEnEspera = null;

async function crearEvento(tarea) {
  // En eventos de todo el día, Google pide como "fin" el día siguiente
  const siguiente = new Date(tarea.fecha + 'T00:00');
  siguiente.setDate(siguiente.getDate() + 1);
  const fin = siguiente.toLocaleDateString('sv-SE'); // da el formato 2026-10-14

  const respuesta = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      summary: tarea.nombre + ' (' + tarea.asignatura + ')',
      start: { date: tarea.fecha },
      end: { date: fin },
      colorId: '5'
    })
  });

  if (respuesta.ok) {
    alert('Evento creado en tu Google Calendar ✅');
  } else {
    accessToken = null;
    alert('No se pudo crear el evento. Inténtalo de nuevo.');
  }
}

function enviarACalendar(tarea) {
  if (accessToken) {
    crearEvento(tarea);
    return;
  }

  tareaEnEspera = tarea;

  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: PERMISO,
      callback: function (respuesta) {
        if (respuesta.error) {
          alert('No se pudo conectar con Google.');
          return;
        }
        accessToken = respuesta.access_token;
        crearEvento(tareaEnEspera);
      }
    });
  }

  tokenClient.requestAccessToken();
}