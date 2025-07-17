<?php
// c:\UniServerZ\www\facturacion\imprimirOca.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

// Incluir conexión y helpers
$mysqli = include_once "conexion.php";
include_once "helpers.php"; // Si necesitas verificar permisos

// Verificar conexión
if ($mysqli->connect_error) {
    die("Error de conexión a la base de datos: " . $mysqli->connect_error);
}

// --- Control de Acceso (Opcional pero recomendado) ---
// Verifica si el usuario tiene permiso para ver OCAs o imprimir
// if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('view_ocas')) { // O un permiso más específico como 'print_ocas'
//     die("Acceso denegado.");
// }
// --- Fin Control de Acceso ---

// Obtener el ID de la OCA desde la URL
$idOca = isset($_GET['idOca']) ? filter_input(INPUT_GET, 'idOca', FILTER_VALIDATE_INT) : null;

if (!$idOca) {
    die("ID de OCA no proporcionado o inválido.");
}

// Consulta para obtener los datos completos de la OCA
// Asegúrate de seleccionar todos los campos necesarios para la impresión
$sql = "SELECT
            co.*, -- Seleccionar todos los campos de control_ocas
            p.codigoProyecto, p.nombreProyecto, p.municipio, -- Datos del proyecto
            prov.proveedor -- Nombre del proveedor
        FROM control_ocas co
        LEFT JOIN proyectos p ON co.idProyecto = p.idProyecto
        LEFT JOIN proveedores prov ON co.idProveedor = prov.idProveedor
        WHERE co.idOca = ?";

$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    die("Error preparando la consulta: " . $mysqli->error);
}

$stmt->bind_param("i", $idOca);
$stmt->execute();
$result = $stmt->get_result();
$oca = $result->fetch_assoc();

$stmt->close();
$mysqli->close();

if (!$oca) {
    die("OCA no encontrada.");
}

