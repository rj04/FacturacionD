import cv2
import numpy as np
import sys
import os

def align_images(image_path1, image_path2, output_path):
    try:
        # Cargar imágenes
        img1 = cv2.imread(image_path1)
        img2 = cv2.imread(image_path2)

        if img1 is None:
            return f"ERROR: No se pudo cargar la imagen de referencia: {image_path1}"
        if img2 is None:
            return f"ERROR: No se pudo cargar la imagen a alinear: {image_path2}"

        # Redimensionar segunda imagen al tamaño de la primera
        height, width = img1.shape[:2]
        img2_resized = cv2.resize(img2, (width, height))

        # Convertir a escala de grises
        gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(img2_resized, cv2.COLOR_BGR2GRAY)

        # Detectar características con ORB
        orb = cv2.ORB_create(500) # Puedes ajustar el número de características
        kp1, des1 = orb.detectAndCompute(gray1, None)
        kp2, des2 = orb.detectAndCompute(gray2, None)

        if des1 is None or des2 is None or len(kp1) < 2 or len(kp2) < 2:
             return "ERROR: No se detectaron suficientes características en una o ambas imágenes."

        # Emparejar características
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des1, des2)
        matches = sorted(matches, key=lambda x: x.distance)

        MIN_MATCH_COUNT = 10
        if len(matches) < MIN_MATCH_COUNT:
            return f"ERROR: No hay suficientes coincidencias buenas - encontradas {len(matches)}, se necesitan {MIN_MATCH_COUNT}"

        # Obtener puntos de coincidencia (usar un número razonable de las mejores coincidencias)
        num_good_matches = min(50, len(matches))
        if num_good_matches < 4: # findHomography necesita al menos 4 puntos
            return f"ERROR: No hay suficientes coincidencias para calcular la homografía (se necesitan al menos 4, se obtuvieron {num_good_matches})."
        
        pts1 = np.float32([kp1[m.queryIdx].pt for m in matches[:num_good_matches]]).reshape(-1, 1, 2)
        pts2 = np.float32([kp2[m.trainIdx].pt for m in matches[:num_good_matches]]).reshape(-1, 1, 2)

        # Calcular homografía y alinear imagen
        matrix, mask = cv2.findHomography(pts2, pts1, cv2.RANSAC, 5.0)

        if matrix is None:
            return "ERROR: No se pudo calcular la matriz de homografía."

        aligned_img2 = cv2.warpPerspective(img2_resized, matrix, (width, height))

        # Guardar la imagen alineada
        cv2.imwrite(output_path, aligned_img2)
        return output_path # Devuelve la ruta de salida en caso de éxito

    except Exception as e:
        return f"ERROR: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Uso: python alinear_imagenes.py <ruta_imagen_referencia> <ruta_imagen_a_alinear> <ruta_salida_alineada>")
        sys.exit(1)

    ruta_img1_arg = sys.argv[1]
    ruta_img2_arg = sys.argv[2]
    ruta_salida_arg = sys.argv[3]

    result = align_images(ruta_img1_arg, ruta_img2_arg, ruta_salida_arg)
    print(result) # Imprime la ruta de salida o el mensaje de error
    if "ERROR:" in result:
        sys.exit(1)
    else:
        sys.exit(0)
