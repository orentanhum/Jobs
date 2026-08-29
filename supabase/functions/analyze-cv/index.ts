import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
const skillMap:[RegExp,string,string][]=[
[/ניהול פרויקטים|מנהלת פרויקטים|מנהל פרויקטים/gi,'Project Management','Management'],
[/ניהול תוכניות|מנהלת תוכניות|מנהל תוכניות/gi,'Program Management','Management'],
[/ניהול צוות|ניהול עובדים|מנהלת צוות|מפקד צוות/gi,'Team Leadership','Leadership'],
[/ניהול לקוחות|שירות לקוחות|קשרי לקוחות/gi,'Customer Management','Business'],
[/מכירות|פיתוח עסקי/gi,'Sales & Business Development','Business'],
[/משאבי אנוש|גיוס עובדים|גיוס/gi,'Human Resources & Recruiting','People'],
[/הדרכה|הכשרה/gi,'Training & Facilitation','People'],
[/תקציב|תקציבים|תקצוב/gi,'Budget Management','Management'],
[/תשתיות/gi,'Infrastructure Budgeting','Finance'],
[/כלכלה|כלכלן|כלכלית/gi,'Economics','Finance'],
[/אקונומטריקה|econometrics/gi,'Econometrics','Analytical'],
[/stata/gi,'Stata','Tools'],
[/ניתוח סטטיסטי|סטטיסטיקה/gi,'Statistical Analysis','Analytical'],
[/מדיניות ציבורית|public policy/gi,'Public Policy','Government'],
[/ממשלה|משרד ממשלתי|משרד התחבורה/gi,'Government Administration','Government'],
[/רכש|ספקים/gi,'Procurement & Vendor Management','Operations'],
[/תפעול|אופרציה/gi,'Operations Management','Operations'],
[/שיווק|דיגיטל/gi,'Marketing','Business'],
[/אקסל|excel/gi,'Microsoft Excel','Tools'],
[/powerpoint|פאוורפוינט/gi,'Microsoft PowerPoint','Tools'],
[/word|וורד/gi,'Microsoft Word','Tools'],
[/office|אופיס/gi,'Microsoft Office','Tools'],
[/sap/gi,'SAP','Tools'],
[/crm/gi,'CRM','Tools'],
[/אנגלית|english/gi,'English','Languages'],
[/עברית|hebrew/gi,'Hebrew','Languages'],
[/ניתוח נתונים|אנליזה|דוחות/gi,'Data Analysis & Reporting','Analytical'],
[/תכנון|בקרה/gi,'Planning & Control','Management'],
[/משא ומתן/gi,'Negotiation','Business'],
[/עבודה מול ממשקים|ממשקים/gi,'Cross-functional Collaboration','Leadership'],
[/פתרון בעיות/gi,'Problem Solving','Analytical'],
[/תקשורת בין אישית|יחסי אנוש/gi,'Interpersonal Communication','Leadership']]

