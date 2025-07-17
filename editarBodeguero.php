<?php
// Mostrar todos los errores
error_reporting(E_ALL);
ini_set('display_errors', 1);

        include_once "header.php";
        include_once "navbar.php";

    $mysqli = include_once "conexion.php";
    $idBodeguero = $_GET["idBodeguero"] ?? null;

    if (!$idBodeguero) {
        die("ID de Bodeguero no proporcionado");
    }

    // Consulta con LEFT JOIN para traer el proyecto si lo tiene
    $query = "SELECT r.*, p.municipio AS nombreProyecto, p.codigoProyecto, p.idProyecto AS proyectoId
            FROM bodegueros r
            LEFT JOIN proyectos p ON p.idBodeguero = r.idBodeguero
            WHERE r.idBodeguero = ?";

    $stmt = $mysqli->prepare($query);
    $stmt->bind_param("i", $idBodeguero);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        die("Bodeguero no encontrado");
    }

    $bodeguero = $result->fetch_assoc();

    // Puede venir vacío si no tiene proyecto
$nombreProyectoActual = $bodeguero['nombreProyecto'] ?? ''; // Usar el alias nombreProyecto
$codigoProyectoActual = $bodeguero['codigoProyecto'] ?? '';


?>
  <!-- Content Wrapper. Contains page content -->
    <div class="content-wrapper">
        <!-- Content Header (Page header) -->
        <div class="content-header">
            <div class="container-fluid">
                <div class="row mb-2">
                    <div class="col-sm-6">
                        <h1 class="m-0" style="font-size:20px">Actualizar Bodegueros</h1>
                    </div><!-- /.col -->

                </div><!-- /.row -->
            </div><!-- /.container-fluid -->
        </div>
        <!-- /.content-header -->

            <!-- Main content -->
        <section class="content">

            <!-- Button trigger modal -->
            <div class="col-12">
                <div class="row align-items-start">
                    <form action="actualizarBodeguero.php" method="POST">
                        <input type="hidden" name="idBodeguero" value="<?php echo $bodeguero["idBodeguero"]; ?>">
                        <div class="col">
                            <div class="row">
                                <label for="Bodeguero">Bodeguero</label>
                                <input name="bodeguero" value="<?php echo $bodeguero["bodeguero"] ?>" placeholder="Bodeguero" class="form-control" type="text" name="bodeguero" id="bodeguero" required>
                            </div>
                            <div class="row">
                                <label for="telefono">Teléfono</label>
                                <input name="telefono" value="<?php echo $bodeguero["telefono"] ?>" placeholder="Telefóno" class="form-control" type="text" name="telefono" id="telefono" required>
                            </div>
                            <!-- Sección para buscar y seleccionar proyecto -->
                            <div class="row position-relative">
                                <label for="proyecto">Proyecto Asignado (Opcional)</label>
                                <!-- Input visible para buscar -->
                                <input type="text" id="buscarProyecto" class="form-control" name="proyecto_display" placeholder="Buscar proyecto por código o municipio..." autocomplete="off" value="<?php echo htmlspecialchars(($codigoProyectoActual ? $codigoProyectoActual . ' - ' : '') . $nombreProyectoActual, ENT_QUOTES, 'UTF-8'); ?>" readonly>
                                <!-- Input oculto para guardar el ID del proyecto -->
                                <input type="hidden" id="idProyecto" name="idProyecto" value="<?php echo $bodeguero['proyectoId'] ?? ''; ?>" >
                                <!-- Div para mostrar la lista de resultados -->
                                <div id="proyectoList" class="list-group position-absolute w-100" style="z-index: 1000; display: none;"></div>
                            </div>
                        <div class="row justify-content-center mt-3">
                            <div class="col-auto">
                                <button type="submit" class="btn btn-info">Actualizar</button>
                            </div>
                            <div class="col-auto">
                                <a class="btn btn-dark" href="listarBodegueros.php">Volver</a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>  
        </section>
    <!-- /.content -->
  </div>
  <!-- /.content-wrapper -->
<?php include_once "footer.php"; ?>
<script>
    document.getElementById('buscarProyecto').addEventListener('input', function() {
        buscarProyecto(this.value, 'proyectoList', 'idProyecto', 'buscarProyecto');
    });

    function buscarProyecto(input, listId, hiddenInputId, inputId) {
        if (input.length >= 2) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', 'buscarProyecto.php?q=' + encodeURIComponent(input), true);
            xhr.onload = function() {
                if (this.status === 200) {
                    try {
                        const proyectos = JSON.parse(this.responseText);
                        let html = '';
                        proyectos.forEach(function(proyecto) { // Asumiendo que buscarProyecto.php devuelve idProyecto, codigoProyecto, municipio
                            html += `<a href="#" class="list-group-item list-group-item-action" 
                                      onclick="seleccionarProyecto('${proyecto.idProyecto}', '${proyecto.municipio}')">
                                      ${proyecto.codigoProyecto} - ${proyecto.municipio}
                                   </a>`;
                        });
                        document.getElementById(listId).innerHTML = html;
                    } catch (e) {
                        console.error('Error al procesar la respuesta:', e);
                    }
                }
            };
            xhr.send();
        } else {
            document.getElementById(listId).innerHTML = '';
        }
    }

    function seleccionarProyecto(idProyecto, nombreProyecto) {
        // Necesitamos obtener el código también para mostrarlo
        // Idealmente, buscarProyecto.php debería devolver el código y el municipio
        // Por ahora, asumimos que el nombreProyecto incluye el código o lo buscamos de nuevo si es necesario
        // Para simplificar, solo mostraremos el municipio por ahora al seleccionar
        console.log('Seleccionando proyecto ID:', idProyecto, 'Nombre:', nombreProyecto);
        document.getElementById('idProyecto').value = idProyecto;
        document.getElementById('buscarProyecto').value = nombreProyecto;
        document.getElementById('proyectoList').innerHTML = '';
        document.getElementById('buscarProyecto').focus();
    }


</script>