document.getElementById('searchPro').addEventListener('input', function() {
    let query = this.value;
    if (query.length >= 2) {
        fetch(`buscarProyectos.php?q=${query}`) 
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log(data);
                let resultsTbody = document.getElementById('resultPro');
                resultsTbody.innerHTML = '';
                data.forEach(item => {
                    let row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.codigoProyecto}</td>
                        <td>${item.proyecto}</td>
                        <td>${item.nombreProyecto}</td>
                        <td>${item.tipo}</td>
                        <td>${item.status}</td>
                        <td>
                            <a href="editarProyectos.php?idProyecto=${item.idProyecto}"><i class="bi bi-pencil"></i> Editar</a>
                        </td>
                        <td>
                        <a href="#" onclick="console.log(${item.idProyecto}); eliminarProyecto(${item.idProyecto})"><i class="bi bi-trash"></i> Eliminar</a>
                        </td>
                    `;
                    resultsTbody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
                alert('Hubo un problema con la operación de búsqueda. Consulte la consola para más detalles.');
            });
    } else {
        document.getElementById('resultPro').innerHTML = '';
    }
});

function eliminarProyecto(id) {
    if (confirm('¿Está seguro de que desea eliminar este Proyecto?')) {
        fetch('eliminarProyecto.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idProyecto: id }) // Usar el parámetro id
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Proyecto eliminado exitosamente');
                document.getElementById('searchPro').dispatchEvent(new Event('input')); // Actualizar la lista de proyectos
            } else {
                alert('Error al eliminar el Proyecto: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Hubo un error al eliminar el Proyecto');
        });
    }
}
