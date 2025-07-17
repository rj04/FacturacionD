<?php
// Mostrar errores
error_reporting(E_ALL);
ini_set('display_errors', 1);

include_once "header.php";
include_once "navbar.php";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $mysqli = include_once "conexion.php";
    $residente = $mysqli->real_escape_string($_POST['residente']);
    $residente = strtoupper($residente);

    $query = "INSERT INTO residentes (residente) VALUES ('$residente')";
    if ($mysqli->query($query)) {
        echo "<script>alert('Residente agregado exitosamente'); window.location.href='ListarResidentes.php';</script>";
    } else {
        echo "<script>alert('Error al agregar el residente');</script>";
    }
}
?>

<div class="content-wrapper">
    <div class="content-header">
        <div class="container-fluid">
            <h1 class="m-0">Agregar Nuevo Residente</h1>
        </div>
    </div>
    <section class="content">
        <form method="POST">
            <div class="form-group">
                <label for="residente">Nombre del Residente</label>
                <input type="text" name="residente" id="residente" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="telefono">Teléfono</label>
                <input type="text" name="telefono" id="telefono" class="form-control" >
            </div>
           
            <button type="submit" class="btn btn-primary">Guardar</button>
            <a href="ListarResidentes.php" class="btn btn-secondary">Cancelar</a>
        </form>
    </section>
</div>
<?php include_once "footer.php"; ?>
