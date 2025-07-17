<?php
// Mostrar errores
error_reporting(E_ALL);
ini_set('display_errors', 1);

include_once "header.php";
include_once "navbar.php";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $mysqli = include_once "conexion.php";
    $bodeguero = $mysqli->real_escape_string($_POST['bodeguero']);
    $bodeguero = strtoupper($bodeguero);

    $query = "INSERT INTO bodegueros (bodeguero) VALUES ('$bodeguero')";
    if ($mysqli->query($query)) {
        echo "<script>alert('Bodeguero agregado exitosamente'); window.location.href='ListarBodegueros.php';</script>";
    } else {
        echo "<script>alert('Error al agregar el bodeguero');</script>";
    }
}
?>

<div class="content-wrapper">
    <div class="content-header">
        <div class="container-fluid">
            <h1 class="m-0">Agregar Nuevo Bodeguero</h1>
        </div>
    </div>
    <section class="content">
        <form method="POST">
            <div class="form-group">
                <label for="bodeguero">Nombre del Bodeguero</label>
                <input type="text" name="bodeguero" id="bodeguero" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="telefono">Teléfono</label>
                <input type="text" name="telefono" id="telefono" class="form-control" >
            </div>
           
            <button type="submit" class="btn btn-primary">Guardar</button>
            <a href="ListarBodegueros.php" class="btn btn-secondary">Cancelar</a>
        </form>
    </section>
</div>
<?php include_once "footer.php"; ?>
