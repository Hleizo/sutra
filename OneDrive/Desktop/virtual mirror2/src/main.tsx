import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('main.tsx loaded');
console.log('Root element:', document.getElementById('root'));

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('React app rendered');
} catch (error) {
  console.error('Failed to render app:', error);
}
