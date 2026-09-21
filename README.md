# PokéApp — PokéAPI

## Descripción

Mini aplicación web interactiva que permite buscar y explorar Pokémon utilizando
los datos oficiales de la [PokéAPI](https://pokeapi.co). Al abrir la página se
muestran los 10 primeros Pokémon y, mediante un campo de búsqueda, se puede
consultar cualquier Pokémon por su nombre. Cada resultado muestra la imagen, el
nombre y los tipos del Pokémon, todo renderizado dinámicamente desde JavaScript.

## Tecnologías

* HTML5
* CSS3
* JavaScript (ES6+)
* PokéAPI

## Funcionalidades

* Carga inicial de al menos 12 Pokémon con imagen, nombre y tipos.
* Búsqueda de Pokémon por nombre (ignora espacios y mayúsculas/minúsculas).
* Sugerencias de búsqueda: al escribir se muestran nombres que coinciden
  (incluye formas alternas como `sandshrew-alola` o `pikachu-gmax`).
* Búsqueda ejecutable con el botón "Buscar" o presionando `Enter`.
* Mensajes de error amigables para búsquedas vacías, Pokémon inexistentes y
  errores de conexión.
* Estado de carga con indicador visual mientras se consulta la API.
* Diseño responsive (escritorio, tablet y móvil).
* Tipos mostrados como insignias con colores según el tipo.
* Generación de cada Pokémon mostrada en la tarjeta (ej. "Gen I").
* Insignia "Legendario" en los Pokémon legendarios.
* Nivel de poder (suma de las 6 estadísticas base).
* Las 6 estadísticas base (PS, Ataque, Defensa, At. Esp., Def. Esp., Velocidad).
* Carga inicial con Pokémon aleatorios.
* Elegir la cantidad de Pokémon a mostrar al inicio (1–1351, incluye formas
  alternas). El botón "Cargar" recarga la lista con esa cantidad y limpia la
  búsqueda (integra el comportamiento del antiguo botón "Mostrar todos").
* Toggle "Mostrar evoluciones" que muestra la línea evolutiva como mini
  tarjetas una al lado de la otra, con flechas indicando la dirección.
* Toggle "Mostrar estadísticas" que muestra u oculta el poder total y las 6
  estadísticas base de cada tarjeta.
* Filtro por tipo para mostrar solo los Pokémon de un tipo de la muestra cargada.
* Filtro por generación (I–IX) para mostrar solo los Pokémon de una generación
  de la muestra cargada.
* Contador de Pokémon mostrados.
* Animación de aparición de las tarjetas.

## API utilizada

Se consume la [PokéAPI](https://pokeapi.co), una API REST pública y gratuita de
Pokémon. La documentación oficial está disponible en
<https://pokeapi.co/docs/v2>.

Endpoints usados:

* `GET https://pokeapi.co/api/v2/pokemon?limit=10` → lista inicial.
* `GET https://pokeapi.co/api/v2/pokemon/{id}` → detalles (imagen y tipos).
* `GET https://pokeapi.co/api/v2/pokemon/{name}` → búsqueda por nombre.
* `GET https://pokeapi.co/api/v2/pokemon-species/{id}` → especie (generación, etc.).
* `GET https://pokeapi.co/api/v2/evolution-chain/{id}` → línea evolutiva.

## Ejecución

Al ser una página web estática, no requiere instalación de dependencias ni
servidor. Basta con:

1. Descargar o clonar el proyecto.
2. Abrir el archivo `index.html` en un navegador web moderno.

Opcionalmente, se puede servir con cualquier servidor estático sencillo, por
ejemplo:

```bash
python3 -m http.server
```

y luego abrir `http://localhost:8000`.

## Estructura del proyecto

```text
/
├── index.html          # Estructura HTML de la aplicación
├── css/
│   └── styles.css      # Estilos y diseño responsive
├── js/
│   └── app.js          # Lógica: consumo de la API y renderizado
└── README.md
```

## Manejo de errores

* **Búsqueda vacía**: si el campo está vacío (o solo contiene espacios), se
  muestra el mensaje "Por favor, ingresa el nombre de un Pokémon.".
* **Pokémon inexistente**: si la API responde con un error 404, se muestra
  "No encontramos ese Pokémon. Verifica el nombre e inténtalo nuevamente.".
* **Errores de red**: si no es posible conectarse, se muestra "No fue posible
  conectarse con PokéAPI. Intenta nuevamente.".
* **Errores inesperados**: toda la lógica asíncrona está envuelta en bloques
  `try/catch`. Los detalles técnicos se registran con `console.error()` y nunca
  se muestran al usuario, evitando romper la interfaz.

## Características adicionales

* **Insignias de tipo con colores**: cada tipo se muestra con un color
  representativo (fuego, agua, eléctrico, planta, etc.).
* **Contador de resultados**: indica cuántos Pokémon se están mostrando.
* **Animación de aparición**: las tarjetas aparecen con una transición suave.
* **Bloqueo de búsquedas simultáneas**: evita ejecutar varias peticiones a la
  vez para mantener la interfaz consistente.

## Atribución y aviso legal

* Los datos se obtienen de [PokéAPI](https://pokeapi.co).
* Pokémon y todos los nombres, imágenes y personajes relacionados son marcas y
  propiedad de Nintendo / Game Freak / The Pokémon Company.
* Este proyecto es **educativo y sin fines comerciales**; no está afiliado,
  respaldado ni aprobado por Nintendo, Game Freak o The Pokémon Company.
