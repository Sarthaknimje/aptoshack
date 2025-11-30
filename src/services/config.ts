// Centralized backend URL configuration
export const getBackendUrl = () => {
  return import.meta.env.VITE_BACKEND_URL || 
         import.meta.env.REACT_APP_BACKEND_URL || 
         'http://localhost:5001'
}

export const API_BASE_URL = getBackendUrl()
export const BACKEND_URL = getBackendUrl()

