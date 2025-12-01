# 🎨 EER Studio

[![Live demo](https://img.shields.io/badge/Live%20Demo-View-blue?logo=github)](https://davidbuenov.github.io/eer-studio/)

**Editor de Diagramas Entidad-Relación Extendido (EER) con Edición Bidireccional**

EER Studio es una aplicación web interactiva para crear y editar diagramas Entidad-Relación Extendido mediante un lenguaje específico de dominio (DSL) simple e intuitivo. Los cambios en el código se reflejan automáticamente en el diagrama visual, y viceversa: ¡arrastra los nodos y el código se actualiza con las nuevas coordenadas!

## ✨ Características

- 📝 **Editor de código DSL** con sintaxis simple para definir entidades, relaciones y atributos
- 🎯 **Visualización en tiempo real** del diagrama EER
- 🔄 **Edición bidireccional**: arrastra nodos en el canvas y el código se actualiza automáticamente
- 💾 **Guardar/Abrir archivos `.eer`** con File System Access API (navegadores modernos) y fallback compatible
- 🤖 **Prompt integrado para IA** - genera código EER usando ChatGPT, Claude o Gemini
- 📤 **Exportar a SVG** - descarga tus diagramas en formato vectorial
- 🎨 **Interfaz moderna** diseñada con Tailwind CSS
- 📚 **Guía de sintaxis integrada** con ejemplos y referencia completa
- 🔍 **Zoom y paneo** para trabajar con diagramas grandes
- 🌐 **Compatible con navegadores modernos**

## 🌐 Demo en vivo y ejemplos

Puedes probar la aplicación ya desplegada en GitHub Pages:

https://davidbuenov.github.io/eer-studio/

Además, el repositorio incluye una carpeta `examples/` con varios ficheros de ejemplo con extensión `.eer` que puedes abrir directamente en la app (File → Open) para ver diagramas de muestra y editar.

## 🚀 Características EER Soportadas

- ✅ Entidades fuertes y débiles
- ✅ Relaciones normales e identificativas
- ✅ Atributos: simples, clave, derivados y multivaluados
- ✅ Cardinalidades (1, N, M) y participación total
- ✅ Jerarquías de especialización/generalización (disjuntas y solapadas)
- ✅ Uniones/Categorías
- ✅ Posicionamiento manual con coordenadas persistentes

## 📦 Instalación

### Prerrequisitos

- [Node.js](https://nodejs.org/) (versión 18 o superior)
- npm (incluido con Node.js)

### Pasos

1. **Clona el repositorio:**

```bash
git clone https://github.com/davidbuenov/eer-studio.git
cd eer-studio
```

2. **Instala las dependencias:**

```bash
npm install
```

3. **Inicia el servidor de desarrollo:**

```bash
npm run dev
```

4. **Abre tu navegador:**

Navega a [http://localhost:5173](http://localhost:5173) (o el puerto que muestre la terminal)

## 🏗️ Build para Producción

Para generar una versión optimizada para producción:

```bash
npm run build
```

Los archivos generados estarán en la carpeta `dist/`. Puedes servirlos con cualquier servidor web estático.

Para previsualizar el build:

```bash
npm run preview
## 🌍 Publicación en GitHub Pages

Este proyecto está preparado para desplegarse automáticamente en **GitHub Pages** usando una *GitHub Action* incluida en `.github/workflows/deploy-pages.yml`.

### Cómo funciona

1. Cada push a la rama `main` ejecuta la acción.
2. Se hace build con `npm run build` (base configurada en `vite.config.ts` como `/eer-studio/`).
3. El contenido de `dist/` se publica en GitHub Pages.
4. La URL final será: `https://davidbuenov.github.io/eer-studio/`.

### Activar GitHub Pages

1. Ve a Settings → Pages en el repositorio.
2. Verifica que la fuente (source) esté en "GitHub Actions" (debería aparecer automáticamente tras el primer deploy).

### Personalizar dominio (Opcional)

Si quieres usar un dominio propio:
1. Crea un archivo `CNAME` dentro de `dist/` en tiempo de build (puedes añadir un paso en la acción o un script).
2. Apunta tu DNS (registro CNAME) al dominio `davidbuenov.github.io`.

Ejemplo de paso adicional en el workflow:

```yaml
			- name: Add CNAME
				run: echo "mi-dominio.com" > dist/CNAME
```

### Deploy manual (alternativa)

Si prefieres hacerlo manual sin Actions:
```bash
npm run build
git checkout --orphan gh-pages
git --work-tree dist add --all
git --work-tree dist commit -m "Deploy"
git push origin gh-pages --force
git checkout main
```

## 🔐 Seguridad

Este proyecto no envía datos a servidores externos. Los archivos `.eer` solo se manejan localmente en tu navegador. Usa navegadores modernos para aprovechar la File System Access API.

```

## 📖 Uso

### Sintaxis Básica del DSL

```javascript
// Entidades
ent EMPLEADO (400, 300)
ent DEPARTAMENTO (700, 300)
weak_ent DEPENDIENTE (100, 300)

// Atributos
key_att DNI -> EMPLEADO (350, 220)
att Nombre -> EMPLEADO (450, 220)
derived_att Edad -> EMPLEADO (400, 180)
multivalued_att Telefono -> EMPLEADO (300, 250)

// Relaciones
rel TRABAJA_EN (550, 300)
link EMPLEADO TRABAJA_EN "N" [total]
link DEPARTAMENTO TRABAJA_EN "1"

// Relación Identificativa
ident_rel TIENE_DEP (250, 300)
link EMPLEADO TIENE_DEP "1"
link DEPENDIENTE TIENE_DEP "N" [total]

// Jerarquías
spec d -> EMPLEADO (400, 420)
ent SECRETARIA (280, 550)
ent INGENIERO (520, 550)
link d SECRETARIA
link d INGENIERO
```

### Generación con IA

1. Haz clic en **"Prompt para tu IA"** en la barra superior
2. Copia el prompt proporcionado
3. Pégalo en ChatGPT, Claude, Gemini u otra IA
4. Describe tu problema de base de datos
5. Copia el código generado
6. Pégalo en el editor de EER Studio

### Guardar y Abrir Archivos

- **File → Open**: Abre un archivo `.eer` existente
- **File → Save**: Guarda en el archivo actual (o solicita ubicación si es nuevo)
- **File → Save as**: Guarda con un nuevo nombre/ubicación

## 🛠️ Tecnologías

- **React 19** - Framework UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Estilos
- **Lucide React** - Iconos
- **File System Access API** - Gestión de archivos

## 📝 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Genera el build de producción
- `npm run preview` - Previsualiza el build de producción
- `npm run lint` - Ejecuta el linter

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👨‍💻 Autor

**David Bueno Vallejo**
- Website: [davidbuenov.com](https://davidbuenov.com/)
- GitHub: [@davidbuenov](https://github.com/davidbuenov)

## 🙏 Agradecimientos

Este proyecto fue desarrollado con la asistencia de:
- **Gemini** - Google AI
- **GitHub Copilot** - AI pair programmer

---

⭐ Si te resulta útil este proyecto, ¡dale una estrella en GitHub!
