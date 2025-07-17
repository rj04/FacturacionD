<?php
// Mostrar todos los errores
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start(); // Necesario para historial y autenticación

$mysqli = include_once "conexion.php";

// --- <<<< PROCESAMIENTO AJAX DE ACTUALIZACIÓN (POST) >>>> ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {

    header('Content-Type: application/json');
    $response = ['success' => false, 'message' => 'Error desconocido al actualizar la OCA.'];

    // Verificar sesión de usuario
    if (!isset($_SESSION['idUsuario'])) {
        $response['message'] = 'Error: Sesión de usuario no válida.';
        echo json_encode($response);
        exit;
    }
    $usuario_id = $_SESSION['idUsuario'];

    if ($mysqli->connect_error) {
        $response['message'] = "Error de conexión: " . $mysqli->connect_error;
        echo json_encode($response);
        exit;
    }

    // Obtener idOca primero para poder cargar datos anteriores
    $idOca = filter_input(INPUT_POST, 'idOca', FILTER_VALIDATE_INT);
    if (!$idOca) {
        $response['message'] = "Error: ID de OCA no válido.";
        echo json_encode($response);
        $mysqli->close();
        exit;
    }

    // --- Obtener datos ANTES de actualizar (para historial y fallbacks) ---
    $datos_anteriores_array = null;
    $estado_impresa_antes_de_editar = null; // Para la lógica de reseteo de impresión
    $stmtSelectOldInitial = $mysqli->prepare("SELECT * FROM control_ocas WHERE idOca = ?");
    if ($stmtSelectOldInitial) {
        $stmtSelectOldInitial->bind_param("i", $idOca);
        $stmtSelectOldInitial->execute();
        $resultOldInitial = $stmtSelectOldInitial->get_result();
        $datos_anteriores_array = $resultOldInitial->fetch_assoc();
        $stmtSelectOldInitial->close();
        if (!$datos_anteriores_array) {
            $response['message'] = "Error: No se encontró la OCA original (ID: $idOca) para actualizar.";
            echo json_encode($response);
            $mysqli->close();
            exit;
        }
    } else {
        $response['message'] = "Error al preparar la consulta para obtener datos originales: " . $mysqli->error;
        error_log("Error preparando SELECT inicial para editarOcas: " . $mysqli->error);
        echo json_encode($response);
        $mysqli->close();
        exit;
    }
    // --- Fin obtención de datos originales ---

    // 1. Validación básica del lado del servidor
    $required_fields = ['idOca', 'idProyecto', 'oca_numero', 'valor_oca', 'idProveedor', 'idEstado_Oca', 'proceso_dom', 'anio_oca', 'numero_acta', 'fecha_factura', 'numero_factura', 'monto_factura', 'fechaCompras']; // Añadido proceso_dom y otros campos clave
    // Fecha entrega es requerida solo si estado es 'ENTREGADO'
    // if (isset($_POST['idEstado_Oca']) && $_POST['idEstado_Oca'] /* corresponde a 'ENTREGADO' */) {
    //     $required_fields[] = 'fechaEntrega'; // Lógica de fechaEntrega eliminada por ahora
    // }

    foreach ($required_fields as $field) {
        if (!isset($_POST[$field]) || (is_string($_POST[$field]) && trim($_POST[$field]) === '') || (is_array($_POST[$field]) && empty($_POST[$field]))) {
            $response['message'] = "Error: El campo '$field' es obligatorio.";
            echo json_encode($response);
            $mysqli->close();
            exit;
        }
    }

    // 2. Obtener y preparar datos
    // $idOca ya está definido y validado arriba
    $idProyecto = filter_input(INPUT_POST, 'idProyecto', FILTER_VALIDATE_INT);
    $oca_numero = trim($_POST['oca_numero']); // Nombre de campo unificado
    // $fechaOca = trim($_POST['fechaOca']); // Eliminado
    // $formaPago = trim($_POST['formaPago']); // Eliminado
    $valor_oca = filter_input(INPUT_POST, 'valor_oca', FILTER_VALIDATE_FLOAT, FILTER_NULL_ON_FAILURE);
    // $idResidente = filter_input(INPUT_POST, 'idResidente', FILTER_VALIDATE_INT); // Eliminado del form directo de OCA
    $idProveedor = filter_input(INPUT_POST, 'idProveedor', FILTER_VALIDATE_INT);
    $idEstado_Oca = filter_input(INPUT_POST, 'idEstado_Oca', FILTER_VALIDATE_INT); // Nuevo campo
    // Fecha entrega puede ser NULL si el estado no es ENTREGADO
    // $fechaEntrega = ($estado === 'ENTREGADO' && !empty($_POST['fechaEntrega'])) ? trim($_POST['fechaEntrega']) : null; // Eliminado
    $observaciones = isset($_POST['observaciones']) ? trim($_POST['observaciones']) : null; // Nuevo campo

    // Obtener anio_oca del formulario, ya que es editable
    $anio_oca_form = filter_input(INPUT_POST, 'anio_oca', FILTER_VALIDATE_INT);


    // Validar tipos
    if ($idOca === false || $idProyecto === false || $idProveedor === false || $idEstado_Oca === false) {
        $response['message'] = "Error: ID de OCA, Proyecto, Proveedor o Estado inválido.";
        echo json_encode($response);
        $mysqli->close();
        exit;
    }
     if ($valor_oca === null || $valor_oca === false || $valor_oca < 0) {
        $response['message'] = "Error: El valor de la OCA debe ser un número válido.";
        echo json_encode($response);
        $mysqli->close();
        exit;
    }
    // Opcional: Validar formato de fechas

    // 3. Verificar si la OCA (oca_numero y anio_oca) ya existe para OTRO registro
    if ($anio_oca_form === null || $anio_oca_form === false) {
        $response['message'] = "Error: El año de la OCA proporcionado no es válido.";
        echo json_encode($response);
        $mysqli->close();
        exit;
    }

    $checkQuery = "SELECT COUNT(*) FROM control_ocas WHERE oca_numero = ? AND anio_oca = ? AND idOca != ?";
    $stmtCheck = $mysqli->prepare($checkQuery);
    if ($stmtCheck) {
        $stmtCheck->bind_param("sii", $oca_numero, $anio_oca_form, $idOca); // Usar $anio_oca_form
        $stmtCheck->execute();
        $stmtCheck->store_result();
        $stmtCheck->bind_result($count);
        $stmtCheck->fetch();
        $stmtCheck->close();
        if ($count > 0) {
            $response['message'] = "Error: Ya existe otra OCA con el número '$oca_numero' para el año '$anio_oca_form'.";
            echo json_encode($response);
            $mysqli->close();
            exit;
        }
    } else { error_log("Error preparando verificación duplicado OCA: " . $mysqli->error); }


    // 4. Iniciar Transacción
    $mysqli->begin_transaction();

    try {
        $datos_anteriores = json_encode($datos_anteriores_array); // $datos_anteriores_array ya está definido
        $estado_impresa_antes_de_editar = (int)$datos_anteriores_array['impresa']; // $estado_impresa_antes_de_editar ya está definido


        // 5. Preparar la sentencia UPDATE
        // Ajustar los nombres de campo a los de tu tabla `control_ocas` del módulo `facturacion`
        // Ejemplo: oca -> oca_numero, montoTotal -> valor_oca, etc.
        $updateQuery = "UPDATE control_ocas SET 
                            idProyecto = ?, oca_numero = ?, valor_oca = ?,
                            idProveedor = ?, idEstado_Oca = ?, observaciones = ?,
                            -- Campos que podrían estar en tu tabla facturacion.control_ocas
                            anio_oca = ?, proceso_dom = ?, numero_acta = ?, fecha_factura = ?,
                            numero_factura = ?, monto_factura = ?, iva_retenido_factura = ?, total_factura = ?,
                            total_factura_letras = ?, fechaCompras = ?
                            -- Eliminar: formaPago, estado (texto), fechaEntrega, idResidente (directo)
                        WHERE idOca = ?";
        $stmtUpdate = $mysqli->prepare($updateQuery);
        if ($stmtUpdate === false) {
            throw new Exception("Error preparando la actualización: " . $mysqli->error);
        }

        // Obtener los valores para los campos adicionales del POST o de $datos_anteriores_array si no se editan
        // $anio_oca_form ya se obtuvo y validó. Usar $anio_oca_form para la actualización.
        $anio_oca = $anio_oca_form;

        $proceso_dom = trim($_POST['proceso_dom'] ?? $datos_anteriores_array['proceso_dom']);
        $numero_acta = trim($_POST['numero_acta'] ?? $datos_anteriores_array['numero_acta']);

        $fecha_factura_post = trim($_POST['fecha_factura'] ?? '');
        $fecha_factura = !empty($fecha_factura_post) ? $fecha_factura_post : ($datos_anteriores_array['fecha_factura'] ?? null);

        $numero_factura = trim($_POST['numero_factura'] ?? $datos_anteriores_array['numero_factura']);

        $monto_factura_post = filter_input(INPUT_POST, 'monto_factura', FILTER_VALIDATE_FLOAT, FILTER_NULL_ON_FAILURE);
        $monto_factura = ($monto_factura_post !== null && $monto_factura_post !== false) ? (float)$monto_factura_post : (float)($datos_anteriores_array['monto_factura'] ?? 0);

        // Recalcular iva y total si monto_factura cambia
        $iva_retenido_factura = ($monto_factura >= 113) ? round(($monto_factura / 1.13) * 0.01, 2) : 0;
        $total_factura = round($monto_factura - $iva_retenido_factura, 2);

        $total_factura_letras = trim($_POST['total_factura_letras'] ?? $datos_anteriores_array['total_factura_letras']);
        $fechaCompras = trim($_POST['fechaCompras'] ?? $datos_anteriores_array['fechaCompras']);

        // Se elimina una 's' de los tipos y $fechaOca de los parámetros
        // La cadena de tipos correcta es isdiississssddssi (17 caracteres para 17 variables)
        $stmtUpdate->bind_param("isdiisssissddddsi", // Ajustar tipos y cantidad
            $idProyecto,
            $oca_numero,
            $valor_oca,
            $idProveedor,
            $idEstado_Oca,
            $observaciones,
            $anio_oca, $proceso_dom, $numero_acta, $fecha_factura, $numero_factura,
            $monto_factura, $iva_retenido_factura, $total_factura, $total_factura_letras, $fechaCompras,
            $idOca         // WHERE clause
        );

        // 6. Ejecutar la actualización
        if (!$stmtUpdate->execute()) {
             if ($mysqli->errno == 1062) {
                 throw new Exception("Error: Ya existe otra OCA con el número '$oca_numero' para el año '$anio_oca_form'.");
             } else {
                 throw new Exception("Error al ejecutar la actualización: " . $stmtUpdate->error);
             }
        }
        $stmtUpdate->close();

        // 6.1 LÓGICA PARA RESETEAR 'impresa' SI ES NECESARIO
        $resetear_estado_impresa = false;
        if ($estado_impresa_antes_de_editar === 1) { // $estado_impresa_antes_de_editar ya está definido
            // Si la OCA estaba marcada como impresa (1), y se ha editado,
            // la volvemos a marcar como "nueva" (impresa = 0).
            $stmtResetImpresa = $mysqli->prepare("UPDATE control_ocas SET impresa = 0 WHERE idOca = ?");
            if (!$stmtResetImpresa) {
                throw new Exception("Error al preparar reseteo de estado 'impresa': " . $mysqli->error);
            }
            $stmtResetImpresa->bind_param("i", $idOca);
            if (!$stmtResetImpresa->execute()) {
                throw new Exception("Error al resetear estado 'impresa' tras edición: " . $stmtResetImpresa->error);
            }
            $stmtResetImpresa->close();
            $resetear_estado_impresa = true;
        }

        // 7. Registrar en Historial
        $tipo_accion = "actualizar";
        $tabla_afectada = "control_ocas";
        $id_registro_afectado = $idOca; // El ID del registro que se actualizó

        $datos_nuevos = json_encode([ // Datos que se enviaron en el POST
            'idProyecto' => $idProyecto, 'oca_numero' => $oca_numero, 'valor_oca' => $valor_oca, // fechaOca eliminada
            'idProveedor' => $idProveedor, 'idEstado_Oca' => $idEstado_Oca, 'observaciones' => $observaciones,
            'anio_oca' => $anio_oca, 'proceso_dom' => $proceso_dom, 'numero_acta' => $numero_acta,
            'fecha_factura' => $fecha_factura, 'numero_factura' => $numero_factura,
            'monto_factura' => $monto_factura, 'iva_retenido_factura' => $iva_retenido_factura,
            'total_factura' => $total_factura, 'total_factura_letras' => $total_factura_letras, // Asegúrate que total_factura_letras se envíe si monto_factura cambia
            'impresa' => ($resetear_estado_impresa ? 0 : $estado_impresa_antes_de_editar), // Reflejar el estado final de 'impresa'
            'fechaCompras' => $fechaCompras
            // No incluir formaPago, estado (texto), fechaEntrega, idResidente (directo)
        ]);

        $sentenciaHistorial = $mysqli->prepare("INSERT INTO historial_cambios (idUsuario, tipo_accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos) VALUES (?, ?, ?, ?, ?, ?)");
        if ($sentenciaHistorial) {
            $sentenciaHistorial->bind_param("ississ", $usuario_id, $tipo_accion, $tabla_afectada, $id_registro_afectado, $datos_anteriores, $datos_nuevos);
            if (!$sentenciaHistorial->execute()) {
                 error_log("Error al ejecutar la consulta del historial: " . $sentenciaHistorial->error);
            }
            $sentenciaHistorial->close();
        } else {
             error_log("Error al preparar la consulta del historial: " . $mysqli->error);
        }

        // 7.b. Registrar en Historial el reseteo específico del estado 'impresa' (si ocurrió)
        if ($resetear_estado_impresa) {
            $tipo_accion_reset = "reset_impresion_por_edicion";
            // $tabla_afectada ya es "control_ocas"
            $datos_anteriores_impresa_hist = json_encode(['impresa' => 1]); // Estado anterior era 1
            $datos_nuevos_impresa_hist = json_encode(['impresa' => 0]);   // Nuevo estado es 0
            
            $sentenciaHistorialReset = $mysqli->prepare("INSERT INTO historial_cambios (idUsuario, tipo_accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos) VALUES (?, ?, ?, ?, ?, ?)");
            if ($sentenciaHistorialReset) {
                $sentenciaHistorialReset->bind_param("ississ", $usuario_id, $tipo_accion_reset, $tabla_afectada, $idOca, $datos_anteriores_impresa_hist, $datos_nuevos_impresa_hist);
                if (!$sentenciaHistorialReset->execute()) {
                    error_log("Error al registrar reseteo de impresión en historial: " . $sentenciaHistorialReset->error);
                }
                $sentenciaHistorialReset->close();
            } else {
                error_log("Error al preparar sentencia de historial para reseteo de impresión: " . $mysqli->error);
            }
        }

        // 8. Confirmar Transacción
        $mysqli->commit();
        $response['success'] = true;
        $response['message'] = '¡Orden de Compra actualizada exitosamente!';
        if ($resetear_estado_impresa) {
            $response['message'] .= " El estado de impresión ha sido marcado como 'Nueva' debido a la modificación.";
        }

    } catch (Exception $e) {
        // 9. Revertir Transacción en caso de error
        $mysqli->rollback();
        error_log("Error en transacción de actualización de OCA: " . $e->getMessage());
        $response['message'] = "Error al actualizar la OCA: " . $e->getMessage();
    }

    // 10. Cerrar conexión y responder
    $mysqli->close();
    echo json_encode($response);
    exit;
}
// --- Fin Procesamiento AJAX ---


