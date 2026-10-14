import {Navigate,Route,Routes} from 'react-router-dom'
import {LoginPage} from './pages/LoginPage'
import {Workspace} from './pages/Workspace'
import {Brand} from './components/Brand'
import {useAuth} from './features/auth/authContext'
import type {Preferences} from './types/chat'
export interface Profile{id:string;username:string;display_name:string;avatar_path:string|null;status_text:string;last_seen:string|null;preferences?:Preferences}
export function App(){
 const auth=useAuth();const preview=import.meta.env.DEV&&new URLSearchParams(window.location.search).get('preview')==='design'
 if(auth.isLoading&&!preview)return <main className="initializing"><Brand/><span className="loading-bar"/><p>Opening your space…</p></main>
 const workspace=auth.isAuthenticated||preview?<Workspace profile={auth.profile} preview={preview} onLogout={auth.logout}/>:<Navigate to="/login" replace/>
 return <Routes><Route path="/login" element={auth.isAuthenticated?<Navigate to="/chat" replace/>:<LoginPage onLogin={auth.login} notice={auth.error}/>}/><Route path="/chat" element={workspace}/><Route path="/settings" element={workspace}/><Route path="*" element={<Navigate to={auth.isAuthenticated||preview?'/chat':'/login'} replace/>}/></Routes>
}
