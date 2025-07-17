<?php
// Mostrar todos los errores
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start(); // Necesario para historial y autenticación

// Incluir la conexión y verificarla al inicio del script
$mysqli = include_once "conexion.php";
if ($mysqli->connect_error) {
    // En caso de error de conexión, redirigir o mostrar un mensaje adecuado
    // Para una petición GET, podrías mostrar una página de error o redirigir al index
    // Para una petición POST (AJAX), la respuesta JSON se manejará más abajo
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        die("Error crítico de conexión a la base de datos: " . $mysqli->connect_error);
    }
    // Si es POST, el error se manejará en el bloque AJAX
}

// Definir el ID del estado "Observada"
// ¡¡¡IMPORTANTE!!! Verifica este valor en tu tabla `estado_oca` y ajústalo si es necesario.
define('ID_ESTADO_OBSERVADA', 3);

// --- <<<< PROCESAMIENTO AJAX DEL FORMULARIO >>>> ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {

    // --- <<<< NINGUNA SALIDA HTML ANTES DE ESTE PUNTO >>>> ---

    header('Content-Type: application/json');
    $response = ['success' => false, 'message' => 'Error desconocido al ingresar la OCA.'];

    // Verificar sesión de usuario
    if (!isset($_SESSION['idUsuario'])) {
        $response['message'] = 'Error: Sesión de usuario no válida.';
        echo json_encode($response);
        exit;
    }
    $usuario_id = $_SESSION['idUsuario'];

    // La conexión $mysqli ya está disponible aquí
    if ($mysqli->connect_error) {
        $response['message'] = "Error de conexión a la base de datos: " . $mysqli->connect_error;
        echo json_encode($response);
    }

    // 1. Validación básica del lado del servidor
    $required_fields = ['idProyecto', 'oca_numero', 'anio_oca', 'proceso_numero', 'valor_oca', 'numero_acta', 'idProveedor', 'fecha_factura', 'numero_factura', 'monto_factura', 'total_factura_letras', 'idEstado_Oca']; // Eliminado 'fechaCompras'
    foreach ($required_fields as $field) {
        if (!isset($_POST[$field]) || trim($_POST[$field]) === '') {
            $response['message'] = "Error: El campo '$field' es obligatorio y no puede estar vacío.";
            if ($mysqli instanceof mysqli && $mysqli->thread_id) $mysqli->close(); // Cerrar solo si la conexión es válida
            echo json_encode($response);
            exit; // Salir después de enviar la respuesta JSON
        }
    }

    // 2. Obtener y preparar datos
    // El correlativo (idOca) será AUTO_INCREMENT en la BD.
    $idProyecto = filter_input(INPUT_POST, 'idProyecto', FILTER_VALIDATE_INT);
    $oca_numero = trim($_POST['oca_numero']);
    $anio_oca = filter_input(INPUT_POST, 'anio_oca', FILTER_VALIDATE_INT);
    $proceso_numero = trim($_POST['proceso_numero']);

    // Construir el formato completo de la OCA
    $oca_completa = "OCA-" . $oca_numero . "/" . $anio_oca;
    // Construir el proceso completo
    $proceso_dom = "DOM-CD-" . $proceso_numero . "/" . $anio_oca . "-ADM";

    $valor_oca = filter_input(INPUT_POST, 'valor_oca', FILTER_VALIDATE_FLOAT);
    $numero_acta = trim($_POST['numero_acta']);
    $idProveedor = filter_input(INPUT_POST, 'idProveedor', FILTER_VALIDATE_INT);
    $fecha_factura = trim($_POST['fecha_factura']); // Validar formato si es necesario
    $numero_factura = trim($_POST['numero_factura']);
    $monto_factura = filter_input(INPUT_POST, 'monto_factura', FILTER_VALIDATE_FLOAT);    
    // $fechaCompras = trim($_POST['fechaCompras']); // Ya no se recibe aquí
    $idEstado_Oca = filter_input(INPUT_POST, 'idEstado_Oca', FILTER_VALIDATE_INT); // Nuevo
    $observaciones = isset($_POST['observaciones']) ? trim($_POST['observaciones']) : null; // Nuevo



    // Calcular IVA retenido y Total Factura en backend para seguridad
    $iva_retenido_factura = 0;
    if ($monto_factura !== false && $monto_factura >= 113) { // Asegurar que monto_factura sea un número
        $iva_retenido_factura = round(($monto_factura / 1.13) * 0.01, 2);
    }
    $total_factura = round($monto_factura - $iva_retenido_factura, 2);
    $total_factura_letras = trim($_POST['total_factura_letras']); // Recibir el valor en letras

    // Validar tipos
    if ($idProyecto === false || $anio_oca === false || $idProveedor === false || $idEstado_Oca === false) {
        $response['message'] = "Error: ID de Proyecto, Año OCA o ID de Proveedor inválido.";
        if ($mysqli instanceof mysqli && $mysqli->thread_id) {
            $mysqli->close();
        }
        echo json_encode($response);
        exit;
    }
     if ($valor_oca === false || $valor_oca < 0 || $monto_factura === false || $monto_factura < 0) {
        $response['message'] = "Error: Valor de OCA y Monto de Factura deben ser números válidos.";
        if ($mysqli instanceof mysqli && $mysqli->thread_id) { // Cerrar solo si la conexión es válida
            $mysqli->close();
        }
        echo json_encode($response);
        exit;
    }
    // Opcional: Validar fechas

    // 3. Nueva Verificación de Acta y Estado
    // Buscar si ya existe una OCA con el mismo oca_numero, anio_oca Y numero_acta.
    $checkActaQuery = "SELECT idOca, idEstado_Oca FROM control_ocas WHERE oca_numero = ? AND anio_oca = ? AND numero_acta = ?";
    $stmtCheckActa = $mysqli->prepare($checkActaQuery);
    if ($stmtCheckActa) {
        $stmtCheckActa->bind_param("sis", $oca_numero, $anio_oca, $numero_acta);
        $stmtCheckActa->execute();
        $resultCheckActa = $stmtCheckActa->get_result();
        $existingOcaWithActa = $resultCheckActa->fetch_assoc();
        $stmtCheckActa->close();

        if ($existingOcaWithActa) {
            // Se encontró una OCA con el mismo número, año y acta.
            // Verificar su estado.
            if ($existingOcaWithActa['idEstado_Oca'] != ID_ESTADO_OBSERVADA) {
                // Si el acta existe y la OCA NO está observada, impedir ingreso.
                $response['message'] = "Error: El acta N° '$numero_acta' ya existe para la OCA '$oca_completa' y su estado no es 'Observada'.";
                if ($mysqli instanceof mysqli && $mysqli->thread_id) {
                    $mysqli->close();
                }
                echo json_encode($response);
                exit;
            }
            // Si está observada, se permite continuar y se insertará una nueva entrada.
        }
    } else {
        error_log("Error preparando verificación de acta existente: " . $mysqli->error);
            if ($mysqli instanceof mysqli && $mysqli->thread_id) {
                $mysqli->close();
            }
        $response['message'] = "Error interno al verificar acta existente.";
        echo json_encode($response);
        exit;
    }

    // 4. Iniciar Transacción
    $mysqli->begin_transaction();

    try { // <<<< INICIO BLOQUE TRY PARA INSERCIÓN
        // 5. Preparar la sentencia INSERT
        $insertQuery = "INSERT INTO control_ocas
                        (idProyecto, oca_numero, anio_oca, oca_completa, proceso_dom, valor_oca, numero_acta, idProveedor,
                         fecha_factura, numero_factura, monto_factura, iva_retenido_factura, total_factura, total_factura_letras, 
                         idUsuario_registro, impresa, idEstado_Oca, observaciones, fechaCompras) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NULL)"; // fechaCompras se inserta como NULL inicialmente
        $stmtInsert = $mysqli->prepare($insertQuery); // <<<< ERROR POTENCIAL SI $mysqli NO ESTÁ DEFINIDO AQUÍ
        if ($stmtInsert === false) {
            throw new Exception("Error preparando la inserción: " . $mysqli->error);
        }

        // Vincular parámetros (i=int, s=string, d=double)
        $stmtInsert->bind_param("issssdiissdddsiis", 
            $idProyecto, // i
            $oca_numero,
            $anio_oca,
            $oca_completa, // s <<< NUEVO
            $proceso_dom,
            $valor_oca,
            $numero_acta,
            $idProveedor,
            $fecha_factura,
            $numero_factura,
            $monto_factura,
            $iva_retenido_factura,
            $total_factura,
            $total_factura_letras,
            // $fechaCompras, // Ya no se inserta aquí
            $usuario_id,
            $idEstado_Oca,   // Nuevo
            $observaciones // Nuevo
        );

        // 6. Ejecutar la inserción
        if (!$stmtInsert->execute()) {
            // Verificar error de duplicado (si hay UNIQUE constraint en oca+idProyecto)
             if ($mysqli->errno == 1062) { // Error de entrada duplicada
                 // Este error ahora podría ser por UNIQUE(oca_numero, anio_oca, numero_acta) si la lógica PHP falló
                 // o si la OCA existente no estaba observada.
                 // O si todavía existe un UNIQUE(oca_numero, anio_oca) en la BD que no se eliminó.
                 throw new Exception("Error de duplicado en la base de datos. Verifique que la combinación OCA/Año/Acta sea única o que la existente esté 'Observada'. También revise las restricciones UNIQUE de la tabla.");
             } else {
                 throw new Exception("Error al ejecutar la inserción: " . $stmtInsert->error);
             }
        }
        $id_registro_afectado = $mysqli->insert_id; // Obtener ID de la OCA insertada (Correlativo)
        $stmtInsert->close();

        // 7. Registrar en Historial
        $tipo_accion = "insertar";
        $tabla_afectada = "control_ocas";
        $datos_nuevos = json_encode([
            'correlativo_oca' => $id_registro_afectado,
            'idProyecto' => $idProyecto,
            'oca_numero' => $oca_numero,
            'anio_oca' => $anio_oca,
            'oca_completa' => $oca_completa, // <<< NUEVO
            'proceso_dom' => $proceso_dom,
            'valor_oca' => $valor_oca,
            'numero_acta' => $numero_acta,
            'idProveedor' => $idProveedor,
            'fecha_factura' => $fecha_factura,
            'numero_factura' => $numero_factura,
            'monto_factura' => $monto_factura,
            'iva_retenido_factura' => $iva_retenido_factura,
            'total_factura' => $total_factura,
            'total_factura_letras' => $total_factura_letras,
            // 'fechaCompras' => $fechaCompras, // Ya no se registra aquí
            'idEstado_Oca' => $idEstado_Oca,
            'observaciones' => $observaciones
        ]);
        $datos_anteriores = null;

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

        // 8. Confirmar Transacción
        $mysqli->commit();
        $response['success'] = true;
        $response['message'] = '¡Orden de Compra ingresada exitosamente!';

    } catch (Exception $e) {
        // 9. Revertir Transacción en caso de error
        $mysqli->rollback();
        error_log("Error en transacción de ingreso de OCA: " . $e->getMessage());
        $response['message'] = "Error al ingresar la OCA: " . $e->getMessage();
    }

    // 10. Cerrar conexión y responder
    if ($mysqli instanceof mysqli && $mysqli->thread_id) { // Cerrar solo si la conexión es válida
        $mysqli->close();
    }
    echo json_encode($response);
    exit;
}
// --- Fin Procesamiento AJAX ---


