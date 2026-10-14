import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import './styles.css'
import {AuthProvider} from './features/auth/AuthProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></React.StrictMode>)

if(import.meta.env.PROD&&'serviceWorker'in navigator){window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js').catch(()=>{window.dispatchEvent(new CustomEvent('nanba-error',{detail:'App installation support could not start. Browser use is still available.'}))})})}
