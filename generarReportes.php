<?php 
error_reporting(E_ALL);
ini_set('display_errors', 1);

$mysqli = include_once "conexion.php";
include_once "header.php";   
include_once "navbar.php"; 
?>
<style>
    .report-btn {
        background-color: #007BFF;
        font-family: 'Montserrat', sans-serif;
        font-size: 14px; /* Ajustado */
        color: white;
        border: none;
        padding: 15px; /* Ajustado */
        text-align: center;
        text-decoration: none;
        display: flex;
        flex-direction: column; /* Icono arriba, texto abajo */
        align-items: center;
        justify-content: center; /* Centrar contenido vertical y horizontalmente */
        gap: 8px; /* Espacio entre icono y texto */
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        width: 100%; /* Ocupar todo el ancho de la columna */
        height: 120px; /* Altura fija para uniformidad */
    }

    .report-btn img {
        width: 40px; /* Tamaño del icono */
        height: 40px; /* Tamaño del icono */
        /* margin-bottom: 5px; No es necesario con gap */
    }

    .report-btn:hover {
        background-color: #46b8edcc;
    }

    /* Eliminar la clase .icono si ya no se usa o ajustar si es necesario en otros lugares */
    /* .icono { width: 50px; height: 50px; } */

    /* Estilos para la barra de carga */
    #loading {
        position: fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.8);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
    }
    
    .loader {
        border: 16px solid #f3f3f3;
        border-top: 16px solid #3498db;
        border-radius: 50%;
        width: 60px;
        height: 60px;
        animation: spin 2s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>
<!-- Content     Wrapper -->
<div class="content-wrapper">
    <!-- Content Header -->
    <div class="content-header">
        <div class="container-fluid">
            <div class="row mb-2">
                <div class="col-sm-6">
                    <h1 class="m-0">Reportes</h1>
                </div>
            </div>
        </div>
    </div>

    <!-- Main content -->
    <section class="content">        
        <div class="container-fluid">
            <div class="row">
                
                <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                    <button class="report-btn" onclick="abrirReporteOca()">
                        <img src="sources/images/ocas-icono.png" alt="Órdenes de Compra">
                        Reporte de Órdenes de Compra
                    </button>
                </div>
                <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                    <button class="report-btn" onclick="window.location.href='reporteAvanceOcas.php'">
                        <img src="sources/images/avance-icono.png" alt="Avance de OCAs"> <!-- Necesitarás un icono adecuado -->
                        Reporte de Avance de OCAs
                    </button>
                </div>
            </div>

           
                <!-- Puedes añadir más botones aquí si es necesario, siguiendo el patrón col-lg-3 col-md-6 mb-4 -->
            </div>
        </div>
    </section>
</div>
<!-- Modales -->
<!-- Modal para Reporte de Materiales -->
<div class="modal fade" id="reportModal" tabindex="-1" aria-labelledby="reportModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="reportModalLabel">Seleccionar Tipo de Reporte</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="list-group">
                    <a href="#" class="list-group-item list-group-item-action" onclick="showReportForm('alquileres')">
                        Reporte de Alquileres
                    </a>
                    <a href="#" class="list-group-item list-group-item-action" onclick="showReportForm('combustible')">
                        Reporte de Vales de Combustible
                    </a>
                    <a href="#" class="list-group-item list-group-item-action" onclick="showReportForm('maquinaria')">
                        Reporte de Maquinaria por OCA
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modal para el formulario de fechas -->
<div class="modal fade" id="reportFormModal" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Seleccionar Período</h5>
                <button type="button" class="close" data-bs-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <form id="reportForm">
                    <input type="hidden" id="tipo_reporte" name="tipo_reporte">
                    <div class="form-group">
                        <label for="daterange">Rango de Fechas:</label>
                        <input type="text" class="form-control" id="daterange" name="daterange" required>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">Generar Reporte</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Div para loading -->
<div id="loading" style="display:none;">
    <div class="loader"></div>
    <p>Generando reporte, por favor espera...</p>
</div>


<!-- Scripts -->
<script type="text/javascript">
    // Asegurarnos de que jQuery esté cargado
    document.addEventListener('DOMContentLoaded', function() {
        // Verificar jQuery
        if (typeof jQuery === 'undefined') {
            console.error('jQuery no está cargado');
            return;
        }

        // Inicializar daterangepicker cuando todo esté listo
        setTimeout(function() {
            initializeDateRangePicker();
        }, 500);
    });

    function initializeDateRangePicker() {
        $('#daterange').daterangepicker({
            autoUpdateInput: false,
            opens: 'left',
            locale: {
                format: 'DD/MM/YYYY',
                separator: ' - ',
                applyLabel: 'Aplicar',
                cancelLabel: 'Cancelar',
                fromLabel: 'Desde',
                toLabel: 'Hasta',
                customRangeLabel: 'Rango personalizado',
                daysOfWeek: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
                monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
            }
        });

        // Eventos del daterangepicker
        $('#daterange').on('apply.daterangepicker', function(ev, picker) {
            $(this).val(picker.startDate.format('DD/MM/YYYY') + ' - ' + picker.endDate.format('DD/MM/YYYY'));
        });

        $('#daterange').on('cancel.daterangepicker', function(ev, picker) {
            $(this).val('');
        });

        // Manejo del formulario
        $('#reportForm').off('submit').on('submit', function(e) {
            e.preventDefault();
            var daterange = $('#daterange').val();
            var tipo_reporte = $('#tipo_reporte').val();

            if (!daterange) {
                alert('Por favor seleccione un rango de fechas');
                return;
            }

            window.location.href = 'reporteMateriales.php?tipo=' + 
                                encodeURIComponent(tipo_reporte) + 
                                '&daterange=' + 
                                encodeURIComponent(daterange);
        });
    }

    // Función global para mostrar el modal
    window.showReportForm = function(tipo) {
        if (typeof jQuery === 'undefined') {
            console.error('jQuery no está cargado');
            return;
        }

        $('#tipo_reporte').val(tipo);
        $('#daterange').val('');
        
        // Asegurarnos de que el daterangepicker esté inicializado
        if (!$('#daterange').data('daterangepicker')) {
            initializeDateRangePicker();
        }
        
        $('#reportFormModal').modal('show');
    };

    function abrirReporteEq() {
        // Aquí puedes definir lo que debe hacer el botón, por ejemplo, redirigir a otra página
        window.location.href = 'reporteEquipos.php';
    }

    function abrirReporteHe() {
        window.location.href = 'reporteHerramientas.php';
    }

    function abrirReporteMa() {
        // Aquí puedes definir lo que debe hacer el botón, por ejemplo, redirigir a otra página
        window.location.href = 'reporteInsumos.php';
    }

    function abrirReporteSe() {
        window.location.href = 'reporteSeguridadOc.php';
    }

    function abrirReporteOca() {
        window.location.href = 'reporteOcas.php';
    }

    function abrirReporteOficina() {
        window.location.href = 'reporteOficina.php';
    }
</script>

<?php include_once "footer.php"; ?>