<?php include_once "header.php"; 

  $mysqli = include_once "conexion.php";

 include_once "navbar.php"; ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1 class="m-0">Conteo de Herramientas</h1>
          </div><!-- /.col -->

        </div><!-- /.row -->
      </div><!-- /.container-fluid -->
    </div>
    <!-- /.content-header -->

    <!-- Main content -->
    <section class="m-0 row justify-content-center">
        <div class="col-sm-12">
            <div class="alert alert-primary" role="alert">
                No hay datos que mostrar         
            </div>          
        </div>
        <div class="col-sm-3">    
            <a href="default.php" class="btn btn-primary" role="button" autofocus>Aceptar</a>
        </div>         
    </section>
    <!-- /.content -->
  </div>
  <!-- /.content-wrapper -->

<?php include_once "footer.php"; ?>


