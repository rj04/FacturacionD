<?php
error_reporting(E_ALL);
ini_set('display_errors', 0); // Desactivar errores en la salida para Excel
ini_set('log_errors', 1);    // Loggear errores en el servidor
session_start();

$mysqli = include_once "conexion.php";
include_once "helpers.php"; // Para usuarioTienePermiso

// --- Control de Acceso ---
if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('generate_reports')) {
    // Podrías redirigir o mostrar un error simple si se accede directamente sin permiso
    die("Acceso denegado.");
}

$ocasData = [];
$searchTerm = '';

if (isset($_GET['search']) && !empty(trim($_GET['search']))) {
    $searchTerm = trim($_GET['search']);
}

if ($mysqli) {
    // Reutilizar la lógica de consulta de reporteAvanceOcas.php
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
                LEFT JOIN usuarios usr ON co.idUsuario_registro = usr.idUsuario "; // GROUP BY y ORDER BY se añaden después

    $whereClauses = [];
    $params = [];
    $types = "";

    if (!empty($searchTerm)) {
        $searchCondition = " (LOWER(co.oca_completa) LIKE LOWER(?) OR
                               LOWER(p.nombreProyecto) LIKE LOWER(?) OR
                               LOWER(p.codigoProyecto) LIKE LOWER(?) OR
                               LOWER(prov.proveedor) LIKE LOWER(?) OR
                               LOWER(usr.nombre) LIKE LOWER(?)) ";
        $whereClauses[] = $searchCondition;
        $searchTermLike = "%" . $searchTerm . "%";
        for ($i = 0; $i < 5; $i++) {
            $params[] = $searchTermLike;
            $types .= "s";
        }
    }

    $sqlFinal = $sqlOcas; // Iniciar con la base

    if (!empty($whereClauses)) {
        $sqlFinal .= " WHERE " . implode(" AND ", $whereClauses);
    }

    $sqlFinal .= " GROUP BY co.oca_numero, co.anio_oca, co.oca_completa, p.nombreProyecto, p.codigoProyecto, prov.proveedor, usr.nombre
                   ORDER BY co.anio_oca DESC, co.oca_numero DESC";

    if (!empty($params)) {
        $stmtOcas = $mysqli->prepare($sqlFinal);
        if ($stmtOcas) {
            $stmtOcas->bind_param($types, ...$params);
            $stmtOcas->execute();
            $resultOcas = $stmtOcas->get_result();
        } else {
            error_log("Error preparando consulta principal de OCAs (Excel): " . $mysqli->error);
            $resultOcas = false;
        }
    } else {
        $resultOcas = $mysqli->query($sqlFinal);
    }

    if ($resultOcas) {
        while ($oca_master = $resultOcas->fetch_assoc()) {
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
                $oca_master['incrementoDisminucion'] = '';
                $oca_master['anticipo'] = '';
                $oca_master['pagoDeContado'] = '';
                $oca_master['modificacionSolicitada'] = '';
                $oca_master['tipoOrden'] = '';
                $oca_master['mesSolicitudCheque'] = '';
                $ocasData[] = $oca_master;
            }
        }
        if ($resultOcas instanceof mysqli_result) $resultOcas->free();
    } else {
        error_log("Error en la consulta principal de OCAs (Excel): " . $mysqli->error);
    }
    $mysqli->close();
}

header("Content-Type: application/vnd.ms-excel; charset=utf-8");
header("Content-Disposition: attachment; filename=reporte_avance_ocas_" . date('Y-m-d') . ".xls");
header("Pragma: no-cache");
header("Expires: 0");

echo "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>";
echo "<head><meta charset='utf-8'/></head><body>";
echo "<table border='1'>";
echo "<thead><tr>
        <th>#</th><th>Solicitud</th><th>Proyecto</th><th>Cod. Proyecto</th><th>OCA</th><th>Proveedor</th><th>Monto Adjud.</th><th>Admin. OCA</th>
        <th>Incre./Dism.</th><th>Anticipo</th><th>Pago Contado</th>";
for ($i = 1; $i <= 40; $i++) echo "<th>Pago $i</th>";
echo "<th>Monto Ejec.</th><th>% Ejec.</th><th>Disponible</th><th>Modif. Solic.</th>
        <th>Tipo Orden</th><th>Observaciones</th><th>Mes Sol. Cheque</th><th>Cant. Actas</th>
      </tr></thead><tbody>";

$correlativo = 1;
foreach ($ocasData as $oca) {
    echo "<tr>";
    echo "<td>" . $correlativo++ . "</td>";
    echo "<td></td>"; // Solicitud vacía
    echo "<td>" . htmlspecialchars($oca['nombreProyecto']) . "</td>";
    echo "<td>" . htmlspecialchars($oca['codigoProyecto']) . "</td>";
    echo "<td>" . htmlspecialchars($oca['oca_completa']) . "</td>";
    echo "<td>" . htmlspecialchars($oca['nombreProveedor']) . "</td>";
    echo "<td style='mso-number-format:\"\\$\\#\\,\\#\\#0\\.00\"'>" . $oca['montoAdjudicado'] . "</td>"; // Formato Excel para moneda
    echo "<td></td>"; // Admin OCA vacío
    echo "<td>" . htmlspecialchars($oca['incrementoDisminucion']) . "</td>";
    echo "<td>" . htmlspecialchars($oca['anticipo']) . "</td>"; // Si tiene $, quitarlo o usar formato Excel
    echo "<td>" . htmlspecialchars($oca['pagoDeContado']) . "</td>"; // Si tiene $, quitarlo o usar formato Excel
    for ($i = 0; $i < 40; $i++) {
        $pagoVal = isset($oca['pagos_detalle'][$i]) ? $oca['pagos_detalle'][$i]['total_factura'] : null;
        echo "<td style='mso-number-format:\"\\$\\#\\,\\#\\#0\\.00\"'>" . ($pagoVal !== null ? $pagoVal : '') . "</td>";
    }
    echo "<td style='mso-number-format:\"\\$\\#\\,\\#\\#0\\.00\"'>" . $oca['montoEjecutado'] . "</td>";
    echo "<td style='mso-number-format:\"0\\.00%\"'>" . ($oca['porcentajeEjecutado'] / 100) . "</td>"; // Formato Excel para porcentaje
    echo "<td style='mso-number-format:\"\\$\\#\\,\\#\\#0\\.00\"'>" . $oca['disponible'] . "</td>";
    echo "<td>" . htmlspecialchars($oca['modificacionSolicitada']) . "</td>";
    echo "<td>" . htmlspecialchars($oca['tipoOrden']) . "</td>";
    echo "<td>" . htmlspecialchars($oca['todasObservaciones'] ?? '') . "</td>";
    echo "<td>" . htmlspecialchars($oca['mesSolicitudCheque']) . "</td>";
    echo "<td>" . htmlspecialchars($oca['cantidadActas']) . "</td>";
    echo "</tr>";
}
echo "</tbody></table>";
echo "</body></html>";
exit;
?>