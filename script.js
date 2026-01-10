let db;
let pestañaActual = 'pendientes';
let imagenBase64 = "";
let editandoId = null;
let filtroBiblioteca = 'actores';

// 1. BASE DE DATOS INICIALIZACIÓN
const request = indexedDB.open("CineTrackDB", 1);
request.onupgradeneeded = e => {
    db = e.target.result;
    db.createObjectStore("peliculas", { keyPath: "id" });
    db.createObjectStore("fotosPersonas", { keyPath: "nombre" });
};
request.onsuccess = e => {
    db = e.target.result;
    console.log("DB Lista");
    migrarDatosAntiguos();
};

function migrarDatosAntiguos() {
    if (localStorage.getItem('migracion_v3')) return;
    const p = JSON.parse(localStorage.getItem('pendientes')) || [];
    const v = JSON.parse(localStorage.getItem('vistas')) || [];
    const tx = db.transaction("peliculas", "readwrite");
    const store = tx.objectStore("peliculas");
    [...p.map(x=>({...x, tipo:'pendientes'})), ...v.map(x=>({...x, tipo:'vistas'}))].forEach(item => {
        item.id = Number(item.id) || Date.now() + Math.random();
        store.put(item);
    });
    tx.oncomplete = () => { localStorage.setItem('migracion_v3', 'true'); location.reload(); };
}

// 2. NAVEGACIÓN
function toggleMenu() {
    const nav = document.getElementById("menu-lateral");
    nav.style.width = nav.style.width === "270px" ? "0" : "270px";
}

function irA(tipo) {
    if(document.getElementById("menu-lateral").style.width === "270px") toggleMenu();
    pestañaActual = tipo;
    document.getElementById('seccion-inicio').style.display = 'none';
    document.getElementById('pantalla-biblioteca').style.display = 'none';
    document.getElementById('seccion-listado').style.display = 'block';
    document.getElementById('ordenar-vistas').style.display = tipo === 'vistas' ? 'block' : 'none';
    mostrarPelis();
}

function volverInicio() {
    pestañaActual = 'inicio';
    document.getElementById('seccion-inicio').style.display = 'block';
    document.getElementById('seccion-listado').style.display = 'none';
    document.getElementById('pantalla-biblioteca').style.display = 'none';
    limpiarFormulario();
}

// 3. IMÁGENES ALTA CALIDAD
function previsualizar(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; 
                const scale = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                imagenBase64 = canvas.toDataURL('image/jpeg', 0.9);
                document.getElementById('preview-portada').innerHTML = `<img src="${imagenBase64}" style="width:100px; border-radius:8px;">`;
            };
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// 4. GUARDADO Y LISTADO
function agregarNueva() {
    const titulo = document.getElementById('titulo').value;
    if (!titulo) return alert("El título es obligatorio");

    const peli = {
        id: editandoId || Date.now(),
        titulo: titulo,
        año: document.getElementById('año').value,
        genero: document.getElementById('genero').value,
        director: document.getElementById('director').value,
        actores: document.getElementById('actores').value,
        plataforma: document.getElementById('plataforma').value,
        portada: imagenBase64 || 'https://via.placeholder.com/300x450',
        sinopsis: document.getElementById('sinopsis').value,
        fechaVista: document.getElementById('fechaVista').value,
        nota: document.getElementById('nota').value,
        tipo: (document.getElementById('nota').value) ? 'vistas' : 'pendientes',
        vecesVista: (editandoId) ? undefined : 0 // Se maneja en marcarVista
    };

    const tx = db.transaction("peliculas", "readwrite");
    tx.objectStore("peliculas").put(peli);
    tx.oncomplete = () => { volverInicio(); alert("Guardado con éxito"); };
}

