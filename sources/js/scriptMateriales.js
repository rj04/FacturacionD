document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById("searchMa");
    const table = $('#materialesTable').DataTable({
        processing: true,
        serverSide: true,
        ajax: {
            url: "buscarMateriales.php",
            type: "GET",
            data: function (d) {
                d.q = searchInput.value.trim();
            }
        },
        paging: true,
        lengthChange: false,
        pageLength: 10,
        searching: false,
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
            { data: "material" },
            { data: "unidadMedida" },
            { data: "cantidad" },
            { data: "fechaIngreso" },
            { data: "procedencia" },
            { data: "activo" },
            { data: "consumido" },
            { data: "cantidadTrasladada" },
            { data: "oca" },

            {
                data: "idMaterial",
                render: function(data) {
                    return `<button class="btn btn-sm btn-success transfer-btn" data-id="${data}">
                    <i class="bi bi-box-arrow-right"></i> Transferir</button>`;
                }
            },
             // Nueva columna para ver las transferencias
            {
                data: "idMaterial",
                render: function(data) {
                    return `<a href="detalleTransferenciasMa.php?idMaterial=${data}" class="ver-transferencias btn btn-info btn-sm">
                    <i class="bi bi-eye"></i> Detalle</a>`;
                }
            }
        ]
    });
    

    //Buscador personalizado
        if (searchInput) {
            searchInput.addEventListener("input", function() {
                table.ajax.reload();
            });
        }

    // Abrir modal transferencia
        $('#materialesTable').on('click', '.transfer-btn', function() {
            var idMaterial = $(this).data('id');
            $('#idMaterial').val(idMaterial); // Este es el input oculto correcto
            $('#modalTransferir').modal('show');    // Este es el ID correcto del modal
        });

    // Buscar proyecto en modal
        $('#searchProyectoBtn').on('click', function() {
            let valor = $('#searchProyectoInput').val();
            $.get('buscarProyectos.php', { q: valor }, function(res) {
                let proyectos = JSON.parse(res);
                let select = $('#transferProyecto');
                select.empty();
                proyectos.forEach(p => {
                    select.append(new Option(p.nombre, p.id));
                });
            }).fail(() => alert('Error al buscar proyectos'));
        });

    // Procesar transferencia
        $('#formTransferencia').on('submit', function(e) {
            e.preventDefault();

            // Validaciones simples
            const cantidad = $('#cantidadTransferida').val();
            const fecha = $('#fechaTransferencia').val();
            const proyecto = $('#idProyecto').val(); // Cambié #idProyecto a #transferProyecto

            if (!cantidad || cantidad <= 0) {
                Swal.fire('Error', 'Ingrese una cantidad válida.', 'error');
                return;
            }

            if (!fecha) {
                Swal.fire('Error', 'Ingrese una fecha de traslado.', 'error');
                return;
            }

            if (!proyecto) {
                Swal.fire('Error', 'Seleccione un proyecto de destino.', 'error');
                return;
            }

            // Mostrar SweetAlert de carga
            Swal.fire({
                title: 'Procesando...',
                html: 'Por favor espera un momento.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            //console.log($(this).serialize());  // Verifica qué datos están siendo enviados
            //console.log("Enviando POST a /inventario-test/transferirHerramientas.php");

            // Enviar los datos de la transferencia
                $.post('http://localhost/inventario-test/transferirMateriales.php', $(this).serialize(), function(response) {
                    try {
                        // Aquí intentamos analizar la respuesta, para asegurarnos de que sea válida
                        let res = typeof response === 'string' ? JSON.parse(response) : response;

                        // Mostrar mensaje con Swal basado en el estado
                        Swal.fire({
                            icon: res.status === "success" ? 'success' : 'error',
                            title: res.status === "success" ? '¡Éxito!' : 'Error',
                            text: res.message,
                            timer: 3000,
                            showConfirmButton: false
                        });

                        // Si la transferencia fue exitosa, limpiar el formulario y recargar la tabla
                        if (res.status === "success") {
                            $('#modalTransferir').modal('hide');
                            table.ajax.reload();
                            $('#formTransferencia')[0].reset();
                            $('#transferProyecto').empty();
                            console.log("Respuesta del servidor:", response);

        if (response.status === "success") {
            console.log("Datos del material:", response.data);
        } else {
            console.warn("Error:", response.message);
        }
                        }
                    } catch (err) {
                        console.error("Error al procesar JSON:", err);  // Aquí capturamos errores de JSON
                        Swal.fire({
                            icon: 'error',
                            title: 'Oops...',
                            text: 'Ocurrió un error inesperado. Ver consola.',
                        });
                    }
                }).fail(function(xhr, status, error) {
                    console.log('Error en la conexión:', status, error);  // Agregamos logs detallados del error
                    console.log(xhr.responseText);  // Aquí puedes ver los detalles del error específico

                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo conectar con el servidor.',
                    });
                });


        // Eliminar material
            function eliminarMateriales(id) {
                if (confirm('¿Está seguro de que desea eliminar esta material?')) {
                    fetch('eliminarHerramientas.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idMaterial: id })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('Registro eliminado exitosamente');
                            $('#materialesTable').DataTable().ajax.reload();
                        } else {
                            alert('Error al eliminar: ' + data.error);
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('Error en la solicitud.');
                    });
                }
            }
        });
});