import React,{useEffect,useState} from 'react'
import ReactDOM from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import App from './App.tsx'
import AuthPage from './AuthPage.tsx'
import { supabase } from './supabase'
import './index.css'

function Root(){
  const [session,setSession]=useState<Session|null>(null)
  const [ready,setReady]=useState(false)
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)})
    const {data}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setReady(true)})
    return()=>data.subscription.unsubscribe()
  },[])
  if(!ready)return <div className="grid min-h-[100dvh] place-items-center bg-slate-100 text-sm text-slate-500">Loading JobTrack…</div>
  return session?<App/>:<AuthPage/>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Root/></React.StrictMode>,
)
