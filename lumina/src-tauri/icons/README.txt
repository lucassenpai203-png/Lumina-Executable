ICONOS DE LÚMINA
================

Para generar los iconos automáticamente, ejecuta desde la carpeta lumina/:

  pnpm tauri icon <ruta-a-tu-imagen.png>

La imagen fuente debe ser al menos 512x512 píxeles, formato PNG.
Tauri generará automáticamente todos los tamaños necesarios:
- 32x32.png
- 128x128.png  
- 128x128@2x.png
- icon.icns (macOS)
- icon.ico (Windows)

Hasta que tengas tu imagen personalizada, puedes usar cualquier 
imagen PNG de 512x512 como punto de partida.