// --- Lógica GET para Cargar Datos ---
$ocas = null;
$codigoNombreProyecto = '';
// $nombreResidente = ''; // Ya no se usa para el input directo de residente
$nombreProveedor = '';
$estadosOca = []; // Para poblar el select de estados

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET["idOca"])) {
        // Redirigir o mostrar error si no hay ID
        header("Location: listarOcas.php");
        exit("ID de OCA no proporcionado.");
    }
    $idOca = filter_input(INPUT_GET, 'idOca', FILTER_VALIDATE_INT);
    if (!$idOca) { // Adicionalmente verificar si es false o 0
        exit("ID de OCA inválido.");
    }

    if ($idOca === false) {
        exit("ID de OCA inválido.");
    }

    // Usar sentencia preparada y JOINs para obtener todos los datos necesarios
    $query = "SELECT co.*, /* Selecciona todos los campos de control_ocas */
                     p.codigoProyecto, p.nombreProyecto AS nombre_proyecto, p.municipio, /* Obtener idResidente del proyecto */
                     pr.proveedor AS nombre_proveedor, /* Alias para el nombre del proveedor */
                     eo.estadoOca AS nombre_estado_oca /* Nombre del estado */
              FROM control_ocas co
              LEFT JOIN proyectos p ON co.idProyecto = p.idProyecto
              LEFT JOIN proveedores pr ON co.idProveedor = pr.idProveedor
              LEFT JOIN estado_oca eo ON co.idEstado_Oca = eo.idEstado_Oca
              WHERE co.idOca = ?";

    $stmt_get = $mysqli->prepare($query);
    if ($stmt_get) {
        $stmt_get->bind_param("i", $idOca);
        if ($stmt_get->execute()) {
            $resultado = $stmt_get->get_result();
            $ocas = $resultado->fetch_assoc();
            if ($ocas) {
                // $codigoNombreProyecto = ($ocas['codigoProyecto'] ?? '') . ' - ' . ($ocas['municipio'] ?? '');
                $codigoNombreProyecto = ($ocas['codigoProyecto'] ?? '') . ' - ' . ($ocas['nombre_proyecto'] ?? '') . ' (' . ($ocas['municipio'] ?? '') . ')';
                $nombreProveedor = $ocas['nombre_proveedor'] ?? ''; // Usar alias
            } else {
                 exit("No se encontró la OCA con ese ID.");
            }
        } else {
             exit("Error ejecutando consulta GET: " . $stmt_get->error);
        }
        $stmt_get->close();
    } else {
        exit("Error preparando consulta GET: " . $mysqli->error);
    }

    // Obtener todos los estados de OCA para el select
    $resultEstados = $mysqli->query("SELECT idEstado_Oca, estadoOca FROM estado_oca ORDER BY estadoOca ASC");
    if ($resultEstados) {
        while ($rowEstado = $resultEstados->fetch_assoc()) {
            $estadosOca[] = $rowEstado;
        }
        $resultEstados->free();
    }
    $mysqli->close(); // Cerrar conexión GET
}

