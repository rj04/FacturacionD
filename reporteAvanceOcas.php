<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
//$mysqli = null; // No es necesario si se asigna directamente desde el include
$mysqli = include_once "conexion.php";
include_once "header.php";
include_once "navbar.php";
include_once "helpers.php"; // Para usuarioTienePermiso

// --- Control de Acceso ---
if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('generate_reports')) { // Asumiendo un permiso 'generate_reports'
    echo "<div class='content-wrapper'><section class='content'><div class='container-fluid'><div class='alert alert-danger'>Acceso denegado. No tiene permiso para generar este reporte.</div></div></section></div>";
    include_once "footer.php";
    exit;
}

$ocasData = [];
$searchTerm = '';

if (isset($_GET['search']) && !empty(trim($_GET['search']))) {
    $searchTerm = trim($_GET['search']);
}

if ($mysqli) {
    // Query principal para obtener las OCAs agrupadas y su información base
    // Se modificará para incluir la búsqueda

    $sqlOcas = "SELECT
                    MIN(co.idOca) as primary_idOca,
                    co.oca_numero,
                    co.anio_oca,
                    co.oca_completa,
                    p.nombreProyecto,
                    p.codigoProyecto,
                    prov.proveedor AS nombreProveedor,
                    (SELECT valor_oca FROM control_ocas WHERE idOca = MIN(co.idOca)) AS montoAdjudicado,
                    usr.nombre AS administradorOCA,
                    (SELECT GROUP_CONCAT(DISTINCT obs.observaciones ORDER BY obs.idOca SEPARATOR '; ')
                     FROM control_ocas obs
                     WHERE obs.oca_numero = co.oca_numero AND obs.anio_oca = co.anio_oca AND obs.observaciones IS NOT NULL AND obs.observaciones != '') AS todasObservaciones,
                    COUNT(DISTINCT co.numero_acta) AS cantidadActas
                FROM control_ocas co
                LEFT JOIN proyectos p ON co.idProyecto = p.idProyecto
                LEFT JOIN proveedores prov ON co.idProveedor = prov.idProveedor
                LEFT JOIN usuarios usr ON co.idUsuario_registro = usr.idUsuario
                GROUP BY co.oca_numero, co.anio_oca, co.oca_completa, p.nombreProyecto, p.codigoProyecto, prov.proveedor, usr.nombre
                ORDER BY co.anio_oca DESC, co.oca_numero DESC"; // El ORDER BY se moverá después del WHERE si hay búsqueda

    $whereClauses = [];
    $params = [];
    $types = "";

    if (!empty($searchTerm)) {
        $searchCondition = " (LOWER(co.oca_completa) LIKE LOWER(?) OR
                               LOWER(p.nombreProyecto) LIKE LOWER(?) OR
                               LOWER(p.codigoProyecto) LIKE LOWER(?) OR
                               LOWER(prov.proveedor) LIKE LOWER(?) OR
                               LOWER(usr.nombre) LIKE LOWER(?)) "; // usr.nombre es administradorOCA
        $whereClauses[] = $searchCondition;
        $searchTermLike = "%" . $searchTerm . "%";
        for ($i = 0; $i < 5; $i++) {
            $params[] = $searchTermLike;
            $types .= "s";
        }
    }

    $sqlFinal = preg_replace('/GROUP BY.*ORDER BY.*/s', '', $sqlOcas); // Quitar GROUP BY y ORDER BY temporalmente

    if (!empty($whereClauses)) {
        $sqlFinal .= " WHERE " . implode(" AND ", $whereClauses);
    }

    // Re-añadir GROUP BY y ORDER BY
    $sqlFinal .= " GROUP BY co.oca_numero, co.anio_oca, co.oca_completa, p.nombreProyecto, p.codigoProyecto, prov.proveedor, usr.nombre
                   ORDER BY co.anio_oca DESC, co.oca_numero DESC";

    if (!empty($params)) {
        $stmtOcas = $mysqli->prepare($sqlFinal);
        if ($stmtOcas) {
            $stmtOcas->bind_param($types, ...$params);
            $stmtOcas->execute();
            $resultOcas = $stmtOcas->get_result();
        } else {
            error_log("Error preparando consulta principal de OCAs con búsqueda: " . $mysqli->error);
            $resultOcas = false;
        }
    } else {
        $resultOcas = $mysqli->query($sqlFinal);
    }

    if ($resultOcas) {
        while ($oca_master = $resultOcas->fetch_assoc()) {
            // Para cada OCA, obtener todos sus registros de 'pagos' (total_factura de control_ocas)
            $sqlPagos = "SELECT idOca, total_factura, numero_factura, fecha_factura, numero_acta
                         FROM control_ocas
                         WHERE oca_numero = ? AND anio_oca = ?
                         ORDER BY fecha_factura ASC, idOca ASC";
            $stmtPagos = $mysqli->prepare($sqlPagos);
            if ($stmtPagos) {
                $stmtPagos->bind_param("si", $oca_master['oca_numero'], $oca_master['anio_oca']);
                $stmtPagos->execute();
                $resultPagosDetalle = $stmtPagos->get_result();

                $pagos_detalle = [];
                $montoEjecutadoTotal = 0;
                while ($pago = $resultPagosDetalle->fetch_assoc()) {
                    $pagos_detalle[] = $pago;
                    $montoEjecutadoTotal += floatval($pago['total_factura']);
                }
                $stmtPagos->close();

                $oca_master['montoEjecutado'] = $montoEjecutadoTotal;
                $oca_master['pagos_detalle'] = $pagos_detalle;

                $montoAdjudicado = floatval($oca_master['montoAdjudicado']);
                $oca_master['porcentajeEjecutado'] = ($montoAdjudicado > 0) ? ($montoEjecutadoTotal / $montoAdjudicado) * 100 : 0;
                $oca_master['disponible'] = $montoAdjudicado - $montoEjecutadoTotal;

                // Campos placeholder
                $oca_master['idSolicitud'] = $oca_master['primary_idOca'];
                $oca_master['noOficialOca'] = $oca_master['oca_completa'];
                $oca_master['incrementoDisminucion'] = '';
                $oca_master['anticipo'] = '';
                $oca_master['pagoDeContado'] = '';
                $oca_master['modificacionSolicitada'] = '';
                $oca_master['tipoOrden'] = '';
                $oca_master['mesSolicitudCheque'] = '';

                $ocasData[] = $oca_master;
            } else {
                // Manejar error en la preparación de la consulta de pagos
                error_log("Error preparando consulta de pagos: " . $mysqli->error);
            }
        }
        $resultOcas->free();
    } else {
        // Manejar error en la consulta principal de OCAs
        error_log("Error en la consulta principal de OCAs: " . $mysqli->error);
    }
    $mysqli->close();
} else {
    // Manejar error de conexión inicial
    error_log("Error de conexión a la base de datos.");
}
?>

