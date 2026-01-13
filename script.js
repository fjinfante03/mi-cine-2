// Esperar a que el HTML cargue por completo
document.addEventListener('DOMContentLoaded', mostrarPelis);

function agregarNueva() {
    // Capturar los valores de los inputs
    const titulo = document.getElementById('titulo').value;
    const portadaInput = document.getElementById('portada').value;
    const actores = document.getElementById('actores').value;
    const sinopsis = document.getElementById('sinopsis').value;

    // Validación mínima: el título es obligatorio
    if (!titulo) {
        alert("Por favor, introduce al menos el título de la película.");
        return;
    }

    // Si la URL de la portada está vacía, usamos una imagen por defecto
    const portada = portadaInput || 'https://via.placeholder.com/150x225?text=Sin+Portada';

    // Crear el objeto de la película
    const item = { 
        titulo, 
        portada, 
        actores: actores || "No especificados", 
        sinopsis: sinopsis || "Sin sinopsis disponible.", 
        id: Date.now() // Generamos un ID único basado en la fecha/hora
    };

    // Obtener la lista actual de LocalStorage o crear una vacía si no existe
    let lista = JSON.parse(localStorage.getItem('misPelis')) || [];
    
    // Añadir la nueva peli al principio de la lista
    lista.unshift(item); 
    
    // Guardar de nuevo en LocalStorage
    localStorage.setItem('misPelis', JSON.stringify(lista));

    // Limpiar los campos del formulario para la siguiente película
    document.getElementById('titulo').value = '';
    document.getElementById('portada').value = '';
    document.getElementById('actores').value = '';
    document.getElementById('sinopsis').value = '';

    // Actualizar la vista
    mostrarPelis();
}

function mostrarPelis() {
    const listaUI = document.getElementById('lista-items');
    listaUI.innerHTML = ''; // Limpiar la lista antes de volver a pintarla
    
    const lista = JSON.parse(localStorage.getItem('misPelis')) || [];

    // Dibujar cada tarjeta
    lista.forEach(item => {
        listaUI.innerHTML += `
            <div class="card">
                <img src="${item.portada}" alt="Poster de ${item.titulo}">
                <div class="card-content">
                    <h3>${item.titulo}</h3>
                    <span class="actores">👥 ${item.actores}</span>
                    <p>${item.sinopsis}</p>
                    <button class="btn-borrar" onclick="borrarPeli(${item.id})">Eliminar</button>
                </div>
            </div>
        `;
    });
}

function borrarPeli(id) {
    if (confirm("¿Seguro que quieres eliminar esta película?")) {
        let lista = JSON.parse(localStorage.getItem('misPelis'));
        // Filtrar la lista para quitar la película con el ID seleccionado
        lista = lista.filter(item => item.id !== id);
        // Guardar la lista actualizada
        localStorage.setItem('misPelis', JSON.stringify(lista));
        // Refrescar la pantalla
        mostrarPelis();
    }
}
