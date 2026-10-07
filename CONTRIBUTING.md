# Cómo colaborar

¡Gracias por querer mejorar el curso! Es gratuito y se mantiene entre todos.

## Antes de empezar
- ¿Encontraste un error o una explicación confusa? Abre un *issue* con la plantilla **Error** o **Duda**.
- ¿Tienes una idea? Usa la plantilla **Sugerencia**.
- Para cambios pequeños (erratas, enlaces, aclaraciones) puedes enviar directamente un *pull request*.

## Cómo está organizado
- `NN-tema/`, `css/`, `javascript/`, `react/`: una carpeta por lección con `index.html` (apuntes) y `ejercicio.html`.
- `assets/estilos.css` y `assets/curso.js`: estilos y comportamiento compartidos por todas las páginas.
- `assets/indice.json`: lista de lecciones del buscador (Ctrl+K).
- `sitemap.xml`: mapa del sitio.

## Reglas de las lecciones
1. Una sola etiqueta `<h1>` por página, con `lang="es"`, `<title>` y `meta description`.
2. Las imágenes llevan `alt` útil, y los ejemplos de código se escriben dentro de `<pre><code>`.
3. Todo debe verse bien en móvil y en escritorio, y funcionar con teclado.
4. Respeta `prefers-reduced-motion` en cualquier animación nueva.
5. El contenido debe ser correcto: si una explicación fue generada con ayuda de IA, verifícala con MDN antes de enviarla.

## Revisión automática
Antes de enviar tu cambio ejecuta:

```bash
python scripts/revisar.py            # enlaces, metadatos, sitemap e índice
python scripts/revisar.py --arreglar # regenera assets/indice.json
python -m http.server 8000           # probar en http://localhost:8000
```

Al añadir una lección, agrega también su URL a `sitemap.xml`. GitHub Actions repite esta revisión en cada *push* y *pull request*.

## Licencias
El código se publica bajo MIT (`LICENSE`) y el contenido bajo `LICENSE-CONTENIDO.md`. Al colaborar aceptas esas licencias.