<div class="content-wrapper">
    <section class="content-header">
        <div class="container-fluid">
            <div class="row mb-2">
                <div class="col-sm-6">
                    <h1>Reporte de Avance de OCAs</h1>
                </div>
            </div>
        </div>
    </section>

    <section class="content">
        <div class="container-fluid">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Detalle de Órdenes de Compra</h3>
                    <div class="card-tools">
                        <form action="reporteAvanceOcas.php" method="GET" class="form-inline">
                            <div class="input-group input-group-sm" style="width: 300px;">
                                <input type="text" name="search" class="form-control float-right" placeholder="Buscar OCA, Proyecto, Proveedor..." value="<?php echo htmlspecialchars($searchTerm); ?>">
                                <div class="input-group-append">
                                    <button type="submit" class="btn btn-default">
                                        <i class="fas fa-search"></i>
                                    </button>
                                    <?php if (!empty($searchTerm)): ?>
                                        <a href="reporteAvanceOcas.php" class="btn btn-default" title="Limpiar búsqueda">
                                            <i class="fas fa-times"></i>
                                        </a>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                <div class="card-body">
                    <?php if (empty($ocasData)): ?>
                        <div class="alert alert-info">No hay datos de OCAs para mostrar.</div>
                    <?php else: ?>
                        <div class="table-responsive">
                            <table class="table table-bordered table-striped table-hover" style="font-size: 0.8rem;">
                                <thead>
                                    <tr>
                                        <th>#</th> <!-- Nuevo campo correlativo -->
                                        <th>Solicitud</th>
                                        <th>OCA</th>
                                        <th>Proyecto</th>
                                        <th>Proveedor</th>
                                        <th>Monto Adjud.</th>
                                        <th>Admin. OCA</th>
                                        <th>Incre./Dism.</th>
                                        <th>Anticipo</th>
                                        <th>Pago Contado</th>
                                        <?php for ($i = 1; $i <= 40; $i++) echo "<th>Pago $i</th>"; ?>
                                        <th>Monto Ejec.</th>
                                        <th>% Ejec.</th>
                                        <th>Disponible</th>
                                        <th>Modif. Solic.</th>
                                        <th>Tipo Orden</th>
                                        <th>Observaciones</th>
                                        <th>Mes Sol. Cheque</th>
                                        <th>Cant. Actas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($ocasData as $oca): ?>
                                        <?php static $correlativo = 1; // Inicializar contador correlativo ?>
                                        <tr>
                                            <tr style="font-size: 0.75rem;"> <!-- Reducir un poco el tamaño de fuente de la fila -->
                                            <td><?php echo $correlativo++; ?></td> <!-- Mostrar correlativo e incrementar -->
                                            <td></td> <!-- Dejar vacío según solicitud -->
                                            <td><?php echo htmlspecialchars($oca['codigoProyecto']); ?></td> <!-- Mover Cod. Proyecto -->
                                            <td><?php echo htmlspecialchars($oca['oca_completa']); ?></td>
                                            <td><?php echo htmlspecialchars($oca['nombreProveedor']); ?></td>
                                            <td class="text-right">$<?php echo number_format($oca['montoAdjudicado'], 2); ?></td>
                                            <td></td>
                                            <td><?php echo htmlspecialchars($oca['incrementoDisminucion']); ?></td>
                                            <td><?php echo ($oca['anticipo'] === '') ? '' : '$' . htmlspecialchars($oca['anticipo']); ?></td>
                                            <td><?php echo ($oca['pagoDeContado'] === '') ? '' : '$' . htmlspecialchars($oca['pagoDeContado']); ?></td>
                                            <?php
                                            for ($i = 0; $i < 40; $i++) {
                                                $pagoVal = isset($oca['pagos_detalle'][$i]) ? $oca['pagos_detalle'][$i]['total_factura'] : null;
                                                echo "<td class='text-right'>$" . ($pagoVal !== null ? number_format($pagoVal, 2) : '') . "</td>";
                                            }
                                            ?>
                                            <td class="text-right font-weight-bold">$<?php echo number_format($oca['montoEjecutado'], 2); ?></td>
                                            <td>
                                                <?php $porcentaje = floatval($oca['porcentajeEjecutado']); ?>
                                                <div class="progress" style="height: 20px; font-size: 0.7rem;">
                                                    <div class="progress-bar <?php
                                                        if ($porcentaje >= 100) echo 'bg-success';
                                                        elseif ($porcentaje >= 75) echo 'bg-info';
                                                        elseif ($porcentaje >= 50) echo 'bg-warning';
                                                        else echo 'bg-danger';
                                                    ?>" role="progressbar" style="width: <?php echo $porcentaje; ?>%;" aria-valuenow="<?php echo $porcentaje; ?>" aria-valuemin="0" aria-valuemax="100">
                                                        <?php echo number_format($porcentaje, 2); ?>%
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="text-right">$<?php echo number_format($oca['disponible'], 2); ?></td>
                                            <td><?php echo htmlspecialchars($oca['modificacionSolicitada']); ?></td>
                                            <td><?php echo htmlspecialchars($oca['tipoOrden']); ?></td>
                                            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="<?php echo htmlspecialchars($oca['todasObservaciones'] ?? ''); ?>">
                                                <?php echo htmlspecialchars($oca['todasObservaciones'] ?? ''); ?>
                                            </td>
                                            <td><?php echo htmlspecialchars($oca['mesSolicitudCheque']); ?></td>
                                            <td class="text-center"><?php echo htmlspecialchars($oca['cantidadActas']); ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php endif; ?>
                </div>
                <div class="card-footer">
                    <button onclick="window.print();" class="btn btn-primary no-print mr-2">
                        <i class="fas fa-print"></i> Imprimir Reporte
                    </button>
                    <a href="exportarAvanceOcas.php?search=<?php echo urlencode($searchTerm); ?>" class="btn btn-success no-print">
                        <i class="fas fa-file-excel"></i> Exportar a Excel
                    </a>
                </div>
            </div>
        </div>
    </section>
</div>

<style>
@media print {
    .no-print, .main-sidebar, .main-header, .main-footer, .content-header .row .col-sm-6:last-child {
        display: none !important;
    }
    .content-wrapper {
        margin-left: 0 !important;
        padding-top: 0 !important;
    }
    .table {
        font-size: 8pt !important; /* Reducir tamaño de fuente para impresión */
    }
    .table td, .table th {
        padding: 0.2rem !important; /* Reducir padding */
    }
    .progress {
        background-color: #e9ecef !important; /* Asegurar fondo para la barra de progreso */
    }
    .progress-bar {
        color: black !important; /* Mejor contraste para texto en barra */
        -webkit-print-color-adjust: exact !important; /* Forzar colores de fondo en Chrome/Safari */
        print-color-adjust: exact !important; /* Forzar colores de fondo estándar */
    }
}
</style>

<?php include_once "footer.php"; ?>