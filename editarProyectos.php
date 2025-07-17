<?php
// Mostrar todos los errores
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start(); // Necesario para el historial (si lo implementas aquí) o autenticación

$mysqli = include_once "conexion.php";

// --- Procesamiento AJAX de Actualización ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {

    header('Content-Type: application/json');
    $response = ['success' => false, 'message' => 'Error desconocido al actualizar.'];

    if ($mysqli->connect_error) {
        $response['message'] = "Error de conexión: " . $mysqli->connect_error;
        echo json_encode($response);
        exit;
    }

    // 1. Validación básica del lado del servidor
    $required_fields = ['idProyecto', 'codigoProyecto', 'municipio', 'nombreProyecto', 'zona', 'status'];
    foreach ($required_fields as $field) {
        if (empty($_POST[$field])) {
            $response['message'] = "Error: El campo '$field' es obligatorio.";
            echo json_encode($response);
            $mysqli->close();
            exit;
        }
    }

    // 2. Obtener y preparar datos
    $idProyecto = (int)$_POST['idProyecto']; // Asegurarse que sea entero
    $codigoProyecto = trim($_POST['codigoProyecto']);
    $municipio = trim($_POST['municipio']);
    $nombreProyecto = trim($_POST['nombreProyecto']);
    $zona = trim($_POST['zona']);
    $status = trim($_POST['status']);
    // Manejo correcto de NULL para IDs opcionales
    $idResidente = !empty($_POST['idResidente']) ? (int)$_POST['idResidente'] : null;
    $idBodeguero = !empty($_POST['idBodeguero']) ? (int)$_POST['idBodeguero'] : null;

    // 3. Sentencia Preparada para UPDATE (¡Más seguro!)
    $query = "UPDATE proyectos SET
                codigoProyecto = ?,
                municipio = ?,
                nombreProyecto = ?,
                idResidente = ?,
                idBodeguero = ?,
                zona = ?,
                status = ?
              WHERE idProyecto = ?";

    $stmt = $mysqli->prepare($query);

    if ($stmt === false) {
        $response['message'] = "Error al preparar la consulta de actualización: " . $mysqli->error;
        echo json_encode($response);
        $mysqli->close();
        exit;
    }

    // 4. Vincular parámetros (s = string, i = integer)
    // Tipos: s, s, s, i, i, s, s, i
    $stmt->bind_param("sssiissi",
        $codigoProyecto,
        $municipio,
        $nombreProyecto,
        $idResidente,
        $idBodeguero,
        $zona,
        $status,
        $idProyecto // El ID para la cláusula WHERE
    );

    // 5. Ejecutar y verificar
    if ($stmt->execute()) {
        // affected_rows puede ser 0 si no hubo cambios, pero la consulta fue exitosa
        if ($stmt->affected_rows >= 0) {
            $response['success'] = true;
            $response['message'] = '¡Proyecto actualizado exitosamente!';
            // Aquí podrías añadir lógica para registrar en historial si es necesario
            // (similar a como lo haces en otros archivos de actualización)
        } else {
             // Esto no debería ocurrir si execute() fue true, pero por si acaso
            $response['message'] = 'La consulta se ejecutó pero no afectó filas.';
        }
    } else {
        // Verificar error de duplicado (ejemplo, ajusta el código de error si es diferente)
        if ($mysqli->errno == 1062) { // 1062 es el código común para Duplicate entry
             $response['message'] = 'Error: Ya existe otro proyecto con ese Código de Proyecto.';
        } else {
             $response['message'] = "Error al ejecutar la actualización: " . $stmt->error;
        }
    }

    // 6. Cerrar y responder
    $stmt->close();
    $mysqli->close();
    echo json_encode($response);
    exit; // Detener la ejecución normal de la página
}
// --- Fin Procesamiento AJAX ---


