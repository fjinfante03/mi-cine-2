// 🔑 CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCSCr6rmC9E-WjQl0_mSZIczRvCAXCevHE",
  authDomain: "micineapp.firebaseapp.com",
  projectId: "micineapp",
  storageBucket: "micineapp.firebasestorage.app",
  messagingSenderId: "846060506741",
  appId: "1:846060506741:web:f3dea30f303f5a2109723c",
  measurementId: "G-VVGR59SF2H"
};

// Inicializar Firebase y los servicios de Auth y Firestore
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 🔑 API TMDB
const TMDB_API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

let usuarioActual = null;
let miColeccion = [];
let grupoActual = 'actores';
let esModoRegistro = false;

let chartNotasInstance = null;
let chartGenerosInstance = null;
let chartPaisesInstance = null;
let chartInstance = null;

// --- GESTIÓN DE SESIÓN DE USUARIO ---
auth.onAuthStateChanged(async (user) => {
  if (user) {
    usuarioActual = user;
    document.getElementById('nav-principal').classList.remove('hidden');
    document.getElementById('nav-principal').classList.add('flex');
    
    document.getElementById('panel-usuario').innerHTML = `
      <span class="text-xs text-slate-300 font-semibold truncate max-w-[150px]">👤 ${user.email}</span>
      <button onclick="cerrarSesion()" class="text-xs bg-slate-800 hover:bg-slate-700 text-rose-400 px-3 py-1.5 rounded-lg transition">Salir</button>
    `;

    // Cargar películas del usuario desde Firestore
    await cargarColeccionDesdeFirebase();
    cambiarSeccion('coleccion');
  } else {
    usuarioActual = null;
    miColeccion = [];
    document.getElementById('nav-principal').classList.add('hidden');
    document.getElementById('nav-principal').classList.remove('flex');
    document.getElementById('panel-usuario').innerHTML = '';
    cambiarSeccion('login');
  }
});

// Cambiar entre Login y Registro
function toggleModoAuth() {
  esModoRegistro = !esModoRegistro;
  document.getElementById('titulo-auth').textContent = esModoRegistro ? 'Crear Cuenta' : 'Iniciar Sesión';
  document.getElementById('btn-auth-submit').textContent = esModoRegistro ? 'Registrarse' : 'Iniciar Sesión';
  document.getElementById('texto-toggle-auth').textContent = esModoRegistro ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?';
  document.getElementById('btn-toggle-auth').textContent = esModoRegistro ? 'Inicia sesión' : 'Regístrate gratis';
}

document.getElementById('form-auth').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();

  try {
    if (esModoRegistro) {
      await auth.createUserWithEmailAndPassword(email, password);
      alert('¡Cuenta creada con éxito!');
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
  } catch (error) {
    alert('Error de autenticación: ' + error.message);
  }
});

function cerrarSesion() {
  auth.signOut();
}

// --- CONEXIÓN BASE DE DATOS (FIRESTORE) ---
async function cargarColeccionDesdeFirebase() {
  if (!usuarioActual) return;
  try {
    const doc = await db.collection('colecciones').doc(usuarioActual.uid).get();
    if (doc.exists) {
      miColeccion = doc.data().peliculas || [];
    } else {
      miColeccion = [];
    }
  } catch (error) {
    console.error("Error al cargar colección:", error);
  }
}

async function guardarEnFirebase() {
  if (!usuarioActual) return;
  try {
    await db.collection('colecciones').doc(usuarioActual.uid).set({
      peliculas: miColeccion
    });
  } catch (error) {
    console.error("Error al guardar colección:", error);
  }
}

