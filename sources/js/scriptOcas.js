document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search');
    const resultOca = document.getElementById('resultOca');
    const pagination = document.getElementById('pagination'); 
    let currentPage = 1;

    function fetchOcas(page = 1, search = '') {
        fetch(`buscarOcas.php?q=${encodeURIComponent(search)}&page=${page}`)
            .then(response => response.json())
            .then(data => {
                console.log('Datos recibidos del servidor:', data); // Mensaje de depuración

                const ocas = data.ocas;
                const totalPaginas = data.totalPaginas;
                const paginaActual = data.paginaActual;

                let html = '';
                ocas.forEach(oca => {
                    html += ` 
                    <tr>
                        <td>${oca.codigoProyecto} ${oca.proyecto}</td>
                        <td>${oca.oca}</td>
                        <td>${oca.residente}</td>
                        <td>${oca.proveedor}</td>
                        <td>${oca.formaPago}</td>
                        <td>${oca.fechaEntrega}</td>
                        <td>${oca.estado}</td>
                        <td><a href="editarOcas.php?idOca=${oca.idOca}"><i class="bi bi-pencil"></i> Editar</a></td>
                        <td><a href="#" onclick="confirmarEliminacion(${oca.idOca})"><i class="bi bi-trash"></i> Eliminar</a></td>
                    </tr>
                    `;
                });
                resultOca.innerHTML = html;

                let paginationHtml = '';
                const startPage = Math.floor((paginaActual - 1) / 10) * 10 + 1;
                const endPage = Math.min(startPage + 9, totalPaginas);

                if (startPage > 1) {
                    paginationHtml += `
                        <li class="page-item">
                            <a class="page-link" href="#" data-page="${startPage - 1}">Anterior</a>
                        </li>
                    `;
                }

                for (let i = startPage; i <= endPage; i++) {
                    paginationHtml += `
                        <li class="page-item ${paginaActual == i ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
                }

                if (endPage < totalPaginas) {
                    paginationHtml += `
                        <li class="page-item">
                            <a class="page-link" href="#" data-page="${endPage + 1}">Siguiente</a>
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
        fetchOcas(1, search);
    });

    pagination.addEventListener('click', function(e) {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');
            fetchOcas(page, searchInput.value);
        }
    });

    // Inicializar con la primera página y sin búsqueda
    fetchOcas();
});

function confirmarEliminacion(id) {
    if (confirm('¿Está seguro de que desea eliminar esta orden de compra?')) {
        eliminarOca(id);
    }
}

function eliminarOca(id) {
    fetch('eliminarOcas.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idoca: id })
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