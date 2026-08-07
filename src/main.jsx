import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { useStore } from './store'
import './index.css'
import '@xyflow/react/dist/style.css'

// expose the store for automated tests / debugging
if (typeof window !== 'undefined') window.__ft = useStore

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
