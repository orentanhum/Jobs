import { useState } from 'react'
import { BriefcaseBusiness,LogIn,UserPlus } from 'lucide-react'
import { supabase } from './supabase'

export default function AuthPage(){
  const [mode,setMode]=useState<'signin'|'signup'>('signin')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [name,setName]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setMessage('')
    if(mode==='signin'){
      const {error}=await supabase.auth.signInWithPassword({email,password})
      if(error)setMessage(error.message)
    }else{
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name},emailRedirectTo:window.location.origin}})
      if(error)setMessage(error.message)
      else if(!data.session)setMessage('Account created. Check your email to confirm your account, then sign in.')
      else setMessage('Account created successfully.')
    }
    setBusy(false)
  }
  return <div className="min-h-[100dvh] bg-slate-100 px-4 py-6 sm:grid sm:place-items-center">
    <div className="mx-auto w-full max-w-sm rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <BriefcaseBusiness className="mx-auto text-indigo-600" size={40}/>
      <h1 className="mt-2 text-center text-2xl font-bold">JobTrack</h1>
      <p className="mt-1 text-center text-sm text-slate-500">Your private job search workspace</p>
      <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        <button type="button" onClick={()=>{setMode('signin');setMessage('')}} className={`rounded-lg px-3 py-2.5 text-sm font-bold ${mode==='signin'?'bg-white text-indigo-700 shadow-sm':'text-slate-500'}`}><LogIn className="mr-1 inline" size={15}/>Sign in</button>
        <button type="button" onClick={()=>{setMode('signup');setMessage('')}} className={`rounded-lg px-3 py-2.5 text-sm font-bold ${mode==='signup'?'bg-white text-indigo-700 shadow-sm':'text-slate-500'}`}><UserPlus className="mr-1 inline" size={15}/>Create account</button>
      </div>
      <form onSubmit={submit} className="mt-4">
        {mode==='signup'&&<input required autoComplete="name" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} className="mb-3 w-full rounded-xl border p-3 text-base"/>}
        <input required type="email" inputMode="email" autoCapitalize="none" autoComplete="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-xl border p-3 text-base"/>
        <input required minLength={6} type="password" autoComplete={mode==='signin'?'current-password':'new-password'} placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-3 w-full rounded-xl border p-3 text-base"/>
        {message&&<div className={`mt-3 rounded-lg p-3 text-sm ${message.toLowerCase().includes('created')?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600'}`}>{message}</div>}
        <button disabled={busy} className="mt-4 w-full rounded-xl bg-indigo-600 p-3 text-base font-bold text-white disabled:opacity-60">{busy?'Please wait…':mode==='signin'?'Sign in':'Create my account'}</button>
      </form>
      {mode==='signup'&&<p className="mt-3 text-center text-xs leading-5 text-slate-500">Your jobs, profile and CV are private to your account.</p>}
    </div>
  </div>
}
