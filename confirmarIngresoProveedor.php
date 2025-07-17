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
            <h1 class="m-0">Ingreso de Proveedores</h1>
          </div><!-- /.col -->

        </div><!-- /.row -->
      </div><!-- /.container-fluid -->
    </div>
    <!-- /.content-header -->

    <!-- Main content -->
    <section class="m-0 row justify-content-center">
        <div class="col-sm-12">
            <div class="alert alert-primary" role="alert">
                Proveedor ingresado con éxito!                
                <br>
                Agregar otro Proveedor?                
            </div>          
        </div>
        <div class="col-sm-3">    
            <a href="registrarProveedor.php" class="btn btn-primary" role="button" autofocus>Si</a>
            <a href="default.php" class="btn btn-dark" role="button">No</a>     
        </div>         
    </section>
    <!-- /.content -->
  </div>
  <!-- /.content-wrapper -->

  <script>
        // Agregar manejador de eventos para las teclas de flecha
        document.addEventListener('keydown', function(event) {
            const activeElement = document.activeElement;
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                if (activeElement.classList.contains('btn')) {
                    const buttons = Array.from(document.querySelectorAll('.btn'));
                    let index = buttons.indexOf(activeElement);
                    if (event.key === 'ArrowRight') {
                        index = (index + 1) % buttons.length;
                    } else if (event.key === 'ArrowLeft') {
                        index = (index - 1 + buttons.length) % buttons.length;
                    }
                    buttons[index].focus();
                }
            }
        });
    </script>
 
<?php include_once "footer.php"; ?>


