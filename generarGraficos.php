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

    .report-btn:hover {
        background-color: #46b8edcc;
    }

    .report-btn img {
        width: 40px; /* Tamaño del icono */
        height: 40px; /* Tamaño del icono */
    }

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
                    <h1 class="m-0">Gráficos</h1>
                </div>
            </div>
        </div>
    </div>

    <!-- Main content -->
    <section class="content">        
        <div class="container-fluid">
            <div class="row">
                <div class="col-lg-3 col-md-6 mb-4">
                    <button class="report-btn" onclick="abrirGraficoEq()">
                        <img src="sources/images/equipo-icono.png" alt="Gráfica de Equipos">
                        Gráfica de Equipos
                    </button>
                </div>
                <div class="col-lg-3 col-md-6 mb-4">
                    <button class="report-btn" onclick="abrirGraficoHe()">
                        <img src="sources/images/herramienta-icono.png" alt="Gráfica de Herramientas">
                        Gráfica de Herramientas
                    </button>
                </div>
                <div class="col-lg-3 col-md-6 mb-4">
                    <button class="report-btn" onclick="abrirReporteSe()"> <!-- Considera cambiar a abrirGraficoSe() si existe -->
                        <img src="sources/images/sso.png" alt="Gráfica de Seguridad Ocupacional">
                        Gráfica de Seguridad Ocupacional
                    </button>
                </div>
                <div class="col-lg-3 col-md-6 mb-4">
                    <button class="report-btn" onclick="abrirGraficoOca()">
                        <img src="sources/images/ocas-icono.png" alt="Gráfica de Órdenes de Compra">
                        Gráfica de Órdenes de Compra
                    </button>
                </div>
            </div>

            <div class="row">
                <div class="col-lg-3 col-md-6 mb-4">
                    <button type="button" class="report-btn" onclick="$('#reportModal').modal('show');"> <!-- Asumiendo que usa el mismo modal que reportes -->
                        <img src="sources/images/materias-primas.png" alt="Gráfica de Alquileres">
                        Gráfica de Alquileres
                    </button>
                </div>
                <div class="col-lg-3 col-md-6 mb-4">
                    <button class="report-btn" onclick="abrirGraficoVales()">
                        <img src="sources/images/diesel.png" alt="Gráfica de Vales de Combustible">
                        Gráfica de Vales de Combustible
                    </button>
                </div>
                <div class="col-lg-3 col-md-6 mb-4">
                    <button type="button" class="report-btn" onclick="$('#reportModal').modal('show');"> <!-- Asumiendo que usa el mismo modal que reportes -->
                        <img src="sources/images/materias-primas.png" alt="Gráfica de Maquinaria">
                        Gráfica de Maquinaria
                    </button>
                </div>
                <!-- Puedes añadir más botones aquí si es necesario, siguiendo el patrón col-lg-3 col-md-6 mb-4 -->
            </div>
        </div>  
    </section>
</div>


<script>
    // Función para mostrar la barra de carga
    function showLoading() {
        document.getElementById('loading').style.display = 'flex';
    }

    // Función para ocultar la barra de carga
    function hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }
    function abrirGraficoEq() {
    window.location.href = 'graficoEquipos.php';
    }
    function abrirGraficoHe() {
    window.location.href = 'graficoHerramientas.php';
    }
    function abrirGraficoVales() {
    window.location.href = 'graficoVales.php';
    }
    function abrirGraficoOca() {
    window.location.href = 'graficoOcas.php';
    }
</script>

<?php include_once "footer.php"; ?> 