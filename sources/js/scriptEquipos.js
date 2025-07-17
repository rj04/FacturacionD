document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById("searchEq");

    // Inicializa DataTables
    const table = $('#equiposTable').DataTable({
        processing: true,
        serverSide: true,
        ajax: {
            url: "buscarEquipos.php",
            type: "GET",
            data: function (d) {
                d.q = searchInput.value.trim();  // Envía el valor de búsqueda
            }
        },
        paging: true,
        lengthChange: false,
        pageLength: 10,  // Número de registros por página
        searching: false,  // Desactiva la búsqueda incorporada de DataTables
        info: true,
        language: {
            paginate: {
                first: "Primera",
                last: "Última",
                next: "Siguiente",
                previous: "Anterior"
            },
            info: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
            infoEmpty: "No hay entradas disponibles",
            infoFiltered: "(filtrado de _MAX_ entradas totales)"
        },
        columns: [
            { data: "codigoProyecto" },
            { data: "equipo" },
            { data: "activoFijo" },
            { data: "cantidad" },
            { data: "fechaIngreso" },
            { data: "procedencia" },
            { data: "oca" },
            { data: "estado" },
            { data: "movido" },

            { 
                data: "idIngresoEq",
                render: function(data) {
                    return `<button class="btn btn-sm btn-success transfer-btn" data-id="${data}">
                    <i class="bi bi-box-arrow-right"></i> Transferir</button>`;
                }
            },
            // Nueva columna para ver las transferencias
            {
                data: "idIngresoEq",
                render: function(data) {
                    return `<a href="detalleTransferenciasEq.php?idIngresoEq=${data}" class="ver-transferencias btn btn-info btn-sm">
                    <i class="bi bi-eye"></i> Detalle</a>`;
                }
            }
        ]
    });

    // Realiza búsqueda en tiempo real
    searchInput.addEventListener("input", function() {
        table.ajax.reload();  // Recarga la tabla
    });

    // Función para confirmar eliminación
    window.confirmarEliminacion = function(id) {
        if (confirm('¿Está seguro de que desea eliminar este equipo?')) {
            eliminarEquipo(id);
        }
    }

    // Función para eliminar equipo
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
                table.ajax.reload(); // Recargar tabla sin recargar página
            } else {
                alert('Error al eliminar el registro: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Hubo un error al procesar la solicitud. Consulte la consola para más detalles.');
        });
    }

    // Abrir el modal al hacer clic en Transferir
    $('#equiposTable').on('click', '.transfer-btn', function() {
        var idIngresoEq = $(this).data('id');
        $('#transferIdIngresoEq').val(idIngresoEq);
        $('#transferModal').modal('show');
    });

    // Manejar la búsqueda de proyectos en el modal
    $('#searchProyectoBtn').on('click', function() {
        var searchValue = $('#searchProyectoInput').val();
        $.ajax({
            type: 'GET',
            url: 'buscarProyectos.php',
            data: { q: searchValue },
            success: function(response) {
                var proyectos = JSON.parse(response);
                var select = $('#transferProyecto');
                select.empty();
                proyectos.forEach(function(proyecto) {
                    select.append(new Option(proyecto.nombre, proyecto.id));
                });
            },
            error: function() {
                alert('Error al buscar proyectos');
            }
        });
    });

    // Manejar la transferencia de equipo
    $('#transferForm').on('submit', function(e) {
        e.preventDefault();

        var formData = $(this).serialize();

        $.ajax({
            type: 'POST',
            url: 'transferirEquipos.php',
            data: formData,
            dataType: 'json',
            success: function(response) {
                console.log('Respuesta del servidor:', response);
                try {
                    if (response.status === 'success') {
                        alert(response.message);
                        $('#transferModal').modal('hide');
                        $('#equiposTable').DataTable().ajax.reload();
                    } else {
                        alert('Error: ' + response.message);
                    }
                } catch (err) { // <-- Este catch se activaba por el JSON.parse() erróneo
                    console.error("Error al parsear la respuesta JSON:", err); // Línea ~145
                    // Este alert ya no debería mostrarse si quitas el JSON.parse()
                    alert('Error al procesar la respuesta del servidor. Verifica la consola.');
                }
            },
            error: function(xhr, status, error) {
                // Este callback 'error' se dispara si el servidor devuelve un status != 2xx
                // O si el JSON recibido del servidor es INVÁLIDO (pero en tu caso era válido)
                console.error('Error AJAX:', status, error, xhr.responseText);
                alert('Error de comunicación al intentar transferir. Revise la consola.');
            },
        });
    });
    // Limpiar el formulario cuando el modal se cierra (opcional)
    $('#transferModal').on('hidden.bs.modal', function () {
        $('#transferForm')[0].reset();
        $('#proyectoList').html(''); // Limpiar lista de proyectos
    });
});