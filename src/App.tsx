import './App.css'
import { useEffect, useState } from 'react'
import { Search, Plus, X } from 'lucide-react'
import { supabase } from './supabase'

// Types
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
  workMode: 'Remote' | 'Hybrid' | 'On-site'
  sourceUrl: string
  source: 'LinkedIn' | 'Company Website' | 'Recruiter' | 'Other'
  priority: 'High' | 'Medium' | 'Low'
  description: string
}

// Sample Jobs Data
const SAMPLE_JOBS: Job[] = [
  {
    id: '1',
    company: 'Acme Technologies',
    position: 'Senior React Developer',
    location: 'San Francisco, CA',
    workMode: 'Hybrid',
    fitScore: 95,
    priority: 'High',
    status: 'Applied',
    dateAdded: '2026-08-14',
    nextAction: 'Phone screen on Aug 18',
    source: 'LinkedIn',
    sourceUrl: 'https://linkedin.com/jobs/123'
  },
  {
    id: '2',
    company: 'CloudFlow Inc',
    position: 'Full Stack Engineer',
    location: 'New York, NY',
    workMode: 'Remote',
    fitScore: 88,
    priority: 'High',
    status: 'Interview',
    dateAdded: '2026-08-10',
    nextAction: 'Technical interview on Aug 20',
    source: 'Company Website',
    sourceUrl: 'https://cloudflow.com/careers'
  },
  {
    id: '3',
    company: 'StartupXYZ',
    position: 'JavaScript Developer',
    location: 'Austin, TX',
    workMode: 'Remote',
    fitScore: 72,
    priority: 'Medium',
    status: 'Interested',
    dateAdded: '2026-08-12',
    nextAction: 'Review job description',
    source: 'LinkedIn',
    sourceUrl: 'https://linkedin.com/jobs/456'
  },
  {
    id: '4',
    company: 'Enterprise Corp',
    position: 'Senior TypeScript Developer',
    location: 'Chicago, IL',
    workMode: 'On-site',
    fitScore: 65,
    priority: 'Low',
    status: 'New',
    dateAdded: '2026-08-15',
    nextAction: 'Tailor resume',
    source: 'Recruiter',
    sourceUrl: ''
  },
  {
    id: '5',
    company: 'TechHub',
    position: 'Frontend Engineer',
    location: 'Seattle, WA',
    workMode: 'Hybrid',
    fitScore: 82,
    priority: 'Medium',
    status: 'Reviewing',
    dateAdded: '2026-08-13',
    nextAction: 'Send cover letter',
    source: 'Company Website',
    sourceUrl: 'https://techhub.com/jobs'
  }
]

// Status Badge Component
const StatusBadge = ({ status }: { status: Job['status'] }) => {
  const statusColors: Record<Job['status'], string> = {
    'New': 'bg-gray-100 text-gray-800',
    'Reviewing': 'bg-blue-100 text-blue-800',
    'Interested': 'bg-purple-100 text-purple-800',
    'Applied': 'bg-indigo-100 text-indigo-800',
    'Interview': 'bg-yellow-100 text-yellow-800',
    'Offer': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
    'Closed': 'bg-gray-200 text-gray-700'
  }
  
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}>
      {status}
    </span>
  )
}

