/**
 * Renderer entry point. Runs inside the window with no Node.js access.
 * Mounts the React application into <div id="root"> from index.html.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@app/App';
import '@styles/index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('VoxelRoom: #root element is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
