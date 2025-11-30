import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { WalletProvider } from './contexts/WalletContext'
import { PhotonProvider } from './contexts/PhotonContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <WalletProvider>
          <PhotonProvider>
            <App />
          </PhotonProvider>
        </WalletProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
