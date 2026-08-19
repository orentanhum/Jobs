import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Opportunity={company:string;position:string;location:string;work_mode?:string;source:string;source_url:string;description?:string}

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
const roleTerms=['program manager','technical program manager','delivery manager','program director','project manager','pmo','delivery lead']
const preferredLocations=['haifa','yokneam','caesarea','netanya','herzliya','raanana','kfar saba','tel aviv','petah tikva','north','sharon','israel','remote']
const profileTerms=[
 ['program management',8],['delivery',8],['technical program',8],['r&d',7],['saas',6],['cloud',5],['aws',5],['azure',5],['devops',5],['ai',5],['artificial intelligence',5],['iot',5],['jira',4],['confluence',4],['datadog',4],['stakeholder',5],['cross-functional',5],['agile',4],['software',4],['hardware',4],['customer',3]
] as const

const norm=(s='')=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
function relevant(o:Opportunity){const title=norm(o.position),loc=norm(o.location);return roleTerms.some(x=>title.includes(x))&&preferredLocations.some(x=>loc.includes(x))}
function fit(o:Opportunity){const text=norm(`${o.position} ${o.description||''}`);let score=62;for(const[t,w]of profileTerms)if(text.includes(t))score+=w;const title=norm(o.position);if(title.includes('program manager')||title.includes('delivery manager'))score+=10;if(norm(o.location).includes('haifa')||norm(o.location).includes('north')||norm(o.location).includes('netanya'))score+=4;return Math.min(98,Math.max(60,score))}

async function fetchRemotive():Promise<Opportunity[]>{
 try{const r=await fetch('https://remotive.com/api/remote-jobs?category=project-management',{headers:{'User-Agent':'JobTrack/1.0'}});if(!r.ok)return[];const d=await r.json();return(d.jobs||[]).map((j:any)=>({company:j.company_name||'Unknown',position:j.title||'',location:j.candidate_required_location||'Remote',work_mode:'Remote',source:'Remotive',source_url:j.url||'',description:(j.description||'').replace(/<[^>]*>/g,' ').slice(0,4000)}))}catch{return[]}
}
async function fetchArbeitnow():Promise<Opportunity[]>{
 try{const r=await fetch('https://www.arbeitnow.com/api/job-board-api',{headers:{'User-Agent':'JobTrack/1.0'}});if(!r.ok)return[];const d=await r.json();return(d.data||[]).map((j:any)=>({company:j.company_name||'Unknown',position:j.title||'',location:j.location||'Remote',work_mode:j.remote?'Remote':'On-site/Hybrid',source:'Arbeitnow',source_url:j.url||'',description:(j.description||'').replace(/<[^>]*>/g,' ').slice(0,4000)}))}catch{return[]}
}

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 try{
  const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const feeds=(await Promise.all([fetchRemotive(),fetchArbeitnow()])).flat().filter(relevant)
  const unique=new Map<string,Opportunity>();for(const o of feeds){const key=o.source_url||`${norm(o.company)}|${norm(o.position)}|${norm(o.location)}`;if(key)unique.set(key,o)}
  const {data:jobs}=await supabase.from('jobs').select('company,position,source_url')
  const {data:candidates}=await supabase.from('job_candidates').select('company,position,source_url')
  const existing=new Set([...(jobs||[]),...(candidates||[])].map((x:any)=>x.source_url||`${norm(x.company)}|${norm(x.position)}`))
  const rows=[...unique.values()].filter(o=>!existing.has(o.source_url||`${norm(o.company)}|${norm(o.position)}`)).map(o=>({...o,fit_score:fit(o),review_status:'New',discovered_at:new Date().toISOString()}))
  let inserted:any[]=[];if(rows.length){const{data,error}=await supabase.from('job_candidates').insert(rows).select();if(error)throw error;inserted=data||[]}
  return new Response(JSON.stringify({ok:true,found:feeds.length,new_opportunities:inserted.length,sources:['Remotive','Arbeitnow']}),{headers:{...cors,'Content-Type':'application/json'}})
 }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:{...cors,'Content-Type':'application/json'}})}
})
