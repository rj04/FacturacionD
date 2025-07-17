document.getElementById('searchIn').addEventListener('input', function() {
    let query = this.value.trim();
    if (query.length >= 2) {
        fetch(`buscarInsumos.php?q=${query}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                let resultsTbody = document.getElementById('resultIn');
                resultsTbody.innerHTML = '';
                data.insumos.forEach(item => {
                    let row = document.createElement('tr'); 
                    row.innerHTML = `
                        <td>${item.codigoProyecto}</td>
                        <td>${item.material}</td>
                        <td>${item.unidadMedida}</td>
                        <td>${item.cantidad}</td>
                        <td>${item.fechaIngreso}</td>
                        <td>${item.procedencia}</td>  
                        <td>${item.oca}</td>
                        <td>
                            <a href="editarInsumos.php?idMaterial=${item.idMaterial}"><i class="bi bi-pencil"></i> Editar</a>
                        </td>
                        <td>
                            <a href="#" onclick="eliminarInsumos(${item.idMaterial})"><i class="bi bi-trash"></i> Eliminar</a>
                        </td>
                    `;
                    resultsTbody.appendChild(row);
                });

                // Construir la paginación
                let paginationUl = document.getElementById('pagination');
                paginationUl.innerHTML = '';
                for (let i = 1; i <= data.totalPages; i++) {
                    let li = document.createElement('li');
                    li.className = 'page-item';
                    li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
                    paginationUl.appendChild(li);
                }

                // Manejar eventos de click en la paginación
                paginationUl.querySelectorAll('a.page-link').forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        let page = this.getAttribute('data-page');
                        fetch(`buscarInsumos.php?q=${query}&page=${page}`)
                            .then(response => response.json())
                            .then(data => {
                                resultsTbody.innerHTML = '';
                                data.insumos.forEach(item => {
                                    let row = document.createElement('tr');
                                    row.innerHTML = `
                                        <td>${item.codigoProyecto}</td>
                                        <td>${item.material}</td>
                                        <td>${item.unidadMedida}</td>
                                        <td>${item.cantidad}</td>
                                        <td>${item.fechaIngreso}</td>
                                        <td>${item.procedencia}</td>  
                                        <td>${item.oca}</td>
                                        <td>
                                            <a href="editarInsumos.php?idMaterial=${item.idMaterial}"><i class="bi bi-pencil"></i> Editar</a>
                                        </td>
                                        <td>
                                            <a href="#" onclick="eliminarInsumos(${item.idMaterial})"><i class="bi bi-trash"></i> Eliminar</a>
                                        </td>
                                    `;
                                    resultsTbody.appendChild(row);
                                });
                            })
                            .catch(error => {
                                console.error('There was a problem with the fetch operation:', error);
                                alert('Hubo un problema con la operación de búsqueda. Consulte la consola para más detalles.');
                            });
                    });
                });
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
                alert('Hubo un problema con la operación de búsqueda. Consulte la consola para más detalles.');
            });
    } else {
        document.getElementById('resultIn').innerHTML = '';
    }
});

function eliminarInsumos(id) {
    if (confirm('¿Está seguro de que desea eliminar estos Insumos?')) {
        fetch('eliminarInsumos.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idMaterial: id })
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
}
