import {createContext,useContext} from 'react'
import type {Session,User} from '@supabase/supabase-js'
import type {Profile} from '../../App'
export interface AuthState{user:User|null;session:Session|null;profile:Profile|null;isLoading:boolean;isAuthenticated:boolean;error:string;login:(username:string,password:string)=>Promise<void>;logout:()=>Promise<void>;changePassword:(current:string,next:string)=>Promise<void>;refreshProfile:()=>Promise<void>}
export const AuthContext=createContext<AuthState|null>(null)
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('AuthProvider is missing.');return value}
