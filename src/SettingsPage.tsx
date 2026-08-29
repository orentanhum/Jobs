import { useEffect, useRef, useState } from 'react'
import { Save, Upload, FileText, UserRound, Target, Brain } from 'lucide-react'
import { supabase } from './supabase'

type Profile = {
  full_name?: string; email?: string; phone?: string; linkedin_url?: string; location?: string; current_title?: string;
  professional_summary?: string; target_roles?: string[]; preferred_locations?: string[]; work_modes?: string[]; seniority_levels?: string[]; keywords?: string[];
  preferred_companies?: string[]; excluded_companies?: string[]; excluded_keywords?: string[]; minimum_fit?: number; auto_discovery?: boolean;
  cv_file_name?: string; cv_storage_path?: string; cv_updated_at?: string; cv_analysis?: any; cv_analysis_updated_at?: string
}

const csv = (v?: string[]) => v?.join(', ') || ''
const arr = (v: string) => v.split(',').map(x => x.trim()).filter(Boolean)

export default function SettingsPage() {
  const [p, setP] = useState<Profile>({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const reloadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setP(data)
    return data
  }

  useEffect(() => { reloadProfile() }, [])

  const set = (k: keyof Profile, v: any) => setP(x => ({ ...x, [k]: v }))

  const save = async () => {
    setBusy(true); setMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMsg('Please sign in again.'); setBusy(false); return }
    const editable = {
      full_name:p.full_name??'', email:p.email??'', phone:p.phone??'', linkedin_url:p.linkedin_url??'', location:p.location??'', current_title:p.current_title??'',
      professional_summary:p.professional_summary??'', target_roles:p.target_roles??[], preferred_locations:p.preferred_locations??[], work_modes:p.work_modes??[], seniority_levels:p.seniority_levels??[],
      keywords:p.keywords??[], preferred_companies:p.preferred_companies??[], excluded_companies:p.excluded_companies??[], excluded_keywords:p.excluded_keywords??[],
      minimum_fit:p.minimum_fit??70, auto_discovery:p.auto_discovery??true, updated_at:new Date().toISOString()
    }
    const { error } = await supabase.from('profiles').update(editable).eq('id', user.id)
    setMsg(error ? `Save failed: ${error.message}` : 'Settings saved successfully')
    setBusy(false)
  }

  const analyze = async () => {
    setMsg('Running full CV verification and deep analysis… extracting profile, skills, roles, seniority, domains, experience and search data. Hebrew content will be normalized to English capabilities.')
    const { data, error } = await supabase.functions.invoke('analyze-cv')
    if (error) throw error
    if (!data?.ok) throw new Error(data?.error || 'Analysis failed')
    await reloadProfile()
    setMsg(`Full CV analysis completed · ${data.skills_count || 0} capabilities · ${data.roles_count || 0} target roles · ${data.keywords_count || 0} search terms saved.`)
    return data
  }

  const upload = async (f?: File) => {
    if (!f) return
    setMsg('')
    if (f.size > 10*1024*1024) { setMsg('CV must be smaller than 10 MB.'); return }
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!ext || !['pdf','doc','docx'].includes(ext)) { setMsg('Please choose a PDF or Word document.'); return }
    setBusy(true)
    try {
      const { data:{user}, error:userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Your session expired. Please sign in again.')
      const safe = f.name.replace(/[^a-zA-Z0-9._-]/g,'_')
      const path = `${user.id}/${Date.now()}-${safe}`
      const { error:uploadError } = await supabase.storage.from('cvs').upload(path,f,{cacheControl:'3600',upsert:false,contentType:f.type||undefined})
      if (uploadError) throw uploadError
      const { error:profileError } = await supabase.from('profiles').update({cv_file_name:f.name,cv_storage_path:path,cv_updated_at:new Date().toISOString(),cv_analysis:{},cv_analysis_updated_at:null,updated_at:new Date().toISOString()}).eq('id',user.id)
      if (profileError) { await supabase.storage.from('cvs').remove([path]); throw profileError }
      if (p.cv_storage_path && p.cv_storage_path !== path) await supabase.storage.from('cvs').remove([p.cv_storage_path])
      const now = new Date().toISOString()
      setP(x => ({...x,cv_file_name:f.name,cv_storage_path:path,cv_updated_at:now}))
      setMsg(`CV uploaded successfully: ${f.name}. Starting full verification and profile enrichment…`)
      await analyze()
    } catch(e:any) { setMsg(`Upload/analysis failed: ${e?.message || 'Unknown error'}`) }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value='' }
  }

  const field = (label:string,k:keyof Profile,placeholder='') => <label className="block"><span className="text-xs font-bold text-slate-600">{label}</span><input value={(p[k] as string)||''} onChange={e=>set(k,e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border p-2.5 text-sm"/></label>
  const list = (label:string,k:keyof Profile,placeholder:string) => <label className="block"><span className="text-xs font-bold text-slate-600">{label}</span><input dir="auto" value={csv(p[k] as string[])} onChange={e=>set(k,arr(e.target.value))} placeholder={placeholder} className="mt-1 w-full rounded-lg border p-2.5 text-sm"/><span className="text-[11px] text-slate-400">English and Hebrew supported · Separate with commas</span></label>
  const verified = p.cv_analysis?.verification

  return <div className="max-w-4xl">
    <div className="flex items-start gap-3"><div><h1 className="text-2xl font-bold">Settings</h1><p className="text-sm text-slate-500">Your profile drives private job tracking, discovery and matching. Job search terms can be entered in English or Hebrew.</p></div><button type="button" onClick={save} disabled={busy} className="ml-auto flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save size={16}/>{busy?'Working…':'Save'}</button></div>
    {msg && <div className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">{msg}</div>}
    <section className="mt-4 rounded-xl border bg-white p-4"><h2 className="mb-4 flex items-center gap-2 font-bold"><UserRound size={18}/>My Profile</h2><div className="grid gap-3 md:grid-cols-2">{field('Full name','full_name')}{field('Current title','current_title')}{field('Email','email')}{field('Phone','phone')}{field('Location','location')}{field('LinkedIn','linkedin_url','https://linkedin.com/in/...')}</div><label className="mt-3 block"><span className="text-xs font-bold text-slate-600">Professional summary</span><textarea dir="auto" value={p.professional_summary||''} onChange={e=>set('professional_summary',e.target.value)} rows={4} className="mt-1 w-full rounded-lg border p-2.5 text-sm"/></label></section>
    <section className="mt-4 rounded-xl border bg-white p-4"><h2 className="mb-1 flex items-center gap-2 font-bold"><Target size={18}/>Jobs I'm Looking For / משרות שאני מחפש</h2><p className="mb-4 text-xs text-slate-500">CV analysis automatically enriches these fields. You can still edit them manually.</p><div className="grid gap-3 md:grid-cols-2">{list('Target roles / fields · תפקידים / תחומים','target_roles','Finance, Banking, כספים, בנקאות, מנהל כספים')}{list('Preferred locations · אזורים','preferred_locations','North, Sharon, Tel Aviv, חיפה, צפון, שרון, תל אביב')}{list('Work modes · אופן עבודה','work_modes','Hybrid, Remote, היברידי, מרחוק')}{list('Seniority levels · רמות ותק','seniority_levels','Student, Entry Level, Senior, Manager')}{list('Skills / search keywords · מילות חיפוש','keywords','Finance, Banking, Excel, ERP, כספים, בנקאות, חשבות')}{list('Preferred companies · חברות מועדפות','preferred_companies','Banks, fintech, בנקים, חברות פיננסיות')}{list('Excluded companies · חברות לא רצויות','excluded_companies','')}{list('Excluded keywords · מילות חיפוש לא רצויות','excluded_keywords','')}<label><span className="text-xs font-bold text-slate-600">Minimum fit %</span><input type="number" min="0" max="100" value={p.minimum_fit??70} onChange={e=>set('minimum_fit',Number(e.target.value))} className="mt-1 w-full rounded-lg border p-2.5 text-sm"/></label><label className="flex items-center gap-3 pt-6 text-sm"><input type="checkbox" checked={p.auto_discovery??true} onChange={e=>set('auto_discovery',e.target.checked)}/>Automatically discover matching opportunities</label></div></section>
    <section className="mt-4 rounded-xl border bg-white p-4"><h2 className="mb-2 flex items-center gap-2 font-bold"><FileText size={18}/>My CV</h2><p className="mb-3 text-sm text-slate-500">Upload PDF or Word, up to 10 MB. Every upload automatically runs the same full analysis as the Analyze CV button.</p>{p.cv_file_name&&<div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm"><b>{p.cv_file_name}</b><div className="text-xs text-slate-400">Uploaded {p.cv_updated_at?new Date(p.cv_updated_at).toLocaleString():''}</div>{verified&&<div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-emerald-100 px-2 py-1 font-bold text-emerald-700">CV verified</span><span className="rounded-full bg-sky-100 px-2 py-1 font-bold text-sky-700">{verified.skills_count||0} skills</span><span className="rounded-full bg-indigo-100 px-2 py-1 font-bold text-indigo-700">{verified.target_roles_count||0} roles</span><span className="rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-700">{verified.keywords_count||0} search terms</span></div>}</div>}<input ref={fileRef} id="cv-file-input" type="file" accept="application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={e=>upload(e.currentTarget.files?.[0])}/><div className="flex flex-col gap-2 sm:flex-row"><button type="button" disabled={busy} onClick={()=>fileRef.current?.click()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-indigo-300 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 disabled:opacity-50"><Upload size={16}/>{busy?'Working…':p.cv_file_name?'Replace CV':'Upload CV'}</button><button type="button" disabled={busy||!p.cv_file_name} onClick={async()=>{setBusy(true);try{await analyze()}catch(e:any){setMsg(`Analysis failed: ${e?.message||'Unknown error'}`)}finally{setBusy(false)}}} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Brain size={16}/>Full Analyze CV</button></div><p className="mt-2 text-xs text-slate-400">Full analysis extracts experience, education, achievements, domains, tools, languages, skills, capability levels, target roles, seniority and search keywords. Hebrew CV capabilities are saved in English.</p></section>
  </div>
}