// --- Lógica GET para Cargar Datos (sin cambios significativos) ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET["id"])) {
        // Redirigir o mostrar error si no hay ID
        header("Location: listaDeProyectos.php");
        exit("ID de proyecto no proporcionado.");
    }
    $idProyecto = (int)$_GET["id"]; // Asegurarse que sea entero

    $query = "SELECT p.idProyecto, p.codigoProyecto, p.municipio, p.nombreProyecto, p.zona, p.status,
                     p.idResidente, p.idBodeguero,
                     r.residente AS residente, r.telefono as telefonoR,
                     b.bodeguero AS bodeguero, b.telefono as telefonoB
              FROM proyectos p
              LEFT JOIN residentes r ON p.idResidente = r.idResidente
              LEFT JOIN bodegueros b ON p.idBodeguero = b.idBodeguero
              WHERE p.idProyecto = ?"; // Usar sentencia preparada también aquí es buena práctica

    $stmt_get = $mysqli->prepare($query);
    if ($stmt_get) {
        $stmt_get->bind_param("i", $idProyecto);
        $stmt_get->execute();
        $resultado = $stmt_get->get_result();
        $proyectos = $resultado->fetch_assoc();
        $stmt_get->close();
    } else {
        exit("Error preparando consulta GET: " . $mysqli->error);
    }


    if (!$proyectos) {
        exit("No hay resultados para ese ID de proyecto.");
    }

    // Asignar variables para el formulario (igual que antes)
    $codProyecto = $proyectos['codigoProyecto'] ?? '';
    $municipio = $proyectos['municipio'] ?? '';
    $nombreProyecto = $proyectos['nombreProyecto'] ?? '';
    $idResidenteActual = $proyectos['idResidente'] ?? ''; // Guardar ID actual
    $residente = $proyectos['residente'] ?? '';
    $telefonoR = $proyectos['telefonoR'] ?? '';
    $idBodegueroActual = $proyectos['idBodeguero'] ?? ''; // Guardar ID actual
    $bodeguero = $proyectos['bodeguero'] ?? '';
    $telefonoB = $proyectos['telefonoB'] ?? '';
    $zona = $proyectos['zona'] ?? '';
    $status = $proyectos['status'] ?? '';

    $mysqli->close(); // Cerrar conexión después de obtener datos
} else {
     // Si no es GET ni POST AJAX, redirigir o mostrar error
     // header("Location: listaDeProyectos.php");
     // exit();
}

if (!$proyectos) {
    exit("No hay resultados para ese ID de proyecto.");
}