// Priority Badge Component
const PriorityBadge = ({ priority }: { priority: Job['priority'] }) => {
  const priorityColors: Record<Job['priority'], string> = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-orange-100 text-orange-800',
    'Low': 'bg-gray-100 text-gray-800'
  }
  
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityColors[priority]}`}>
      {priority}
    </span>
  )
}

// Fit Score Component
const FitScoreDisplay = ({ score }: { score: number }) => {
  let color = 'text-green-600'
  if (score < 70) color = 'text-orange-600'
  if (score < 60) color = 'text-red-600'
  
  return (
    <div className={`font-bold text-lg ${color}`}>
      {score}%
    </div>
  )
}

// Add Job Modal
const AddJobModal = ({ isOpen, onClose, onAdd }: {
  isOpen: boolean
  onClose: () => void
  onAdd: (job: AddJobForm) => void
}) => {
  const [form, setForm] = useState<AddJobForm>({
    jobTitle: '',
    company: '',
    location: '',
    workMode: 'Remote',
    sourceUrl: '',
    source: 'LinkedIn',
    priority: 'Medium',
    description: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(form)
    setForm({
      jobTitle: '',
      company: '',
      location: '',
      workMode: 'Remote',
      sourceUrl: '',
      source: 'LinkedIn',
      priority: 'Medium',
      description: ''
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Add New Job</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Title *
              </label>
              <input
                type="text"
                required
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., Senior React Developer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company *
              </label>
              <input
                type="text"
                required
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., Acme Technologies"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., San Francisco, CA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Mode *
              </label>
              <select
                value={form.workMode}
                onChange={(e) => setForm({ ...form, workMode: e.target.value as Job['workMode'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option>Remote</option>
                <option>Hybrid</option>
                <option>On-site</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source *
              </label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value as Job['source'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option>LinkedIn</option>
                <option>Company Website</option>
                <option>Recruiter</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority *
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Job['priority'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn/Source URL
              </label>
              <input
                type="url"
                value={form.sourceUrl}
                onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Paste the job description here..."
              />
            </div>
          </div>

          <div className="flex gap-4 justify-end border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Add Job
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Summary Card Component
const SummaryCard = ({ title, count, icon, color }: {
  title: string
  count: number
  icon: string
  color: string
}) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <p className={`text-3xl font-bold mt-2 ${color}`}>{count}</p>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </div>
)

// Main App Component
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
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading jobs:', error)
      return
    }

    const mappedJobs: Job[] = (data || []).map(job => ({
      id: String(job.id),
      company: job.company || '',
      position: job.position || '',
      location: job.location || '',
      workMode: job.work_mode || 'Remote',
      fitScore: job.fit_score || 0,
      priority: job.priority || 'Medium',
      status: job.status || 'New',
      dateAdded: job.created_at
        ? job.created_at.split('T')[0]
        : '',
      nextAction: job.next_action || '',
      source: job.source || 'Other',
      sourceUrl: job.source_url || '',
      description: job.description || ''
    }))

    setJobs(mappedJobs)
  }

  loadJobs()
}, [])

  // Filter and search jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.position.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || job.status === statusFilter
    const matchesPriority = priorityFilter === 'All' || job.priority === priorityFilter
    const matchesSource = sourceFilter === 'All' || job.source === sourceFilter
    
    return matchesSearch && matchesStatus && matchesPriority && matchesSource
  })

  // Sort jobs
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === 'fitScore') return b.fitScore - a.fitScore
    if (sortBy === 'company') return a.company.localeCompare(b.company)
    return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
  })

  // Calculate summary stats
  const stats = {
    all: jobs.length,
    interested: jobs.filter(j => j.status === 'Interested').length,
    applied: jobs.filter(j => j.status === 'Applied').length,
    interviews: jobs.filter(j => j.status === 'Interview').length,
    offers: jobs.filter(j => j.status === 'Offer').length
  }

const handleAddJob = async (formData: AddJobForm) => {
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      company: formData.company,
      position: formData.jobTitle,
      location: formData.location,
      work_mode: formData.workMode,
      fit_score: 0,
      priority: formData.priority,
      status: 'New',
      next_action: 'Review and apply',
      source: formData.source,
      source_url: formData.sourceUrl,
      description: formData.description
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding job:', error)
    alert('Could not save the job. Check the browser console.')
    return
  }

  const newJob: Job = {
    id: String(data.id),
    company: data.company || '',
    position: data.position || '',
    location: data.location || '',
    workMode: data.work_mode || 'Remote',
    fitScore: data.fit_score || 0,
    priority: data.priority || 'Medium',
    status: data.status || 'New',
    dateAdded: data.created_at
      ? data.created_at.split('T')[0]
      : new Date().toISOString().split('T')[0],
    nextAction: data.next_action || '',
    source: data.source || 'Other',
    sourceUrl: data.source_url || '',
    description: data.description || ''
  }

  setJobs(currentJobs => [newJob, ...currentJobs])
  setIsModalOpen(false)
}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-indigo-600">JobTrack</h1>
            <div className="flex space-x-8">
              <button className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors border-b-2 border-indigo-600 pb-2">
                Dashboard
              </button>
              <button className="text-gray-600 hover:text-gray-800 transition-colors">Jobs</button>
              <button className="text-gray-600 hover:text-gray-800 transition-colors">Analytics</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Job Dashboard</h2>
            <p className="text-gray-600 mt-1">Manage and track your job applications</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
            Add Job
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <SummaryCard title="All Jobs" count={stats.all} icon="📋" color="text-indigo-600" />
          <SummaryCard title="Interested" count={stats.interested} icon="👁️" color="text-purple-600" />
          <SummaryCard title="Applied" count={stats.applied} icon="✉️" color="text-blue-600" />
          <SummaryCard title="Interviews" count={stats.interviews} icon="🗣️" color="text-yellow-600" />
          <SummaryCard title="Offers" count={stats.offers} icon="🎉" color="text-green-600" />
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by company or position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              >
                <option value="All">Status: All</option>
                <option value="New">Status: New</option>
                <option value="Reviewing">Status: Reviewing</option>
                <option value="Interested">Status: Interested</option>
                <option value="Applied">Status: Applied</option>
                <option value="Interview">Status: Interview</option>
                <option value="Offer">Status: Offer</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              >
                <option value="All">Priority: All</option>
                <option value="High">Priority: High</option>
                <option value="Medium">Priority: Medium</option>
                <option value="Low">Priority: Low</option>
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              >
                <option value="All">Source: All</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Company Website">Website</option>
                <option value="Recruiter">Recruiter</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              >
                <option value="dateAdded">Sort: Newest</option>
                <option value="company">Sort: Company</option>
                <option value="fitScore">Sort: Best Fit</option>
              </select>
            </div>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Mode</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Fit</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date Added</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-indigo-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {job.company}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700">{job.position}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-600">{job.location}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                        {job.workMode}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <FitScoreDisplay score={job.fitScore} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PriorityBadge priority={job.priority} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-600 text-sm">{job.dateAdded}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{job.nextAction}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedJobs.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-600 text-lg">No jobs found matching your filters.</p>
            </div>
          )}
        </div>
      </main>

      {/* Add Job Modal */}
      <AddJobModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddJob}
      />
    </div>
  )
}
