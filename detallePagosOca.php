<?php
// detallePagosOca.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$mysqli = include_once "conexion.php";

// Verificar conexión
if ($mysqli->connect_error) {
    die("Error de conexión: " . $mysqli->connect_error);
}

$idOca = null;
$ocaDetalles = null;
$pagos = [];
$totalPagado = 0.0;
$saldoPendiente = 0.0;
$error_message = '';

// 1. Obtener y validar idOca desde GET
if (isset($_GET['idOca'])) {
    $idOca = filter_input(INPUT_GET, 'idOca', FILTER_VALIDATE_INT);
    if ($idOca === false || $idOca <= 0) {
        $error_message = "El ID de la OCA proporcionado no es válido.";
    }
} else {
    $error_message = "No se proporcionó un ID de OCA.";
}

// 2. Si el ID es válido, buscar detalles de la OCA y sus pagos
if (empty($error_message) && $idOca) {
    // Obtener detalles de la OCA y Proyecto
    $queryOca = "SELECT co.idOca, co.oca, co.montoTotal, p.codigoProyecto, p.municipio
                 FROM control_ocas co
                 INNER JOIN proyectos p ON co.idProyecto = p.idProyecto
                 WHERE co.idOca = ?";
    $stmtOca = $mysqli->prepare($queryOca);
    if ($stmtOca) {
        $stmtOca->bind_param("i", $idOca);
        if ($stmtOca->execute()) {
            $resultadoOca = $stmtOca->get_result();
            $ocaDetalles = $resultadoOca->fetch_assoc();
            if (!$ocaDetalles) {
                $error_message = "No se encontró la OCA con el ID proporcionado.";
            }
        } else {
            $error_message = "Error al buscar detalles de la OCA: " . $stmtOca->error;
        }
        $stmtOca->close();
    } else {
        $error_message = "Error preparando consulta de OCA: " . $mysqli->error;
    }

    // Si se encontró la OCA, buscar sus pagos
    if ($ocaDetalles) {
        $queryPagos = "SELECT idPago, idOca, nActa, montoParcial, fechaIngreso
                       FROM control_pagos
                       WHERE idOca = ?
                       ORDER BY fechaIngreso DESC, idPago DESC"; // Ordenar por fecha o ID
        $stmtPagos = $mysqli->prepare($queryPagos);
        if ($stmtPagos) {
            $stmtPagos->bind_param("i", $idOca);
            if ($stmtPagos->execute()) {
                $resultadoPagos = $stmtPagos->get_result();
                while ($pago = $resultadoPagos->fetch_assoc()) {
                    $pagos[] = $pago;
                    $totalPagado += (float)$pago['montoParcial'];
                }
                $saldoPendiente = (float)$ocaDetalles['montoTotal'] - $totalPagado;
            } else {
                 $error_message = "Error al buscar los pagos: " . $stmtPagos->error;
            }
            $stmtPagos->close();
        } else {
             $error_message = "Error preparando consulta de pagos: " . $mysqli->error;
        }
    }
}

$mysqli->close();

include_once "header.php";
include_once "navbar.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <div class="content-header">
        <div class="container-fluid">
            <div class="row mb-2">
                <div class="col-sm-6">
                    <h1 class="m-0" style="font-size:20px">Detalle de Pagos - OCA: <?php echo htmlspecialchars($ocaDetalles['oca'] ?? 'N/A'); ?></h1>
                </div><!-- /.col -->
            </div><!-- /.row -->
        </div><!-- /.container-fluid -->
    </div><!-- /.content-header -->

    <!-- Main content -->
    <section class="content">
        <div class="container-fluid">
            <?php if (!empty($error_message)): ?>
                <div class="alert alert-danger"><?php echo $error_message; ?></div>
                <a href="pagosOca.php" class="btn btn-secondary"><i class="fas fa-arrow-left mr-1"></i> Volver a la lista</a>
            <?php elseif ($ocaDetalles): ?>
                <!-- Detalles de la OCA -->
                <div class="card mb-4">
                    <div class="card-header">Información de la Orden de Compra</div>
                    <div class="card-body">
                        <p><strong>Proyecto:</strong> <?php echo htmlspecialchars(($ocaDetalles['codigoProyecto'] ?? '') . ' - ' . ($ocaDetalles['municipio'] ?? '')); ?></p>
                        <p><strong>Número OCA:</strong> <?php echo htmlspecialchars($ocaDetalles['oca']); ?></p>
                        <p><strong>Monto Total:</strong> $<?php echo number_format($ocaDetalles['montoTotal'], 2); ?></p>
                        <p><strong>Total Pagado:</strong> $<?php echo number_format($totalPagado, 2); ?></p>
                        <p><strong>Saldo Pendiente:</strong> <strong class="<?php echo ($saldoPendiente <= 0.01) ? 'text-success' : 'text-danger'; ?>">$<?php echo number_format($saldoPendiente, 2); ?></strong></p>
                    </div>
                </div>

                <!-- Tabla de Pagos -->
                <div class="card">
                    <div class="card-header">Historial de Pagos Registrados</div>
                    <div class="card-body">
                        <?php if (!empty($pagos)): ?>
                            <table class="table table-bordered table-striped">
                                <thead>
                                    <tr>
                                        <th># Acta</th>
                                        <th class="text-right">Monto Pagado</th>
                                        <th>Fecha Registro (Aprox.)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($pagos as $pago): ?>
                                        <tr>
                                            <td><?php echo htmlspecialchars($pago['nActa']); ?></td>
                                            <td class="text-right">$<?php echo number_format($pago['montoParcial'], 2); ?></td>
                                            <td><?php echo htmlspecialchars($pago['fechaIngreso'] ? date('d/m/Y H:i', strtotime($pago['fechaIngreso'])) : 'No registrada'); ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        <?php else: ?>
                            <div class="alert alert-info">No hay pagos registrados para esta OCA.</div>
                        <?php endif; ?>
                    </div>
                    <div class="card-footer">
                         <a href="pagosOca.php" class="btn btn-secondary"><i class="fas fa-arrow-left mr-1"></i> Volver a la lista</a>
                         <a href="registrarPago.php?idOca=<?php echo $idOca; ?>" class="btn btn-primary ml-2"><i class="fas fa-plus mr-1"></i> Registrar Nuevo Pago</a>
                    </div>
                </div>
            <?php endif; ?>
        </div><!-- /.container-fluid -->
    </section>
    <!-- /.content -->
</div>
<!-- /.content-wrapper -->

<?php include_once "footer.php"; ?>