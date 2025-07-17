<?php 
// Mover session_start() al inicio absoluto del script.
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$mysqli = include_once "conexion.php";


    // --- CONSULTA ELIMINADA: OCAs para el año 2025 ---
    // $queryOcas2025 = $mysqli->query("SELECT COUNT(idOca) AS totalOcas2025 FROM control_ocas WHERE YEAR(fechaOca) = 2025");
    // $ocas2025Data = $queryOcas2025->fetch_assoc();
    // $totalOcas2025 = $ocas2025Data['totalOcas2025'] ?? 0;
    // if($queryOcas2025) $queryOcas2025->free();
    $totalOcas2025 = 0; // Dejar la variable definida para evitar errores si se usa en otro lado, aunque la caja se eliminará.

$sqlOcasProyecto = "
    SELECT
        CONCAT(p.codigoProyecto, ' - ', p.municipio) AS proyecto_display,
        COUNT(co.idOca) AS total_ocas,
        SUM(co.valor_oca) AS suma_monto_total_oca -- Cambiado montoTotal a valor_oca
    FROM
        control_ocas co
    JOIN
        proyectos p ON co.idProyecto = p.idProyecto
    WHERE
        p.status = 'ACTIVO' -- Considerar solo proyectos activos
    GROUP BY
        proyecto_display
    ORDER BY
        SUM(co.valor_oca) DESC -- Cambiado montoTotal a valor_oca
    ";
error_log("DEBUG Default: SQL OcasProyecto: " . preg_replace('/\s+/', ' ', $sqlOcasProyecto));

$startTimeOcas = microtime(true);
$resOcasProyecto = $mysqli->query($sqlOcasProyecto);
$endTimeOcas = microtime(true);
$queryDurationOcas = $endTimeOcas - $startTimeOcas;
error_log("DEBUG Default: Consulta de OCAs por proyecto ejecutada en " . $queryDurationOcas . " segundos.");

$proyectosParaGraficoOcas = [];
$cantidadOcasPorProyecto = [];
$montoOcasPorProyecto = [];
$datosGraficoOcasProyectos = ['labels' => [], 'datasets' => []]; // Inicializar

if (!$resOcasProyecto) {
$errorMsgOcas = "Error en la consulta de OCAs por proyecto: " . $mysqli->error;
error_log("ERROR Default: " . $errorMsgOcas);
// Inicializar para evitar errores de JS si la consulta falla
$datosGraficoOcasProyectos = ['labels' => [], 'datasets' => []];
} else {
error_log("DEBUG Default: Consulta de OCAs por proyecto exitosa. Filas: " . $resOcasProyecto->num_rows);
while ($fila = $resOcasProyecto->fetch_assoc()) {
    $proyectosParaGraficoOcas[] = $fila['proyecto_display'];
    $cantidadOcasPorProyecto[] = (int)$fila['total_ocas'];
    $montoOcasPorProyecto[] = (float)$fila['suma_monto_total_oca']; // Corregido el alias
}
$resOcasProyecto->free();

$datosGraficoOcasProyectos = [
    'labels' => $proyectosParaGraficoOcas,
    'datasets' => [
        [
            'label' => 'Cantidad de OCAs',
            'data' => $cantidadOcasPorProyecto,
            'backgroundColor' => 'rgba(54, 162, 235, 0.7)', // Azul
            'borderColor' => 'rgba(54, 162, 235, 1)',
            'borderWidth' => 1,
            'yAxisID' => 'yOcasCount', // Eje Y para cantidad
            'type' => 'bar'
        ],
        [
            'label' => 'Monto Total OCAs ($)',
            'data' => $montoOcasPorProyecto,
            'backgroundColor' => 'rgba(255, 159, 64, 0.7)', // Naranja
            'borderColor' => 'rgba(255, 159, 64, 1)',
            'borderWidth' => 2, // Más grueso para la línea
            'type' => 'line', // Mostrar monto como una línea
            'yAxisID' => 'yOcasMonto', // Eje Y para monto
            'tension' => 0.1 // Suavizar la línea
        ]
    ]
];
}
// --- FIN NUEVA CONSULTA Y DATOS OCAS ---
// echo "<p>DEBUG: Saliendo antes de incluir header.php</p>"; exit(); // <-- Descomenta esta línea para probar hasta este punto