if (!$ocas) {
    // Si no es POST y no se encontró en GET, redirigir o mostrar error
    header("Location: listarOcas.php");
    exit();
}

// Incluir header y navbar DESPUÉS de la lógica PHP GET
include_once "header.php";
include_once "navbar.php";
?>
<style>
    /* Estilos para listas de autocompletado */
    .autocomplete-list {
        position: absolute;
        z-index: 1000;
        width: calc(100% - 2rem); /* Ajustar según padding del contenedor */
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid #ccc;
        background-color: white;
        display: none; /* Oculto por defecto */
    }
</style>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <div class="content-header">
        <div class="container-fluid">
            <div class="row mb-2">
                <div class="col-sm-6">
                    <h1 class="m-0" style="font-size:20px">Editar Orden de Compra (OCA)</h1>
                </div><!-- /.col -->
                <div class="col-sm-6">

                </div><!-- /.col -->
            </div><!-- /.row -->
        </div><!-- /.container-fluid -->
    </div><!-- /.content-header -->

    <!-- Main content -->
    <section class="content">
        <div class="container">
             <div class="row justify-content-center">
                <div class="col-md-8 col-lg-7"> <!-- Ancho del formulario -->
                    <div class="card card-primary">
                        <div class="card-header">
                            <h3 class="card-title">Detalles de la OCA</h3>
                        </div>
                        <!-- *** FORMULARIO ACTUALIZADO *** -->
                        <form action="editarOcas.php" method="POST" id="editOcaForm" class="needs-validation" novalidate>
                            <!-- Campo oculto para enviar el ID -->
                            <input type="hidden" name="idOca" value="<?php echo htmlspecialchars($ocas['idOca'] ?? ''); ?>">

                            <div class="card-body">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label for="oca_numero" class="form-label">Orden de Compra (Número) <span class="text-danger">*</span></label>
                                        <input value="<?php echo htmlspecialchars($ocas['oca_numero'] ?? ''); ?>" type="text" class="form-control" placeholder="Número OCA" name="oca_numero" id="oca_numero" autocomplete="off" required autofocus>
                                        <div class="invalid-feedback">Ingrese el número de OCA.</div>
                                    </div>
                                    <!-- Campo Fecha OCA Eliminado del Formulario -->
                                    <div class="col-md-6"> <!-- Este div se puede usar para otro campo o ajustar el layout -->
                                        <label for="valor_oca" class="form-label">Valor OCA <span class="text-danger">*</span></label>
                                        <div class="input-group">
                                            <span class="input-group-text">$</span>
                                            <input value="<?php echo htmlspecialchars($ocas['valor_oca'] ?? ''); ?>" type="number" class="form-control" placeholder="0.00" name="valor_oca" id="valor_oca" step="0.01" min="0" required> <!-- Asumiendo 'valor_oca' -->
                                            <div class="invalid-feedback">Ingrese un monto válido.</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <!-- Campo Forma de Pago Eliminado -->
                                    <div class="col-md-6">
                                        <label for="anio_oca" class="form-label">Año OCA <span class="text-danger">*</span></label>
                                        <input value="<?php echo htmlspecialchars($ocas['anio_oca'] ?? date('Y')); ?>" type="number" class="form-control" name="anio_oca" id="anio_oca" placeholder="Ej: <?php echo date('Y'); ?>" required>
                                        <div class="invalid-feedback">Ingrese el año.</div>
                                    </div>
                                </div>
                                <hr>
                                <!-- Campos adicionales de ingresarOca.php (facturacion) -->
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label for="proceso_dom" class="form-label">Proceso DOM <span class="text-danger">*</span></label>
                                        <input value="<?php echo htmlspecialchars($ocas['proceso_dom'] ?? ''); ?>" type="text" class="form-control" name="proceso_dom" id="proceso_dom" placeholder="Ej: DOM-CD-001/2024-ADM" required>
                                        <div class="invalid-feedback">Ingrese el proceso DOM.</div>
                                    </div>
                                    <div class="col-md-6">
                                        <label for="numero_acta" class="form-label">N° Acta <span class="text-danger">*</span></label>
                                        <input value="<?php echo htmlspecialchars($ocas['numero_acta'] ?? ''); ?>" type="text" class="form-control" name="numero_acta" id="numero_acta" placeholder="Número de Acta" required>
                                        <div class="invalid-feedback">Ingrese el número de acta.</div>
                                    </div>
                                </div>

                                <div class="row mb-3">
                                    <div class="col-12 position-relative">
                                        <label for="buscarProyecto" class="form-label">Proyecto <span class="text-danger">*</span></label>
                                        <!-- Mostrar el nombre del proyecto actual -->
                                        <input value="<?php echo htmlspecialchars($codigoNombreProyecto); ?>" type="text" class="form-control" id="buscarProyecto" placeholder="Buscar y seleccionar proyecto..." autocomplete="off" required>
                                        <input value="<?php echo htmlspecialchars($ocas['idProyecto'] ?? ''); ?>" type="hidden" name="idProyecto" id="idProyecto" required> <!-- idProyecto de la OCA -->
                                        <div id="proyectoList" class="list-group autocomplete-list"></div>
                                        <div class="invalid-feedback">Seleccione un proyecto.</div>
                                    </div>
                                </div>

                                <div class="row mb-3">
                                    <div class="col-md-12 position-relative">
                                        <label for="buscarProveedor" class="form-label">Proveedor <span class="text-danger">*</span></label>
                                        <!-- Mostrar el nombre del proveedor actual -->
                                        <input value="<?php echo htmlspecialchars($nombreProveedor); ?>" type="text" class="form-control" id="buscarProveedor" placeholder="Buscar y seleccionar proveedor..." autocomplete="off" required>
                                        <input value="<?php echo htmlspecialchars($ocas['idProveedor'] ?? ''); ?>" type="hidden" name="idProveedor" id="idProveedor" required>
                                        <div id="proveedorList" class="list-group autocomplete-list"></div>
                                        <div class="invalid-feedback">Seleccione un proveedor.</div>
                                    </div>
                                </div>
                                <hr>
                                <!-- Detalles de Factura -->
                                <h5 class="mb-3">Detalles de Factura</h5>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label for="fecha_factura" class="form-label">Fecha Factura <span class="text-danger">*</span></label>
                                        <input value="<?php echo htmlspecialchars($ocas['fecha_factura'] ?? ''); ?>" type="date" class="form-control" name="fecha_factura" id="fecha_factura" required>
                                        <div class="invalid-feedback">Ingrese fecha de factura.</div>
                                    </div>
                                    <div class="col-md-6">
                                        <label for="numero_factura" class="form-label">N° Factura <span class="text-danger">*</span></label>
                                        <input value="<?php echo htmlspecialchars($ocas['numero_factura'] ?? ''); ?>" type="text" class="form-control" name="numero_factura" id="numero_factura" placeholder="Número de Factura" required>
                                        <div class="invalid-feedback">Ingrese número de factura.</div>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-4">
                                        <label for="monto_factura" class="form-label">Monto Factura <span class="text-danger">*</span></label>
                                        <input value="<?php echo htmlspecialchars($ocas['monto_factura'] ?? ''); ?>" type="number" class="form-control" name="monto_factura" id="monto_factura" step="0.01" min="0" placeholder="0.00" required>
                                    </div>
                                    <div class="col-md-4">
                                        <label for="iva_retenido_factura" class="form-label">IVA Retenido</label>
                                        <input value="<?php echo htmlspecialchars($ocas['iva_retenido_factura'] ?? ''); ?>" type="text" class="form-control" name="iva_retenido_factura" id="iva_retenido_factura" readonly>
                                    </div>
                                    <div class="col-md-4">
                                        <label for="total_factura" class="form-label">Total Factura</label>
                                        <input value="<?php echo htmlspecialchars($ocas['total_factura'] ?? ''); ?>" type="text" class="form-control" name="total_factura" id="total_factura" readonly>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-12">
                                        <label for="total_factura_letras" class="form-label">Valor en Letras <span class="text-danger">*</span></label>
                                        <input value="<?php echo htmlspecialchars($ocas['total_factura_letras'] ?? ''); ?>" type="text" class="form-control" name="total_factura_letras" id="total_factura_letras" readonly required>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label for="fechaCompras" class="form-label">Fecha enviada a Compras <span class="text-danger">*</span></label>
                                        <input value="<?php echo htmlspecialchars($ocas['fechaCompras'] ?? ''); ?>" type="date" class="form-control" name="fechaCompras" id="fechaCompras" required>
                                        <div class="invalid-feedback">Ingrese fecha de compras.</div>
                                    </div>
                                </div>
                                <hr>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label for="idEstado_Oca" class="form-label">Estado OCA <span class="text-danger">*</span></label>
                                        <select class="form-select form-control" name="idEstado_Oca" id="idEstado_Oca" required>
                                            <option value="" disabled>Seleccione...</option>
                                            <?php foreach ($estadosOca as $estadoItem): ?>
                                                <option value="<?php echo $estadoItem['idEstado_Oca']; ?>" <?php echo (isset($ocas['idEstado_Oca']) && $ocas['idEstado_Oca'] == $estadoItem['idEstado_Oca']) ? 'selected' : ''; ?>>
                                                    <?php echo htmlspecialchars($estadoItem['estadoOca']); ?>
                                                </option>
                                            <?php endforeach; ?>
                                        </select>
                                        <div class="invalid-feedback">Seleccione un estado.</div>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-12">
                                        <label for="observaciones" class="form-label">Observaciones (Opcional)</label>
                                        <textarea class="form-control" name="observaciones" id="observaciones" placeholder="Añadir observaciones..." rows="2"><?php echo htmlspecialchars($ocas['observaciones'] ?? ''); ?></textarea>
                                    </div>
                                </div>
                            </div> <!-- /.card-body -->

                            <div class="card-footer text-center">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save mr-1"></i> Actualizar OCA
                                </button>
                                <a class="btn btn-secondary ml-2" href="listarOcas.php">
                                    <i class="fas fa-times mr-1"></i> Cancelar
                                </a>
                            </div>
                        </form>
                    </div> <!-- /.card -->
                </div> <!-- /.col -->
            </div> <!-- /.row -->
        </div> <!-- /.container -->
    </section>
    <!-- /.content -->
