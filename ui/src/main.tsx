import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ChainProvider } from './chain/ChainProvider';
import { WalletProvider } from './chain/WalletContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ChainProvider>
        <WalletProvider>
          <App />
        </WalletProvider>
      </ChainProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