// --- NUEVA CONSULTA Y DATOS PARA GRÁFICO DE OCAS POR PROYECTO Y ZONA ---
error_log("DEBUG Default: Iniciando consulta para gráficos de OCAs por proyecto y zona.");

$sqlOcasPorZonaProyecto = "
    SELECT
        p.zona,
        p.codigoProyecto AS proyecto_display,
        COUNT(co.idOca) AS total_ocas,
        SUM(co.valor_oca) AS suma_monto_total_oca -- Cambiado montoTotal a valor_oca
    FROM
        control_ocas co
    JOIN
        proyectos p ON co.idProyecto = p.idProyecto
    WHERE
        p.status = 'ACTIVO' -- Considerar solo proyectos activos
    GROUP BY
        p.zona, proyecto_display
    ORDER BY
        p.zona, SUM(co.valor_oca) DESC -- Cambiado montoTotal a valor_oca
";
error_log("DEBUG Default: SQL OcasPorZonaProyecto: " . preg_replace('/\s+/', ' ', $sqlOcasPorZonaProyecto));

$startTimeOcasZona = microtime(true);
$resOcasPorZonaProyecto = $mysqli->query($sqlOcasPorZonaProyecto);
$endTimeOcasZona = microtime(true);
$queryDurationOcasZona = $endTimeOcasZona - $startTimeOcasZona;
error_log("DEBUG Default: Consulta de OCAs por zona y proyecto ejecutada en " . $queryDurationOcasZona . " segundos.");

// Inicializar arrays para cada zona
$datosGraficoOcasZona1 = ['labels' => [], 'datasets' => [[ 'label' => 'Cantidad de OCAs', 'data' => [], 'backgroundColor' => 'rgba(54, 162, 235, 0.7)', 'borderColor' => 'rgba(54, 162, 235, 1)', 'yAxisID' => 'yOcasCount', 'type' => 'bar'],[ 'label' => 'Monto Total OCAs ($)', 'data' => [], 'backgroundColor' => 'rgba(255, 159, 64, 0.7)', 'borderColor' => 'rgba(255, 159, 64, 1)', 'type' => 'line', 'yAxisID' => 'yOcasMonto', 'tension' => 0.1]]];
$datosGraficoOcasZona2 = ['labels' => [], 'datasets' => [[ 'label' => 'Cantidad de OCAs', 'data' => [], 'backgroundColor' => 'rgba(75, 192, 192, 0.7)', 'borderColor' => 'rgba(75, 192, 192, 1)', 'yAxisID' => 'yOcasCount', 'type' => 'bar'],[ 'label' => 'Monto Total OCAs ($)', 'data' => [], 'backgroundColor' => 'rgba(255, 99, 132, 0.7)', 'borderColor' => 'rgba(255, 99, 132, 1)', 'type' => 'line', 'yAxisID' => 'yOcasMonto', 'tension' => 0.1]]];
$datosGraficoOcasZona3 = ['labels' => [], 'datasets' => [[ 'label' => 'Cantidad de OCAs', 'data' => [], 'backgroundColor' => 'rgba(153, 102, 255, 0.7)', 'borderColor' => 'rgba(153, 102, 255, 1)', 'yAxisID' => 'yOcasCount', 'type' => 'bar'],[ 'label' => 'Monto Total OCAs ($)', 'data' => [], 'backgroundColor' => 'rgba(255, 206, 86, 0.7)', 'borderColor' => 'rgba(255, 206, 86, 1)', 'type' => 'line', 'yAxisID' => 'yOcasMonto', 'tension' => 0.1]]];
$datosGraficoOcasZona4 = ['labels' => [], 'datasets' => [[ 'label' => 'Cantidad de OCAs', 'data' => [], 'backgroundColor' => 'rgba(153, 102, 255, 0.7)', 'borderColor' => 'rgba(153, 102, 255, 1)', 'yAxisID' => 'yOcasCount', 'type' => 'bar'],[ 'label' => 'Monto Total OCAs ($)', 'data' => [], 'backgroundColor' => 'rgba(255, 206, 86, 0.7)', 'borderColor' => 'rgba(255, 206, 86, 1)', 'type' => 'line', 'yAxisID' => 'yOcasMonto', 'tension' => 0.1]]];

