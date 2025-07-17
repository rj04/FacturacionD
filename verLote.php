<?php
// c:\UniServerZ\www\facturacion\verLote.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

include_once "helpers.php";
// --- Control de Acceso ---
if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('view_print_batches')) { // O un permiso más general como 'view_ocas'
    header("Location: index.php?error=Acceso denegado a la visualización de lotes.");
    exit;
}

$mysqli = include_once "conexion.php";
if ($mysqli->connect_error) {
    die("Error de conexión a la base de datos: " . $mysqli->connect_error);
}

$idLote = isset($_GET['idLote']) ? filter_input(INPUT_GET, 'idLote', FILTER_VALIDATE_INT) : null;

if (!$idLote) {
    die("ID de Lote no proporcionado o inválido.");
}

// Obtener información del lote
$loteInfo = null;
$stmtLote = $mysqli->prepare("SELECT li.*, u.nombre as nombreUsuarioRegistro 
                              FROM lotes_impresion li 
                              LEFT JOIN usuarios u ON li.idUsuarioRegistro = u.idUsuario 
                              WHERE li.idLote = ?");
if ($stmtLote) {
    $stmtLote->bind_param("i", $idLote);
    $stmtLote->execute();
    $resultLote = $stmtLote->get_result();
    $loteInfo = $resultLote->fetch_assoc();
    $stmtLote->close();
}

if (!$loteInfo) {
    die("Lote no encontrado.");
}

// Obtener OCAs asociadas al lote
$ocasDelLote = [];
$stmtOcas = $mysqli->prepare("SELECT 
                                co.idOca, co.oca_completa, co.valor_oca, co.numero_factura, co.total_factura,
                                p.nombreProyecto, prov.proveedor as nombreProveedor,
                                DATE_FORMAT(co.fechaCompras, '%d/%m/%Y') as fecha_compras_formateada
                              FROM control_ocas co
                              JOIN lote_ocas lo ON co.idOca = lo.idOca
                              LEFT JOIN proyectos p ON co.idProyecto = p.idProyecto
                              LEFT JOIN proveedores prov ON co.idProveedor = prov.idProveedor
                              WHERE lo.idLote = ?
                              ORDER BY co.oca_numero ASC");
if ($stmtOcas) {
    $stmtOcas->bind_param("i", $idLote);
    $stmtOcas->execute();
    $resultOcas = $stmtOcas->get_result();
    while ($row = $resultOcas->fetch_assoc()) {
        $ocasDelLote[] = $row;
    }
    $stmtOcas->close();
}

$mysqli->close();

include_once "header.php";
include_once "navbar.php";
?>

<div class="content-wrapper">
    <section class="content-header">
        <div class="container-fluid">
            <div class="row mb-2">
                <div class="col-sm-6">
                    <h1>Detalle del Lote de Impresión</h1>
                </div>
                <div class="col-sm-6 text-right">
                    <a href="listarLotes.php" class="btn btn-secondary">Volver a Lista de Lotes</a>
                </div>
            </div>
        </div>
    </section>

    <section class="content">
        <div class="container-fluid">
            <div class="card card-primary">
                <div class="card-header">
                    <h3 class="card-title">Información del Lote: <?php echo htmlspecialchars($loteInfo['numeroLote']); ?></h3>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Número de Lote:</strong> <?php echo htmlspecialchars($loteInfo['numeroLote']); ?></p>
                            <p><strong>Fecha del Lote:</strong> <?php echo date("d/m/Y", strtotime($loteInfo['fechaLote'])); ?></p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Registrado por:</strong> <?php echo htmlspecialchars($loteInfo['nombreUsuarioRegistro'] ?? 'N/A'); ?></p>
                            <p><strong>Fecha de Registro:</strong> <?php echo date("d/m/Y H:i:s", strtotime($loteInfo['fechaRegistro'])); ?></p>
                        </div>
                    </div>
                     <hr>
                    <h4>Órdenes de Compra en este Lote (<?php echo count($ocasDelLote); ?>)</h4>
                    <?php if (!empty($ocasDelLote)): ?>
                        <div class="table-responsive mt-3">
                            <table class="table table-bordered table-striped table-sm">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>OCA Completa</th>
                                        <th>Proyecto</th>
                                        <th>Proveedor</th>
                                        <th class="text-right">Valor OCA</th>
                                        <th>N° Factura</th>
                                        <th class="text-right">Total Factura</th>
                                        <th>Fecha Compras</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($ocasDelLote as $index => $oca): ?>
                                    <tr>
                                        <td><?php echo $index + 1; ?></td>
                                        <td><?php echo htmlspecialchars($oca['oca_completa']); ?></td>
                                        <td><?php echo htmlspecialchars($oca['nombreProyecto'] ?? 'N/A'); ?></td>
                                        <td><?php echo htmlspecialchars($oca['nombreProveedor'] ?? 'N/A'); ?></td>
                                        <td class="text-right">$<?php echo number_format($oca['valor_oca'], 2); ?></td>
                                        <td><?php echo htmlspecialchars($oca['numero_factura'] ?? 'N/A'); ?></td>
                                        <td class="text-right">$<?php echo number_format($oca['total_factura'], 2); ?></td>
                                        <td><?php echo htmlspecialchars($oca['fecha_compras_formateada'] ?? 'N/A'); ?></td>
                                        <td>
                                            <a href="imprimirOca.php?idOca=<?php echo $oca['idOca']; ?>" target="_blank" class="btn btn-info btn-xs" title="Imprimir OCA">
                                                <i class="bi bi-printer"></i>
                                            </a>
                                            <a href="editarOcas.php?idOca=<?php echo $oca['idOca']; ?>" class="btn btn-secondary btn-xs" title="Ver/Editar OCA">
                                                <i class="bi bi-eye"></i>
                                            </a>
                                        </td>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                        <div class="mt-3 text-center">
                            <?php
                                $idsParaImprimir = array_column($ocasDelLote, 'idOca');
                                $queryString = http_build_query(['idOcas' => $idsParaImprimir]);
                            ?>
                            <a href="imprimirMultiplesOcas.php?<?php echo $queryString; ?>" target="_blank" class="btn btn-primary">
                                <i class="bi bi-printer-fill"></i> Imprimir Todas las OCAs de este Lote
                            </a>
                        </div>
                    <?php else: ?>
                        <p class="text-muted">No hay Órdenes de Compra asociadas a este lote.</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </section>
</div>

<?php include_once "footer.php"; ?>