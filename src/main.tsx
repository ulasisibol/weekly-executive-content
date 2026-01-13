import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Providers } from '@microsoft/mgt-element';
import { Msal2Provider } from '@microsoft/mgt-msal2-provider';
import App from './App.tsx';
import './index.css';

// Microsoft Graph API Authentication Kurulumu
Providers.globalProvider = new Msal2Provider({
  clientId: '04f1fef3-9f97-4f42-9a27-f2f0f18329a4',
  authority: 'https://login.microsoftonline.com/2dfe2a58-f11c-46ba-acb0-8606046a17ed',
  redirectUri: window.location.origin,
  scopes: [
    'Sites.ReadWrite.All',
    'Files.ReadWrite.All',
    'User.Read'
  ]
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
