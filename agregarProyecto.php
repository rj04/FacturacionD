<?php
// Mostrar errores (SOLO para desarrollo, comentar/quitar en producción)
error_reporting(E_ALL);
ini_set('display_errors', 1);
// session_start(); // Si usas sesiones, debe ir aquí, ANTES de cualquier salida

// --- <<<< MOVER AQUÍ EL PROCESAMIENTO AJAX DEL FORMULARIO >>>> ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {

    // --- <<<< NINGUNA SALIDA HTML ANTES DE ESTE PUNTO >>>> ---

    header('Content-Type: application/json'); // <<< AHORA ESTA LÍNEA FUNCIONARÁ
    $response = ['success' => false, 'message' => 'Error desconocido.'];

    // Incluir la conexión DENTRO del bloque AJAX si solo se usa aquí,
    // o ANTES si también se usa en la parte GET. Asegúrate que conexion.php NO genere salida.
    $mysqli = include_once "conexion.php";
    if ($mysqli->connect_error) {
        $response['message'] = "Error de conexión a la base de datos: " . $mysqli->connect_error;
        echo json_encode($response);
        exit; // <<< SALIR DESPUÉS DE ENVIAR JSON
    }

    // 1. Validación básica del lado del servidor
    $required_fields = ['codigoProyecto', 'municipio', 'nombreProyecto', 'status'];
    foreach ($required_fields as $field) {
        // Usar isset() además de empty() para evitar warnings si el campo no se envía
        if (!isset($_POST[$field]) || empty($_POST[$field])) {
            $response['message'] = "Error: El campo '$field' es obligatorio.";
            echo json_encode($response);
            $mysqli->close();
            exit; // <<< SALIR DESPUÉS DE ENVIAR JSON
        }
    }

    // 2. Obtener y preparar datos
    $codigoProyecto = trim($_POST['codigoProyecto']);
    $municipio = trim($_POST['municipio']);
    $nombreProyecto = trim($_POST['nombreProyecto']);
    $idResidente = !empty($_POST['idResidente']) ? (int)$_POST['idResidente'] : null;
    $idBodeguero = !empty($_POST['idBodeguero']) ? (int)$_POST['idBodeguero'] : null;
    $zona = trim($_POST['zona']);
    $status = trim($_POST['status']);

    // 3. Sentencia Preparada
    $query = "INSERT INTO proyectos (codigoProyecto, municipio, nombreProyecto, idResidente, idBodeguero, zona, status)
              VALUES (?, ?, ?, ?, ?, ?, ?)";

    $stmt = $mysqli->prepare($query);

    if ($stmt === false) {
        // Loggear el error real para depuración interna
        error_log("Error al preparar la consulta INSERT: " . $mysqli->error);
        $response['message'] = "Error interno del servidor al preparar la consulta."; // Mensaje genérico para el usuario
        echo json_encode($response);
        $mysqli->close();
        exit; // <<< SALIR DESPUÉS DE ENVIAR JSON
    }

    // 4. Vincular parámetros
    $stmt->bind_param("sssiiss",
        $codigoProyecto,
        $municipio,
        $nombreProyecto,
        $idResidente,
        $idBodeguero,
        $zona,
        $status
    );

    // 5. Ejecutar y verificar
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            $response['success'] = true;
            $response['message'] = '¡Proyecto agregado exitosamente!';
        } else {
            $response['message'] = 'No se insertaron filas. Verifique los datos o si ya existe.';
        }
    } else {
        // Loggear el error real
        error_log("Error al ejecutar la consulta INSERT: " . $stmt->error . " | Errno: " . $mysqli->errno);
        if ($mysqli->errno == 1062) {
             $response['message'] = 'Error: Ya existe un proyecto con ese Código de Proyecto.';
        } else {
             $response['message'] = "Error al guardar en la base de datos."; // Mensaje genérico
        }
    }

    // 6. Cerrar y responder
    $stmt->close();
    $mysqli->close();
    echo json_encode($response);
    exit; // <<< MUY IMPORTANTE: Detener la ejecución aquí para no enviar HTML
}
// --- Fin Procesamiento AJAX ---


// --- ESTA PARTE SOLO SE EJECUTA PARA PETICIONES GET (CARGA NORMAL DE LA PÁGINA) ---
include_once "header.php"; // <<< La salida HTML empieza aquí para GET
include_once "navbar.php";