// --- ESTA PARTE SOLO SE EJECUTA PARA PETICIONES GET ---
include_once "header.php";
include_once "navbar.php";
// Obtener estados de OCA para el select
$estadosOca = [];
$resultEstados = $mysqli->query("SELECT idEstado_Oca, estadoOca FROM estado_oca ORDER BY estadoOca ASC");
if ($resultEstados) {
    $estadosOca = $resultEstados->fetch_all(MYSQLI_ASSOC);
}

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
                    <h1 class="m-0" style="font-size:20px">Ingresar Orden de Compra (OCA)</h1>
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
                        <form action="ingresarOca.php" method="POST" id="addOcaForm" class="needs-validation" novalidate>
                            <div class="card-body">
                           
                                <!-- Nuevo Campo: Última Acta Registrada para el Proyecto -->
                                <div class="row mb-2"> <!-- Reducido margen inferior -->
                                    <div class="col-12">                                        
                                        <label for="acta_existente_oca_display" class="form-label">Acta Registrada para esta OCA/Año (Si existe)</label>
                                        <input type="text" class="form-control form-control-sm" id="acta_existente_oca_display" readonly placeholder="Ingrese Número y Año de OCA para verificar...">
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-4">
                                        <label for="oca_numero" class="form-label">OCA (Número) <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" placeholder="Ej: 12345" name="oca_numero" id="oca_numero" autocomplete="off" required autofocus>
                                        <div class="invalid-feedback">Ingrese el número de OCA.</div>
                                    </div>                                   
                                    <div class="col-md-3">
                                        <label for="anio_oca" class="form-label">Año <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" placeholder="Ej: <?php echo date('Y'); ?>" name="anio_oca" id="anio_oca" value="<?php echo date('Y'); ?>" required>
                                        <div class="invalid-feedback">Ingrese el año.</div>
                                    </div>
                                    <div class="col-md-5">
                                        <label for="oca_completa_display" class="form-label">OCA Completa</label>
                                        <input type="text" class="form-control" name="oca_completa_display" id="oca_completa_display" readonly>
                                    </div>
                                     <div class="col-md-6 mt-2">
                                        <label for="valor_oca" class="form-label">Valor de OCA <span class="text-danger">*</span></label>
                                        <div class="input-group">
                                            <span class="input-group-text">$</span>
                                            <input type="number" class="form-control" placeholder="0.00" name="valor_oca" id="valor_oca" step="0.01" min="0" required>
                                            <div class="invalid-feedback">Ingrese un monto válido.</div>
                                        </div>
                                    </div>
                                    <div class="col-md-6 mt-2">
                                        <label for="proceso_numero" class="form-label">Número de Proceso <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" placeholder="Ej: 001" name="proceso_numero" id="proceso_numero" autocomplete="off" required>
                                        <div class="invalid-feedback">Ingrese el número de proceso.</div>
                                    </div>
                                </div>

                                <div class="row mb-3">
                                    <div class="col-12">
                                        <label for="proceso_dom_display" class="form-label">Proceso DOM Completo</label>
                                        <input type="text" class="form-control" name="proceso_dom_display" id="proceso_dom_display" readonly>
                                    </div>
                                </div>
                                
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label for="numero_acta" class="form-label">N° Acta <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" placeholder="Número de Acta" name="numero_acta" id="numero_acta" autocomplete="off" required>
                                        <div class="invalid-feedback">Ingrese el número de acta.</div>
                                    </div>
                                    <div class="col-md-6 position-relative">
                                        <label for="buscarProveedor" class="form-label">Proveedor <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="buscarProveedor" placeholder="Buscar proveedor..." autocomplete="off" required>
                                        <input type="hidden" name="idProveedor" id="idProveedor" required>
                                        <div id="proveedorList" class="list-group autocomplete-list"></div>
                                        <div class="invalid-feedback">Seleccione un proveedor.</div>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-12 position-relative">
                                        <label for="buscarProyecto" class="form-label">Proyecto <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="buscarProyecto" placeholder="Buscar proyecto por código o nombre..." autocomplete="off" required>
                                        <input type="hidden" name="idProyecto" id="idProyecto" required>
                                        <div id="proyectoList" class="list-group autocomplete-list"></div>
                                        <div class="invalid-feedback">Seleccione un proyecto.</div>
                                    </div>
                                </div>  

                                <hr>
                                <h5 class="mb-3">Detalles de Factura</h5>

                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label for="fecha_factura" class="form-label">Fecha Factura <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" name="fecha_factura" id="fecha_factura" autocomplete="off" required>
                                        <div class="invalid-feedback">Ingrese la fecha de la factura.</div>
                                    </div>
                                    <div class="col-md-6">
                                        <label for="numero_factura" class="form-label">N° Factura <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" placeholder="Número de Factura" name="numero_factura" id="numero_factura" autocomplete="off" required>
                                        <div class="invalid-feedback">Ingrese el número de factura.</div>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-4">
                                        <label for="monto_factura" class="form-label">Monto Factura <span class="text-danger">*</span></label>
                                        <div class="input-group">
                                            <span class="input-group-text">$</span>
                                            <input type="number" class="form-control" placeholder="0.00" name="monto_factura" id="monto_factura" step="0.01" min="0" required>
                                            <div class="invalid-feedback">Ingrese un monto válido.</div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <label for="iva_retenido_factura" class="form-label">IVA Retenido</label>
                                        <div class="input-group">
                                            <span class="input-group-text">$</span>
                                            <input type="text" class="form-control" name="iva_retenido_factura" id="iva_retenido_factura" readonly>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <label for="total_factura" class="form-label">Total Factura</label>
                                        <div class="input-group">
                                            <span class="input-group-text">$</span>
                                            <input type="text" class="form-control" name="total_factura" id="total_factura" readonly>
                                        </div>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-12">
                                        <label for="total_factura_letras" class="form-label">Valor en Letras</label>
                                        <input type="text" class="form-control" name="total_factura_letras" id="total_factura_letras" readonly>
                                    </div>
                                </div>

                                <!-- Campo Fecha Compras y Estado OCA eliminados del formulario principal -->
                                <!-- El estado se manejará con el campo oculto idEstadoOcaForm -->
                                <!-- Nuevo Campo Observaciones -->
                                <div class="row mb-3">
                                    <div class="col-12">
                                        <label for="observaciones" class="form-label">Observaciones (Opcional)</label>
                                        <textarea class="form-control" name="observaciones" id="observaciones" placeholder="Añadir observaciones..." rows="3"></textarea>
                                    </div>
                                </div>
                                <input type="hidden" name="idEstado_Oca" id="idEstadoOcaForm" value="1"> <!-- Asumiendo que 1 es 'Enviada'. ¡VERIFICAR ESTE ID EN TU BD! -->
                            </div> <!-- /.card-body -->

                            <div class="card-footer text-center">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save mr-1"></i> Guardar OCA
                                </button>
                                <a class="btn btn-secondary ml-2" href="listarOcas.php"> <!-- O a donde quieras volver -->
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
    // --- Inicio Función NumeroALetras (Adaptada) ---
    // Esta función es una adaptación. Considera usar una librería robusta para producción.
    function NumeroALetras(num, currency) {
        currency = currency || {};
        var data = {
            numero: num,
            enteros: Math.floor(num),
            centavos: (((Math.round(num * 100)) - (Math.floor(num) * 100))),
            letrasCentavos: '',
            letrasMonedaPlural: currency.plural || 'DÓLARES ESTADOUNIDENSES',
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
        } else { // Si no hay centavos, indicar "CON CERO CENTAVOS"
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
                case 1: return "UN";
                case 2: return "DOS";
                case 3: return "TRES";
                case 4: return "CUATRO";
                case 5: return "CINCO";
                case 6: return "SEIS";
                case 7: return "SIETE";
                case 8: return "OCHO";
                case 9: return "NUEVE";
            }
            return "";
        }

        function Decenas(num) {
            let decena = Math.floor(num / 10);
            let unidad = num % 10;
            switch (decena) {
                case 1:
                    switch (unidad) {
                        case 0: return "DIEZ";
                        case 1: return "ONCE";
                        case 2: return "DOCE";
                        case 3: return "TRECE";
                        case 4: return "CATORCE";
                        case 5: return "QUINCE";
                        default: return "DIECI" + Unidades(unidad).toLowerCase();
                    }
                case 2: return unidad == 0 ? "VEINTE" : "VEINTI" + Unidades(unidad).toLowerCase();
                case 3: return DecenasY("TREINTA", unidad);
                case 4: return DecenasY("CUARENTA", unidad);
                case 5: return DecenasY("CINCUENTA", unidad);
                case 6: return DecenasY("SESENTA", unidad);
                case 7: return DecenasY("SETENTA", unidad);
                case 8: return DecenasY("OCHENTA", unidad);
                case 9: return DecenasY("NOVENTA", unidad);
                case 0: return Unidades(unidad);
            }
        }

        function DecenasY(strSin, numUnidades) {
            if (numUnidades > 0) return strSin + " Y " + Unidades(numUnidades);
            return strSin;
        }

        function Centenas(num) {
            let centenas = Math.floor(num / 100);
            let decenas = num % 100;
            switch (centenas) {
                case 1: if (decenas > 0) return "CIENTO " + Decenas(decenas); return "CIEN";
                case 2: return "DOSCIENTOS " + Decenas(decenas);
                case 3: return "TRESCIENTOS " + Decenas(decenas);
                case 4: return "CUATROCIENTOS " + Decenas(decenas);
                case 5: return "QUINIENTOS " + Decenas(decenas);
                case 6: return "SEISCIENTOS " + Decenas(decenas);
                case 7: return "SETECIENTOS " + Decenas(decenas);
                case 8: return "OCHOCIENTOS " + Decenas(decenas);
                case 9: return "NOVECIENTOS " + Decenas(decenas);
            }
            return Decenas(decenas);
        }

        function Seccion(num, divisor, strSingular, strPlural) {
            let cientos = Math.floor(num / divisor)
            let resto = num % divisor;
            let letras = "";
            if (cientos > 0)
                if (cientos > 1)
                    letras = Centenas(cientos) + " " + strPlural;
                else
                    letras = strSingular;
            if (resto > 0)
                letras += "";
            return letras;
        }

        function Miles(num) {
            let divisor = 1000;
            let cientos = Math.floor(num / divisor)
            let resto = num % divisor;
            let strMiles = Seccion(num, divisor, "UN MIL", "MIL");
            let strCentenas = Centenas(resto);
            if (strMiles == "") return strCentenas;
            return strMiles + " " + strCentenas;
        }

        function Millones(num) {
            let divisor = 1000000;
            let cientos = Math.floor(num / divisor)
            let resto = num % divisor;
            let strMillones = Seccion(num, divisor, "UN MILLON DE", "MILLONES DE");
            let strMiles = Miles(resto);
            if (strMillones == "") return strMiles;
            return strMillones + " " + strMiles;
        }
    };
    // --- Fin Función NumeroALetras ---
    
    document.addEventListener('DOMContentLoaded', function() {
    let ocasParaLoteIds = []; // <<< NUEVO: Array para acumular IDs de OCAs para el lote

    const form = document.getElementById('addOcaForm');
    const proveedorInput = document.getElementById('buscarProveedor');
    const proyectoInput = document.getElementById('buscarProyecto'); // Nuevo
    const proyectoListDiv = document.getElementById('proyectoList'); // Nuevo
    const proveedorListDiv = document.getElementById('proveedorList');
    const montoFacturaInput = document.getElementById('monto_factura');
    const ivaRetenidoInput = document.getElementById('iva_retenido_factura');
    const totalFacturaInput = document.getElementById('total_factura');
    const totalFacturaLetrasInput = document.getElementById('total_factura_letras');
    const procesoNumeroInput = document.getElementById('proceso_numero');
    const ocaNumeroInput = document.getElementById('oca_numero'); // Nuevo
    const anioOcaInput = document.getElementById('anio_oca');
    const procesoDomDisplayInput = document.getElementById('proceso_dom_display'); // Cambiado
    const ocaCompletaDisplayInput = document.getElementById('oca_completa_display'); // Nuevo
    const actaExistenteOcaDisplayInput = document.getElementById('acta_existente_oca_display'); // Cambiado
    
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
        // Asegurarse que el estado "Enviada" se mande (si no está visible)
        // Si el campo idEstado_Oca está oculto y tiene un valor fijo, ya se incluirá.
        // Si se decidiera dinámicamente, aquí se podría añadir: formData.append('idEstado_Oca', ID_ESTADO_ENVIADA);

        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';

        fetch('ingresarOca.php', { // Enviar al mismo archivo
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
                    title: '¡Éxito!',
                    text: data.message,
                    timer: 2000,
                    showConfirmButton: false,
                    allowOutsideClick: false
                }).then(() => {
                    if (data.id_oca_creada) { // <<< NUEVO: Acumular ID
                        ocasParaLoteIds.push(data.id_oca_creada);
                    }
                    // Lógica post-guardado
                    Swal.fire({
                        title: 'OCA Ingresada',
                        text: '¿Desea agregar otra OCA?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, agregar otra',
                        cancelButtonText: 'No, finalizar',
                        allowOutsideClick: false
                    }).then((result) => {
                        if (result.isConfirmed) {
                            form.reset(); // Limpiar formulario
                            form.classList.remove('was-validated');
                            // Opcional: Mantener ciertos campos como proyecto o año
                            document.getElementById('oca_numero').focus();
                            // Resetear campos calculados visualmente
                            if(montoFacturaInput) montoFacturaInput.dispatchEvent(new Event('input'));
                            actualizarCamposCompuestos();

                        } else {
                            // Preguntar por la Fecha de Envío a Compras
                            Swal.fire({
                                title: 'Fecha de Envío a Compras',
                                html: '<input type="date" id="swal-fechaCompras" class="swal2-input" value="' + new Date().toISOString().split('T')[0] + '">', // Fecha actual por defecto
                                icon: 'info',
                                showCancelButton: true,
                                confirmButtonText: 'Continuar',
                                cancelButtonText: 'Cancelar',
                                focusConfirm: false,
                                preConfirm: () => {
                                    const fecha = document.getElementById('swal-fechaCompras').value;
                                    if (!fecha) {
                                        Swal.showValidationMessage(`Por favor, ingrese una fecha.`);
                                    }
                                    return fecha;
                                }
                            }).then((resultFecha) => {
                                if (resultFecha.isConfirmed && resultFecha.value) {
                                    const fechaComprasSeleccionada = resultFecha.value;
                                    // Ahora, preguntar si quiere generar lote
                                    Swal.fire({
                                        title: 'Finalizar Ingreso',
                                        text: `Fecha de envío a compras establecida: ${new Date(fechaComprasSeleccionada).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}. ¿Desea generar un lote de impresión ahora?`,
                                        icon: 'question',
                                        showDenyButton: true, // Para "Ir a la lista"
                                        showCancelButton: false, // No necesitamos cancelar aquí
                                        confirmButtonText: 'Sí, generar lote',
                                        denyButtonText: 'No, ir a la lista',
                                    }).then((resultLote) => {
                                        if (resultLote.isConfirmed) {
                                            if (ocasParaLoteIds.length > 0) {
                                                generarLoteYRedirigir(ocasParaLoteIds, fechaComprasSeleccionada);
                                            } else {
                                                Swal.fire('Atención', 'No hay OCAs nuevas para incluir en el lote.', 'info');
                                            }
                                            // generarLoteYRedirigir(ocasParaLoteIds, fechaComprasSeleccionada);
                                        } else if (resultLote.isDenied) {
                                            window.location.href = 'listarOcas.php';
                                        }
                                    });
                                }
                            });
                        }
                        // Si el usuario elige "No, finalizar" y luego "Cancelar" en la fecha, ocasParaLoteIds se mantiene.
                    });
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al Ingresar',
                    text: data.message || 'No se pudo ingresar la OCA.'
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

    // --- Definición de Cálculos automáticos ---
    function calcularValoresFactura() {
        const montoFactura = parseFloat(montoFacturaInput.value) || 0;
        let ivaRetenido = 0;

        if (montoFactura >= 113) {
            ivaRetenido = (montoFactura / 1.13) * 0.01;
        }
        ivaRetenidoInput.value = ivaRetenido.toFixed(2);

        const totalFactura = montoFactura - ivaRetenido;
        totalFacturaInput.value = totalFactura.toFixed(2);

        if (totalFactura >= 0) {
             totalFacturaLetrasInput.value = NumeroALetras(totalFactura, {
                plural: 'DÓLARES ESTADOUNIDENSES',
                singular: 'DÓLAR ESTADOUNIDENSE',
                centPlural: 'CENTAVOS',
                centSingular: 'CENTAVO'
            }).toUpperCase();
        } else {
            totalFacturaLetrasInput.value = '';
        }
    }

    if(montoFacturaInput) montoFacturaInput.addEventListener('input', calcularValoresFactura);

    // --- Definición de Lógica de Autocompletado (Usando Fetch) ---
    function setupAutocomplete(inputId, listId, hiddenId, type) {
        
        const inputElement = document.getElementById(inputId); // <<< Mantener esta línea
        const listDiv = document.getElementById(listId);
        const hiddenElement = document.getElementById(hiddenId);

        if (!inputElement || !listDiv || !hiddenElement) return;

        inputElement.addEventListener('input', function() {
            const query = this.value;
            if (query.length < 2) {
                listDiv.innerHTML = '';
                listDiv.style.display = 'none';
                hiddenElement.value = ''; // Limpiar ID si se borra                
                return;
            }

            // Usar buscar.php genérico
            fetch(`buscar.php?q=${encodeURIComponent(query)}&type=${type}`)
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
                            let displayText = item.nombre; // Asumimos que 'nombre' siempre existe
                            if (type === 'proyectos' && item.codigo) { // 'codigo' es específico de proyectos
                                displayText = `${item.codigo} - ${item.nombre}`;
                            }
                            a.textContent = displayText;
                            a.onclick = (e) => {
                                
                                e.preventDefault();
                                inputElement.value = displayText; // Usar displayText
                                hiddenElement.value = item.id;
                                // Si es proyecto, actualizar campo de residente (solo display)
                                // (Esta lógica se eliminará si el residente ya no se muestra)                                
                                listDiv.innerHTML = '';                                
                                listDiv.style.display = 'none';
                                // Opcional: Mover foco al siguiente campo
                                // findNextFocusableElement(inputElement)?.focus();
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

    // Limpiar ID si el usuario cambia el texto manualmente después de seleccionar
         inputElement.addEventListener('change', function() {
             // Si el valor actual no coincide con una selección previa (podrías guardar la selección), limpiar ID
             // O una lógica más simple: si el input se vacía, limpiar ID
             if (this.value === '') {
                 hiddenElement.value = '';
                 // No es necesario limpiar el campo de acta aquí ya que no depende del proyecto
             }
         });

         
    }

    // --- Definición de Concatenar Proceso y OCA Completa ---
    function actualizarCamposCompuestos() {
        const numOca = ocaNumeroInput.value.trim();
        const anio = anioOcaInput.value.trim();
        const numProc = procesoNumeroInput.value.trim();

        // Actualizar OCA Completa
        if (numOca && anio) {
            ocaCompletaDisplayInput.value = `OCA-${numOca}/${anio}`;
        } else {
            ocaCompletaDisplayInput.value = '';
        }

        // Actualizar Proceso DOM Completo
        if (numProc && anio) {
            procesoDomDisplayInput.value = `DOM-CD-${numProc}/${anio}-ADM`;
        } else {
            procesoDomDisplayInput.value = '';
        }
    }

    
    // --- Función para cargar datos de una OCA/Año existente y poblar el formulario ---
    function cargarDatosOcaExistente() {
        const ocaNum = document.getElementById('oca_numero').value.trim();
        const anioOca = anioOcaInput.value.trim();

        if (!ocaNum || !anioOca || !actaExistenteOcaDisplayInput) {
            actaExistenteOcaDisplayInput.value = 'Ingrese Número y Año de OCA para verificar...';
            limpiarCamposFormularioOca(); // Limpiar si los campos clave se borran
            return;
        }

        actaExistenteOcaDisplayInput.value = 'Buscando acta existente...';
        limpiarCamposFormularioOca(); // Limpiar antes de una nueva búsqueda

        fetch(`obtenerDatosOcaExistente.php?oca_numero=${encodeURIComponent(ocaNum)}&anio_oca=${encodeURIComponent(anioOca)}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (data.oca_encontrada) {
                        if (data.ultima_acta_registrada) {
                            actaExistenteOcaDisplayInput.value = `Última Acta Registrada para ${ocaNum}/${anioOca}: ${data.ultima_acta_registrada}`;
                        } else {
                            actaExistenteOcaDisplayInput.value = `No hay actas previas registradas para ${ocaNum}/${anioOca}.`;
                        }
                        poblarFormularioConDatosOca(data.oca_data);
                    } else {
                        actaExistenteOcaDisplayInput.value = 'OCA/Año no encontrada en la base de datos.';
                        // No es necesario limpiar aquí de nuevo, ya se hizo antes de la búsqueda o si los campos clave se borraron.
                    }
                } else {
                    actaExistenteOcaDisplayInput.value = 'Error al verificar OCA.';
                    console.error('Error al obtener datos de OCA:', data.message);
                }
            })
            .catch(error => {
                actaExistenteOcaDisplayInput.value = 'Error de comunicación al verificar OCA.';
                console.error('Fetch error al obtener datos de OCA:', error);
            });
    }

    function poblarFormularioConDatosOca(datos) {
        if (!datos) return;

        // Campos de texto y número directos
        document.getElementById('idProyecto').value = datos.idProyecto || '';
        if (datos.idProyecto && datos.nombre_proyecto) {
            document.getElementById('buscarProyecto').value = datos.codigo_proyecto ? `${datos.codigo_proyecto} - ${datos.nombre_proyecto}` : datos.nombre_proyecto;
        } else {
            document.getElementById('buscarProyecto').value = '';
        }
        
        document.getElementById('proceso_numero').value = datos.proceso_numero || ''; 
        // Los campos _display se actualizan por actualizarCamposCompuestos()

        document.getElementById('valor_oca').value = datos.valor_oca || '';
        document.getElementById('numero_acta').value = ''; // Se limpia, ya que el usuario ingresará la nueva o la que corresponde.

        document.getElementById('idProveedor').value = datos.idProveedor || '';
         if (datos.idProveedor && datos.nombre_proveedor) {
            document.getElementById('buscarProveedor').value = datos.nombre_proveedor;
        } else {
            document.getElementById('buscarProveedor').value = '';
        }

        // Los campos de factura se limpian porque el PHP los elimina de oca_data
        // y el usuario debe ingresarlos si está creando una nueva factura para esta OCA.
        document.getElementById('fecha_factura').value = '';
        document.getElementById('numero_factura').value = '';
        document.getElementById('monto_factura').value = '';
        // Los campos calculados de factura se actualizarán por el evento 'input' en monto_factura
        document.getElementById('iva_retenido_factura').value = '';
        document.getElementById('total_factura').value = '';
        document.getElementById('total_factura_letras').value = '';        
        // document.getElementById('fechaCompras').value = datos.fechaCompras || ''; // Ya no está en el form
        // document.getElementById('idEstado_Oca').value = datos.idEstado_Oca || ''; // Ya no está en el form
        document.getElementById('observaciones').value = datos.observaciones || '';
        document.getElementById('idEstadoOcaForm').value = datos.idEstado_Oca || '1'; // Actualizar el hidden

        // Disparar eventos para recalcular campos dependientes si es necesario
        if (montoFacturaInput) montoFacturaInput.dispatchEvent(new Event('input'));
        actualizarCamposCompuestos(); 
    }

    function limpiarCamposFormularioOca() {
        // No limpiar oca_numero ni anio_oca, ya que son los campos de entrada para la búsqueda
        document.getElementById('idProyecto').value = '';
        document.getElementById('buscarProyecto').value = '';
        document.getElementById('proceso_numero').value = '';
        // oca_completa_display y proceso_dom_display se limpian por actualizarCamposCompuestos()

        document.getElementById('valor_oca').value = '';
        document.getElementById('numero_acta').value = '';
        document.getElementById('idProveedor').value = '';
        document.getElementById('buscarProveedor').value = '';
        document.getElementById('fecha_factura').value = '';
        document.getElementById('numero_factura').value = '';
        document.getElementById('monto_factura').value = '';
        document.getElementById('iva_retenido_factura').value = '';
        document.getElementById('total_factura').value = '';
        document.getElementById('total_factura_letras').value = '';
        // document.getElementById('fechaCompras').value = ''; // Ya no está en el form
        // document.getElementById('idEstado_Oca').value = ''; // Ya no está en el form
        document.getElementById('idEstadoOcaForm').value = '1'; // Resetear a "Enviada"
        document.getElementById('observaciones').value = '';
        // Si los campos calculados no se limpian automáticamente por el 'input' event, hacerlo aquí.
        actualizarCamposCompuestos();
        if (montoFacturaInput) montoFacturaInput.dispatchEvent(new Event('input')); // Para recalcular y limpiar letras
    }

    // --- Event Listeners y Configuraciones Iniciales ---
    // montoFacturaInput.addEventListener('input', calcularValoresFactura); // Ya se añadió arriba

    // Configurar autocompletado para cada campo
    setupAutocomplete('buscarProyecto', 'proyectoList', 'idProyecto', 'proyectos'); // Nuevo
    setupAutocomplete('buscarProveedor', 'proveedorList', 'idProveedor', 'proveedores'); // <<< DESCOMENTAR ESTA LÍNEA


    ocaNumeroInput.addEventListener('input', actualizarCamposCompuestos);
    procesoNumeroInput.addEventListener('input', actualizarCamposCompuestos);
    anioOcaInput.addEventListener('input', actualizarCamposCompuestos);

     // Listeners para oca_numero y anio_oca para cargar acta existente
    ocaNumeroInput.addEventListener('input', cargarDatosOcaExistente); 
    anioOcaInput.addEventListener('input', cargarDatosOcaExistente); 
 
    // Ocultar listas si se hace clic fuera
    document.addEventListener('click', function(event) {
        const lists = [proveedorListDiv, proyectoListDiv]; // Añadir proyectoListDiv
        const inputs = [proveedorInput, proyectoInput]; // Añadir proyectoInput
        let clickedInside = false;

        inputs.forEach(input => { if (input && input.contains(event.target)) clickedInside = true; });
        lists.forEach(list => { if (list && list.contains(event.target)) clickedInside = true; });

        if (!clickedInside) {
            lists.forEach(list => { if (list) list.style.display = 'none'; });
        }
    });

    // Enfocar el primer campo y actualizar campos compuestos al cargar
    ocaNumeroInput.focus();
    actualizarCamposCompuestos();
    if(montoFacturaInput) calcularValoresFactura(); // Calcular valores de factura por si hay datos cacheados

    // <<< NUEVA FUNCIÓN: Generar Lote y Redirigir >>>
    function generarLoteYRedirigir(idsOca, fechaCompras) {
        const formData = new FormData();
        idsOca.forEach(id => formData.append('idOcas[]', id));
        formData.append('fechaCompras', fechaCompras); // Añadir fecha de compras

        Swal.fire({
            title: 'Generando Lote...',
            text: 'Por favor, espere.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        fetch('crearLoteImpresion.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            Swal.close();
            if (data.success && data.idLote) {
                ocasParaLoteIds = []; // Limpiar el array después de generar el lote
                Swal.fire('¡Lote Creado!', `Lote ${data.numeroLote} generado. Redirigiendo...`, 'success').then(() => {
                    window.location.href = `verLote.php?idLote=${data.idLote}`;
                });
            } else {
                Swal.fire('Error', data.message || 'No se pudo crear el lote de impresión.', 'error');
            }
        })
        .catch(error => {
            Swal.close();
            console.error('Error en fetch (generarLoteYRedirigir):', error);
            Swal.fire('Error de Comunicación', 'Ocurrió un error al intentar generar el lote.', 'error');
        });
    }
}); // Fin DOMContentLoaded
</script>