</div>
<!-- /.content-wrapper -->

<?php include_once "footer.php"; ?>

<!-- *** JAVASCRIPT ACTUALIZADO *** -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('editOcaForm'); // ID del formulario de edición
    // Campos de autocompletado
    const proyectoInput = document.getElementById('buscarProyecto');
    const proveedorInput = document.getElementById('buscarProveedor');
    const proyectoListDiv = document.getElementById('proyectoList');
    const proveedorListDiv = document.getElementById('proveedorList');

    // Campos de factura
    const montoFacturaInput = document.getElementById('monto_factura');
    const ivaRetenidoInput = document.getElementById('iva_retenido_factura');
    const totalFacturaInput = document.getElementById('total_factura');
    const totalFacturaLetrasInput = document.getElementById('total_factura_letras');

    // --- Función NumeroALetras (Adaptada) ---
    function NumeroALetras(num, currency) {
        currency = currency || {};
        var data = {
            numero: num,
            enteros: Math.floor(num),
            centavos: (((Math.round(num * 100)) - (Math.floor(num) * 100))),
            letrasCentavos: '',
            letrasMonedaPlural: currency.plural || 'DÓLARES ESTADOUNIDENSES', // Ajusta según tu moneda
            letrasMonedaSingular: currency.singular || 'DÓLAR ESTADOUNIDENSE',
            letrasMonedaCentavoPlural: currency.centPlural || 'CENTAVOS',
            letrasMonedaCentavoSingular: currency.centSingular || 'CENTAVO'
        };

        if (data.centavos > 0) {
            data.letrasCentavos = "CON " + (function() {
                if (data.centavos == 1)
                    return Millones(data.centavos) + " " + data.letrasMonedaCentavoSingular;
                else
                    return Millones(data.centavos) + " " + data.letrasMonedaCentavoPlural;
            })();
        } else {
            data.letrasCentavos = "CON CERO " + data.letrasMonedaCentavoPlural;
        }

        if (data.enteros == 0)
            return "CERO " + data.letrasMonedaPlural + " " + data.letrasCentavos;
        if (data.enteros == 1)
            return Millones(data.enteros) + " " + data.letrasMonedaSingular + " " + data.letrasCentavos;
        else
            return Millones(data.enteros) + " " + data.letrasMonedaPlural + " " + data.letrasCentavos;

        function Unidades(num) {
            switch (num) {
                case 1: return "UN"; case 2: return "DOS"; case 3: return "TRES"; case 4: return "CUATRO";
                case 5: return "CINCO"; case 6: return "SEIS"; case 7: return "SIETE"; case 8: return "OCHO";
                case 9: return "NUEVE";
            }
            return "";
        }
        function Decenas(num) {
            let decena = Math.floor(num / 10); let unidad = num % 10;
            switch (decena) {
                case 1: switch (unidad) {
                        case 0: return "DIEZ"; case 1: return "ONCE"; case 2: return "DOCE"; case 3: return "TRECE";
                        case 4: return "CATORCE"; case 5: return "QUINCE"; default: return "DIECI" + Unidades(unidad).toLowerCase();
                    }
                case 2: return unidad == 0 ? "VEINTE" : "VEINTI" + Unidades(unidad).toLowerCase();
                case 3: return DecenasY("TREINTA", unidad); case 4: return DecenasY("CUARENTA", unidad);
                case 5: return DecenasY("CINCUENTA", unidad); case 6: return DecenasY("SESENTA", unidad);
                case 7: return DecenasY("SETENTA", unidad); case 8: return DecenasY("OCHENTA", unidad);
                case 9: return DecenasY("NOVENTA", unidad); case 0: return Unidades(unidad);
            }
        }
        function DecenasY(strSin, numUnidades) { if (numUnidades > 0) return strSin + " Y " + Unidades(numUnidades); return strSin; }
        function Centenas(num) {
            let centenas = Math.floor(num / 100); let decenas = num % 100;
            switch (centenas) {
                case 1: if (decenas > 0) return "CIENTO " + Decenas(decenas); return "CIEN";
                case 2: return "DOSCIENTOS " + Decenas(decenas); case 3: return "TRESCIENTOS " + Decenas(decenas);
                case 4: return "CUATROCIENTOS " + Decenas(decenas); case 5: return "QUINIENTOS " + Decenas(decenas);
                case 6: return "SEISCIENTOS " + Decenas(decenas); case 7: return "SETECIENTOS " + Decenas(decenas);
                case 8: return "OCHOCIENTOS " + Decenas(decenas); case 9: return "NOVECIENTOS " + Decenas(decenas);
            }
            return Decenas(decenas);
        }
        function Seccion(num, divisor, strSingular, strPlural) { let cientos = Math.floor(num / divisor); let resto = num % divisor; let letras = ""; if (cientos > 0) if (cientos > 1) letras = Centenas(cientos) + " " + strPlural; else letras = strSingular; if (resto > 0) letras += ""; return letras; }
        function Miles(num) { let divisor = 1000; let cientos = Math.floor(num / divisor); let resto = num % divisor; let strMiles = Seccion(num, divisor, "UN MIL", "MIL"); let strCentenas = Centenas(resto); if (strMiles == "") return strCentenas; return strMiles + " " + strCentenas; }
        function Millones(num) { let divisor = 1000000; let cientos = Math.floor(num / divisor); let resto = num % divisor; let strMillones = Seccion(num, divisor, "UN MILLON DE", "MILLONES DE"); let strMiles = Miles(resto); if (strMillones == "") return strMiles; return strMillones + " " + strMiles; }
    };

    function calcularValoresFactura() {
        const montoFactura = parseFloat(montoFacturaInput.value) || 0;
        let ivaRetenido = 0;
        if (montoFactura >= 113) { ivaRetenido = (montoFactura / 1.13) * 0.01; }
        ivaRetenidoInput.value = ivaRetenido.toFixed(2);
        const totalFactura = montoFactura - ivaRetenido;
        totalFacturaInput.value = totalFactura.toFixed(2);
        totalFacturaLetrasInput.value = totalFactura >= 0 ? NumeroALetras(totalFactura).toUpperCase() : '';
    }
    if (montoFacturaInput) montoFacturaInput.addEventListener('input', calcularValoresFactura);

    // --- Manejo de Envío del Formulario con Fetch y SweetAlert ---
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        form.classList.add('was-validated');

        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Actualizando...';

        fetch('editarOcas.php', { // Enviar al mismo archivo
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        })
        .then(response => {
             const contentType = response.headers.get("content-type");
             if (response.ok && contentType && contentType.indexOf("application/json") !== -1) {
                 return response.json();
             } else {
                 return response.text().then(text => {
                     throw new Error(`Respuesta inesperada (Status: ${response.status}): ${text}`);
                 });
             }
        })
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Actualizado!',
                    text: data.message,
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = 'listarOcas.php'; // Redirigir a la lista
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al Actualizar',
                    text: data.message || 'No se pudo actualizar la OCA.'
                });
            }
        })
        .catch(error => {
            console.error('Error en fetch:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de Comunicación',
                text: error.message.includes("Respuesta inesperada")
                      ? 'Ocurrió un error en el servidor. Revise la consola (F12) > Red > Respuesta.'
                      : 'No se pudo comunicar con el servidor.'
            });
        })
        .finally(() => {
             submitButton.disabled = false;
             submitButton.innerHTML = originalButtonText;
        });
    });

    // --- Lógica de Autocompletado (Usando Fetch - igual que ingresarOca) ---
    function setupAutocomplete(inputId, listId, hiddenId, type) {
        const inputElement = document.getElementById(inputId);
        const listDiv = document.getElementById(listId);
        const hiddenElement = document.getElementById(hiddenId);

        if (!inputElement || !listDiv || !hiddenElement) return;

        inputElement.addEventListener('input', function() {
            const query = this.value;
            if (query.length < 2) {
                listDiv.innerHTML = '';
                listDiv.style.display = 'none';
                hiddenElement.value = '';
                return;
            }

            fetch(`buscar.php?q=${encodeURIComponent(query)}&type=${type}`)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => {
                    listDiv.innerHTML = '';
                    listDiv.style.display = 'none';
                    if (data && data.length > 0) { // Verificar que data sea un array
                        data.forEach(item => { // item debe tener 'id' y 'nombre'
                            const a = document.createElement('a');
                            a.href = '#';
                            a.classList.add('list-group-item', 'list-group-item-action');
                            // Ajustar texto según el tipo
                            let displayText = item.nombre;
                            if (type === 'proyectos' && item.codigo) {
                                displayText = `${item.codigo} - ${item.nombre}`;
                            }
                            // Para proveedores, item.nombre ya es el nombre del proveedor
                            a.textContent = displayText;
                            a.onclick = (e) => {
                                e.preventDefault();
                                inputElement.value = displayText; // Mostrar texto completo
                                hiddenElement.value = item.id;
                                // Si es proyecto, actualizar campo de residente (solo display)
                                if (type === 'proyectos' && document.getElementById('displayResidenteProyecto')) {
                                    // Asumimos que buscar.php para proyectos también devuelve el nombre del residente
                                    document.getElementById('displayResidenteProyecto').value = item.residenteNombre || 'Residente se asigna por proyecto';
                                }
                                listDiv.innerHTML = '';
                                listDiv.style.display = 'none';
                            };
                            listDiv.appendChild(a);
                        });
                        listDiv.style.display = 'block';
                    } else {
                        listDiv.innerHTML = '<div class="list-group-item disabled">No encontrado</div>';
                        listDiv.style.display = 'block';
                    }
                })
                .catch(error => {
                    console.error(`Error buscando ${type}:`, error);
                    listDiv.innerHTML = `<div class="list-group-item text-danger">Error al buscar ${type}</div>`;
                    listDiv.style.display = 'block';
                });
        });

         inputElement.addEventListener('change', function() {
             if (this.value === '') {
                 hiddenElement.value = '';
             }
         });
    }

    setupAutocomplete('buscarProyecto', 'proyectoList', 'idProyecto', 'proyectos');
    // setupAutocomplete('buscarResidente', 'residenteList', 'idResidente', 'residentes'); // Eliminado
    setupAutocomplete('buscarProveedor', 'proveedorList', 'idProveedor', 'proveedores');

    // Lógica de fechaEntrega eliminada

    // Ocultar listas si se hace clic fuera
    document.addEventListener('click', function(event) {
        const lists = [proyectoListDiv, proveedorListDiv]; // residenteListDiv eliminado
        const inputs = [proyectoInput, proveedorInput]; // residenteInput eliminado
        let clickedInside = false;

        inputs.forEach(input => { if (input && input.contains(event.target)) clickedInside = true; });
        lists.forEach(list => { if (list && list.contains(event.target)) clickedInside = true; });

        if (!clickedInside) {
            lists.forEach(list => { if (list) list.style.display = 'none'; });
        }
    });

}); // Fin DOMContentLoaded
</script>