// Incluir header y navbar DESPUÉS de la lógica PHP
include_once "header.php";
include_once "navbar.php";
?>
    <div class="content-wrapper">
        <div class="content-header">
            <div class="container-fluid d-flex justify-content-center">
                <h1 class="m-0 text-center">Editar Proyecto</h1>
            </div>
        </div>
        <!-- /.content-header -->
        <div class="container">
            <!-- Main content -->
            <section class="content">
                <div class="row align-items-center"> <!-- Alinea verticalmente -->
                    <!-- Formulario (8 columnas) -->
                    <div class="col-md-8 form-container">
                        <!-- *** MODIFICACIÓN HTML: ID, novalidate, quitar action *** -->
                        <form method="POST" action="editarProyectos.php" id="editProjectForm" class="needs-validation" novalidate>
                            <!-- Campo oculto para enviar el ID del proyecto que se está editando -->
                            <input type="hidden" name="idProyecto" value="<?php echo htmlspecialchars($idProyecto); ?>">

                            <div class="row mb-3">
                                <div class="col">
                                    <label for="codigoProyecto" class="form-label">Código del Proyecto</label>
                                    <input value="<?php echo htmlspecialchars($codProyecto); ?>" placeholder="Código del Proyecto" class="form-control" type="text" name="codigoProyecto" id="codigoProyecto" required>
                                    <div class="invalid-feedback">Por favor, ingrese el código del proyecto.</div>
                                </div>
                                <div class="col">
                                    <label for="municipio" class="form-label">Municipio, Departamento</label>
                                    <input value="<?php echo htmlspecialchars($municipio); ?>" placeholder="Municipio, Departamento" class="form-control" type="text" name="municipio" id="municipio" required>
                                     <div class="invalid-feedback">Por favor, ingrese el municipio y departamento.</div>
                                </div>
                            </div>

                            <div class="row mb-3">
                                <div class="col">
                                    <label for="nombreProyecto" class="form-label">Nombre del Proyecto</label>
                                    <textarea placeholder="Nombre del Proyecto" class="form-control" name="nombreProyecto" id="nombreProyecto" required><?php echo htmlspecialchars(trim($nombreProyecto)); ?></textarea>
                                    <div class="invalid-feedback">Por favor, ingrese el nombre del proyecto.</div>
                                </div>
                            </div>
                            <div class="row mb-3 position-relative">
                                <div class="col">
                                    <label for="residente" class="form-label">Nombre del Residente</label>
                                    <input value="<?php echo htmlspecialchars($residente); ?>" placeholder="Buscar Residente..." class="form-control" type="text" name="residente_display" id="residente" autocomplete="off"> <!-- Cambiado name para no enviar -->
                                    <!-- *** MODIFICACIÓN HTML: Usar ID actual para el valor inicial del hidden input *** -->
                                    <input type="hidden" id="idResidente" name="idResidente" value="<?php echo htmlspecialchars($idResidenteActual); ?>">
                                    <div id="residenteList" class="list-group position-absolute w-100" style="z-index: 1000; display: none;"></div>
                                </div>
                                <div class="col">
                                    <label for="telefonoR" class="form-label">Teléfono Residente</label>
                                    <input value="<?php echo htmlspecialchars($telefonoR); ?>" placeholder="Teléfono" class="form-control" type="text" id="telefonoR" readonly> <!-- readonly -->
                                </div>
                            </div>
                            <div class="row mb-3 position-relative">
                                <div class="col">
                                    <label for="bodeguero" class="form-label">Bodeguero (Opcional)</label>
                                    <input value="<?php echo htmlspecialchars($bodeguero); ?>" placeholder="Buscar Bodeguero..." class="form-control" type="text" name="bodeguero_display" id="bodeguero" autocomplete="off"> <!-- Cambiado name para no enviar -->
                                     <!-- *** MODIFICACIÓN HTML: Usar ID actual para el valor inicial del hidden input *** -->
                                    <input type="hidden" id="idBodeguero" name="idBodeguero" value="<?php echo htmlspecialchars($idBodegueroActual); ?>">
                                    <div id="bodegueroList" class="list-group position-absolute w-100" style="z-index: 1000; display: none;"></div>
                                </div>
                                <div class="col">
                                    <label for="telefonoB" class="form-label">Teléfono Bodeguero</label>
                                    <input value="<?php echo htmlspecialchars($telefonoB); ?>" placeholder="Teléfono Bodeguero" class="form-control" type="text" id="telefonoB" readonly> <!-- readonly -->
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col">
                                    <label for="zona" class="form-label">Zona</label>
                                    <!-- *** MODIFICACIÓN HTML: Usar form-select y verificar valor actual *** -->
                                    <select name="zona" id="zona" class="form-select" required>
                                        <option value="" disabled <?php echo ($zona == '') ? 'selected' : ''; ?>>SELECCIONE ZONA</option>
                                        <option value="ZONA 1" <?php echo ($zona == 'ZONA 1') ? 'selected' : ''; ?>>ZONA 1</option>
                                        <option value="ZONA 2" <?php echo ($zona == 'ZONA 2') ? 'selected' : ''; ?>>ZONA 2</option>
                                        <option value="ZONA 3" <?php echo ($zona == 'ZONA 3') ? 'selected' : ''; ?>>ZONA 3</option>
                                        <option value="ZONA 4" <?php echo ($zona == 'ZONA 4') ? 'selected' : ''; ?>>ZONA 4</option>
                                    </select>
                                    <div class="invalid-feedback">Por favor, seleccione una zona.</div>
                                </div>
                                <div class="col">
                                    <label for="status" class="form-label">Status</label>
                                     <!-- *** MODIFICACIÓN HTML: Usar form-select y verificar valor actual *** -->
                                    <select name="status" id="status" class="form-select" required>
                                        <option value="" disabled <?php echo ($status == '') ? 'selected' : ''; ?>>SELECCIONE ESTADO</option>
                                        <option value="ACTIVO" <?php echo ($status == 'ACTIVO') ? 'selected' : ''; ?>>ACTIVO</option>
                                        <option value="INACTIVO" <?php echo ($status == 'INACTIVO') ? 'selected' : ''; ?>>INACTIVO</option>
                                        <option value="FINALIZADO" <?php echo ($status == 'FINALIZADO') ? 'selected' : ''; ?>>FINALIZADO</option>
                                    </select>
                                     <div class="invalid-feedback">Por favor, seleccione un estado.</div>
                                </div>
                            </div>
                            <hr>
                            <div class="row justify-content-center mt-3">
                                <div class="col-auto">
                                    <!-- *** MODIFICACIÓN HTML: Cambiado texto y tipo a submit *** -->
                                    <button type="submit" class="btn btn-primary">Actualizar Proyecto</button>
                                </div>
                                <div class="col-auto">
                                    <a class="btn btn-secondary" href="listaDeProyectos.php">Cancelar</a>
                                </div>
                            </div>
                        </form>
                    </div>
                    <!-- Imagen (4 columnas) -->
                    <div class="col-md-4 d-flex justify-content-center align-items-center">
                        <img src="sources/images/dom.png" alt="DPA Logo" class="img-fluid" style="max-height: 300px;">
                    </div>

                </div>
            </section>
        </div>
    </div>  <!-- /.content-wrapper -->
