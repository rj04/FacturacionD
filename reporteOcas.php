<?php 
ob_start(); // Iniciar el buffer de salida

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

ini_set('memory_limit', '4G'); 
ini_set('max_execution_time', 600); 

$mysqli = include_once "conexion.php";

header('Content-Type: text/html; charset=utf-8');

// Consulta con LIMIT y OFFSET
$query = "
    SELECT 
        p.codigoProyecto, 
        p.municipio, 
        co.oca, 
        co.fechaOca, 
        r.residente AS residente,
        pr.proveedor AS proveedor,
        co.estado,
        co.formaPago, 
        co.montoTotal 
    FROM control_ocas co
    JOIN proyectos p ON co.idProyecto = p.idProyecto
    LEFT JOIN residentes r ON co.idResidente = r.idResidente 
    LEFT JOIN proveedores pr ON co.idProveedor = pr.idProveedor";

$resultado = $mysqli->query($query);
$ocas = $resultado->fetch_all(MYSQLI_ASSOC);


?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Control de Inventarios :: DOM</title>
    <link rel="icon" type="image/x-icon" href="sources/images/dom.png">
    <link rel="stylesheet" href="sources/css/bootstrap.min.css">
    <link href="sources/css/estilo.css" rel="stylesheet">
    <link href="sources/css/reporteH.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300&display=swap" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="sources/css/fontawesome-free/css/all.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <!-- iconos de bootstrap -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    
    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/dataTables.bootstrap4.min.css">

    <!-- Google Font: Source Sans Pro -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,400i,700&display=fallback">
    <!-- Ionicons -->
    <link rel="stylesheet" href="https://code.ionicframework.com/ionicons/2.0.1/css/ionicons.min.css">
    <!-- JQVMap -->
    <link rel="stylesheet" href="dashboard/plugins/jqvmap/jqvmap.min.css">
    <!-- Theme style -->
    <link rel="stylesheet" href="dashboard/dist/css/adminlte.min.css">
    <!-- overlayScrollbars -->
    <link rel="stylesheet" href="dashboard/plugins/overlayScrollbars/css/OverlayScrollbars.min.css">
    <!-- Daterange picker -->
    <link rel="stylesheet" href="dashboard/plugins/daterangepicker/daterangepicker.css">

</head>
<body class="hold-transition sidebar-mini layout-fixed">
    
    <main class="container-fluid">

    <h3 class="text-center">Reporte de Órdenes de Compra</h3>
    <button onclick="window.history.back();" class="btn btn-secondary">Regresar</button>
    <button onclick="exportarExcel();" class="btn btn-success">Exportar a Excel</button>
  
    <div class="container-fluid">
        <div class="table-responsive"> <!-- Hace la tabla desplazable en pantallas pequeñas -->
            <table class="table table-bordered table-striped"><table class="table table-striped table-hover table-bordered" id="tabla">
                    <thead>
                        <tr>
                            <th class="text-center">Proyecto</th>
                            <th class="text-center">Orden de Compra</th>
                            <th class="text-center">Fecha OCA</th>
                            <th class="text-center">Residente</th>
                            <th class="text-center">Proveedor</th>
                            <th class="text-center">Estado</th>
                            <th class="text-center">Forma de Pago</th>
                            <th class="text-center">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($ocas as $oca) { ?>
                        <tr>
                            
                            <td><?php echo $oca['codigoProyecto'] . $oca['municipio'];?></td>
                            <td><?php echo $oca["oca"]?></td>
                            <td><?php echo $oca["fechaOca"]?></td>
                            <td><?php echo $oca["residente"]?></td>
                            <td><?php echo $oca["proveedor"]?></td>
                            <td><?php echo $oca["estado"]?></td>
                            <td><?php echo $oca["formaPago"]?></td>
                            <td>$<?php echo number_format($oca['montoTotal'], 2) ?></td>
                        </tr>
                        <?php } ?>
                    </tbody>
                </table>
            </div>
        </div>
    </section>
    <!-- /.content -->

<?php
    ob_end_flush(); // Enviar el contenido del buffer
?>
<?php include_once "footer.php"; ?>
<script>
    function exportarExcel() {
        // Redirigir a la página que genera el archivo Excel
        window.location.href = 'exportarReporteOca.php';
    }
</script>