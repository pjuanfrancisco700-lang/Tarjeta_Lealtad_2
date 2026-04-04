# Tarjeta de Lealtad - estructura profesional

## Estructura
- `index.html`: estructura de la app
- `css/styles.css`: estilos visuales
- `js/config.js`: configuración editable
- `js/app.js`: lógica y conexión con Apps Script
- `assets/logo.svg`: logo editable

## Qué editar normalmente
### Cambiar logo
Reemplaza `assets/logo.svg` por tu logo o cambia la ruta en `js/config.js`.

### Cambiar nombre del negocio
En `js/config.js` cambia:
```js
negocio: 'Café Urbano'
```

### Cambiar URL de Apps Script
En `js/config.js` cambia:
```js
apiUrl: 'TU_URL_AQUI'
```

### Cambiar meta de puntos o recompensa
También en `js/config.js`:
```js
metaPuntos: 10,
recompensa: 'Café gratis'
```

## Subida a GitHub Pages
Sube todo el contenido de esta carpeta respetando la estructura.