function mostrarPelis() {
    const listaUI = document.getElementById('lista-items');
    const filtro = document.getElementById('buscar-peli').value.toLowerCase();
    const orden = document.getElementById('ordenar-vistas').value;
    listaUI.innerHTML = '';
    
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = e => {
        let items = e.target.result.filter(p => p.tipo === pestañaActual && p.titulo.toLowerCase().includes(filtro));
        
        document.getElementById('titulo-listado').innerText = `${pestañaActual === 'pendientes' ? '🍿 Pendientes' : '✅ Ya Vistas'} (${items.length})`;

        // ORDENACIÓN DINÁMICA
        if (pestañaActual === 'vistas') {
            if (orden === 'nota') items.sort((a,b) => (b.nota || 0) - (a.nota || 0));
            else if (orden === 'veces') items.sort((a,b) => (b.vecesVista || 0) - (a.vecesVista || 0));
            else items.sort((a,b) => b.id - a.id);
        } else {
            items.sort((a,b) => b.id - a.id);
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'mini-card-peli';
            const badgePlat = item.plataforma ? `badge-${item.plataforma.toLowerCase().split(' ')[0].replace('+', '')}` : '';
            
            div.innerHTML = `
                ${item.tipo === 'vistas' ? `<span class="nota-mini">⭐ ${item.nota}</span>${item.vecesVista > 1 ? `<span class="veces-mini">x${item.vecesVista}</span>` : ''}` 
                : `<span class="plataforma-badge ${badgePlat}">${item.plataforma || 'Varios'}</span>`}
                <img src="${item.portada}" loading="lazy">
            `;
            div.onclick = () => abrirZoom(item);
            listaUI.appendChild(div);
        });
    };
}

// 5. GESTIÓN DE VISIONADOS Y ZOOM
function marcarVista(id) {
    const tx = db.transaction("peliculas", "readwrite");
    const store = tx.objectStore("peliculas");
    store.get(id).onsuccess = e => {
        const p = e.target.result;
        if (!p.nota || p.tipo === 'pendientes') {
            const n = prompt("Nota (1-10):", "5");
            if (n) p.nota = n;
        }
        p.tipo = 'vistas';
        p.vecesVista = (p.vecesVista || 0) + 1;
        const hoy = new Date().toLocaleDateString('es-ES');
        if (!p.historialFechas) p.historialFechas = [];
        p.historialFechas.push(hoy);
        
        store.put(p).onsuccess = () => { cerrarZoom(); irA('vistas'); };
    };
}

function abrirZoom(item) {
    const modal = document.getElementById('zoom-modal');
    modal.style.display = "block";
    document.getElementById('img-zoom').src = item.portada;
    
    const historial = item.historialFechas ? item.historialFechas.join(', ') : (item.fechaVista || 'Sin fecha');
    const infoVista = item.tipo === 'vistas' ? `
        <div style="background:#222; padding:10px; border-radius:8px; margin-top:10px; text-align:left; border-left:4px solid var(--main-red);">
            <p style="margin:0; color:#ffc107;">🎬 Veces vista: ${item.vecesVista || 1}</p>
            <p style="margin:5px 0 0 0; font-size:12px; color:#888;">📅 Historial: ${historial}</p>
        </div>` : '';

    document.getElementById('caption-zoom').innerHTML = `
        <h2 style="color:var(--main-red); margin:15px 0 5px 0;">${item.titulo}</h2>
        <p style="color:#888; margin-bottom:15px;">${item.director} | ${item.año}</p>
        <p style="font-size:14px; text-align:left; line-height:1.4;">${item.sinopsis || 'Sin descripción.'}</p>
        ${infoVista}
        <div style="display:flex; gap:10px; margin-top:20px;">
            <button onclick="marcarVista(${item.id})" style="flex:2; background:#28a745; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">${item.tipo === 'pendientes' ? '✅ MARCAR VISTA' : '➕ REVER'}</button>
            <button onclick="prepararEdicion(${JSON.stringify(item).replace(/"/g, '&quot;')})" style="flex:1; background:#007bff; border:none; color:white; padding:12px; border-radius:8px;">✏️</button>
            <button onclick="eliminarPeli(${item.id})" style="flex:1; background:var(--main-red); border:none; color:white; padding:12px; border-radius:8px;">🗑️</button>
        </div>
    `;
}

