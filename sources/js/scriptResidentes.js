document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('searchRe').addEventListener('input', function () {
        let query = this.value.trim();
        if (query.length >= 2) {
            fetch(`buscarResidentes.php?q=${query}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    let resultsTbody = document.getElementById('resultRe');
                    if (resultsTbody) {
                        resultsTbody.innerHTML = '';
                        data.residentes.forEach(item => {
                            let row = document.createElement('tr');
                            row.innerHTML = `
                                <td>${item.residente}</td>
                                <td>
                                    <a href="editarResidente.php?idResidente=${item.idResidente}"><i class="bi bi-pencil"></i> Editar</a>
                                </td>
                                <td>
                                    <a href="#" onclick="eliminarResidente(${item.idResidente})"><i class="bi bi-trash"></i> Eliminar</a>
                                </td>
                            `;
                            resultsTbody.appendChild(row);
                        });
                    }
                })
                .catch(error => {
                    console.error('There was a problem with the fetch operation:', error);
                });
        } else {
            let resultsTbody = document.getElementById('resultRe');
            if (resultsTbody) {
                resultsTbody.innerHTML = '';
            }
        }
    });
});


function eliminarResidente(id) {
    if (confirm('¿Está seguro de que desea eliminar este Residente?')) {
        fetch('eliminarResidente.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idResidente: id })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Residente eliminado exitosamente');
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
