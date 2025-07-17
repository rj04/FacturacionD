// Define la variable table en un alcance más amplio
let table;

document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById("searchHe");
    table = $('#herramientasTable').DataTable({
        "processing": true,
        "serverSide": true,
        "ajax": {
            "url": "buscarHerramientas.php",
            "type": "GET",
            "data": function (d) {
                if (searchInput) {
                    d.q = searchInput.value;  // Envía el valor de búsqueda
                }
            }
        },
        "paging": true,
        "lengthChange": false,
        "pageLength": 10,
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

    if (searchInput) {
        searchInput.addEventListener("input", function() {
            // Usa el método search() de DataTables para realizar la búsqueda
            table.search(searchInput.value).draw();
        });
    } else {
        console.warn("El elemento con ID 'searchHe' no existe.");
    }
});

// Abrir el modal al hacer clic en el botón de transferir
$('#herramientasTable').on('click', '.transfer-btn', function() {
    var idHerramienta = $(this).data('id');
    $('#transferIdHerramienta').val(idHerramienta);
    $('#transferModal').modal('show');
});

// Manejar la búsqueda del proyecto en el modal
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

// Manejar la transferencia de herramienta
$('#transferForm').on('submit', function(e) {
    e.preventDefault();

    var formData = $(this).serialize();

    $.ajax({
        type: 'POST',
        url: 'transferirHerramientas.php',
        data: formData,
        success: function(response) {
            try {
                var res = JSON.parse(response);
                alert(res.message);
                if (res.status === "success") {
                    $('#transferModal').modal('hide');
                    if (table) {
                        table.ajax.reload(); // Recargar la tabla para ver los cambios
                    }
                    $('#transferForm')[0].reset();
                    $('#transferProyecto').empty();
                }
            } catch (e) {
                console.error("Error al parsear la respuesta JSON:", e);
                console.error("Respuesta del servidor:", response);
                alert("Error al transferir la herramienta. Verifica la consola para más detalles.");
            }
        },
        error: function() {
            alert('Error al transferir la herramienta');
        }
    });
});