// --- NAVEGACIÓN Y PANTALLAS ---
function cambiarSeccion(seccionId) {
  document.querySelectorAll('.seccion-pantalla').forEach(sec => sec.classList.add('hidden'));

  document.querySelectorAll('.btn-nav').forEach(btn => {
    btn.className = 'btn-nav px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-amber-500 transition';
  });

  const btnActivo = document.getElementById(`nav-${seccionId}`);
  if (btnActivo) {
    btnActivo.className = 'btn-nav px-3 py-2 rounded-lg bg-amber-500 text-slate-950 font-semibold transition';
  }

  if (seccionId === 'login') {
    document.getElementById('sec-login').classList.remove('hidden');
  } else if (seccionId === 'coleccion') {
    document.getElementById('sec-coleccion').classList.remove('hidden');
    renderizarColeccion(miColeccion);
  } else if (seccionId === 'estadisticas') {
    document.getElementById('sec-estadisticas').classList.remove('hidden');
    actualizarGraficos();
    renderizarEstadisticas();
  } else if (['actores', 'directores', 'guionistas', 'productores'].includes(seccionId)) {
    grupoActual = seccionId;
    document.getElementById('sec-grupo').classList.remove('hidden');
    renderizarPantallaGrupo(seccionId);
  }
}

function volverAGrupoActual() {
  cambiarSeccion(grupoActual);
}

function cerrarModalBusqueda() {
  const modalBusqueda = document.getElementById('modal-busqueda');
  modalBusqueda.classList.add('hidden');
  modalBusqueda.classList.remove('flex');
}

// Búsqueda TMDB
document.getElementById('form-tmdb').addEventListener('submit', async (e) => {
  e.preventDefault();
  const busqueda = document.getElementById('input-busqueda-tmdb').value.trim();
  if (busqueda) {
    await buscarResultadosEnTMDB(busqueda);
    document.getElementById('input-busqueda-tmdb').value = '';
  }
});