<?php include_once "footer.php"; ?>

<!-- *** JAVASCRIPT MODIFICADO (similar a agregarProyecto.php) *** -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('editProjectForm'); // ID del formulario de edición
    const residenteInput = document.getElementById('residente');
    const bodegueroInput = document.getElementById('bodeguero');
    const residenteListDiv = document.getElementById('residenteList');
    const bodegueroListDiv = document.getElementById('bodegueroList');

    // --- Manejo de Envío del Formulario con Fetch y SweetAlert ---
    form.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevenir envío tradicional
        event.stopPropagation();

        // Validación Bootstrap client-side
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return; // Detener si no es válido
        }
        form.classList.add('was-validated'); // Mostrar estilos de validación

        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        // --- CORRECCIÓN: Typo disable -> disabled ---
        submitButton.disabled = true; // Deshabilitar botón
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Actualizando...'; // Feedback visual

        // --- CORRECCIÓN: Sintaxis de fetch() ---
        fetch('editarProyectos.php', { // El objeto de opciones es el SEGUNDO argumento
            method: 'POST',
            headers: { // Indicar que es una petición AJAX
                'X-Requested-With': 'XMLHttpRequest'
                // No necesitas 'Content-Type' aquí, FormData lo maneja
            },
            body: formData // 'body' va DENTRO del objeto de opciones
        }) // Fin del objeto de opciones y de la llamada fetch()
        // --- FIN CORRECCIÓN ---
        .then(response => {
             // Primero, verifica si la respuesta es realmente JSON
             const contentType = response.headers.get("content-type");
             if (response.ok && contentType && contentType.indexOf("application/json") !== -1) {
                 return response.json();
             } else {
                 // Si no es JSON o hubo un error HTTP, obtén el texto para ver el error HTML/PHP
                 return response.text().then(text => {
                     // Lanza un error para que sea capturado por .catch()
                     throw new Error(`Respuesta inesperada del servidor (Status: ${response.status}): ${text}`);
                 });
             }
        })
        .then(data => {
            // Este bloque solo se ejecuta si la respuesta fue JSON válido
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Actualizado!',
                    text: data.message,
                    timer: 1500, // Cierra automáticamente
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = 'listaDeProyectos.php'; // Redirigir a la lista
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al Actualizar',
                    text: data.message || 'No se pudo actualizar el proyecto.'
                });
            }
        })
        .catch(error => {
            console.error('Error en fetch:', error); // Muestra el error completo en consola
            Swal.fire({
                icon: 'error',
                title: 'Error de Comunicación',
                // Muestra un mensaje más detallado si es posible, o uno genérico
                text: error.message.includes("Respuesta inesperada")
                      ? 'Ocurrió un error en el servidor. Revise la consola del navegador (F12) > Red > Respuesta, para más detalles.'
                      : 'No se pudo comunicar con el servidor. Inténtelo más tarde.'
            });
        })
        .finally(() => {
             // Rehabilitar botón
             submitButton.disabled = false;
             submitButton.innerHTML = 'Actualizar Proyecto';
        });
    });

    // --- Lógica de Autocompletado (sin cambios respecto a la versión anterior) ---
    if (residenteInput) {
        residenteInput.addEventListener('input', function() {
            buscarEnTiempoReal(this.value, 'residenteList', 'idResidente', 'residente', 'telefonoR', 'residentes', 'buscarResidente.php');
        });
        residenteInput.addEventListener('change', function() {
            if (this.value === '') {
                document.getElementById('idResidente').value = '';
                document.getElementById('telefonoR').value = '';
            }
        });
    }

    if (bodegueroInput) {
        bodegueroInput.addEventListener('input', function() {
            buscarEnTiempoReal(this.value, 'bodegueroList', 'idBodeguero', 'bodeguero', 'telefonoB', 'bodegueros', 'buscarBodeguero.php');
        });
        bodegueroInput.addEventListener('change', function() {
            if (this.value === '') {
                document.getElementById('idBodeguero').value = '';
                document.getElementById('telefonoB').value = '';
            }
        });
    }

    function buscarEnTiempoReal(input, listId, hiddenId, inputFieldId, phoneFieldId, type, backendScript) {
        const listDiv = document.getElementById(listId);
        if (!listDiv) return;

        if (input.length >= 2) {
            const url = `${backendScript}?q=${encodeURIComponent(input)}`;
            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => {
                    listDiv.innerHTML = '';
                    listDiv.style.display = 'none';

                    if (data.length > 0) {
                        data.forEach(item => {
                            const a = document.createElement('a');
                            a.href = '#';
                            a.classList.add('list-group-item', 'list-group-item-action');

                            const itemId = item.idResidente || item.idBodeguero || item.id;
                            const itemName = item.residente || item.bodeguero || item.nombre;
                            const itemPhone = item.telefono || '';

                            a.textContent = `${itemName} ${itemPhone ? '- ' + itemPhone : ''}`;

                            a.onclick = function(e) {
                                e.preventDefault();
                                seleccionarItem(itemId, itemName, itemPhone, hiddenId, inputFieldId, phoneFieldId, listId);
                            };
                            listDiv.appendChild(a);
                        });
                        listDiv.style.display = 'block';
                    } else {
                        listDiv.innerHTML = '<div class="list-group-item disabled">No se encontraron resultados</div>';
                        listDiv.style.display = 'block';
                    }
                })
                .catch(error => {
                    console.error(`Error buscando ${type}:`, error);
                    listDiv.innerHTML = `<div class="list-group-item text-danger">Error al cargar ${type}</div>`;
                    listDiv.style.display = 'block';
                });
        } else {
            listDiv.innerHTML = '';
            listDiv.style.display = 'none';
        }
    }

    function seleccionarItem(id, nombre, telefono, hiddenId, inputFieldId, phoneFieldId, listId) {
        document.getElementById(hiddenId).value = id;
        document.getElementById(inputFieldId).value = nombre;
        if (phoneFieldId) {
            document.getElementById(phoneFieldId).value = telefono;
        }
        const listDiv = document.getElementById(listId);
        listDiv.innerHTML = '';
        listDiv.style.display = 'none';
    }

    document.addEventListener('click', function(event) {
        if (residenteInput && !residenteInput.contains(event.target) && residenteListDiv && !residenteListDiv.contains(event.target)) {
            residenteListDiv.style.display = 'none';
        }
        if (bodegueroInput && !bodegueroInput.contains(event.target) && bodegueroListDiv && !bodegueroListDiv.contains(event.target)) {
            bodegueroListDiv.style.display = 'none';
        }
    });

}); // Fin DOMContentLoaded
</script>

