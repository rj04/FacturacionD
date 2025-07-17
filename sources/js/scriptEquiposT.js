document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById("searchEq");

    // Inicializa DataTables
    const table = $('#equiposTable').DataTable({
        "processing": true,
        "serverSide": true,
        "ajax": {
            "url": "buscarEquipos.php",
            "type": "GET",
            "data": function (d) {
                d.q = searchInput.value;  // Envía el valor de búsqueda
            }
        },
        "paging": true,
        "lengthChange": false,
        "pageLength": 10,  // Número de registros por página
        "searching": false,  // Desactiva la búsqueda incorporada de DataTables
        "info": true,
        "language": {
            "paginate": {
                "first": "Primera",
                "last": "Última",
                "next": "Siguiente",
                "previous": "Anterior"
            },
            "info": "Mostrando _START_ a _END_ de _TOTAL_ entradas",
            "infoEmpty": "No hay entradas disponibles",
            "infoFiltered": "(filtrado de _MAX_ entradas totales)"
        }
    });

    // Realiza una búsqueda en tiempo real
    searchInput.addEventListener("input", function() {
        table.ajax.reload();  // Recarga la tabla con la nueva búsqueda
    });

    // Abrir el modal al hacer clic en el botón de transferir
    $('#equiposTable').on('click', '.transfer-btn', function() {
        var idIngresoEq = $(this).data('id');
        $('#transferIdIngresoEq').val(idIngresoEq);
        $('#transferModal').modal('show');
    });

    // Manejar la búsqueda del proyecto en el modal
    $('#searchProyectoBtn').on('click', function() {
        var searchValue = $('#searchProyectoInput').val();
        // Realiza la búsqueda del proyecto aquí
        // Puedes hacer una llamada AJAX para buscar el proyecto y actualizar el modal
        $.ajax({
            type: 'GET',
            url: 'buscarProyectos.php', // Archivo PHP para buscar proyectos
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
            url: 'transferirEquipos.php', // Archivo PHP para manejar la transferencia
            data: formData,
            success: function(response) {
                // Manejar la respuesta del servidor
                try {
                    var res = JSON.parse(response);
                    alert(res.message);
                    if (res.status === "success") {
                        $('#transferModal').modal('hide');
                        table.ajax.reload(); // Recargar la tabla para ver los cambios
                        // Limpiar el formulario del modal
                        $('#transferForm')[0].reset();
                        $('#transferProyecto').empty();
                    }
                } catch (e) {
                    console.error("Error al parsear la respuesta JSON:", e);
                    console.error("Respuesta del servidor:", response);
                    alert("Error al transferir el equipo. Verifica la consola para más detalles.");
                }
            },
            error: function() {
                alert('Error al transferir el equipo');
            }
        });
    });
});