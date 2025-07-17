<?php 

include_once "header.php"; 
include_once "navbar.php";

  $mysqli = include_once "conexion.php";

 ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1 class="m-0">Ordenes de Compra</h1>
          </div><!-- /.col -->
        </div><!-- /.row -->
      </div><!-- /.container-fluid -->
    </div>
    <!-- /.content-header -->

    <!-- Main content -->
    <section class="m-0 row justify-content-center">
        <div class="col-sm-12">
            <div class="alert alert-primary" role="alert">
                Acta y pago ingresados con éxito!                
            </div>            
        </div>
        <div class="col-sm-3">    
            <a href="pagosOca.php" class="btn btn-dark" role="button">Aceptar</a>     
        </div>          
    </section>
    <!-- /.content -->
  </div>
  <!-- /.content-wrapper -->
 
<?php include_once "footer.php"; ?>


