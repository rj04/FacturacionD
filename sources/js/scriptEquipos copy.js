document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchEq');
    const resultEq = document.getElementById('resultEq');
    const pagination = document.getElementById('pagination');
    let currentPage = 1;

    function fetchEquipos(page = 1, search = '') {
        fetch(`buscarEquipos.php?q=${encodeURIComponent(search)}&page=${page}`)
            .then(response => response.json())
            .then(data => {
                console.log('Datos recibidos del servidor:', data); // Mensaje de depuración

                const equipos = data.equipos;
                const totalPaginas = data.totalPaginas;
                const paginaActual = data.paginaActual;

                let html = '';
                equipos.forEach(equipo => {
                    html += ` 
                        <tr>
                            <td>${equipo.codigoProyecto}</td>
                            <td>${equipo.equipo}</td>
                            <td>${equipo.activoFijo}</td>
                            <td>${equipo.cantidad}</td>
                            <td>${equipo.fechaIngreso}</td>
                            <td>${equipo.procedencia}</td>
                            <td>${equipo.oca}</td>
                            <td>${equipo.estado}</td>
                            <td>${equipo.movido}</td>
                            <td><a href="editarEquipos.php?idEquipo=${equipo.idIngresoEq}"><i class="bi bi-pencil"></i> Editar</a></td>
                            <td><a href="#" onclick="confirmarEliminacion(${equipo.idIngresoEq})"><i class="bi bi-trash"></i> Eliminar</a></td>
                        </tr>
                    `;
                });
                resultEq.innerHTML = html;

                let paginationHtml = '';
                for (let i = 1; i <= totalPaginas; i++) {
                    paginationHtml += `
                        <li class="page-item ${paginaActual == i ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
                }
                pagination.innerHTML = paginationHtml;
            })
            .catch(error => {
                console.error('Hubo un problema con la fetch operation:', error);
                alert('Hubo un problema con la operación de búsqueda. Consulte la consola para más detalles.');
            });
    }

    searchInput.addEventListener('input', function() {
        const search = this.value;
        fetchEquipos(1, search);
    });

    pagination.addEventListener('click', function(e) {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');
            fetchEquipos(page, searchInput.value);
        }
    });

    // Inicializar con la primera página y sin búsqueda
    fetchEquipos();
});

function confirmarEliminacion(id) {
    if (confirm('¿Está seguro de que desea eliminar este equipo?')) {
        eliminarEquipo(id);
    }
}

function eliminarEquipo(id) {
    fetch('eliminarEquipos.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idEquipo: id })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Registro eliminado exitosamente');
            window.location.reload();
        } else {
            alert('Error al eliminar el registro: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Hubo un error al procesar la solicitud. Consulte la consola para más detalles.');
    });
}

