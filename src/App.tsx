import './App.css'
import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, ExternalLink, LayoutDashboard, Linkedin, MapPin, Plus, Search, Sparkles, UserRound, X } from 'lucide-react'
import { supabase } from './supabase'

interface Job {
  id: string
  company: string
  position: string
  location: string
  workMode: 'Remote' | 'Hybrid' | 'On-site'
  fitScore: number
  priority: 'High' | 'Medium' | 'Low'
  status: 'New' | 'Reviewing' | 'Interested' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Closed'
  dateAdded: string
  nextAction: string
  source: 'LinkedIn' | 'Company Website' | 'Recruiter' | 'Other'
  sourceUrl?: string
  description?: string
}

interface AddJobForm {
  jobTitle: string
  company: string
  location: string
  workMode: Job['workMode']
  sourceUrl: string
  source: Job['source']
  priority: Job['priority']
  description: string
}

const LINKEDIN_PROFILE = 'https://www.linkedin.com/in/oren-tanhum-9331b54/'
const LINKEDIN_JOBS = 'https://www.linkedin.com/jobs/'

const StatusBadge = ({ status }: { status: Job['status'] }) => {
  const styles: Record<Job['status'], string> = {
    New: 'bg-slate-100 text-slate-700', Reviewing: 'bg-sky-100 text-sky-700', Interested: 'bg-violet-100 text-violet-700',
    Applied: 'bg-indigo-100 text-indigo-700', Interview: 'bg-amber-100 text-amber-700', Offer: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-rose-100 text-rose-700', Closed: 'bg-slate-200 text-slate-600'
  }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>{status}</span>
}