// 6. BIBLIOTECA RANKING
function abrirBiblioteca(tipo) {
    toggleMenu();
    filtroBiblioteca = tipo;
    document.getElementById('seccion-inicio').style.display = 'none';
    document.getElementById('seccion-listado').style.display = 'none';
    document.getElementById('pantalla-biblioteca').style.display = 'block';
    document.getElementById('titulo-biblio').innerText = tipo === 'actores' ? '👥 Mis Actores Favoritos' : '🎬 Mis Directores Favoritos';
    generarBiblioteca();
}

function generarBiblioteca() {
    const grid = document.getElementById('grid-reparto');
    const buscador = document.getElementById('buscar-reparto').value.toLowerCase();
    grid.innerHTML = '';

    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = e => {
        const todas = e.target.result;
        let conteo = {};

        todas.forEach(p => {
            let nombres = (filtroBiblioteca === 'directores') ? [p.director] : (p.actores ? p.actores.split(',') : []);
            nombres.forEach(n => {
                let nom = n.trim();
                if(!nom) return;
                if(!conteo[nom]) conteo[nom] = 0;
                if(p.tipo === 'vistas') conteo[nom] += (p.vecesVista || 1);
            });
        });

        const ordenados = Object.keys(conteo)
            .filter(n => n.toLowerCase().includes(buscador))
            .sort((a,b) => conteo[b] - conteo[a]);

        db.transaction("fotosPersonas").objectStore("fotosPersonas").getAll().onsuccess = ev => {
            const fotosMap = {};
            ev.target.result.forEach(f => fotosMap[f.nombre] = f.foto);

            ordenados.forEach(n => {
                const card = document.createElement('div');
                card.className = 'persona-card';
                card.innerHTML = `<img class="avatar" src="${fotosMap[n] || 'https://via.placeholder.com/150'}"><h4>${n}</h4><div class="mini-galeria"></div>`;
                
                todas.filter(p => p.tipo === 'vistas' && (p.director === n || (p.actores && p.actores.includes(n)))).forEach(p => {
                    const m = document.createElement('img');
                    m.src = p.portada; m.style = "width:30px; height:42px; margin:2px; border-radius:3px; cursor:pointer; object-fit:cover;";
                    m.onclick = (ex) => { ex.stopPropagation(); abrirZoom(p); };
                    card.querySelector('.mini-galeria').appendChild(m);
                });
                card.querySelector('.avatar').onclick = () => cambiarFoto(n);
                grid.appendChild(card);
            });
        };
    };
}

// AUXILIARES
function eliminarPeli(id) {
    if (!confirm("¿Borrar definitivamente?")) return;
    db.transaction("peliculas", "readwrite").objectStore("peliculas").delete(id).onsuccess = () => { cerrarZoom(); mostrarPelis(); };
}
function cerrarZoom() { document.getElementById('zoom-modal').style.display = 'none'; }
function limpiarFormulario() {
    editandoId = null;
    document.querySelectorAll('input, textarea, select').forEach(el => el.value = '');
    document.getElementById('preview-portada').innerHTML = '<p>🖼️ Toca para subir el póster</p>';
    imagenBase64 = "";
}
function cambiarFoto(n) {
    const input = document.getElementById('input-foto-persona');
    input.onchange = e => {
        const reader = new FileReader();
        reader.onload = ev => {
            db.transaction("fotosPersonas", "readwrite").objectStore("fotosPersonas").put({nombre: n, foto: ev.target.result});
            setTimeout(generarBiblioteca, 200);
        };
        reader.readAsDataURL(e.target.files[0]);
    };
    input.click();
}
function prepararEdicion(item) {
    cerrarZoom(); volverInicio();
    editandoId = item.id;
    document.getElementById('titulo').value = item.titulo;
    document.getElementById('director').value = item.director;
    document.getElementById('actores').value = item.actores;
    document.getElementById('sinopsis').value = item.sinopsis;
    document.getElementById('nota').value = item.nota || '';
    document.getElementById('fechaVista').value = item.fechaVista || '';
    document.getElementById('campos-vistas-edit').style.display = 'block';
    imagenBase64 = item.portada;
    document.getElementById('preview-portada').innerHTML = `<img src="${item.portada}" style="width:100px;">`;
}