// --- Generar HTML para imprimir ---
// Este es un ejemplo básico. Deberás adaptarlo al diseño real de tu OCA.
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Imprimir OCA - <?php echo htmlspecialchars($oca['oca_completa']); ?></title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css" integrity="sha384-xOolHFLEh07PJGoPkLv1IbcEPTNtaed2xpHsD9ESMhqIYd0nLMwNLD69Npy4HI+N" crossorigin="anonymous">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20mm; /* Márgenes para impresión */
            font-size: 10pt;
        }
        .container {
            width: 100%;
            margin: 0 auto;
        }
        .header, .footer {
            width: 100%;
            text-align: center;
            position: fixed;
        }
        .header {
            top: 0;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
        }
        .footer {
            bottom: 0;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
        .content {
            margin-top: 30mm; /* Espacio para el encabezado */
            margin-bottom: 20mm; /* Espacio para el pie de página */
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        th, td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        .no-border td, .no-border th {
            border: none;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .bold { font-weight: bold; }

        /* Estilos específicos para impresión */
        @media print {
            body {
                margin: 10mm; /* Ajustar márgenes para impresión si es necesario */
            }
            .header, .footer {
                position: fixed;
            }
            .content {
                 margin-top: 20mm; /* Ajustar espacio para encabezado en impresión */
                 margin-bottom: 15mm; /* Ajustar espacio para pie de página en impresión */
            }
            /* Ocultar elementos no deseados en la impresión */
            .no-print {
                display: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header no-print">
            <!-- Puedes poner un logo o título aquí si no quieres que aparezca en la impresión -->
            <h2>Vista Previa de Impresión</h2>
        </div>

        <div class="content">
            <h1 class="text-center">Orden de Compra</h1>
            <h2 class="text-center"><?php echo htmlspecialchars($oca['oca_completa']); ?></h2>
            <hr>

            <table class="no-border">
                <tr>
                    <td class="bold">Proyecto:</td>
                    <td><?php echo htmlspecialchars($oca['codigoProyecto'] . ' - ' . $oca['nombreProyecto'] . ' (' . $oca['municipio'] . ')'); ?></td>
                </tr>
                <tr>
                    <td class="bold">Proceso DOM:</td>
                    <td><?php echo htmlspecialchars($oca['proceso_dom']); ?></td>
                </tr>
                <tr>
                    <td class="bold">Proveedor:</td>
                    <td><?php echo htmlspecialchars($oca['proveedor']); ?></td>
                </tr>
                <tr>
                    <td class="bold">Valor OCA:</td>
                    <td>$<?php echo number_format($oca['valor_oca'], 2, '.', ','); ?></td>
                </tr>
                <tr>
                    <td class="bold">N° Acta:</td>
                    <td><?php echo htmlspecialchars($oca['numero_acta']); ?></td>
                </tr>
                <tr>
                    <td class="bold">Fecha Compras:</td>
                    <td><?php echo date('d/m/Y', strtotime($oca['fechaCompras'])); ?></td>
                </tr>
                 <tr>
                    <td class="bold">Estado Impresión:</td>
                    <td><?php echo $oca['impresa'] == 1 ? 'Impresa' : 'Nueva'; ?></td>
                </tr>
                 <tr>
                    <td class="bold">Estado OCA:</td>
                    <td><?php // Aquí deberías buscar el nombre del estado en la tabla estado_oca si lo necesitas ?>
                        <?php echo htmlspecialchars($oca['idEstado_Oca']); // Muestra solo el ID por ahora ?>
                    </td>
                </tr>
            </table>

            <h4 class="mt-4">Detalles de Factura</h4>
            <table>
                <thead>
                    <tr>
                        <th>N° Factura</th>
                        <th>Fecha Factura</th>
                        <th>Monto Factura</th>
                        <th>IVA Retenido</th>
                        <th>Total Factura</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><?php echo htmlspecialchars($oca['numero_factura']); ?></td>
                        <td><?php echo date('d/m/Y', strtotime($oca['fecha_factura'])); ?></td>
                        <td class="text-right">$<?php echo number_format($oca['monto_factura'], 2, '.', ','); ?></td>
                        <td class="text-right">$<?php echo number_format($oca['iva_retenido_factura'], 2, '.', ','); ?></td>
                        <td class="text-right">$<?php echo number_format($oca['total_factura'], 2, '.', ','); ?></td>
                    </tr>
                </tbody>
            </table>

             <?php if (!empty($oca['total_factura_letras'])): ?>
             <p class="bold">Valor en Letras: <?php echo htmlspecialchars($oca['total_factura_letras']); ?></p>
             <?php endif; ?>

             <?php if (!empty($oca['observaciones'])): ?>
             <h4 class="mt-4">Observaciones</h4>
             <p><?php echo nl2br(htmlspecialchars($oca['observaciones'])); ?></p>
             <?php endif; ?>

            <div class="footer no-print">
                <!-- Puedes poner información del sistema o paginación aquí si no quieres que aparezca en la impresión -->
                <p>Generado el: <?php echo date('d/m/Y H:i'); ?></p>
            </div>
        </div>

        <div class="text-center mt-4 no-print">
            <button class="btn btn-primary" onclick="window.print()">Imprimir esta página</button>
            <button class="btn btn-secondary ml-2" onclick="window.close()">Cerrar</button>
        </div>

    </div>
</body>
</html>
<?php
// Opcional: Marcar la OCA como impresa después de generar la vista previa
// Esto podría hacerse aquí o al hacer clic en el botón "Imprimir" real en el modal de impresión del navegador.
// Hacerlo aquí es más simple, pero podría marcarse como impresa aunque el usuario no imprima realmente.
// Si decides hacerlo aquí, necesitarás otra conexión o reutilizar la actual antes de cerrarla.
/*
if ($mysqli->ping()) { // Verificar si la conexión sigue abierta
    $stmtUpdate = $mysqli->prepare("UPDATE control_ocas SET impresa = 1 WHERE idOca = ? AND impresa = 0");
    if ($stmtUpdate) {
        $stmtUpdate->bind_param("i", $idOca);
        $stmtUpdate->execute();
        $stmtUpdate->close();
        // Opcional: Registrar en historial
    }
}
*/
?>