if (!$resOcasPorZonaProyecto) {
    $errorMsgOcas = "Error en la consulta de OCAs por zona y proyecto: " . $mysqli->error;
    error_log("ERROR Default: " . $errorMsgOcas);
} else {
    error_log("DEBUG Default: Consulta de OCAs por zona y proyecto exitosa. Filas: " . $resOcasPorZonaProyecto->num_rows);
    while ($fila = $resOcasPorZonaProyecto->fetch_assoc()) {
        $zona = strtoupper(trim($fila['zona'] ?? '')); // Normalizar nombre de zona y evitar error con null
        $proyectoDisplay = $fila['proyecto_display'];
        $totalOcas = (int)$fila['total_ocas'];
        $sumaMonto = (float)$fila['suma_monto_total_oca']; // Corregido el alias

        switch ($zona) {
            case 'ZONA 1':
                $datosGraficoOcasZona1['labels'][] = $proyectoDisplay;
                $datosGraficoOcasZona1['datasets'][0]['data'][] = $totalOcas;
                $datosGraficoOcasZona1['datasets'][1]['data'][] = $sumaMonto;
                break;
            case 'ZONA 2':
                $datosGraficoOcasZona2['labels'][] = $proyectoDisplay;
                $datosGraficoOcasZona2['datasets'][0]['data'][] = $totalOcas;
                $datosGraficoOcasZona2['datasets'][1]['data'][] = $sumaMonto;
                break;
            case 'ZONA 3':
                $datosGraficoOcasZona3['labels'][] = $proyectoDisplay;
                $datosGraficoOcasZona3['datasets'][0]['data'][] = $totalOcas;
                $datosGraficoOcasZona3['datasets'][1]['data'][] = $sumaMonto;
                break;
            case 'ZONA 4':
                $datosGraficoOcasZona4['labels'][] = $proyectoDisplay;
                $datosGraficoOcasZona4['datasets'][0]['data'][] = $totalOcas;
                $datosGraficoOcasZona4['datasets'][1]['data'][] = $sumaMonto;
                break;    
        }
    }
    $resOcasPorZonaProyecto->free();
}
// --- FIN NUEVA CONSULTA Y DATOS OCAS ---
// echo "<p>DEBUG: Saliendo antes de incluir header.php</p>"; exit(); // <-- Descomenta esta línea para probar hasta este punto

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
            <h1 class="m-0">Dashboard</h1>
          </div><!-- /.col -->
        </div><!-- /.row -->
      </div><!-- /.container-fluid -->
    </div>
    <!-- /.content-header -->

    <!-- Main content -->
    <section class="content">
      <div class="container-fluid">
        <!-- Small boxes (Stat box) - Modificado -->
        <!-- <div class="row">
          <div class="col-lg-4 col-md-4 col-sm-12">
            <!-- small box >
            <div class="small-box bg-purple"> < Cambiado color para diferenciar >
              <div class="inner">
                <h3><?php echo $totalOcas2025; ?></h3>
                <p>OCAs Registradas (2025)</p>
              </div>
              <div class="icon">
                <i class="ion ion-briefcase"></i> <!-- Icono relevante para OCAs -->
              <!--/div>
              <a href="listarOcas.php" class="small-box-footer">Más información <i class="fas fa-arrow-circle-right"></i></a>
            </div>
          </div>
           <div class="col-lg-4 col-md-4 col-sm-12">

           
          </div>
          <div class="col-lg-4 col-md-4 col-sm-12">

           
          </div -->

          <!-- ./col -->
          <!-- inicia nueva caja -->
          <!--div class="col-lg-3 col-6"-->
            <!-- small box -->
            <!--div class="small-box bg-danger">
              <div class="inner">
                <h3>65</h3>

                <p> </p>
              </div>
              <div class="icon">
                <i class="ion ion-pie-graph"></i>
              </div>
              <a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a>
            </div>
          </div-->
          <!-- ./col -->
        <!--</div> -->
        <!-- /.row -->
        <!-- Main row -->

        <!-- /.row (main row) -->

          <!-- right col -->
        </div>
        <!-- /.row (main row) -->
      </div><!-- /.container-fluid -->
    </section>
    <!-- /.content -->
  </div>
  <!-- /.content-wrapper -->
 
