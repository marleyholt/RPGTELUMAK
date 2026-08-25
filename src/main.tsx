import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import './index.css';

import firebaseConfigLocal from '../firebase-applet-config.json';
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || firebaseConfigLocal.oAuthClientId || '80100152503-o4al8geedo0jhm8hfjq5h36it3e3muve.apps.googleusercontent.com';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {clientId ? (
      <GoogleOAuthProvider clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);