function abrirEstadisticas() {
    toggleMenu();
    document.getElementById('seccion-inicio').style.display = 'none';
    document.getElementById('seccion-listado').style.display = 'none';
    document.getElementById('pantalla-biblioteca').style.display = 'none';
    document.getElementById('pantalla-estadisticas').style.display = 'block';
    calcularEstadisticas();
}

function calcularEstadisticas() {
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = e => {
        const todas = e.target.result;
        const vistas = todas.filter(p => p.tipo === 'vistas');
        
        // 1. Tiempo estimado (asumimos 105 min por peli de media)
        const totalMinutos = vistas.reduce((acc, p) => acc + (p.vecesVista || 1) * 105, 0);
        const horas = Math.floor(totalMinutos / 60);
        const dias = (horas / 24).toFixed(1);

        // 2. Géneros y Años favoritos
        let generos = {};
        let años = {};
        
        vistas.forEach(p => {
            // Géneros
            if (p.genero) {
                p.genero.split(',').forEach(g => {
                    let gen = g.trim();
                    generos[gen] = (generos[gen] || 0) + 1;
                });
            }
            // Años
            if (p.año) {
                años[p.año] = (años[p.año] || 0) + 1;
            }
        });

        const topGenero = Object.entries(generos).sort((a,b) => b[1] - a[1])[0] || ["-", 0];
        const topAño = Object.entries(años).sort((a,b) => b[1] - a[1])[0] || ["-", 0];

        // Renderizar en pantalla
        document.getElementById('stats-resumen').innerHTML = `
            <div class="stat-box"><h3>Películas</h3><p>${vistas.length}</p></div>
            <div class="stat-box"><h3>Visionados</h3><p>${vistas.reduce((acc, p) => acc + (p.vecesVista || 1), 0)}</p></div>
            <div class="stat-box"><h3>Tiempo</h3><p>${horas}h <small style="font-size:12px;">(${dias}d)</small></p></div>
            <div class="stat-box"><h3>Año de Oro</h3><p>${topAño[0]}</p></div>
        `;

        document.getElementById('stats-detalles').innerHTML = `
            <h3 style="color:#888; font-size:14px; margin-bottom:10px;">TUS TOP GÉNEROS</h3>
            ${Object.entries(generos).sort((a,b) => b[1] - a[1]).slice(0, 5).map(g => `
                <div class="stat-item">
                    <span>${g[0]}</span>
                    <span style="color:var(--main-red); font-weight:bold;">${g[1]} pelis</span>
                </div>
            `).join('')}
        `;
    };

}

function abrirEstadisticas() {
    toggleMenu(); // Cierra el menú al abrir stats
    // Ocultar todas las pantallas
    document.querySelectorAll('.container').forEach(c => c.style.display = 'none');
    document.getElementById('seccion-inicio').style.display = 'none';
    document.getElementById('seccion-listado').style.display = 'none';
    
    // Mostrar pantalla stats
    const pantallaStats = document.getElementById('pantalla-estadisticas');
    if(pantallaStats) {
        pantallaStats.style.display = 'block';
        calcularEstadisticas();
    }
}

// Esta versión intenta capturar todo el contenido
function exportarDatos() {
    const tx = db.transaction("peliculas", "readonly");
    const store = tx.objectStore("peliculas");
    
    store.getAll().onsuccess = (e) => {
        const todasLasPelis = e.target.result;
        
        // Creamos el archivo incluyendo los datos de imagen si existen
        const data = JSON.stringify(todasLasPelis);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = `cine_total_con_fotos_${new Date().getDate()}.json`;
        a.click();
        
        alert("Copia completa generada. ¡Pásala a tu otro dispositivo!");
    };
}

function importarDatos(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const pelis = JSON.parse(e.target.result);
            const tx = db.transaction("peliculas", "readwrite");
            const store = tx.objectStore("peliculas");
            pelis.forEach(p => store.put(p));
            tx.oncomplete = () => {
                alert("¡Base de datos actualizada!");
                location.reload();
            };
        } catch (err) {
            alert("Error al leer el archivo");
        }
    };
    reader.readAsText(input.files[0]);
}