async function buscarResultadosEnTMDB(titulo) {
  try {
    const resBusqueda = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(titulo)}&language=es-ES`);
    const dataBusqueda = await resBusqueda.json();

    if (!dataBusqueda.results || dataBusqueda.results.length === 0) {
      alert('No se encontró ninguna película con ese nombre.');
      return;
    }

    const modalBusqueda = document.getElementById('modal-busqueda');
    const contenedorResultados = document.getElementById('modal-busqueda-resultados');

    contenedorResultados.innerHTML = dataBusqueda.results.map(peli => {
      const poster = peli.poster_path ? `${TMDB_IMAGE_URL}${peli.poster_path}` : 'https://via.placeholder.com/500x750?text=Sin+Poster';
      const anio = peli.release_date ? peli.release_date.split('-')[0] : 'Año desconocido';
      const sinopsis = peli.overview || 'Sin sinopsis disponible.';

      return `
        <div 
          onclick="seleccionarYPuntuarPelicula(${peli.id})" 
          class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex gap-4 items-center hover:border-amber-500 transition cursor-pointer group"
        >
          <img src="${poster}" alt="${peli.title}" class="w-16 h-24 object-cover rounded-lg flex-shrink-0 border border-slate-700">
          <div class="space-y-1 text-xs">
            <h4 class="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition">${peli.title} <span class="text-amber-500">(${anio})</span></h4>
            <p class="text-slate-400 line-clamp-2">${sinopsis}</p>
          </div>
        </div>
      `;
    }).join('');

    modalBusqueda.classList.remove('hidden');
    modalBusqueda.classList.add('flex');

  } catch (error) {
    console.error('Error al conectar con TMDb:', error);
    alert('Hubo un error al obtener los datos de la API.');
  }
}

async function seleccionarYPuntuarPelicula(movieId) {
  cerrarModalBusqueda();

  if (miColeccion.some(p => p.id === movieId)) {
    alert('Esta película ya está en tu colección.');
    return;
  }

  try {
    const resDetalles = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=es-ES`);
    const dataDetalles = await resDetalles.json();

    const resCreditos = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}&language=es-ES`);
    const dataCreditos = await resCreditos.json();

    const posterPeli = dataDetalles.poster_path ? `${TMDB_IMAGE_URL}${dataDetalles.poster_path}` : 'https://via.placeholder.com/500x750?text=Sin+Poster';

    const obtenerPersona = (p) => ({
      nombre: p.name,
      foto: p.profile_path ? `${TMDB_IMAGE_URL}${p.profile_path}` : null
    });

    const actores = dataCreditos.cast.slice(0, 20).map(obtenerPersona);
    const directores = dataCreditos.crew.filter(c => c.job === 'Director').map(obtenerPersona);
    const guionistas = dataCreditos.crew.filter(c => c.job === 'Screenplay' || c.job === 'Writer' || c.department === 'Writing').map(obtenerPersona);
    const productores = dataCreditos.crew.filter(c => c.job === 'Producer' || c.job === 'Executive Producer' || c.department === 'Production').map(obtenerPersona);

    const generos = dataDetalles.genres ? dataDetalles.genres.map(g => g.name) : ['Sin género'];
    const paises = dataDetalles.production_countries && dataDetalles.production_countries.length > 0 
      ? dataDetalles.production_countries.map(p => p.name) 
      : ['Desconocido'];

    const duracionMinutos = dataDetalles.runtime || 0;
    const anioEstreno = dataDetalles.release_date ? dataDetalles.release_date.split('-')[0] : 'N/A';

    const notaPersonal = prompt(`Puntúa "${dataDetalles.title}" (del 1 al 10):`, "8");
    const notaFinal = notaPersonal ? parseFloat(notaPersonal) : 7.0;

    const nuevaPelicula = {
      id: movieId,
      titulo: dataDetalles.title,
      sinopsis: dataDetalles.overview || 'Sin sinopsis disponible.',
      estreno: anioEstreno,
      anio: anioEstreno,
      poster: posterPeli,
      notaPersonal: notaFinal,
      duracion: duracionMinutos,
      runtime: duracionMinutos,
      generos: generos,
      paises: paises,
      actores: actores,
      directores: directores.length > 0 ? directores : [{ nombre: 'Desconocido', foto: null }],
      guionistas: guionistas.length > 0 ? guionistas : [{ nombre: 'Desconocido', foto: null }],
      productores: productores.length > 0 ? productores : [{ nombre: 'Desconocido', foto: null }],
      estado: 'vista',
      fechaAgregado: Date.now()
    };

    miColeccion.push(nuevaPelicula);
    await guardarEnFirebase();
    cambiarSeccion('coleccion');

  } catch (error) {
    console.error('Error al guardar la película:', error);
    alert('Ocurrió un error al cargar la película elegida.');
  }
}

// --- RENDERIZADO DE PANTALLAS ---
function renderizarColeccion(lista) {
  renderizarGridColeccion(lista);
}

function renderizarGridColeccion(lista) {
  const contenedor = document.getElementById('grid-peliculas');
  if (document.getElementById('total-pelis')) {
    document.getElementById('total-pelis').textContent = `Películas: ${lista.length}`;
  }
  contenedor.innerHTML = '';

  if (lista.length === 0) {
    contenedor.innerHTML = `<p class="col-span-full text-center text-slate-500 py-12">No tienes películas guardadas. ¡Añade una película para empezar!</p>`;
    return;
  }

  lista.forEach(peli => {
    const nombresActores = (peli.actores || []).map(a => typeof a === 'string' ? a : a.nombre);
    const nombresDirectores = (peli.directores || []).map(d => typeof d === 'string' ? d : d.nombre);
    const duracionVal = peli.duracion || peli.runtime;
    const textoDuracion = duracionVal ? ` • ${duracionVal} min` : '';

    const card = document.createElement('div');
    card.className = 'card-peli bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between cursor-pointer hover:border-amber-500/50 transition';
    card.onclick = () => verDetallePelicula(peli.id);
    card.innerHTML = `
      <div>
        <div class="relative">
          <img src="${peli.poster}" alt="${peli.titulo}" class="w-full h-72 object-cover">
          <span class="absolute top-2 right-2 bg-amber-500 text-slate-950 font-bold px-2.5 py-1 rounded-md text-xs shadow-md">
            ★ ${peli.notaPersonal}
          </span>
        </div>
        <div class="p-4 space-y-2">
          <h3 class="font-bold text-slate-100 text-base leading-snug">${peli.titulo}</h3>
          <p class="text-xs text-amber-500/90 font-medium">${peli.estreno || peli.anio}${textoDuracion}</p>
          <p class="text-xs text-slate-400 line-clamp-3">${peli.sinopsis}</p>
          
          <div class="pt-2 text-xs text-slate-400 space-y-1">
            <p><strong class="text-slate-300">Dir:</strong> ${nombresDirectores.join(', ')}</p>
            <p><strong class="text-slate-300">Reparto:</strong> ${nombresActores.slice(0, 3).join(', ')}...</p>
          </div>
        </div>
      </div>
      <div class="p-4 pt-0">
        <button onclick="event.stopPropagation(); eliminarPelicula(${peli.id})" class="text-xs text-rose-400 hover:text-rose-300 w-full text-right">
          Eliminar
        </button>
      </div>
    `;
    contenedor.appendChild(card);
  });
}

function renderizarPantallaGrupo(propiedad) {
  const titulosMap = {
    actores: '🎭 Actores',
    directores: '🎬 Directores',
    guionistas: '✍️ Guionistas',
    productores: '💼 Productores'
  };

  document.getElementById('titulo-seccion-grupo').textContent = titulosMap[propiedad] || 'Personas';
  const contenedor = document.getElementById('grid-personas-grupo');
  const mapaPersonas = new Map();

  miColeccion.forEach(peli => {
    const listaRol = peli[propiedad] || [];

    listaRol.forEach(p => {
      const esObjeto = typeof p === 'object' && p !== null;
      const nombre = esObjeto ? p.nombre : p;
      let foto = esObjeto && p.foto ? p.foto : null;

      if (!foto) {
        foto = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=1e293b&color=f59e0b&size=200`;
      }

      if (!mapaPersonas.has(nombre)) {
        mapaPersonas.set(nombre, {
          nombre: nombre,
          foto: foto,
          peliculas: [peli]
        });
      } else {
        const personaExistente = mapaPersonas.get(nombre);
        if (!personaExistente.peliculas.some(item => item.id === peli.id)) {
          personaExistente.peliculas.push(peli);
        }
      }
    });
  });

  const personasArray = Array.from(mapaPersonas.values()).map(persona => {
    const sumaNotas = persona.peliculas.reduce((acc, p) => acc + (p.notaPersonal || 0), 0);
    const notaPromedio = (sumaNotas / persona.peliculas.length).toFixed(1);
    return {
      ...persona,
      notaPromedio: parseFloat(notaPromedio)
    };
  });

  personasArray.sort((a, b) => {
    if (b.peliculas.length !== a.peliculas.length) {
      return b.peliculas.length - a.peliculas.length;
    }
    return b.notaPromedio - a.notaPromedio;
  });

  contenedor.innerHTML = personasArray.map(persona => {
    const miniPostersHtml = persona.peliculas.map(p => `
      <img 
        src="${p.poster}" 
        alt="${p.titulo}" 
        title="${p.titulo} (★ ${p.notaPersonal})" 
        onclick="event.stopPropagation(); verDetallePelicula(${p.id})"
        class="w-9 h-12 object-cover rounded border border-slate-700 hover:scale-110 hover:border-amber-400 transition cursor-pointer shadow-sm"
      >
    `).join('');

    const nombreEscapado = persona.nombre.replace(/'/g, "\\'");

    return `
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-between text-center space-y-3 hover:border-amber-500/50 transition">
        <div class="cursor-pointer w-full flex flex-col items-center" onclick="verDetallePersona('${nombreEscapado}', '${propiedad}')">
          <img 
            src="${persona.foto}" 
            alt="${persona.nombre}" 
            onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(persona.nombre)}&background=1e293b&color=f59e0b'"
            class="w-20 h-20 rounded-full object-cover border-2 border-amber-500 shadow-md mb-2"
          >
          <h4 class="text-sm font-semibold text-slate-100 line-clamp-1">${persona.nombre}</h4>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium">${persona.peliculas.length} peli(s)</span>
            <span class="text-xs bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded">★ ${persona.notaPromedio}</span>
          </div>
        </div>

        <div class="w-full pt-3 border-t border-slate-800">
          <div class="flex flex-wrap justify-center gap-1">
            ${miniPostersHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function verDetallePersona(nombrePersona, propiedad) {
  document.querySelectorAll('.seccion-pantalla').forEach(sec => sec.classList.add('hidden'));
  document.getElementById('sec-persona').classList.remove('hidden');

  const contenedor = document.getElementById('contenido-persona-individual');

  const pelisDePersona = miColeccion.filter(p => {
    const lista = p[propiedad] || [];
    return lista.some(item => (typeof item === 'string' ? item : item.nombre) === nombrePersona);
  });

  const sumaNotas = pelisDePersona.reduce((acc, p) => acc + (p.notaPersonal || 0), 0);
  const notaPromedio = pelisDePersona.length > 0 ? (sumaNotas / pelisDePersona.length).toFixed(1) : '0.0';

  let fotoPersona = null;
  pelisDePersona.forEach(p => {
    (p[propiedad] || []).forEach(item => {
      if (typeof item === 'object' && item !== null && item.nombre === nombrePersona && item.foto) {
        fotoPersona = item.foto;
      }
    });
  });

  if (!fotoPersona) {
    fotoPersona = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombrePersona)}&background=1e293b&color=f59e0b&size=300`;
  }

  let htmlPelis = pelisDePersona.map(p => `
    <div 
      onclick="verDetallePelicula(${p.id})" 
      class="bg-slate-950 p-4 rounded-xl border border-slate-800 flex gap-4 items-center hover:border-amber-500/60 transition cursor-pointer"
    >
      <img src="${p.poster}" class="w-16 h-24 object-cover rounded-lg border border-slate-700 flex-shrink-0">
      <div class="text-xs space-y-1">
        <div class="flex items-center justify-between gap-2">
          <h5 class="font-bold text-amber-400 text-base">${p.titulo} <span class="text-slate-400 font-normal text-xs">(${p.estreno || p.anio})</span></h5>
          <span class="bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded text-xs">★ ${p.notaPersonal}</span>
        </div>
        <p class="text-slate-400 line-clamp-2 leading-relaxed">${p.sinopsis}</p>
      </div>
    </div>
  `).join('');

  contenedor.innerHTML = `
    <div class="flex items-center gap-6 border-b border-slate-800 pb-6">
      <img 
        src="${fotoPersona}" 
        alt="${nombrePersona}" 
        onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(nombrePersona)}&background=1e293b&color=f59e0b'"
        class="w-28 h-28 rounded-full object-cover border-4 border-amber-500 shadow-xl flex-shrink-0"
      >
      <div class="space-y-2">
        <h3 class="text-3xl font-bold text-slate-100">${nombrePersona}</h3>
        <div class="flex items-center gap-4">
          <span class="text-sm text-slate-300 font-medium">${pelisDePersona.length} película(s) vista(s)</span>
          <span class="text-sm text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded border border-amber-500/20">Nota media: ★ ${notaPromedio}</span>
        </div>
      </div>
    </div>

    <div class="space-y-4">
      <h4 class="text-sm font-semibold text-slate-400 uppercase tracking-wider">Películas vistas en tu diario:</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${htmlPelis}
      </div>
    </div>
  `;
}

function verDetallePelicula(idPeli) {
  document.querySelectorAll('.seccion-pantalla').forEach(sec => sec.classList.add('hidden'));
  document.getElementById('sec-detalle-peli').classList.remove('hidden');

  const peli = miColeccion.find(p => p.id === idPeli);
  if (!peli) return;

  const contenedor = document.getElementById('contenido-detalle-peli');

  const nombresActores = (peli.actores || []).map(a => typeof a === 'string' ? a : a.nombre);
  const nombresDirectores = (peli.directores || []).map(d => typeof d === 'string' ? d : d.nombre);
  const nombresGuionistas = (peli.guionistas || []).map(g => typeof g === 'string' ? g : g.nombre);
  const nombresProductores = (peli.productores || []).map(p => typeof p === 'string' ? p : p.nombre);

  const textoGeneros = peli.generos ? peli.generos.join(', ') : 'No especificados';
  const textoPaises = peli.paises ? peli.paises.join(', ') : 'No especificados';
  const duracionVal = peli.duracion || peli.runtime;
  const textoDuracion = duracionVal ? `${duracionVal} minutos` : 'Desconocida';

  contenedor.innerHTML = `
    <div class="flex flex-col md:flex-row gap-6">
      <img src="${peli.poster}" class="w-48 h-72 object-cover rounded-xl border border-slate-700 flex-shrink-0 shadow-lg">
      <div class="space-y-3 text-sm flex-1">
        <h3 class="text-3xl font-bold text-amber-500">${peli.titulo} <span class="text-slate-400 text-xl font-normal">(${peli.estreno || peli.anio})</span></h3>
        <p class="text-amber-400 font-bold text-lg">Tu valoración: ★ ${peli.notaPersonal} / 10</p>
        <div class="space-y-1.5 text-slate-300 pt-2 border-t border-slate-800">
          <p><strong>⏱️ Duración:</strong> ${textoDuracion}</p>
          <p><strong>🎭 Géneros:</strong> ${textoGeneros}</p>
          <p><strong>🌍 País(es):</strong> ${textoPaises}</p>
          <p><strong>🎬 Director(es):</strong> ${nombresDirectores.join(', ')}</p>
          <p><strong>✍️ Guionista(s):</strong> ${nombresGuionistas.join(', ')}</p>
          <p><strong>💼 Productor(es):</strong> ${nombresProductores.join(', ')}</p>
        </div>
      </div>
    </div>
    <div class="mt-6 text-sm text-slate-300 space-y-3 pt-4 border-t border-slate-800">
      <h4 class="font-bold text-slate-100 text-base">Sinopsis:</h4>
      <p class="bg-slate-950 p-4 rounded-xl border border-slate-800 leading-relaxed text-slate-400">${peli.sinopsis}</p>
      <h4 class="font-bold text-slate-100 text-base pt-2">Reparto principal:</h4>
      <p class="text-slate-400 leading-relaxed">${nombresActores.join(', ')}</p>
    </div>
  `;
}

async function eliminarPelicula(id) {
  if (confirm('¿Seguro que quieres eliminar esta película?')) {
    miColeccion = miColeccion.filter(p => p.id !== id);
    await guardarEnFirebase();
    renderizarColeccion(miColeccion);
  }
}

function filtrarColeccion() {
  const texto = document.getElementById('filtro-local').value.toLowerCase();
  const filtradas = miColeccion.filter(p => {
    const nombresActores = (p.actores || []).map(a => typeof a === 'string' ? a : a.nombre);
    const nombresDirectores = (p.directores || []).map(d => typeof d === 'string' ? d : d.nombre);
    return p.titulo.toLowerCase().includes(texto) ||
      nombresDirectores.some(d => d.toLowerCase().includes(texto)) ||
      nombresActores.some(a => a.toLowerCase().includes(texto));
  });
  renderizarColeccion(filtradas);
}

// ESTADÍSTICAS Y GRÁFICOS
function actualizarGraficos() {
  let minutosTotales = 0;
  let sumaNotas = 0;

  miColeccion.forEach(p => {
    minutosTotales += (p.duracion || p.runtime || 0);
    sumaNotas += (p.notaPersonal || 0);
  });

  const horas = Math.floor(minutosTotales / 60);
  const mins = minutosTotales % 60;
  const promedioNota = miColeccion.length > 0 ? (sumaNotas / miColeccion.length).toFixed(1) : '0.0';

  if (document.getElementById('stat-horas')) document.getElementById('stat-horas').textContent = `${horas} h ${mins} min`;
  if (document.getElementById('stat-total')) document.getElementById('stat-total').textContent = miColeccion.length;
  if (document.getElementById('stat-promedio')) document.getElementById('stat-promedio').textContent = `${promedioNota} / 10`;

  const canvasNotas = document.getElementById('chartNotas');
  const canvasGeneros = document.getElementById('chartGeneros');
  const canvasPaises = document.getElementById('chartPaises');

  if (chartNotasInstance) chartNotasInstance.destroy();
  if (chartGenerosInstance) chartGenerosInstance.destroy();
  if (chartPaisesInstance) chartPaisesInstance.destroy();

  const notasContador = { '9-10': 0, '7-8': 0, '5-6': 0, '<5': 0 };
  miColeccion.forEach(p => {
    if (p.notaPersonal >= 9) notasContador['9-10']++;
    else if (p.notaPersonal >= 7) notasContador['7-8']++;
    else if (p.notaPersonal >= 5) notasContador['5-6']++;
    else notasContador['<5']++;
  });

  if (canvasNotas) {
    chartNotasInstance = new Chart(canvasNotas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(notasContador),
        datasets: [{
          data: Object.values(notasContador),
          backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#f43f5e']
        }]
      },
      options: { plugins: { legend: { labels: { color: '#94a3b8' } } } }
    });
  }

  const generosCount = {};
  miColeccion.forEach(p => {
    (p.generos || ['Sin género']).forEach(g => {
      generosCount[g] = (generosCount[g] || 0) + 1;
    });
  });

  if (canvasGeneros) {
    chartGenerosInstance = new Chart(canvasGeneros.getContext('2d'), {
      type: 'bar',
      data: {
        labels: Object.keys(generosCount),
        datasets: [{
          label: 'Películas',
          data: Object.values(generosCount),
          backgroundColor: '#3b82f6'
        }]
      },
      options: {
        indexAxis: 'y',
        scales: {
          x: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#1e293b' } },
          y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  const paisesCount = {};
  miColeccion.forEach(p => {
    (p.paises || ['Desconocido']).forEach(pais => {
      paisesCount[pais] = (paisesCount[pais] || 0) + 1;
    });
  });

  if (canvasPaises) {
    chartPaisesInstance = new Chart(canvasPaises.getContext('2d'), {
      type: 'bar',
      data: {
        labels: Object.keys(paisesCount),
        datasets: [{
          label: 'Películas',
          data: Object.values(paisesCount),
          backgroundColor: '#10b981'
        }]
      },
      options: {
        scales: {
          y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#1e293b' } },
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
}

// Exportar colección a un archivo JSON
function exportarColeccion() {
  if (miColeccion.length === 0) {
    alert("No tienes películas para exportar.");
    return;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(miColeccion, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `backup_peliculas_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Importar colección desde un archivo JSON a Firebase
function importarColeccion(event) {
  const fileReader = new FileReader();
  fileReader.onload = async function(e) {
    try {
      const pelisImportadas = JSON.parse(e.target.result);
      if (Array.isArray(pelisImportadas)) {
        if (confirm(`¿Quieres importar ${pelisImportadas.length} películas? Esto actualizará tu colección actual.`)) {
          miColeccion = pelisImportadas;
          await guardarEnFirebase();
          renderizarColeccion(miColeccion);
          alert("¡Colección restaurada y guardada en Firebase con éxito!");
        }
      } else {
        alert("El archivo no tiene el formato correcto.");
      }
    } catch (error) {
      alert("Error al leer el archivo JSON.");
    }
  };
  fileReader.readAsText(event.target.files[0]);
}

// Función para re-sincronizar y completar actores/directores/productores en películas viejas
async function reSincronizarPeliculas() {
  if (miColeccion.length === 0) {
    alert("No hay películas guardadas.");
    return;
  }

  if (!confirm("Se van a actualizar los datos del reparto y equipo técnico de tus películas antiguas sin borrar tus notas. ¿Deseas continuar?")) {
    return;
  }

  alert("Iniciando sincronización... Por favor espera unos segundos.");

  for (let peli of miColeccion) {
    try {
      const res = await fetch(`${TMDB_BASE_URL}/movie/${peli.id}/credits?api_key=${TMDB_API_KEY}&language=es-ES`);
      const credits = await res.json();

      if (credits.cast && credits.crew) {
        // Directores
        peli.directores = credits.crew
          .filter(c => c.job === 'Director')
          .map(c => ({
            nombre: c.name,
            foto: c.profile_path ? `${TMDB_IMAGE_URL}${c.profile_path}` : null
          }));

        // Guionistas
        peli.guionistas = credits.crew
          .filter(c => c.job === 'Screenplay' || c.job === 'Writer' || c.job === 'Author')
          .map(c => ({
            nombre: c.name,
            foto: c.profile_path ? `${TMDB_IMAGE_URL}${c.profile_path}` : null
          }));

        // Productores
        peli.productores = credits.crew
          .filter(c => c.job === 'Producer' || c.job === 'Executive Producer')
          .map(c => ({
            nombre: c.name,
            foto: c.profile_path ? `${TMDB_IMAGE_URL}${c.profile_path}` : null
          }));

        // Actores principales (Top 10)
        peli.actores = credits.cast
          .slice(0, 10)
          .map(c => ({
            nombre: c.name,
            foto: c.profile_path ? `${TMDB_IMAGE_URL}${c.profile_path}` : null
          }));
      }
    } catch (e) {
      console.error(`Error actualizando ${peli.titulo}:`, e);
    }
  }

  // Guardar en Firebase los datos actualizados
  await guardarEnFirebase();
  renderizarColeccion(miColeccion);
  alert("¡Sincronización completada con éxito! Ahora tus listas de actores y equipo están al 100%.");
}

function aplicarFiltrosYOrden() {
  const elemGenero = document.getElementById('filtro-genero');
  const elemDecada = document.getElementById('filtro-decada');
  const elemNota = document.getElementById('filtro-nota');
  const elemOrden = document.getElementById('orden-coleccion');

  const generoSel = elemGenero ? elemGenero.value : 'todos';
  const decadaSel = elemDecada ? elemDecada.value : 'todas';
  const notaMin = elemNota ? (parseFloat(elemNota.value) || 0) : 0;
  const criterioOrden = elemOrden ? elemOrden.value : 'recientes';

  let filtradas = miColeccion.filter(p => (p.estado || 'vista') === 'vista');

  // 1. Filtrar por Género
  if (generoSel !== 'todos') {
    filtradas = filtradas.filter(p => p.generos && p.generos.includes(generoSel));
  }

  // 2. Filtrar por Década
  if (decadaSel !== 'todas') {
    filtradas = filtradas.filter(p => {
      const anio = parseInt(p.anio || p.estreno);
      if (isNaN(anio)) return false;
      if (decadaSel === 'antiguas') return anio < 1970;
      const decadaNum = parseInt(decadaSel);
      return anio >= decadaNum && anio < decadaNum + 10;
    });
  }

  // 3. Filtrar por Nota Mínima
  if (notaMin > 0) {
    filtradas = filtradas.filter(p => (p.notaPersonal || 0) >= notaMin);
  }

  // 4. Ordenar
  filtradas.sort((a, b) => {
    switch (criterioOrden) {
      case 'nota-desc':
        return (b.notaPersonal || 0) - (a.notaPersonal || 0);
      case 'estreno-desc':
        return (parseInt(b.anio || b.estreno) || 0) - (parseInt(a.anio || a.estreno) || 0);
      case 'estreno-asc':
        return (parseInt(a.anio || a.estreno) || 0) - (parseInt(b.anio || b.estreno) || 0);
      case 'duracion-desc':
        return ((b.runtime || b.duracion) || 0) - ((a.runtime || a.duracion) || 0);
      case 'duracion-asc':
        return ((a.runtime || a.duracion) || 0) - ((b.runtime || b.duracion) || 0);
      case 'recientes':
      default:
        return (b.fechaAgregado || 0) - (a.fechaAgregado || 0);
    }
  });

  renderizarGridColeccion(filtradas);
}

function renderizarEstadisticas() {
  const vistas = miColeccion.filter(p => (p.estado || 'vista') === 'vista');

  // Total películas
  const elemTotal = document.getElementById('stat-total-pelis');
  if (elemTotal) elemTotal.textContent = vistas.length;

  // 1. Tiempo Total Invertido
  const minutosTotales = vistas.reduce((acc, p) => acc + (p.runtime || p.duracion || 0), 0);
  const dias = Math.floor(minutosTotales / (60 * 24));
  const horas = Math.floor((minutosTotales % (60 * 24)) / 60);
  const elemTiempo = document.getElementById('stat-tiempo-total');
  if (elemTiempo) elemTiempo.textContent = `${dias}d ${horas}h (${minutosTotales} min)`;

  // 2. Década Favorita
  const conteoDecadas = {};
  vistas.forEach(p => {
    const anio = parseInt(p.anio || p.estreno);
    if (!isNaN(anio)) {
      const decada = Math.floor(anio / 10) * 10;
      conteoDecadas[`${decada}s`] = (conteoDecadas[`${decada}s`] || 0) + 1;
    }
  });

  const decadaFavKeys = Object.keys(conteoDecadas);
  const decadaFav = decadaFavKeys.length > 0 
    ? decadaFavKeys.reduce((a, b) => conteoDecadas[a] > conteoDecadas[b] ? a : b) 
    : 'N/A';

  const elemDecada = document.getElementById('stat-decada-fav');
  if (elemDecada) elemDecada.textContent = decadaFav;
}