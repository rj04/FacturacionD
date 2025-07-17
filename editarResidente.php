<?php
// Mostrar todos los errores
error_reporting(E_ALL);
ini_set('display_errors', 1);

        include_once "header.php";
        include_once "navbar.php";

    $mysqli = include_once "conexion.php";
    $idResidente = $_GET["idResidente"] ?? null;

    if (!$idResidente) {
        die("ID de residente no proporcionado");
    }

    // Consulta con LEFT JOIN para traer el proyecto si lo tiene
    $query = "SELECT r.*, p.municipio AS nombreProyecto, p.codigoProyecto, p.idProyecto AS proyectoId
            FROM residentes r
            LEFT JOIN proyectos p ON p.idResidente = r.idResidente
            WHERE r.idResidente = ?";

    $stmt = $mysqli->prepare($query);
    $stmt->bind_param("i", $idResidente);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        die("Residente no encontrado");
    }

    $residente = $result->fetch_assoc();

    // Puede venir vacío si no tiene proyecto
$nombreProyectoActual = $residente['nombreProyecto'] ?? ''; // Usar el alias 'nombreProyecto'
$codigoProyectoActual = $residente['codigoProyecto'] ?? '';


?>
  <!-- Content Wrapper. Contains page content -->
    <div class="content-wrapper">
        <!-- Content Header (Page header) -->
        <div class="content-header">
            <div class="container-fluid">
                <div class="row mb-2">
                    <div class="col-sm-6">
                        <h1 class="m-0" style="font-size:20px">Actualizar Residentes</h1>
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
                    <form action="actualizarResidente.php" method="POST">
                        <input type="hidden" name="idResidente" value="<?php echo $residente["idResidente"]; ?>">
                        <div class="col">
                            <div class="row">
                                <label for="residente">Residente</label>
                                <input name="residente" value="<?php echo $residente["residente"] ?>" placeholder="Residente" class="form-control" type="text" name="residente" id="residente" required>
                            </div>
                            <div class="row">
                                <label for="telefono">Teléfono</label>
                                <input name="telefono" value="<?php echo $residente["telefono"] ?>" placeholder="Telefóno" class="form-control" type="text" name="telefono" id="telefono" >
                            </div>
                            <div class="row">
                                <label for="proyecto">Proyecto</label>
                                <input type="text" id="buscarProyecto" class="form-control" name="proyecto" placeholder="Buscar proyecto..." autocomplete="off" value="<?php echo htmlspecialchars($nombreProyectoActual, ENT_QUOTES, 'UTF-8'); ?>" readonly>

                                <input type="hidden" id="idProyecto" name="idProyecto" value="<?php echo $residente['proyectoId'] ?? ''; ?>">
                                <div id="proyectoList" class="list-group"></div>
                            </div> 
                        </div> 

                        <div class="row justify-content-center mt-3">
                            <div class="col-auto">
                                <button type="submit" class="btn btn-info">Actualizar</button>
                            </div>
                            <div class="col-auto">
                                <a class="btn btn-dark" href="listarResidentes.php">Volver</a>
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
                        proyectos.forEach(function(proyecto) {
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
        console.log('Seleccionando proyecto:', idProyecto, nombreProyecto);
        document.getElementById('idProyecto').value = idProyecto;
        document.getElementById('buscarProyecto').value = nombreProyecto;
        document.getElementById('proyectoList').innerHTML = '';
        document.getElementById('buscarProyecto').focus();
    }
    window.onload = function() {
    document.getElementById('buscarProyecto').focus();
};


</script>