<?php include_once "footer.php"; ?>
<!-- ChartJS -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
  /*document.addEventListener('DOMContentLoaded', function () {
    const ctxEquiposEstado = document.getElementById('equiposEstadoChart');
    if (ctxEquiposEstado) {
        const datosGrafico = <?php echo json_encode($datosGraficoEstadoEquipos); ?>;
        new Chart(ctxEquiposEstado, {
            type: 'pie',
            data: {
                labels: datosGrafico.labels,
                datasets: [{
                    label: 'Estado de Equipos',
                    data: datosGrafico.data,
                    backgroundColor: datosGrafico.backgroundColor,
                    borderColor: datosGrafico.borderColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed !== null) { label += context.parsed; }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

 // Función genérica para crear gráficos de OCAs por zona
 function crearGraficoOcasPorZona(canvasId, datosGraficoPHP, tituloGrafico) {
        const ctx = document.getElementById(canvasId);
        if (ctx) {
            const datosGrafico = datosGraficoPHP; // Ya viene como objeto desde PHP
            if (datosGrafico.labels.length === 0) {
                // Mostrar mensaje si no hay datos para esta zona
                const parentDiv = ctx.parentElement;
                parentDiv.innerHTML = `<p class="text-center text-muted p-5">No hay datos de OCAs para mostrar en ${tituloGrafico.replace('OCAs Proyectos ', '')}.</p>`;
                return;
            }
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: datosGrafico.labels,
                    datasets: datosGrafico.datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: tituloGrafico },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) { label += ': '; }
                                    if (context.parsed.y !== null) {
                                        if (context.dataset.yAxisID === 'yOcasMonto') {
                                            label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                                        } else {
                                            label += context.parsed.y;
                                        }
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { stacked: false },
                        yOcasCount: { type: 'linear', display: true, position: 'left', beginAtZero: true, title: { display: true, text: 'Cantidad de OCAs' }},
                        yOcasMonto: { type: 'linear', display: true, position: 'right', beginAtZero: true, title: { display: true, text: 'Monto Total ($)' }, grid: { drawOnChartArea: false }}
                    }
                }
            });
        }
    }

    // Crear los gráficos para cada zona
    crearGraficoOcasPorZona('ocasZona1Chart', <?php echo json_encode($datosGraficoOcasZona1); ?>, 'OCAs Proyectos Zona 1');
    crearGraficoOcasPorZona('ocasZona2Chart', <?php echo json_encode($datosGraficoOcasZona2); ?>, 'OCAs Proyectos Zona 2');
    crearGraficoOcasPorZona('ocasZona3Chart', <?php echo json_encode($datosGraficoOcasZona3); ?>, 'OCAs Proyectos Zona 3');
    crearGraficoOcasPorZona('ocasZona4Chart', <?php echo json_encode($datosGraficoOcasZona4); ?>, 'OCAs Proyectos Zona 4');

 });*/
</script>