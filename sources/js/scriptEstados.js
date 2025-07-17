document.getElementById('search').addEventListener('input', function() {
    let query = this.value;
    if (query.length >= 2) {
        fetch(`buscarEstados.php?q=${query}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                let resultsTbody = document.getElementById('results');
                resultsTbody.innerHTML = '';
                data.forEach(item => {
                    let row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.estado}</td>
                        <td>
                            <a href="editarEstados.php?idEstado=${item.idEstado}"><i class="bi bi-pencil"></i> Editar</a>
                        </td>
                        <td>
                            <a href="eliminarEstados.php?idEstado=${item.idEstado}"><i class="bi bi-trash"></i> Eliminar</a>
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
        document.getElementById('results').innerHTML = '';
    }
});