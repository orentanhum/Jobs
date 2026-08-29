import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
const skillMap:[RegExp,string,string][]=[
[/ניהול פרויקטים|מנהלת פרויקטים|מנהל פרויקטים/gi,'Project Management','Management'],
[/ניהול תוכניות|מנהלת תוכניות|מנהל תוכניות/gi,'Program Management','Management'],
[/ניהול צוות|ניהול עובדים|מנהלת צוות/gi,'Team Leadership','Leadership'],
[/ניהול לקוחות|שירות לקוחות|קשרי לקוחות/gi,'Customer Management','Business'],
[/מכירות|פיתוח עסקי/gi,'Sales & Business Development','Business'],
[/משאבי אנוש|גיוס עובדים|גיוס/gi,'Human Resources & Recruiting','People'],
[/הדרכה|הכשרה/gi,'Training & Facilitation','People'],
[/תקציב|תקציבים/gi,'Budget Management','Management'],
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
Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});try{const auth=req.headers.get('Authorization');if(!auth)throw new Error('Authentication required');const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;const userDb=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user},error:ue}=await userDb.auth.getUser();if(ue||!user)throw new Error('Invalid session');const db=createClient(url,service);const {data:p,error:pe}=await db.from('profiles').select('full_name,current_title,professional_summary,cv_file_name,cv_storage_path').eq('id',user.id).single();if(pe||!p?.cv_storage_path)throw new Error('No CV uploaded');const {data:file,error:fe}=await db.storage.from('cvs').download(p.cv_storage_path);if(fe||!file)throw new Error('Could not read CV');const bytes=new Uint8Array(await file.arrayBuffer());let text=stringsFromBinary(bytes);const skills=extractSkills(text);const analysis:any={headline:p.current_title||'Professional Profile',summary:p.professional_summary||'Professional profile extracted from the uploaded CV.',skills:skills.map(x=>x.name),skill_levels:Object.fromEntries(skills.map(x=>[x.name,x.level])),domains:[...new Set(skills.map(x=>x.category))],source_language:/[\u0590-\u05FF]/.test(text)?'Hebrew':'Unknown / English',skills_language:'English',analysis_version:'english-capabilities-v1'};
const apiKey=Deno.env.get('OPENAI_API_KEY');if(apiKey){const prompt=`Analyze this CV. The CV may be Hebrew. Return ONLY JSON with keys headline, summary, strengths, skills, domains, career_highlights, recommended_roles, experience, education, languages, skill_levels. IMPORTANT: every skill/capability, domain, role and professional description must be in English. skill_levels is an object mapping each English skill to an integer 0-100 based only on evidence in the CV. Do not underrate long experience. CV:\n${text.slice(0,30000)}`;const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',messages:[{role:'user',content:prompt}],response_format:{type:'json_object'}})});if(r.ok){const j=await r.json();try{Object.assign(analysis,JSON.parse(j.choices?.[0]?.message?.content||'{}'),{skills_language:'English',source_language:/[\u0590-\u05FF]/.test(text)?'Hebrew':'English',analysis_version:'ai-english-v2'})}catch{}}}
const {error:up}=await db.from('profiles').update({cv_analysis:analysis,cv_analysis_updated_at:new Date().toISOString(),keywords:analysis.skills||[]}).eq('id',user.id);if(up)throw up;return new Response(JSON.stringify({ok:true,skills_count:(analysis.skills||[]).length,skills:analysis.skills,source_language:analysis.source_language,skills_language:'English',analysis_version:analysis.analysis_version}),{headers:{...cors,'Content-Type':'application/json'}})}catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}})
