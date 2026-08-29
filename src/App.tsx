import './App.css'
import { useEffect, useMemo, useState } from 'react'
import {
  Brain, BriefcaseBusiness, Check, ExternalLink, Filter, LayoutDashboard,
  LogOut, Palette, RefreshCw, Search, Settings, ShieldCheck, Sparkles,
  Trash2, UserRound, X,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import CVPage from './CVPage'
import SettingsPage from './SettingsPage'

type Role = 'admin' | 'viewer'
type Page = 'jobs' | 'new' | 'skills' | 'cv' | 'settings' | 'legal'
type ThemeColor = 'green' | 'blue' | 'pink' | 'purple'
type Job = { id:number; company:string; position:string; location:string; work_mode:string; fit_score:number; status:string; source:string; source_url?:string; insertion_date?:string; description?:string; priority?:string; next_action?:string; notes?:string }
type Candidate = { id:number; company:string; position:string; location:string; work_mode:string; fit_score:number; review_status:string; source:string; source_url?:string; description?:string; discovered_at:string }
type Skill = { display_skill:string; opportunity_count:number; main_job_count:number; new_opportunity_count:number; avg_importance:number; demand_score:number }
type JobSkill = { job_id:number; skill:string; importance:number; category:string }

const STATUSES = ['New','Interested','Applied','Interview Scheduled','Interviewed','Follow Up','Offer','On Hold','Not Relevant','Rejected','Closed']
const THEMES: { value:ThemeColor; label:string }[] = [
  { value:'green', label:'Green' },
  { value:'blue', label:'Blue' },
  { value:'pink', label:'Pink' },
  { value:'purple', label:'Purple' },
]

const Fit = ({ n }:{ n:number }) => <span className={`rounded-full px-2 py-1 text-xs font-bold ${n>=93?'bg-emerald-100 text-emerald-700':n>=85?'bg-sky-100 text-sky-700':'bg-amber-100 text-amber-700'}`}>{n||0}%</span>
const date = (v?:string) => v ? new Date(v).toLocaleDateString() : '—'
const cleanDescription = (s='') => {
  let t=s.replace(/&[a-z]+;/gi,' ').replace(/\s+/g,' ').trim()
  const markers=['Description ','Job Description ','Key job responsibilities ']
  for(const m of markers){ const i=t.indexOf(m); if(i>0)t=t.slice(i+m.length) }
  return t.slice(0,1400)
}

const KNOWLEDGE_PROFILE:Record<string,number> = {
  'Agile / Scrum':92,'AI / Automation':82,'APIs / Integration':85,'Automotive / ADAS':65,
  'Budget / Financial Management':90,'Cloud / SaaS':88,'Cross-functional Leadership':98,
  'Customer-facing Delivery':98,'Cybersecurity':68,'DevOps / CI/CD':85,'Executive Communication':95,
  'Hardware / Systems':78,'Healthcare / Life Sciences':88,'Industrial AI / Data Solutions':80,
  'Infrastructure Delivery':84,'Innovation / Research Programs':88,'Jira / Confluence':92,
  'Metrics / Data-driven':88,'People Leadership':98,'Portfolio / Governance':94,'Process Improvement':95,
  'Product Lifecycle / NPI':78,'Program Management':98,'R&D / Engineering':95,'Release Management':92,
  'Risk & Issue Management':97,'Roadmap & Planning':95,'Software Delivery':100,'Stakeholder Management':98,
  'System Integration & Validation':92,'Technical Project Management':97,'Vendor / Procurement Management':88,
}

const knowledgeGrade = (skill:string) => {
  const exact=KNOWLEDGE_PROFILE[skill]
  if(exact!==undefined)return exact
  const s=skill.toLowerCase()
  const aliases:[string[],number][]=[
    [['software delivery','software development'],100],[['program management'],98],
    [['technical project management','project management'],97],[['delivery management'],98],
    [['stakeholder'],98],[['cross-functional'],98],[['customer-facing','customer delivery','professional services'],98],
    [['people leadership','team management','leadership'],98],[['r&d','engineering management'],95],
    [['roadmap','planning'],95],[['risk','issue management'],97],[['executive communication','communication'],95],
    [['process improvement'],95],[['portfolio','governance'],94],[['agile','scrum'],92],[['release management'],92],
    [['jira','confluence'],92],[['system integration','validation'],92],[['budget','financial'],90],
    [['healthcare','life sciences'],88],[['cloud','saas','aws'],88],[['metrics','data-driven'],88],
    [['vendor','procurement'],88],[['innovation','research programs'],88],[['devops','ci/cd','cicd','azure devops'],85],
    [['api','integration'],85],[['infrastructure delivery'],84],[['ai','automation','computer vision','industrial ai'],82],
    [['hardware','systems'],78],[['npi','product lifecycle'],78],[['cybersecurity'],68],[['automotive','adas'],65],
  ]
  for(const [keys,grade] of aliases) if(keys.some(k=>s.includes(k))) return grade
  return 70
}

const Knowledge = ({ skill }:{ skill:string }) => {
  const n=knowledgeGrade(skill)
  const label=n>=90?'Expert':n>=80?'Advanced':n>=70?'Proficient':'Familiar'
  return <div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs font-bold ${n>=90?'bg-emerald-100 text-emerald-700':n>=80?'bg-sky-100 text-sky-700':n>=70?'bg-indigo-100 text-indigo-700':'bg-slate-100 text-slate-600'}`}>{n}%</span><span className="text-xs text-slate-500">{label}</span></div>
}

function Login(){
  const [e,setE]=useState(''), [p,setP]=useState(''), [err,setErr]=useState('')
  return <div className="login-screen grid min-h-screen place-items-center bg-slate-100 p-4"><form onSubmit={async x=>{x.preventDefault();const{error}=await supabase.auth.signInWithPassword({email:e,password:p});if(error)setErr(error.message)}} className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow">
    <BriefcaseBusiness className="brand-accent mx-auto" size={42}/><h1 className="text-center text-2xl font-bold">JobTrack</h1>
    <input required type="email" placeholder="Email" value={e} onChange={x=>setE(x.target.value)} className="mt-5 w-full rounded-lg border p-3"/>
    <input required type="password" placeholder="Password" value={p} onChange={x=>setP(x.target.value)} className="mt-3 w-full rounded-lg border p-3"/>
    {err&&<p className="mt-2 text-xs text-red-600">{err}</p>}
    <button className="theme-primary mt-4 w-full rounded-lg p-3 font-semibold text-white">Sign in</button>
  </form></div>
}

function JobDetails({job,skills,onClose}:{job:Job;skills:JobSkill[];onClose:()=>void}){
  return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 pt-8 md:p-8"><div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
    <div className="sticky top-0 flex items-start gap-3 rounded-t-2xl border-b bg-white p-5"><div className="min-w-0 flex-1"><p className="brand-text text-sm font-bold">{job.company}</p><h2 className="text-xl font-bold md:text-2xl">{job.position}</h2><p className="mt-1 text-sm text-slate-500">{job.location} · {job.work_mode||'—'}</p></div><Fit n={job.fit_score}/><button onClick={onClose} className="tap-target rounded-lg border p-2"><X size={18}/></button></div>
    <div className="grid gap-5 p-5 md:grid-cols-[1fr_1.25fr]"><section><h3 className="font-bold">Job information</h3><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Status</span><div className="font-semibold">{job.status||'New'}</div></div><div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Priority</span><div className="font-semibold">{job.priority||'—'}</div></div><div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Source</span><div className="font-semibold">{job.source||'—'}</div></div><div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Added</span><div className="font-semibold">{date(job.insertion_date)}</div></div></div>{job.description&&<><h3 className="mt-5 font-bold">Job description</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{cleanDescription(job.description)}</p></>}{job.next_action&&<><h3 className="mt-5 font-bold">Next action</h3><p className="mt-2 text-sm text-slate-600">{job.next_action}</p></>}{job.source_url&&<a href={job.source_url} target="_blank" rel="noreferrer" className="theme-outline mt-5 inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold">View original job <ExternalLink size={14}/></a>}</section>
      <section><div className="theme-soft rounded-xl border p-4"><div className="flex items-center gap-2"><Brain size={20} className="brand-accent"/><h3 className="text-lg font-bold">Capabilities needed for this job</h3></div><p className="mt-1 text-xs text-slate-500">Required capabilities identified for this specific role, ordered by importance.</p><div className="mt-4 space-y-2">{skills.length?skills.map((s,i)=><div key={`${s.skill}-${i}`} className="rounded-lg border bg-white p-3"><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><div className="font-semibold">{s.skill}</div><div className="text-xs text-slate-500">{s.category||'Capability'}</div></div><Knowledge skill={s.skill}/><span className="text-xs font-bold text-slate-500">{s.importance}/5</span></div></div>):<div className="rounded-lg border border-dashed bg-white p-4 text-sm text-slate-500">No capabilities have been mapped for this job yet.</div>}</div></div>{job.notes&&<><h3 className="mt-5 font-bold">Notes</h3><p className="mt-2 text-sm text-slate-600">{job.notes}</p></>}</section>
    </div>
  </div></div>
}

function AboutLegal(){
  const cards=[
    ['Ownership & intellectual property','JobTrack is proprietary software created by Oren Tanhum. Original source code, application structure, user-interface implementation, workflows, matching and scoring implementation, database organization, documentation, product text and other original materials are protected to the extent provided by applicable law.'],
    ['Limited permission to use','Access to JobTrack gives an authorized user a limited, personal, non-transferable right to use the service. It does not transfer ownership or grant a right to copy, publish, distribute, sublicense, sell, white-label, commercially exploit or create unauthorized derivative products from proprietary JobTrack software or materials.'],
    ['Security & acceptable use','Users may not bypass authentication, access another user’s private information, interfere with the service, circumvent security controls, scrape proprietary application content using unauthorized means, or remove copyright and ownership notices.'],
    ['Privacy & account data','CVs, profile information and job-tracking data are associated with the signed-in account. JobTrack uses this information to provide profile analysis, matching, opportunity discovery and tracking features. Users remain responsible for the accuracy and lawfulness of information they upload.'],
    ['Third-party content','Job advertisements, company names, trademarks, logos, external links and third-party libraries remain subject to the rights and terms of their respective owners. Their presence in JobTrack does not transfer those rights to Oren Tanhum.'],
    ['Decision-support disclaimer','Fit scores, skill assessments, CV analysis and recommendations are decision-support information only. They do not guarantee job availability, eligibility, an interview, employment, accuracy of third-party listings or any particular outcome. Verify original job postings before acting.'],
  ]
  return <div className="max-w-5xl"><div className="theme-hero rounded-2xl border p-5 md:p-7"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold"><ShieldCheck size={15}/>PROPRIETARY SOFTWARE</div><h1 className="text-2xl font-bold md:text-3xl">About & Legal</h1><p className="mt-2 font-bold">Copyright © 2026 Oren Tanhum. All rights reserved.</p><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">These terms are intended to protect JobTrack, its users and its original software assets. Access to the application does not transfer ownership of the product.</p><p className="mt-3 text-xs text-slate-500">Last updated: August 2026</p></div><div className="mt-4 grid gap-3 md:grid-cols-2">{cards.map(([title,text])=><section key={title} className="rounded-xl border bg-white p-5"><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></section>)}</div><div className="theme-soft mt-4 rounded-xl border p-4 text-sm font-semibold">Any permission to reproduce, license, distribute, resell, integrate commercially or otherwise exploit proprietary JobTrack software or materials must be granted in writing by Oren Tanhum.</div></div>
}

export default function App(){
  const [session,setSession]=useState<Session|null>(null)
  const [ready,setReady]=useState(false)
  const [role,setRole]=useState<Role>('viewer')
  const [theme,setTheme]=useState<ThemeColor>('green')
  const [page,setPage]=useState<Page>('jobs')
  const [jobs,setJobs]=useState<Job[]>([])
  const [candidates,setCandidates]=useState<Candidate[]>([])
  const [skills,setSkills]=useState<Skill[]>([])
  const [jobSkills,setJobSkills]=useState<JobSkill[]>([])
  const [selectedJob,setSelectedJob]=useState<Job|null>(null)
  const [q,setQ]=useState(''),[sf,setSf]=useState('All'),[mf,setMf]=useState('All'),[lf,setLf]=useState('All'),[srcf,setSrcf]=useState('All'),[ff,setFf]=useState('All')
  const [refreshing,setRefreshing]=useState(false),[refreshMsg,setRefreshMsg]=useState('')
  const admin=role==='admin'

  const load=async()=>{
    const [j,c,s,js]=await Promise.all([
      supabase.from('jobs').select('*').order('fit_score',{ascending:false}).order('insertion_date',{ascending:false}),
      supabase.from('job_candidates').select('*').order('discovered_at',{ascending:false}),
      supabase.from('skill_demand_all').select('*').order('demand_score',{ascending:false}),
      supabase.from('job_skills').select('job_id,skill,importance,category').order('importance',{ascending:false}),
    ])
    if(j.data)setJobs(j.data as Job[]); if(c.data)setCandidates(c.data as Candidate[]); if(s.data)setSkills(s.data as Skill[]); if(js.data)setJobSkills(js.data as JobSkill[])
  }

  const refreshOpportunities=async()=>{
    setRefreshing(true);setRefreshMsg('')
    try{const{data,error}=await supabase.functions.invoke('refresh-opportunities');if(error)throw error;await load();setRefreshMsg(`Refresh completed · ${data?.scanned??0} scanned · ${data?.new_opportunities??0} new`)}
    catch{await load();setRefreshMsg('Refresh failed — existing opportunities reloaded.')}
    finally{setRefreshing(false)}
  }

  useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});const{data}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>data.subscription.unsubscribe()},[])
  useEffect(()=>{if(session)(async()=>{const{data}=await supabase.from('profiles').select('role,theme_color').eq('id',session.user.id).single();setRole(data?.role==='admin'?'admin':'viewer');const saved=THEMES.some(t=>t.value===data?.theme_color)?data.theme_color as ThemeColor:'green';setTheme(saved);load()})()},[session])

  const changeTheme=async(value:ThemeColor)=>{
    setTheme(value)
    if(!session)return
    const{error}=await supabase.from('profiles').update({theme_color:value,updated_at:new Date().toISOString()}).eq('id',session.user.id)
    if(error) console.error('Could not save theme preference',error)
  }

  const uniq=(a:string[])=>[...new Set(a.filter(Boolean))].sort()
  const pending=candidates.filter(c=>c.review_status==='New').length
  const totalIntel=jobs.length+candidates.filter(c=>c.review_status!=='Rejected'&&c.review_status!=='Added').length
  const filtered=useMemo(()=>jobs.filter(j=>{const fit=ff==='All'||ff==='90+'&&j.fit_score>=90||ff==='80-89'&&j.fit_score>=80&&j.fit_score<90||ff==='<80'&&j.fit_score<80;return `${j.company} ${j.position} ${j.location}`.toLowerCase().includes(q.toLowerCase())&&(sf==='All'||j.status===sf)&&(mf==='All'||j.work_mode===mf)&&(lf==='All'||j.location===lf)&&(srcf==='All'||j.source===srcf)&&fit}),[jobs,q,sf,mf,lf,srcf,ff])
  const promote=async(id:number)=>{await supabase.rpc('promote_job_candidate',{candidate_id:id});load()}
  const setStatus=async(id:number,status:string)=>{setJobs(v=>v.map(j=>j.id===id?{...j,status}:j));await supabase.from('jobs').update({status,status_updated_at:new Date().toISOString()}).eq('id',id)}
  const deleteJob=async(j:Job)=>{if(!window.confirm(`Delete ${j.company} — ${j.position} from Main Jobs?\n\nThis action cannot be undone.`))return;const{error}=await supabase.from('jobs').delete().eq('id',j.id);if(error){window.alert(`Delete failed: ${error.message}`);return}setJobs(v=>v.filter(x=>x.id!==j.id));await load()}
  const nav=(p:Page)=>`app-nav-button flex w-full items-center gap-2 rounded-lg p-3 text-sm ${page===p?'is-active font-bold':''}`

  if(!ready)return <div className="p-10">Loading…</div>
  if(!session)return <Login/>

  return <div className="theme-shell min-h-screen text-slate-800" data-theme={theme}>
    {selectedJob&&<JobDetails job={selectedJob} skills={jobSkills.filter(s=>s.job_id===selectedJob.id)} onClose={()=>setSelectedJob(null)}/>} 
    <header className="app-header text-white"><div className="mx-auto flex min-h-14 max-w-[1500px] items-center gap-2 px-3 py-2 md:px-4"><b className="flex shrink-0 items-center gap-2"><BriefcaseBusiness/>JobTrack</b><div className="header-actions ml-auto flex min-w-0 items-center gap-2"><span className="role-label text-xs font-bold uppercase tracking-wide">{role}</span><label className="theme-picker flex min-h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-2"><Palette size={16}/><span className="theme-picker-label text-xs font-semibold">Layout</span><select aria-label="Choose layout color" value={theme} onChange={e=>changeTheme(e.target.value as ThemeColor)} className="min-h-9 cursor-pointer bg-transparent text-sm font-semibold text-white outline-none">{THEMES.map(t=><option key={t.value} value={t.value} className="text-slate-900">{t.label}</option>)}</select></label><button onClick={()=>supabase.auth.signOut()} className="tap-target flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold hover:bg-white/10"><LogOut size={16}/><span className="logout-label">Sign out</span></button></div></div></header>
    <div className="app-layout mx-auto grid max-w-[1500px] lg:grid-cols-[230px_1fr]">
      <aside className="app-sidebar border-r bg-white p-3">
        <button onClick={()=>setPage('jobs')} className={nav('jobs')}><LayoutDashboard size={18}/>Main Jobs</button>
        <button onClick={()=>setPage('new')} className={nav('new')}><Sparkles size={18}/>New Opportunities {pending>0&&<span className="theme-count ml-auto rounded-full px-2 text-xs font-bold text-white">{pending}</span>}</button>
        <button onClick={()=>setPage('skills')} className={nav('skills')}><Brain size={18}/>Skills Intelligence</button>
        <button onClick={()=>setPage('cv')} className={nav('cv')}><UserRound size={18}/>CV Details</button>
        <button onClick={()=>setPage('settings')} className={nav('settings')}><Settings size={18}/>Settings</button>
        <button onClick={()=>setPage('legal')} className={`${nav('legal')} legal-nav`}><ShieldCheck size={18}/>About & Legal</button>
      </aside>
      <main className="min-w-0 p-5">
        {page==='settings'?<SettingsPage/>:page==='cv'?<CVPage/>:page==='legal'?<AboutLegal/>:page==='jobs'?<>
          <div className="flex flex-wrap items-start gap-3"><div><h1 className="text-2xl font-bold">Main Jobs</h1><p className="text-sm text-slate-500">Filter and track your selected opportunities.</p></div><button disabled={refreshing} onClick={refreshOpportunities} className="theme-primary ml-auto flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white"><RefreshCw size={16} className={refreshing?'animate-spin':''}/>{refreshing?'Searching…':'Refresh Opportunities'}</button></div>
          {refreshMsg&&<p className="mt-2 text-xs text-slate-500">{refreshMsg}</p>}
          <div className="mt-4 rounded-xl border bg-white p-3"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><Filter size={14}/>Filters <span className="ml-auto font-normal normal-case">Showing {filtered.length} of {jobs.length}</span></div><div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6"><div className="relative"><Search className="absolute left-2.5 top-3" size={14}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Company / role" className="min-h-10 w-full rounded-lg border py-2 pl-8 text-xs"/></div><select value={sf} onChange={e=>setSf(e.target.value)} className="min-h-10 rounded-lg border p-2 text-xs"><option>All</option>{STATUSES.map(x=><option key={x}>{x}</option>)}</select><select value={ff} onChange={e=>setFf(e.target.value)} className="min-h-10 rounded-lg border p-2 text-xs"><option>All</option><option>90+</option><option>80-89</option><option>&lt;80</option></select>{[['Mode',mf,setMf,uniq(jobs.map(j=>j.work_mode))],['Location',lf,setLf,uniq(jobs.map(j=>j.location))],['Source',srcf,setSrcf,uniq(jobs.map(j=>j.source))]].map((a:any)=><select key={a[0]} value={a[1]} onChange={e=>a[2](e.target.value)} className="min-h-10 rounded-lg border p-2 text-xs"><option value="All">{a[0]}: All</option>{a[3].map((x:string)=><option key={x}>{x}</option>)}</select>)}</div></div>
          <div className="mt-3 overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Company</th><th>Job name</th><th>Capabilities needed</th><th>Location</th><th>Mode</th><th>% Fit</th><th>Status</th><th>Source</th><th>Insertion</th><th className="text-right">Action</th></tr></thead><tbody>{filtered.map(j=>{const caps=jobSkills.filter(s=>s.job_id===j.id).sort((a,b)=>b.importance-a.importance);const topCaps=caps.slice(0,3);return <tr className="border-t align-top" key={j.id}><td className="p-3 font-bold whitespace-nowrap">{j.company}</td><td className="min-w-[220px] py-3 pr-3"><button onClick={()=>setSelectedJob(j)} className="brand-text text-left font-semibold hover:underline">{j.position}<span className="mt-1 block text-[11px] font-normal text-slate-500">View full job details →</span></button></td><td className="min-w-[260px] py-3 pr-3"><div className="flex max-w-md flex-wrap gap-1.5">{topCaps.length?topCaps.map(s=><span key={`${j.id}-${s.skill}`} title={`Importance ${s.importance}/5`} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">{s.skill}</span>):<span className="text-xs text-slate-400">Not mapped yet</span>}</div>{caps.length>3&&<details className="mt-2"><summary className="brand-text cursor-pointer select-none text-xs font-bold">Show all ({caps.length})</summary><div className="mt-2 flex max-w-md flex-wrap gap-1.5">{caps.slice(3).map(s=><span key={`${j.id}-all-${s.skill}`} className="theme-soft rounded-full px-2 py-1 text-[11px] font-medium">{s.skill}</span>)}</div></details>}</td><td className="py-3">{j.location}</td><td className="py-3">{j.work_mode||'—'}</td><td className="py-3"><Fit n={j.fit_score}/></td><td className="py-3"><select disabled={!admin} value={j.status||'New'} onChange={e=>setStatus(j.id,e.target.value)} className="rounded border p-1.5 text-xs">{STATUSES.map(x=><option key={x}>{x}</option>)}</select></td><td className="py-3">{j.source_url?<a className="brand-text" href={j.source_url} target="_blank" rel="noreferrer">{j.source}<ExternalLink className="inline" size={11}/></a>:j.source}</td><td className="py-3">{date(j.insertion_date)}</td><td className="p-2 text-right">{admin&&<button type="button" onClick={()=>deleteJob(j)} title="Delete job" className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 size={14}/>Delete</button>}</td></tr>})}</tbody></table></div>
        </>:page==='skills'?<>
          <h1 className="text-2xl font-bold">Skills Intelligence</h1><p className="text-sm text-slate-500">Live market demand calculated across your active Main Jobs + New Opportunities.</p><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl border bg-white p-4"><p className="text-xs uppercase text-slate-500">Main jobs</p><b className="brand-text text-3xl">{jobs.length}</b></div><div className="rounded-xl border bg-white p-4"><p className="text-xs uppercase text-slate-500">New opportunities</p><b className="brand-text text-3xl">{totalIntel-jobs.length}</b></div><div className="rounded-xl border bg-white p-4"><p className="text-xs uppercase text-slate-500">Total analysed</p><b className="brand-text text-3xl">{totalIntel}</b></div></div><div className="mt-4 overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Rank</th><th>Skill</th><th>Your Knowledge</th><th>Total</th><th>Main Jobs</th><th>New</th><th>% Market</th><th>Importance</th><th>Score</th></tr></thead><tbody>{skills.map((s,i)=><tr className="border-t" key={s.display_skill}><td className="p-3 font-bold">#{i+1}</td><td className="font-semibold">{s.display_skill}</td><td><Knowledge skill={s.display_skill}/></td><td>{s.opportunity_count}</td><td>{s.main_job_count}</td><td>{s.new_opportunity_count}</td><td>{totalIntel?Math.round(s.opportunity_count/totalIntel*100):0}%</td><td>{s.avg_importance}/5</td><td className="brand-text font-bold">{s.demand_score}</td></tr>)}</tbody></table></div>
        </>:<>
          <div className="flex flex-wrap items-start gap-3"><div><h1 className="text-2xl font-bold">New Opportunities</h1><p className="text-sm text-slate-500">Review each verified opportunity and add the ones you want to track.</p></div><button disabled={refreshing} onClick={refreshOpportunities} className="theme-outline ml-auto flex min-h-11 items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-bold"><RefreshCw size={14} className={refreshing?'animate-spin':''}/>{refreshing?'Searching…':'Refresh'}</button></div>{refreshMsg&&<p className="mt-2 text-xs text-slate-500">{refreshMsg}</p>}<div className="mt-4 grid gap-3">{candidates.filter(c=>c.review_status!=='Added').map(c=><article key={c.id} className="opportunity-card rounded-xl border bg-white p-4 shadow-sm"><div className="opportunity-head flex gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b>{c.company}</b><Fit n={c.fit_score}/></div><p className="opportunity-title">{c.position}</p><p className="opportunity-meta text-xs text-slate-500">{c.location} · {c.work_mode||'—'} · {c.source}</p>{c.description&&<p className="opportunity-description mt-2 text-sm text-slate-600">{cleanDescription(c.description)}</p>}{c.source_url&&<a href={c.source_url} target="_blank" rel="noreferrer" className="opportunity-link brand-text text-xs font-semibold">View original job <ExternalLink className="ml-1 inline" size={11}/></a>}</div></div>{admin&&<div className="opportunity-actions mt-3 border-t pt-3"><button onClick={()=>promote(c.id)} className="theme-primary flex min-h-11 items-center rounded-lg px-3 py-2 text-xs font-bold text-white"><Check className="mr-1" size={14}/>Add to Main</button></div>}</article>)}</div>
        </>}
      </main>
    </div>
  </div>
}
