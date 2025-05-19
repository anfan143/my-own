import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster 
      position="top-right"
      containerStyle={{
        top: '4rem', // Add margin from the top to position below the navigation bar
      }}
    />
  </StrictMode>
);