// Si no es una petición AJAX POST, se muestra el HTML normal
?>

    <div class="content-wrapper">
        <div class="content-header">
            <div class="container-fluid d-flex justify-content-center">
                <h1 class="m-0 text-center">Agregar Nuevo Proyecto</h1>
            </div>
        </div>
        <div class="container">
            <!-- Main content -->
            <section class="content">
                <div class="row align-items-center"> <!-- Alinea verticalmente -->

                    <!-- Formulario (8 columnas) -->
                    <div class="col-md-8 form-container">
                        <!-- Formulario HTML sin cambios -->
                        <form method="POST" action="agregarProyecto.php" id="addProjectForm" class="needs-validation" novalidate>
                            <div class="row mb-3">
                                <div class="col">
                                    <label for="codigoProyecto" class="form-label">Código de Proyecto</label>
                                    <input type="text" name="codigoProyecto" id="codigoProyecto" class="form-control" autocomplete="off" required>
                                    <div class="invalid-feedback">Por favor, ingrese el código del proyecto.</div>
                                </div>

                                <div class="col">
                                    <label for="municipio" class="form-label">Municipio, Departamento</label>
                                    <input type="text" name="municipio" id="municipio" class="form-control" autocomplete="off" required>
                                    <div class="invalid-feedback">Por favor, ingrese el municipio y departamento.</div>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col">
                                    <label for="nombreProyecto" class="form-label">Nombre del Proyecto</label>
                                    <input type="text" name="nombreProyecto" id="nombreProyecto" class="form-control" autocomplete="off" required>
                                    <div class="invalid-feedback">Por favor, ingrese el nombre del proyecto.</div>
                                </div>
                            </div>
                            <div class="row mb-3 position-relative"> <!-- Añadido position-relative -->
                                <div class="col">
                                    <label for="residente" class="form-label">Nombre del Residente (Opcional)</label>
                                    <input placeholder="Buscar Residente..." class="form-control" type="text" name="residente" id="residente" autocomplete="off">
                                    <input type="hidden" id="idResidente" name="idResidente">
                                    <div id="residenteList" class="list-group position-absolute w-100" style="z-index: 1000; display: none;"></div>
                                </div>

                                <div class="col">
                                    <label for="telefonoR" class="form-label">Teléfono Residente</label>
                                    <input type="text" id="telefonoR" class="form-control" readonly> <!-- Solo lectura, se llena con JS -->
                                </div>
                            </div>
                            <div class="row mb-3 position-relative"> <!-- Añadido position-relative -->
                                <div class="col">
                                    <label for="bodeguero" class="form-label">Bodeguero (Opcional)</label>
                                    <input placeholder="Buscar Bodeguero..." class="form-control" type="text" name="bodeguero" id="bodeguero" autocomplete="off">
                                    <input type="hidden" id="idBodeguero" name="idBodeguero">
                                    <div id="bodegueroList" class="list-group position-absolute w-100" style="z-index: 1000; display: none;"></div>
                                </div>

                                <div class="col">
                                    <label for="telefonoB" class="form-label">Teléfono Bodeguero</label>
                                    <input placeholder="" class="form-control" type="text" id="telefonoB" readonly> <!-- Solo lectura -->
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col">
                                    <label for="zona" class="form-label">Zona</label>
                                    <select name="zona" id="zona" class="form-select" required>
                                        <option value="" disabled selected>SELECCIONE ZONA</option>
                                        <option value="ZONA 1">ZONA 1</option>
                                        <option value="ZONA 2">ZONA 2</option>
                                        <option value="ZONA 3">ZONA 3</option>
                                        <option value="ZONA 4">ZONA 4</option>
                                    </select>
                                    <div class="invalid-feedback">Por favor, seleccione una zona.</div>
                                </div>

                                <div class="col">
                                    <label for="status" class="form-label">Status</label>
                                    <select name="status" id="status" class="form-select" >
                                        <option value="" disabled selected>SELECCIONE STATUS</option>
                                        <option value="ACTIVO">ACTIVO</option>
                                        <option value="INACTIVO">INACTIVO</option>
                                        <option value="FINALIZADO">FINALIZADO</option>
                                    </select>
                                     <div class="invalid-feedback">Por favor, seleccione un estado.</div>
                                </div>
                            </div>
                            <hr>

                            <div class="row justify-content-center mt-3">
                                <div class="col-auto">
                                    <button type="submit" class="btn btn-primary">Guardar Proyecto</button>
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
    </div>

<?php include_once "footer.php"; ?>

