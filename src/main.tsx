// Punto de entrada de toda la app: acá React "engancha" nuestros
// componentes al HTML real (el <div id="root"> de index.html).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// BrowserRouter habilita el ruteo del lado del cliente (cambiar de
// "página" sin recargar). Lo ponemos en la raíz para que TODA la app
// pueda usar <Link>, <Route>, useNavigate, etc.
import { BrowserRouter } from 'react-router-dom'
import './index.css'           // estilos globales (variables, tipografías, botones)
import App from './App.tsx'

// createRoot toma el nodo del DOM donde se va a montar la app.
// El "!" le dice a TypeScript "confiá, este getElementById no es null"
// (sabemos que el div#root existe en index.html).
createRoot(document.getElementById('root')!).render(
  // StrictMode: ayuda de desarrollo. Detecta efectos mal escritos
  // ejecutándolos dos veces. No afecta la build de producción.
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
