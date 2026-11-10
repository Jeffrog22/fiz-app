import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { limparDadosLocaisTenantBloqueado } from './utils/tenant';

// Aplica o zoom de acessibilidade salvo antes de montar o React, para que
// o tamanho da fonte esteja correto desde o primeiro paint (evita flash/
// ajuste visual no mobile ao abrir o app e ao navegar entre telas).
const savedZoom = localStorage.getItem('app_zoom');
if (savedZoom) {
  document.documentElement.style.fontSize = `${savedZoom}%`;
}

limparDadosLocaisTenantBloqueado();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