<!-- *** JAVASCRIPT (Sin cambios necesarios aquí) *** -->
<script>
// Tu JavaScript existente para el manejo del formulario y autocompletado va aquí
// ... (el mismo código JS que tenías antes) ...
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('addProjectForm');
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
        submitButton.disabled = true; // Deshabilitar botón
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...'; // Feedback visual

        fetch('agregarProyecto.php', {
            method: 'POST',
            headers: { // Indicar que es una petición AJAX
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        })
        .then(response => {
             // Primero, verifica si la respuesta es realmente JSON
             const contentType = response.headers.get("content-type");
             if (contentType && contentType.indexOf("application/json") !== -1) {
                 return response.json();
             } else {
                 // Si no es JSON, obtén el texto para ver el error HTML/PHP
                 return response.text().then(text => {
                     throw new Error("Respuesta inesperada del servidor: " + text);
                 });
             }
        })
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: data.message,
                    timer: 2000, // Cierra automáticamente después de 2 segundos
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = 'listaDeProyectos.php'; // Redirigir
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'No se pudo agregar el proyecto.'
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
                      ? 'Ocurrió un error en el servidor. Revise la consola para más detalles.'
                      : 'No se pudo comunicar con el servidor. Inténtelo más tarde.'
            });
        })
        .finally(() => {
             // Rehabilitar botón
             submitButton.disabled = false;
             submitButton.innerHTML = 'Guardar Proyecto';
        });
    });

    // --- Lógica de Autocompletado (Consolidada) ---
    if (residenteInput) {
        residenteInput.addEventListener('input', function() {
            buscarEnTiempoReal(this.value, 'residenteList', 'idResidente', 'residente', 'telefonoR', 'residentes');
        });
        // Limpiar ID si se borra el input
        residenteInput.addEventListener('change', function() {
            if (this.value === '') {
                document.getElementById('idResidente').value = '';
                document.getElementById('telefonoR').value = '';
            }
        });
    }

    if (bodegueroInput) {
        bodegueroInput.addEventListener('input', function() {
            buscarEnTiempoReal(this.value, 'bodegueroList', 'idBodeguero', 'bodeguero', 'telefonoB', 'bodegueros');
        });
         // Limpiar ID si se borra el input
        bodegueroInput.addEventListener('change', function() {
            if (this.value === '') {
                document.getElementById('idBodeguero').value = '';
                document.getElementById('telefonoB').value = '';
            }
        });
    }

    // Función genérica para buscar (Residente o Bodeguero)
    function buscarEnTiempoReal(input, listId, hiddenId, inputFieldId, phoneFieldId, type) {
        const listDiv = document.getElementById(listId);
        if (!listDiv) return;

        if (input.length >= 2) {
            // Usar buscar.php que parece manejar tipos
            const url = `buscar.php?q=${encodeURIComponent(input)}&type=${type}`;
            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => {
                    listDiv.innerHTML = ''; // Limpiar
                    listDiv.style.display = 'none'; // Ocultar por defecto

                    if (data.length > 0) {
                        data.forEach(item => {
                            const a = document.createElement('a');
                            a.href = '#';
                            a.classList.add('list-group-item', 'list-group-item-action');
                            // Asumiendo que buscar.php devuelve 'id', 'nombre', 'telefono'
                            a.textContent = item.nombre; // Mostrar solo el nombre en la lista
                            a.onclick = function(e) {
                                e.preventDefault();
                                seleccionarItem(item.id, item.nombre, item.telefono || '', hiddenId, inputFieldId, phoneFieldId, listId);
                            };
                            listDiv.appendChild(a);
                        });
                        listDiv.style.display = 'block'; // Mostrar lista
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
            // Limpiar campos si el input es corto
            document.getElementById(hiddenId).value = '';
            if (phoneFieldId) document.getElementById(phoneFieldId).value = '';
        }
    }

    // Función genérica para seleccionar item
    function seleccionarItem(id, nombre, telefono, hiddenId, inputFieldId, phoneFieldId, listId) {
        document.getElementById(hiddenId).value = id;
        document.getElementById(inputFieldId).value = nombre; // Poner el nombre en el input visible
        if (phoneFieldId) {
            document.getElementById(phoneFieldId).value = telefono; // Poner teléfono si existe
        }
        const listDiv = document.getElementById(listId);
        listDiv.innerHTML = '';
        listDiv.style.display = 'none';
    }

    // Ocultar listas si se hace clic fuera
    document.addEventListener('click', function(event) {
        if (residenteInput && !residenteInput.contains(event.target) && residenteListDiv && !residenteListDiv.contains(event.target)) {
            residenteListDiv.style.display = 'none';
        }
        if (bodegueroInput && !bodegueroInput.contains(event.target) && bodegueroListDiv && !bodegueroListDiv.contains(event.target)) {
            bodegueroListDiv.style.display = 'none';
        }
    });

    // Estas funciones específicas ya no son estrictamente necesarias si buscarEnTiempoReal/seleccionarItem funcionan bien
    /*
    function seleccionarResidente(idResidente, residente, telefono) {
        const inputId = document.getElementById('idResidente');
        const inputResidente = document.getElementById('residente'); // Campo del formulario
        const inputTelefono = document.getElementById('telefonoR'); // Asegúrate de tener este input

        inputId.value = idResidente;
        inputResidente.value = residente;
        if (inputTelefono) inputTelefono.value = telefono;

        // Limpiar la lista de residentes
        const residenteList = document.getElementById('residenteList');
        if (residenteList) {
            residenteList.innerHTML = '';
        }
    }

    function seleccionarBodeguero(idBodeguero, bodeguero, telefonoB ) {
        const inputIdBodeguero = document.getElementById('idBodeguero');
        const inputBodeguero = document.getElementById('bodeguero'); // Campo del formulario
        const inputTelefonoB = document.getElementById('telefonoB'); // Asegúrate de tener este input

        inputIdBodeguero.value = idBodeguero;
        inputBodeguero.value = bodeguero;
        if (inputTelefonoB) inputTelefonoB.value = telefonoB;

        // Limpiar la lista de bodegueros
        const bodegueroList = document.getElementById('bodegueroList');
            if (bodegueroList) {
                bodegueroList.innerHTML = '';
            }
    }
    */
});
</script>