const PriorityBadge = ({ priority }: { priority: Job['priority'] }) => {
  const styles = { High: 'bg-rose-50 text-rose-700', Medium: 'bg-orange-50 text-orange-700', Low: 'bg-slate-100 text-slate-600' }
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[priority]}`}>{priority}</span>
}

const AddJobModal = ({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (job: AddJobForm) => void }) => {
  const emptyForm: AddJobForm = { jobTitle: '', company: '', location: '', workMode: 'Hybrid', sourceUrl: '', source: 'LinkedIn', priority: 'Medium', description: '' }
  const [form, setForm] = useState<AddJobForm>(emptyForm)
  if (!isOpen) return null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(form)
    setForm(emptyForm)
  }

  const field = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h2 className="text-lg font-bold text-slate-900">Add job opportunity</h2><p className="text-xs text-slate-500">Save a LinkedIn or external opportunity to your pipeline.</p></div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={20}/></button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Position<input required className={`${field} mt-1.5`} value={form.jobTitle} onChange={e=>setForm({...form,jobTitle:e.target.value})}/></label>
          <label className="text-xs font-semibold text-slate-600">Company<input required className={`${field} mt-1.5`} value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/></label>
          <label className="text-xs font-semibold text-slate-600">Location<input required className={`${field} mt-1.5`} value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label>
          <label className="text-xs font-semibold text-slate-600">Work mode<select className={`${field} mt-1.5`} value={form.workMode} onChange={e=>setForm({...form,workMode:e.target.value as Job['workMode']})}><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label>
          <label className="text-xs font-semibold text-slate-600">Source<select className={`${field} mt-1.5`} value={form.source} onChange={e=>setForm({...form,source:e.target.value as Job['source']})}><option>LinkedIn</option><option>Company Website</option><option>Recruiter</option><option>Other</option></select></label>
          <label className="text-xs font-semibold text-slate-600">Priority<select className={`${field} mt-1.5`} value={form.priority} onChange={e=>setForm({...form,priority:e.target.value as Job['priority']})}><option>High</option><option>Medium</option><option>Low</option></select></label>
          <label className="text-xs font-semibold text-slate-600 md:col-span-2">Job URL<input type="url" className={`${field} mt-1.5`} placeholder="https://www.linkedin.com/jobs/view/..." value={form.sourceUrl} onChange={e=>setForm({...form,sourceUrl:e.target.value})}/></label>
          <label className="text-xs font-semibold text-slate-600 md:col-span-2">Notes<textarea rows={3} className={`${field} mt-1.5 resize-none`} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 md:col-span-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Save job</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<Job['status'] | 'All'>('All')
  const [priorityFilter, setPriorityFilter] = useState<Job['priority'] | 'All'>('All')
  const [sourceFilter, setSourceFilter] = useState<Job['source'] | 'All'>('All')
  const [sortBy, setSortBy] = useState('dateAdded')

  useEffect(() => {
    const loadJobs = async () => {
      const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false })
      if (error) { console.error('Error loading jobs:', error); return }
      setJobs((data || []).map(job => ({
        id: String(job.id), company: job.company || '', position: job.position || '', location: job.location || '',
        workMode: job.work_mode || 'Remote', fitScore: job.fit_score || 0, priority: job.priority || 'Medium', status: job.status || 'New',
        dateAdded: job.created_at ? job.created_at.split('T')[0] : '', nextAction: job.next_action || '', source: job.source || 'Other',
        sourceUrl: job.source_url || '', description: job.description || ''
      })))
    }
    loadJobs()
  }, [])

  const sortedJobs = useMemo(() => {
    const filtered = jobs.filter(job => {
      const term = searchTerm.toLowerCase()
      return (job.company.toLowerCase().includes(term) || job.position.toLowerCase().includes(term) || job.location.toLowerCase().includes(term)) &&
        (statusFilter === 'All' || job.status === statusFilter) && (priorityFilter === 'All' || job.priority === priorityFilter) && (sourceFilter === 'All' || job.source === sourceFilter)
    })
    return [...filtered].sort((a,b) => sortBy === 'fitScore' ? b.fitScore-a.fitScore : sortBy === 'company' ? a.company.localeCompare(b.company) : new Date(b.dateAdded).getTime()-new Date(a.dateAdded).getTime())
  }, [jobs, searchTerm, statusFilter, priorityFilter, sourceFilter, sortBy])

  const stats = {
    all: jobs.length,
    active: jobs.filter(j => !['Rejected','Closed'].includes(j.status)).length,
    applied: jobs.filter(j => j.status === 'Applied').length,
    interviews: jobs.filter(j => j.status === 'Interview').length,
    offers: jobs.filter(j => j.status === 'Offer').length
  }

  const handleAddJob = async (formData: AddJobForm) => {
    const { data, error } = await supabase.from('jobs').insert({
      company: formData.company, position: formData.jobTitle, location: formData.location, work_mode: formData.workMode,
      fit_score: 0, priority: formData.priority, status: 'New', next_action: 'Review and apply', source: formData.source,
      source_url: formData.sourceUrl, description: formData.description
    }).select().single()
    if (error) { console.error('Error adding job:', error); alert('Could not save the job.'); return }
    setJobs(current => [{
      id: String(data.id), company: data.company || '', position: data.position || '', location: data.location || '', workMode: data.work_mode || 'Remote',
      fitScore: data.fit_score || 0, priority: data.priority || 'Medium', status: data.status || 'New', dateAdded: data.created_at ? data.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      nextAction: data.next_action || '', source: data.source || 'Other', sourceUrl: data.source_url || '', description: data.description || ''
    }, ...current])
    setIsModalOpen(false)
  }

  const selectClass = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 outline-none focus:border-indigo-400'

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-5 px-4 lg:px-6">
          <div className="flex items-center gap-2 font-bold"><div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500"><BriefcaseBusiness size={18}/></div><span>JobTrack</span></div>
          <div className="hidden flex-1 md:block"><div className="relative max-w-xl"><Search className="absolute left-3 top-2.5 text-slate-500" size={16}/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search company, role or location" className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-500"/></div></div>
          <a href={LINKEDIN_JOBS} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-[#0a66c2] px-3 py-2 text-xs font-semibold hover:bg-[#0958a8]"><Linkedin size={16}/> Find jobs <ExternalLink size={13}/></a>
          <a href={LINKEDIN_PROFILE} target="_blank" rel="noreferrer" title="Open LinkedIn profile" className="grid h-9 w-9 place-items-center rounded-full border border-slate-600 bg-slate-800 text-xs font-bold">OT</a>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)_270px]">
        <aside className="hidden min-h-[calc(100vh-56px)] border-r border-slate-200 bg-white p-3 lg:block">
          <nav className="space-y-1">
            <button className="flex w-full items-center gap-3 rounded-lg bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700"><LayoutDashboard size={18}/>Dashboard</button>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><BriefcaseBusiness size={18}/>My Jobs <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs">{stats.all}</span></button>
            <a href={LINKEDIN_JOBS} target="_blank" rel="noreferrer" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><Linkedin size={18}/>LinkedIn Jobs<ExternalLink className="ml-auto" size={13}/></a>
          </nav>
          <div className="mt-5 border-t border-slate-100 pt-4"><p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Pipeline</p><div className="mt-2 space-y-1 text-xs text-slate-600"><div className="flex justify-between rounded px-3 py-2"><span>Applied</span><b>{stats.applied}</b></div><div className="flex justify-between rounded px-3 py-2"><span>Interviews</span><b>{stats.interviews}</b></div><div className="flex justify-between rounded px-3 py-2"><span>Offers</span><b>{stats.offers}</b></div></div></div>
        </aside>

        <main className="min-w-0 p-4 lg:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h1 className="text-xl font-bold text-slate-950">Job search workspace</h1><p className="text-xs text-slate-500">Track opportunities, applications and next actions in one place.</p></div>
            <div className="flex gap-2"><a href={LINKEDIN_JOBS} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><Linkedin size={16} className="text-[#0a66c2]"/>Browse LinkedIn</a><button onClick={()=>setIsModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"><Plus size={16}/>Add job</button></div>
          </div>

          <section className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-5">
            {[['All jobs',stats.all,'text-indigo-600'],['Active',stats.active,'text-sky-600'],['Applied',stats.applied,'text-violet-600'],['Interviews',stats.interviews,'text-amber-600'],['Offers',stats.offers,'text-emerald-600']].map(([label,value,color])=><div key={String(label)} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p></div>)}
          </section>

          <section className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)} className={selectClass}><option value="All">All statuses</option><option>New</option><option>Reviewing</option><option>Interested</option><option>Applied</option><option>Interview</option><option>Offer</option></select>
              <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value as any)} className={selectClass}><option value="All">All priorities</option><option>High</option><option>Medium</option><option>Low</option></select>
              <select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value as any)} className={selectClass}><option value="All">All sources</option><option>LinkedIn</option><option>Company Website</option><option>Recruiter</option><option>Other</option></select>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className={selectClass}><option value="dateAdded">Newest first</option><option value="fitScore">Best fit</option><option value="company">Company A-Z</option></select>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><h2 className="text-sm font-bold text-slate-900">Opportunities</h2><p className="text-[11px] text-slate-400">{sortedJobs.length} visible of {jobs.length} total</p></div><Sparkles size={17} className="text-indigo-500"/></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-2.5">Company / role</th><th className="px-3 py-2.5">Location</th><th className="px-3 py-2.5">Mode</th><th className="px-3 py-2.5">Fit</th><th className="px-3 py-2.5">Priority</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Next action</th><th className="px-3 py-2.5">Source</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{sortedJobs.map(job=><tr key={job.id} className="group hover:bg-indigo-50/40"><td className="px-4 py-3"><p className="text-sm font-bold text-slate-900">{job.company}</p><p className="mt-0.5 text-xs text-slate-500">{job.position}</p></td><td className="px-3 py-3 text-xs text-slate-600"><span className="flex items-center gap-1"><MapPin size={12}/>{job.location}</span></td><td className="px-3 py-3 text-xs text-slate-600">{job.workMode}</td><td className={`px-3 py-3 text-sm font-bold ${job.fitScore>=80?'text-emerald-600':job.fitScore>=60?'text-amber-600':'text-rose-600'}`}>{job.fitScore}%</td><td className="px-3 py-3"><PriorityBadge priority={job.priority}/></td><td className="px-3 py-3"><StatusBadge status={job.status}/></td><td className="max-w-[180px] px-3 py-3 text-xs text-slate-600">{job.nextAction || '—'}</td><td className="px-3 py-3">{job.sourceUrl?<a href={job.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">{job.source}<ExternalLink size={11}/></a>:<span className="text-xs text-slate-500">{job.source}</span>}</td></tr>)}</tbody></table></div>
            {sortedJobs.length===0&&<div className="p-10 text-center text-sm text-slate-500">No jobs match these filters.</div>}
          </section>
        </main>

        <aside className="border-l border-slate-200 bg-white p-4 lg:min-h-[calc(100vh-56px)]">
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-4 text-white shadow-sm">
            <div className="flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-white/30 bg-indigo-500 text-sm font-bold">OT</div><div><h3 className="font-bold">Oren Tanhum</h3><p className="text-[11px] text-slate-300">Program & Delivery Management</p></div></div>
            <p className="mt-3 text-xs leading-5 text-slate-300">Technology and R&D program leadership with experience across SaaS, cloud, IoT and cross-functional delivery.</p>
            <a href={LINKEDIN_PROFILE} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-[#0a66c2] px-3 py-2 text-xs font-semibold hover:bg-[#0958a8]"><Linkedin size={15}/>Open LinkedIn profile<ExternalLink size={12}/></a>
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-center gap-2"><UserRound size={16} className="text-indigo-500"/><h3 className="text-xs font-bold text-slate-900">Search focus</h3></div><div className="flex flex-wrap gap-1.5">{['Program Manager','Delivery Manager','R&D','SaaS','Cloud','IoT'].map(x=><span key={x} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{x}</span>)}</div></div>
          <div className="mt-3 rounded-xl border border-slate-200 p-4"><h3 className="text-xs font-bold text-slate-900">LinkedIn workflow</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">Find a role on LinkedIn, open it, then use Add job here and paste the job URL. JobTrack keeps the source link with the application.</p><a href={LINKEDIN_JOBS} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Linkedin size={15} className="text-[#0a66c2]"/>Open LinkedIn Jobs</a></div>
        </aside>
      </div>
      <AddJobModal isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} onAdd={handleAddJob}/>
    </div>
  )
}