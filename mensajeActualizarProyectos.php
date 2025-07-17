<?php 
// Mostrar todos los errores
error_reporting(E_ALL);
ini_set('display_errors', 1);

$mysqli = include_once "conexion.php";

// Depuración: Verificar si la conexión se establece correctamente
if ($mysqli->connect_error) {
    die("Error de conexión: " . $mysqli->connect_error);
}
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
            <h1 class="m-0">Actualizar Proyectos</h1>
          </div><!-- /.col -->
        </div><!-- /.row -->
      </div><!-- /.container-fluid -->
    </div>
    <!-- /.content-header -->

    <!-- Main content -->
    <section class="m-0 row justify-content-center">
        <div class="col-sm-12">
            <div class="alert alert-primary" role="alert">
                Proyecto actualizado con éxito!                
            </div>            
        </div>
        <div class="col-sm-3">    
            <a href="listaDeProyectos.php" class="btn btn-dark" role="button">Aceptar</a>     
        </div>          
    </section>
    <!-- /.content -->
  </div>
  <!-- /.content-wrapper -->
 
<?php include_once "footer.php"; ?>


