<?php
// c:\UniServerZ\www\facturacion\imprimirMultiplesOcas.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

$mysqli = include_once "conexion.php";
include_once "helpers.php"; // Si necesitas verificar permisos

if ($mysqli->connect_error) {
    die("Error de conexión a la base de datos: " . $mysqli->connect_error);
}

// --- Control de Acceso (Opcional) ---
// if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('print_ocas')) {
//     die("Acceso denegado.");
// }

$idOcasArray = isset($_GET['idOcas']) && is_array($_GET['idOcas']) ? $_GET['idOcas'] : null;

if (empty($idOcasArray)) {
    die("No se proporcionaron IDs de OCA o el formato es incorrecto.");
}

// Sanitizar los IDs para asegurar que son enteros
$idOcasSanitizados = array_map('intval', $idOcasArray);
$idOcasSanitizados = array_filter($idOcasSanitizados, function($id) { return $id > 0; }); // Filtrar IDs no válidos (ej. 0 o negativos)

if (empty($idOcasSanitizados)) {
    die("IDs de OCA no válidos después de la sanitización.");
}

$placeholders = implode(',', array_fill(0, count($idOcasSanitizados), '?'));
$types = str_repeat('i', count($idOcasSanitizados));

$sql = "SELECT
            co.*,
            CONCAT('OCA-', co.oca_numero, '/', co.anio_oca) AS oca_completa_calculada,
            p.codigoProyecto, p.nombreProyecto, p.municipio,
            prov.proveedor
        FROM control_ocas co
        LEFT JOIN proyectos p ON co.idProyecto = p.idProyecto
        LEFT JOIN proveedores prov ON co.idProveedor = prov.idProveedor
        WHERE co.idOca IN ($placeholders)
        ORDER BY co.oca_numero ASC, co.anio_oca ASC"; // O el orden que prefieras

$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    die("Error preparando la consulta: " . $mysqli->error);
}

$stmt->bind_param($types, ...$idOcasSanitizados);
$stmt->execute();
$result = $stmt->get_result();
$ocas = [];
while ($row = $result->fetch_assoc()) {
    $ocas[] = $row;
}

$stmt->close();
// No cerramos $mysqli aquí si vamos a marcar como impresas después

if (empty($ocas)) {
    die("No se encontraron OCAs para los IDs proporcionados o ya fueron procesadas.");
}

// Opcional: Marcar las OCAs como impresas
// Es importante decidir si esto se hace aquí o se deja al usuario usar el botón "Marcar Seleccionadas"
// $marcarComoImpresasAlGenerar = false; // DESACTIVADO: El marcado se hace en crearLoteImpresion.php

$mysqli->close();


?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Listado de OCAs para Imprimir</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0; /* El margen se controla por oca-document o @page */
            font-size: 10pt;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        th, td {
            border: 1px solid #ccc;
            padding: 4px 6px; /* Ajustar padding */
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        .no-border td, .no-border th {
            border: none;
            padding: 4px;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .bold { font-weight: bold; }

        @media print {
            body {
                margin: 0;
                font-size: 9pt; /* Ajustar si es necesario para impresión */
            }
            .no-print {
                display: none !important;
            }
            @page {
                margin: 10mm; /* Margen para toda la página de impresión */
            }
        }
    </style>
</head>
<body>
    <div class="container-fluid no-print mt-3 mb-3 text-center">
        <button class="btn btn-primary btn-lg" onclick="window.print()">
            <i class="bi bi-printer-fill"></i> Imprimir Listado
        </button>
        <button class="btn btn-secondary btn-lg ml-2" onclick="window.close()">
            Cerrar Ventana
        </button>
    </div>

    <div class="container-fluid mt-3">
        <h2 class="text-center mb-3">Listado de Órdenes de Compra</h2>
        <table class="table table-bordered table-sm"> <!-- table-sm para hacerla más compacta -->
            <thead>
                <tr>
                    <th>#</th>
                    <th class="text-center">OCA</th>
                    <th class="text-center">Proyecto</th>
                    <th class="text-center">Proceso DOM</th>
                    <th class="text-center">Proveedor</th>
                    <th class="text-center">Valor OCA</th>
                    <th class="text-center">N° Acta</th>
                    <th class="text-center">Fecha Compras</th>
                    <th class="text-center">N° Factura</th>
                    <th class="text-center">Fecha Factura</th>
                    <th class="text-center">Monto Factura</th>
                    <th class="text-center">IVA Retenido</th>
                    <th class="text-center">Total Factura</th>
                    <th class="text-center">Valor en Letras</th>
                    <th class="text-center">Observaciones</th>
                    <th class="text-center">Estado Impresión</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($ocas as $index => $oca): ?>
                <tr>
                    <td><?php echo $index + 1; ?></td>
                    <td><?php echo htmlspecialchars($oca['oca_completa_calculada'] ?? ''); ?></td>
                    <td><?php echo htmlspecialchars($oca['codigoProyecto'] ?? ''); ?></td>
                    <td><?php echo htmlspecialchars($oca['proceso_dom'] ?? ''); ?></td>
                    <td><?php echo htmlspecialchars($oca['proveedor'] ?? ''); ?></td>
                    <td class="text-right">$<?php echo number_format($oca['valor_oca'], 2, '.', ','); ?></td>
                    <td><?php echo htmlspecialchars($oca['numero_acta'] ?? ''); ?></td>
                    <td><?php echo $oca['fechaCompras'] ? date('d/m/Y', strtotime($oca['fechaCompras'])) : 'N/A'; ?></td>
                    <td><?php echo htmlspecialchars($oca['numero_factura'] ?? ''); ?></td>
                    <td><?php echo ($oca['fecha_factura'] && $oca['fecha_factura'] != '0000-00-00') ? date('d/m/Y', strtotime($oca['fecha_factura'])) : 'N/A'; ?></td>
                    <td class="text-right">$<?php echo number_format($oca['monto_factura'], 2, '.', ','); ?></td>
                    <td class="text-right">$<?php echo number_format($oca['iva_retenido_factura'], 2, '.', ','); ?></td>
                    <td class="text-right">$<?php echo number_format($oca['total_factura'], 2, '.', ','); ?></td>
                    <td><?php echo htmlspecialchars($oca['total_factura_letras'] ?? ''); ?></td>
                    <td><?php echo nl2br(htmlspecialchars($oca['observaciones'] ?? '')); ?></td>
                    <td><?php echo $oca['impresa'] == 1 ? 'Impresa' : 'Nueva'; ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

</body>
</html>