function stringsFromBinary(bytes:Uint8Array){const out:string[]=[];for(const enc of ['utf-8','utf-16le'] as const){try{const s=new TextDecoder(enc).decode(bytes).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,' ');out.push(s)}catch{}}return out.join('\n')}
function extractSkills(text:string){const seen=new Set<string>();const skills:{name:string,category:string,level:number}[]=[];for(const [re,name,category] of skillMap){re.lastIndex=0;if(re.test(text)&&!seen.has(name)){seen.add(name);skills.push({name,category,level:80})}}return skills}
const cleanArray=(v:any)=>Array.isArray(v)?[...new Set(v.map(x=>String(x||'').trim()).filter(Boolean))]:[]
const merge=(a:any,b:any)=>[...new Set([...cleanArray(a),...cleanArray(b)])]
const text=(v:any)=>typeof v==='string'?v.trim():''
const clamp=(n:any)=>Math.max(0,Math.min(100,Number(n)||0))

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 try{
  const auth=req.headers.get('Authorization');if(!auth)throw new Error('Authentication required')
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const userDb=createClient(url,anon,{global:{headers:{Authorization:auth}}})
  const {data:{user},error:ue}=await userDb.auth.getUser();if(ue||!user)throw new Error('Invalid session')
  const db=createClient(url,service)
  const {data:p,error:pe}=await db.from('profiles').select('*').eq('id',user.id).single();if(pe||!p?.cv_storage_path)throw new Error('No CV uploaded')
  const {data:file,error:fe}=await db.storage.from('cvs').download(p.cv_storage_path);if(fe||!file)throw new Error('Could not read CV')
  const bytes=new Uint8Array(await file.arrayBuffer())
  const rawText=stringsFromBinary(bytes)
  const fallbackSkills=extractSkills(rawText)
  const sourceLanguage=/[\u0590-\u05FF]/.test(rawText)?'Hebrew':'English / Unknown'
  const analysis:any={
   headline:p.current_title||'Professional Profile',
   summary:p.professional_summary||'Professional profile extracted from the uploaded CV.',
   strengths:[],skills:fallbackSkills.map(x=>x.name),
   skill_levels:Object.fromEntries(fallbackSkills.map(x=>[x.name,x.level])),
   domains:[...new Set(fallbackSkills.map(x=>x.category))],career_highlights:[],recommended_roles:[],experience:[],education:[],languages:[],certifications:[],tools:[],industries:[],achievements:[],seniority_levels:[],location_hints:[],search_keywords:[],
   source_language:sourceLanguage,skills_language:'English',analysis_version:'deep-profile-v3',verification:{cv_read:true,ai_used:false,profile_enriched:false}
  }
  const apiKey=Deno.env.get('OPENAI_API_KEY')
  if(apiKey){
   const prompt=`You are the JobTrack CV intelligence engine. Analyze the CV deeply and comprehensively. The CV may be in Hebrew or English. Return ONLY valid JSON.

Required JSON keys:
headline, summary, strengths, skills, domains, career_highlights, recommended_roles, experience, education, languages, certifications, tools, industries, achievements, seniority_levels, location_hints, search_keywords, skill_levels.

Rules:
1. Translate ALL extracted professional capabilities, skills, domains, role names, descriptions, search keywords and recommendations into English even when the CV is Hebrew.
2. Extract AS MUCH useful, evidence-based information as possible: hard skills, soft skills, tools, platforms, methodologies, industries, domains, management capabilities, finance/data/government capabilities, languages, education, certifications, military leadership, customer-facing work and measurable achievements.
3. recommended_roles should contain 12-30 realistic job titles/role families suitable for this candidate, including adjacent roles supported by transferable skills. Do not invent unsupported seniority.
4. search_keywords should contain 25-80 concise English terms useful for job discovery and matching. Include synonyms and domain phrases supported by the CV.
5. skill_levels must map each English skill/capability to an integer 0-100 based only on evidence. Long/repeated experience should score highly. Do not default everything to 80.
6. experience must be an array of objects where possible, with company/organization, title, dates or duration if available, and concise English responsibilities/achievements.
7. education must capture degrees, institutions, fields and relevant coursework when present.
8. seniority_levels should use practical values such as Student, Internship, Entry Level, Junior, Mid, Senior, Manager, Director, Executive only when supported.
9. location_hints should include locations explicitly present in the CV only.
10. Do not fabricate missing facts. If uncertain, omit rather than guess.

CV content:\n${rawText.slice(0,40000)}`
   const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',messages:[{role:'user',content:prompt}],response_format:{type:'json_object'},temperature:0.1})})
   if(r.ok){const j=await r.json();try{const parsed=JSON.parse(j.choices?.[0]?.message?.content||'{}');Object.assign(analysis,parsed,{skills_language:'English',source_language:sourceLanguage,analysis_version:'ai-deep-profile-v3',verification:{cv_read:true,ai_used:true,profile_enriched:false}})}catch{}}
  }
  analysis.skills=merge(fallbackSkills.map(x=>x.name),analysis.skills)
  analysis.strengths=cleanArray(analysis.strengths);analysis.domains=cleanArray(analysis.domains);analysis.career_highlights=cleanArray(analysis.career_highlights);analysis.recommended_roles=cleanArray(analysis.recommended_roles);analysis.languages=cleanArray(analysis.languages);analysis.certifications=cleanArray(analysis.certifications);analysis.tools=cleanArray(analysis.tools);analysis.industries=cleanArray(analysis.industries);analysis.achievements=cleanArray(analysis.achievements);analysis.seniority_levels=cleanArray(analysis.seniority_levels);analysis.location_hints=cleanArray(analysis.location_hints);analysis.search_keywords=cleanArray(analysis.search_keywords)
  const levels:any={};for(const s of analysis.skills)levels[s]=clamp(analysis.skill_levels?.[s]??fallbackSkills.find(x=>x.name===s)?.level??70);analysis.skill_levels=levels
  const derivedKeywords=merge(analysis.skills,merge(analysis.search_keywords,merge(analysis.tools,analysis.domains)))
  const updated:any={
   cv_analysis:analysis,
   cv_analysis_updated_at:new Date().toISOString(),
   keywords:merge(p.keywords,derivedKeywords),
   target_roles:merge(p.target_roles,analysis.recommended_roles),
   seniority_levels:merge(p.seniority_levels,analysis.seniority_levels),
   preferred_locations:cleanArray(p.preferred_locations).length?cleanArray(p.preferred_locations):analysis.location_hints,
   current_title:text(p.current_title)||text(analysis.headline),
   professional_summary:text(p.professional_summary)||text(analysis.summary),
   updated_at:new Date().toISOString()
  }
  analysis.verification={cv_read:true,ai_used:analysis.analysis_version==='ai-deep-profile-v3',profile_enriched:true,skills_count:analysis.skills.length,target_roles_count:updated.target_roles.length,keywords_count:updated.keywords.length}
  updated.cv_analysis=analysis
  const {error:up}=await db.from('profiles').update(updated).eq('id',user.id);if(up)throw up
  return new Response(JSON.stringify({ok:true,skills_count:analysis.skills.length,roles_count:updated.target_roles.length,keywords_count:updated.keywords.length,skills:analysis.skills,target_roles:updated.target_roles,keywords:updated.keywords,seniority_levels:updated.seniority_levels,current_title:updated.current_title,professional_summary:updated.professional_summary,source_language:analysis.source_language,skills_language:'English',analysis_version:analysis.analysis_version,verification:analysis.verification}),{headers:{...cors,'Content-Type':'application/json'}})
 }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}
})
