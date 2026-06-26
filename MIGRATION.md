# Guía de Migración: TypeScript, Tailwind CSS y shadcn/ui

Esta guía detalla los pasos recomendados para migrar este proyecto Vite a una arquitectura moderna basada en **TypeScript**, **Tailwind CSS** y **shadcn/ui**.

---

## 1. Migración a TypeScript

Para dotar al proyecto de tipado estático seguro, sigue estos pasos:

### 1.1 Instalar dependencias de TypeScript
Ejecuta en tu terminal:
```bash
npm install -D typescript @types/react @types/react-dom @vitejs/plugin-react
```

### 1.2 Configurar `tsconfig.json` y `tsconfig.app.json`
Crea el archivo `tsconfig.json` en la raíz del proyecto para definir la configuración global de compilación:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Crea `tsconfig.app.json` para definir las reglas de tu código cliente:
```json
{
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Paths */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### 1.3 Renombrar archivos
Cambia la extensión de tus archivos principales de JS a TS/TSX:
- `src/main.jsx` -> `src/main.tsx`
- `src/App.jsx` -> `src/App.tsx`
- Actualiza la referencia del script en tu `index.html`:
  ```html
  <script type="module" src="/src/main.tsx"></script>
  ```

---

## 2. Configuración de Tailwind CSS (Versión 4.0)

Tailwind v4 simplifica enormemente la configuración eliminando el archivo `tailwind.config.js` y basando todo en directivas CSS dentro de tu archivo de estilos principal.

### 2.1 Instalar Tailwind v4 y dependencias
Instala los paquetes necesarios:
```bash
npm install tailwindcss @tailwindcss/vite
```

### 2.2 Configurar Vite
Actualiza tu `vite.config.js` para registrar el plugin de Tailwind:
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
```

### 2.3 Importar Tailwind en tu CSS
Reemplaza el inicio de tu `src/index.css` con las directivas de importación de Tailwind:
```css
@import "tailwindcss";
```

---

## 3. Configuración de shadcn/ui con shadcn CLI

shadcn/ui no es una biblioteca de componentes tradicional que instalas mediante NPM, sino un sistema que inyecta el código fuente de los componentes directamente en tu proyecto para darte control absoluto.

### 3.1 Inicializar shadcn CLI
Ejecuta el asistente interactivo:
```bash
npx shadcn@latest init
```

Durante el asistente, responde a las preguntas configurando las siguientes rutas por defecto:
- **TypeScript**: Yes
- **Style style**: Default
- **Base color**: Slate / Neutral
- **Global CSS file**: `src/index.css`
- **CSS variables for colors**: Yes
- **Tailwind CSS config**: (Detectado automáticamente por Vite plugin en v4)
- **Import alias for components**: `@/components`
- **Import alias for utils**: `@/lib/utils`

### 3.2 ¿Por qué es crucial crear e integrar componentes en `/components/ui`?

El CLI de shadcn instala por defecto los elementos de bajo nivel en el directorio `src/components/ui/` (por ejemplo, `button.tsx`, `dialog.tsx`, `navigation-menu.tsx`). Es de vital importancia respetar esta separación por las siguientes razones:

1. **Separación de Concernimientos (Separation of Concerns)**:
   - **`/components/ui/`**: Aloja exclusivamente primitivos puros de presentación y comportamiento genérico (botones, modales, menús de navegación, acordeones). Estos componentes no deben contener lógica de negocio ni peticiones a bases de datos o APIs de la aplicación.
   - **`/components/` (directorio raíz)**: Aloja componentes de alto nivel específicos de la aplicación (ej. `Header.tsx`, `Sidebar.tsx`, `TeamMemberCard.tsx`) que importan los primitivos de `ui/` e implementan la lógica de negocio.
2. **Compatibilidad con shadcn CLI**:
   El CLI de shadcn asume que los componentes primitivos están en `/components/ui`. Si instala un nuevo componente usando el CLI (ej. `npx shadcn@latest add dialog`), el comando creará y actualizará automáticamente los archivos en esta carpeta. Si no existe, podrías terminar con código duplicado o rutas de importación rotas.
3. **Mantenibilidad a largo plazo**:
   Si necesitas personalizar visualmente un componente de shadcn para adaptarlo a la identidad de tu empresa, editas el archivo local dentro de `/components/ui/` directamente. Mantenerlos aislados evita modificar accidentalmente lógica de negocio.

---

## 4. Estructura de Carpetas Sugerida Post-Migración

Una vez completada la migración, la estructura limpia del proyecto será:

```text
/root
├── src/
│   ├── assets/              # Logos, imágenes estáticas
│   ├── components/          # Componentes de UI con lógica de negocio
│   │   └── ui/              # Componentes base puros de shadcn (Button, Dialog, Accordion, etc.)
│   ├── data/                # Mock data o definiciones estáticas
│   ├── lib/
│   │   └── utils.ts         # Funciones de utilidad de clases (cn)
│   ├── App.tsx              # Componente principal
│   ├── main.tsx             # Punto de entrada de React
│   └── index.css            # Estilos CSS globales y directivas de Tailwind
├── tsconfig.json            # Configuraciones de compilación de TypeScript
├── vite.config.ts           # Configuración de Vite con aliases de paths
└── package.json             # Dependencias del proyecto
```
