<?php
        include_once "header.php";
        include_once "navbar.php";

    $mysqli = include_once "conexion.php";

    $idEstado = $_GET["idEstado"];
    $sentencia = $mysqli->prepare("SELECT * FROM estados WHERE idEstado = ?");
    $sentencia->bind_param("i", $idEstado);
    $sentencia->execute();
    $resultado = $sentencia->get_result();

    # Obtenemos solo una fila, que será el estado a editar
    $estado = $resultado->fetch_assoc();
    if (!$estado) { 
    exit("No hay resultados para ese ID");
    }
?>
  <!-- Content Wrapper. Contains page content -->
    <div class="content-wrapper">
        <!-- Content Header (Page header) -->
        <div class="content-header">
            <div class="container-fluid">
                <div class="row mb-2">
                    <div class="col-sm-6">
                        <h1 class="m-0">Actualizar Estado</h1>
                    </div><!-- /.col -->

                </div><!-- /.row -->
            </div><!-- /.container-fluid -->
        </div>
        <!-- /.content-header -->

            <!-- Main content -->
        <section class="content">

            <!-- Button trigger modal -->
            <div class="col-12">
                <div class="row align-items-start">
                    <form action="actualizarEstados.php" method="POST">
                        <input type="hidden" name="idEstado" value="<?php echo $estado["idEstado"] ?>">
                        <div class="form-group">
                            <label for="estado">Estado</label>
                            <input value="<?php echo $estado["estado"] ?>" placeholder="Estado" class="form-control" type="text" name="estado" id="estado" required>
                        </div>
                        
                        <div class="form-group">
                            <button class="btn btn-primary">Actualizar</button>
                            <a class="btn btn-secondary" href="listarEstados.php">Volver</a>
                        </div>
                    </form>
                </div>
            </div>  
        </section>
    <!-- /.content -->
  </div>
  <!-- /.content-wrapper -->
<?php include_once "footer.php"; ?>