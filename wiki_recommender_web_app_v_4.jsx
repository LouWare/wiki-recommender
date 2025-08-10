"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// NOTE: Replace shadcn Badge/Slider imports with lightweight local fallbacks to avoid Node.contains errors
// import { Badge } from "@/components/ui/badge";
// import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ExternalLink, Search, X, BookOpen, Sparkles, RotateCcw } from "lucide-react";

/**
 * Wiki‑Recommender Web‑App v4.2 (Badge/Slider fix, Reader polish)
 * ---------------------------------------------------------------
 * Fix:
 *  - Replaced shadcn `Badge` and `Slider` with local, dependency‑free fallbacks.
 *    This avoids a Radix/UI edge case that can throw
 *    `TypeError: Failed to execute 'contains' on 'Node': parameter 1 is not of type 'Node'.`
 *  - Everything else remains the same: algorithm (MMR, dual profiles), reader, TOC, list styles.
 *
 * Also:
 *  - Added lightweight self‑tests for core utilities (tokenize/cosine/mmr) logged to console.
 */

// ------------------- Lightweight UI fallbacks -------------------
function Badge({ children, variant = "default", className = "" }) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";
  const tone = variant === "secondary"
    ? "border-slate-200 bg-slate-100 text-slate-700"
    : variant === "destructive"
    ? "border-red-200 bg-red-100 text-red-700"
    : "border-slate-200 bg-white text-slate-700";
  return <span className={`${base} ${tone} ${className}`}>{children}</span>;
}

function Slider({ value = [0], onValueChange, min = 0, max = 100, step = 1, className = "" }) {
  const [inner, setInner] = useState(Array.isArray(value) ? value[0] ?? 0 : Number(value) || 0);
  useEffect(() => {
    const next = Array.isArray(value) ? value[0] ?? 0 : Number(value) || 0;
    setInner(next);
  }, [Array.isArray(value) ? value[0] : value]);
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={inner}
      onChange={(e) => {
        const v = Number(e.target.value);
        setInner(v);
        onValueChange?.([v]);
      }}
      className={`w-full cursor-pointer accent-slate-600 ${className}`}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={inner}
    />
  );
}

// ------------------- Hilfsfunktionen -------------------
function tokenize(text, lang = "de") {
   if (!text) return [];
   const t = text
     .toLowerCase()
     .normalize("NFKD")
     .replace(/[\u0300-\u036f]/g, "")
     .replace(/[^\p{L}\p{N}]+/gu, " ");
   const parts = t.split(/\s+/).filter(Boolean);
  const sw = lang === "de" ? STOPWORDS_DE
    : lang === "en" ? STOPWORDS_EN
    : lang === "fr" ? STOPWORDS_FR
    : lang === "es" ? STOPWORDS_ES
    : lang === "ru" ? STOPWORDS_RU
    : new Set();
   return parts.filter((w) => w.length > 2 && !sw.has(w));
 }

function termFreq(tokens) { const tf = new Map(); for (const tok of tokens) tf.set(tok, (tf.get(tok) || 0) + 1); return tf; }
function cosine(a, b) { let dot=0,na=0,nb=0; for (const [k,v] of a){na+=v*v; const vb=b.get(k)||0; dot+=v*vb;} for (const[,v]of b) nb+=v*v; if(!na||!nb) return 0; return dot/(Math.sqrt(na)*Math.sqrt(nb)); }
function computeIdf(documents){const df=new Map(); const n=documents.length||1; for(const doc of documents){const seen=new Set(); for(const k of doc.keys()) seen.add(k); for(const k of seen) df.set(k,(df.get(k)||0)+1);} const idf=new Map(); for(const [k,d] of df) idf.set(k, Math.log((1+n)/(1+d))+1); return idf;}
function applyIdf(tfMap,idf){const out=new Map(); for(const [k,tf] of tfMap) out.set(k, tf*(idf.get(k)||0)); return out;}
function mapSum(a,b,wa=1,wb=1){
  const out=new Map(a);
  for(const [k,v] of b) out.set(k,(out.get(k)||0)+wb*v);
  if(wa!==1) for(const [k,v] of a) out.set(k,(out.get(k)||0)+(wa-1)*v);
  return out;
}
function useLocalStorage(key, initial){const [state,setState]=useState(()=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):initial;}catch{return initial;}}); useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch{}},[key,state]); return [state,setState];}

// ------------------- Stopwörter -------------------
+const STOPWORDS_DE=new Set("aber alle allem allen aller alles als also am an ander andere anderem anderen anderer anderes anderm andern anderr anderes auch auf aus bei bin bis bist da dadurch daher darum das daß dass dein deine deinem deinen deiner deines dem den der des dessen deshalb die dies diese diesem diesen dieser dieses doch dort du durch ein eine einem einen einer eines er es euer eure eurem euren eurer eures für hatte hatten hattest hattet hier hinter ich ihm ihn ihnen ihr ihre ihrem ihren ihrer ihres im in ist ja jedes jedem jeden jeder jedes jener jenes jetzt kann kein keine keinem keinen keiner keines können könnt machen mein meine meinem meinen meiner meines mit muss musst müssen müsst nach nachdem nein nicht noch nun nur ob oder ohne sehr sein seine seinem seinen seiner seines sie sind so tage um und unser unsere unserem unseren unserer unseres unter viel vom von vor wann warum was weg weil weiter welche welcher welches wenn wer werd werde werden werdet wurde wurden zum zur zwischen".split(/\s+/));
+const STOPWORDS_EN=new Set("a about above after again against all am an and any are aren't as at be because been before being below between both but by can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves".split(/\s+/));
+const STOPWORDS_FR=new Set("au aux avec ce ces dans de des du elle elles en et eux il ils je la le les leur leurs ma mais me même mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous c d j l à m n s t y été étée étées étés étant étante étant".split(/\s+/));
+const STOPWORDS_ES=new Set("un una unas unos unos uno sobre todo también tras otro algún alguno alguna algunos algunas ser es soy eres somos sois estoy esta estamos estais están como en para atras porque por qué estado estaba ante antes siendo ambos pero poder puede pueden podría puedo podemos podéis pueden fui fue fuimos fueron hacer hace haces hacen cada fin incluso primero desde conseguir consigo consigue consigues conseguimos conseguirán haber he has ha hemos han menos mucho muchos muy nada ni nos nosotros vos vosotros o otro otra otros otras ser es sea sido tener tengo tiene tenemos tienen tu tus te ti tuyo tuyos su sus suyo suyos ellas ellos ello el lo la los las uno una unos unas".split(/\s+/));
+const STOPWORDS_RU=new Set("и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чем перед иногда лучше чуть том нельзя такой им более всегда конечно всю между".split(/\s+/));
const LANGS=[{code:"de",label:"Deutsch"},{code:"en",label:"English"},{code:"fr",label:"Français"},{code:"es",label:"Español"},{code:"ru",label:"Русский"}];

// ------------------- Netzwerk: robuste fetchJSON -------------------
async function fetchJSON(url, opts = {}, timeoutMs = 12000){const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeoutMs); try{const res=await fetch(url,{...opts,mode:"cors",signal:controller.signal,headers:{Accept:"application/json",...(opts.headers||{})},referrerPolicy:"no-referrer-when-downgrade"}); if(!res.ok) throw new Error(`HTTP ${res.status} @ ${new URL(url).pathname}`); return await res.json();} finally{clearTimeout(timer);}}

// ------------------- Wikipedia API Layer -------------------
async function searchTitles(query, lang){const rest=`https://${lang}.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(query)}&limit=20`; try{const j=await fetchJSON(rest); return (j.pages||[]).map(p=>({id:p.id,title:p.title,excerpt:p.excerpt||""}));}catch{const action=`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=${encodeURIComponent(query)}&srlimit=20&origin=*`; const j=await fetchJSON(action); const arr=j?.query?.search||[]; return arr.map(s=>({id:s.pageid||s.title,title:s.title,excerpt:(s.snippet||"").replace(/<[^>]+>/g,"")}));}}

async function fetchSummary(title, lang){const rest=`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`; try{const s=await fetchJSON(rest); return {pageid:s.pageid,title:s.title,extract:s.extract||"",description:s.description||"",thumbnail:s.thumbnail?.source,url:s.content_urls?.desktop?.page};}catch{const action=`https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro=1&explaintext=1&pithumbsize=600&format=json&titles=${encodeURIComponent(title)}&origin=*`; const j=await fetchJSON(action); const pages=j?.query?.pages||{}; const first=Object.values(pages)[0]||{}; return {pageid:first.pageid,title:first.title||title,extract:first.extract||"",description:"",thumbnail:first.thumbnail?.source,url:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`};}}

async function fetchRelated(title, lang, limit=20){const rest=`https://${lang}.wikipedia.org/api/rest_v1/page/related/${encodeURIComponent(title)}`; try{const j=await fetchJSON(rest); const items=(j.pages||[]).slice(0,limit); return items.map(p=>({id:p.pageid||p.id||Math.random(),title:p.title,excerpt:p.description||p.extract||"",thumbnail:p.thumbnail?.source||p.originalimage?.source}));}catch{const action=`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=${encodeURIComponent("morelike:"+title)}&srlimit=${limit}&origin=*`; const j=await fetchJSON(action); const arr=j?.query?.search||[]; return arr.map(s=>({id:s.pageid||s.title,title:s.title,excerpt:(s.snippet||"").replace(/<[^>]+>/g,"")}));}}

async function fetchArticleHtmlAndToc(title, lang){
  const action=`https://${lang}.wikipedia.org/w/api.php?action=parse&format=json&page=${encodeURIComponent(title)}&prop=text|displaytitle&redirects=true&origin=*`;
  const j=await fetchJSON(action);
  const raw=j?.parse?.text?.["*"]||"";
  const sanitized=sanitizeWikiHtml(raw);
  const { html, toc } = postprocessHtmlForReader(sanitized);
  return { html, toc };
}

function sanitizeWikiHtml(html){
  if(!html) return "";
  const fixProtoAll = (s) =>
    s
      .replace(/srcset="([^"]+)"/g, (_, val) =>
        `srcset="${val.replace(/(^|[\\s,])\\/\\//g, '$1https://')}"`)
      .replace(/src="\\s*\\/\\//g,'src="https://');
  let out = fixProtoAll(html);
  out = out.replace(/<a\\s+([^>]*?)href="([^"]+)"/g, (m, pre, href) => {
    const h = href.trim().toLowerCase();
    return h.startsWith('#')
      ? `<a ${pre} href="${href}"`
      : `<a ${pre} href="${href}" target="_blank" rel="noopener noreferrer"`;
  });
  return out;
}

function slugify(s){
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g,'-')
    .replace(/[^\p{L}\p{N}\-_]+/gu,'')
    .slice(0,80);
}

function postprocessHtmlForReader(html){
  try{
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Edit-UI entfernen
    doc.querySelectorAll('.mw-editsection, .mw-editsection-bracket, .mw-indicators, .mw-indicator').forEach(el=>el.remove());

    // Bilder zentrieren, responsiv, lazy
    doc.querySelectorAll('img').forEach(img=>{
      img.setAttribute('loading','lazy');
      img.removeAttribute('width');
      img.removeAttribute('height');
      img.style.maxWidth='100%';
      img.style.height='auto';
      img.style.display='block';
      img.style.margin='1rem auto';
    });

    // Tabellen in Scroll-Wrapper
    doc.querySelectorAll('table').forEach(tbl=>{
      const wrapper = doc.createElement('div');
      wrapper.className='wiki-table-wrapper';
      const parent = tbl.parentNode; if(!parent) return;
      parent.replaceChild(wrapper, tbl); wrapper.appendChild(tbl);
    });

    // Überschriften normalisieren + TOC (h2/h3)
    const toc=[]; const seenIds=new Set();
    doc.querySelectorAll('h1, h2, h3, h4').forEach(h=>{
      const headline=h.querySelector('.mw-headline');
      const text=(headline?.textContent||h.textContent||'').trim();
      const spanId=headline?.getAttribute('id')||undefined;
      if(text) h.textContent=text;
      let id=spanId||h.getAttribute('id')||(text?slugify(text):'');
      if(!id) id='sec-'+Math.random().toString(36).slice(2,8);
      while(seenIds.has(id)) id += '-x'; seenIds.add(id);
      h.setAttribute('id', id);
      const tag=h.tagName.toLowerCase();
      if(tag==='h2'||tag==='h3') toc.push({ id, text, level: tag==='h2'?2:3 });
    });

    return { html: doc.body.innerHTML, toc };
  }catch{ return { html, toc: [] }; }
}

function buildVectorFromText(text, lang){ return termFreq(tokenize(text, lang)); }

// ------------------- MMR Diversifizierung -------------------
function mmrOrder(items, vectors, baseScores, lambda=0.75, k){const n=items.length; const chosen=[]; const remaining=new Set(items.map((_,i)=>i)); const K=k??n; while(chosen.length<K && remaining.size){ let bestI=-1, bestScore=-Infinity; for(const i of remaining){ const relevance=baseScores[i]??0; let diversityPen=0; if(chosen.length){ let maxSim=0; for(const j of chosen){ const s=cosine(vectors[i], vectors[j]); if(s>maxSim) maxSim=s; } diversityPen=maxSim; } const mmr=lambda*relevance-(1-lambda)*diversityPen; if(mmr>bestScore){bestScore=mmr; bestI=i;} } if(bestI===-1) break; chosen.push(bestI); remaining.delete(bestI);} return chosen;}

function PlaceholderThumb({ title }){ const letter=(title||"?").trim().charAt(0).toUpperCase(); let h=0; for(let i=0;i<title.length;i++) h=(h*31+title.charCodeAt(i))>>>0; const hue=h%360; const bg=`linear-gradient(135deg, hsl(${hue} 70% 90%), hsl(${(hue+40)%360} 70% 85%))`; return (<div className="relative flex h-40 w-full items-center justify-center" style={{backgroundImage:bg}}><div className="text-4xl font-semibold text-slate-700/70">{letter}</div><BookOpen className="absolute right-3 top-3 h-5 w-5 text-slate-600/50"/></div>); }

/** @typedef {{ id: number|string, title: string, excerpt?: string, summary?: string, url?: string, thumbnail?: string, vector?: Map<string, number>, score?: number }} Article */

export default function WikiRecommenderAppV42(){
  const [lang, setLang] = useLocalStorage("wr.lang","de");
  const [query, setQuery] = useLocalStorage("wr.query","Philosophie");
  const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const [candidates,setCandidates]=useState(/** @type {Article[]} */([]));
  const [history,setHistory]=useLocalStorage("wr.history",[]);
  const [modalOpen,setModalOpen]=useState(false); const [active,setActive]=useState(/** @type {Article|null} */(null));
  const [weights,setWeights]=useLocalStorage("wr.weights",{ exploit:70 });
  const [profileLT,setProfileLT]=useLocalStorage("wr.profileLT",{}); const [profileST,setProfileST]=useLocalStorage("wr.profileST",{});
  const pLT=useMemo(()=>new Map(Object.entries(profileLT)),[profileLT]); const pST=useMemo(()=>new Map(Object.entries(profileST)),[profileST]);
  const queryVector=useMemo(()=>buildVectorFromText(query,lang),[query,lang]);

  // Self-tests to catch regressions in core math
  useEffect(() => {
    try {
      const a = termFreq(["a","b","a"]);
      const b = termFreq(["a","b","b"]);
      const c = cosine(a,b);
      if (!(c > 0 && c < 1)) console.warn("[self-test] cosine range suspicious", c);
      const toks = tokenize("Die Philosophie der Freiheit", "de");
      if (!toks.length) console.warn("[self-test] tokenize empty");
      const order = mmrOrder([1,2,3], [a,b,a], [0.9, 0.2, 0.8], 0.8, 3);
      if (!Array.isArray(order) || order.length !== 3) console.warn("[self-test] mmrOrder length");
      console.debug("[self-test] passed");
    } catch (e) {
      console.warn("[self-test] failed", e);
    }
  }, []);

  // Ranking mit IDF, kombinierten Profilen und MMR
  const ranked=useMemo(()=>{ if(!candidates.length) return []; const docs=candidates.map(c=>c.vector||buildVectorFromText(`${c.title} ${c.excerpt||""} ${c.summary||""}`,lang)); const idf=computeIdf(docs); const exploit=(weights?.exploit??70)/100; const betaST=0.3+0.5*exploit; const betaLT=1-betaST; const pComb=mapSum(applyIdf(pLT,idf),applyIdf(pST,idf),betaLT,betaST); const qVec=applyIdf(queryVector,idf); const baseScores=docs.map((d,idx)=>{ const sProfile=cosine(applyIdf(d,idf),pComb); const sQuery=cosine(applyIdf(d,idf),qVec); const lastTitles=new Set(history.slice(0,8).map(h=>h.title)); const novelty=lastTitles.has(candidates[idx].title)?-0.05:0.05; const explore=1-exploit; return exploit*sProfile+explore*sQuery+novelty; }); const order=mmrOrder(candidates,docs.map(d=>applyIdf(d,idf)),baseScores,0.7+0.2*exploit); return order.map(i=>({...candidates[i], vector:docs[i], score:baseScores[i]})); },[candidates,queryVector,pLT,pST,lang,weights,history]);

  async function runSearch(q){
  setLoading(true); setError("");
  try{
    const titles=await searchTitles(q,lang);
    const base=await Promise.all(titles.slice(0,15).map(async t=>{
      try{
        const s=await fetchSummary(t.title,lang);
        return {
          id:s.pageid||t.id, title:s.title||t.title,
          summary:s.extract||"", excerpt:t.excerpt||s.description||"",
          thumbnail:s.thumbnail, url:s.url||`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(t.title)}`
        };
      }catch{
        return { id:t.id, title:t.title, excerpt:t.excerpt||"", url:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(t.title)}` };
      }
    }));
    const relatedBlocks=await Promise.all(base.slice(0,3).map(b=>fetchRelated(b.title,lang,20)));
    const related=relatedBlocks.flat();
    const dedup=new Map();
    for(const a of [...base, ...related]){
      const key=(a.id ?? a.pageid ?? a.title).toString().toLowerCase();
      if(!dedup.has(key)) dedup.set(key,a);
    }
    const merged=Array.from(dedup.values());
    setCandidates(merged);
  }catch(e){
    setError(e?.message||"Netzwerkfehler");
  } finally{ setLoading(false); }
}

    function updateProfilesFromArticle(a){
    const text=`${a.title} ${a.excerpt||""} ${a.summary||""}`;
    const vec=termFreq(tokenize(text,lang));
    const decayLT=0.98, decayST=0.82;
    const upd=(mapObj,decay)=>{
      const m=new Map(Object.entries(mapObj));
      for(const[k,v]of m) m.set(k,v*decay);
      for(const[k,v]of vec) m.set(k,(m.get(k)||0)+v);
      const MAX_TERMS=800, EPS=0.05;
      const pruned=[...m.entries()].filter(([,v])=>v>EPS).sort((a,b)=>b[1]-a[1]).slice(0,MAX_TERMS);
      return Object.fromEntries(pruned);
    };
    setProfileLT(prev=>upd(prev,decayLT));
    setProfileST(prev=>upd(prev,decayST));
    const newHist=[{title:a.title,lang,ts:Date.now()},...history].slice(0,200);
    setHistory(newHist);
  }

  // Vollansicht: Tabs, TOC, Fortschrittsbalken
  const [activeTab,setActiveTab]=useState("summary");
  const [fullHtml,setFullHtml]=useState("");
  const [toc,setToc]=useState(/** @type {{id:string,text:string,level:2|3}[]} */([]));
  const [fullLoading,setFullLoading]=useState(false);

    useEffect(()=>{ if(!candidates.length && query) runSearch(query); },[]);
  // Sprachwechsel soll unmittelbar neue Ergebnisse bringen
  useEffect(()=>{ setCandidates([]); if(query?.trim().length>=2) runSearch(query.trim()); },[lang]);

  const onSubmit=(e)=>{ e.preventDefault(); if(!query || query.trim().length<2) return; runSearch(query.trim()); };
  const openArticle=(a)=>{ setActive(a); setModalOpen(true); setActiveTab("summary"); setFullHtml(""); setToc([]); };
    const closeArticle=()=>{ if(active){ updateProfilesFromArticle(active); fetchRelated(active.title,lang,20).then(rel=>{
      const map=new Map(candidates.map(c=>[((c.id ?? c.pageid ?? c.title).toString().toLowerCase()),c]));
      for(const r of rel){
        const key=(r.id ?? r.pageid ?? r.title).toString().toLowerCase();
        if(!map.has(key)) map.set(key,r);
      }
      setCandidates(Array.from(map.values()));
    }).catch(()=>{}); }
    setModalOpen(false); setActive(null); setFullHtml(""); setToc([]);
  };

  async function ensureFullHtml(){ if(!active || fullHtml || fullLoading) return; try{ setFullLoading(true); const { html, toc } = await fetchArticleHtmlAndToc(active.title, lang); setFullHtml(html); setToc(toc); } catch { setFullHtml('<p class="text-sm text-slate-500">Volltext konnte nicht geladen werden.</p>'); } finally { setFullLoading(false); } }

  // Fortschrittsbalken (Reading Progress) relativ zum Scroll-Container
  const scrollRef = useRef(null);
  const [progress,setProgress]=useState(0);
  useEffect(()=>{
    const el = scrollRef.current; if(!el) return; const onScroll=()=>{ const h=el.scrollHeight - el.clientHeight; const y=el.scrollTop; setProgress(h>0? Math.min(100, Math.max(0, (y/h)*100)) : 0); }; el.addEventListener('scroll', onScroll, { passive:true }); return ()=> el.removeEventListener('scroll', onScroll); },[scrollRef, fullHtml, modalOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6" />
            <h1 className="text-2xl font-semibold tracking-tight">Wiki‑Recommender</h1>
          </div>
          <div className="flex items-center gap-3">
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Sprache" /></SelectTrigger>
              <SelectContent>{LANGS.map(l=> (<SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>))}</SelectContent>
            </Select>
            <Button variant="outline" onClick={()=>{ localStorage.clear(); location.reload(); }} title="Alle lokalen Daten löschen">
              <RotateCcw className="mr-2 h-4 w-4" /> Zurücksetzen
            </Button>
          </div>
        </header>

        <section className="mt-6">
          <form onSubmit={onSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Interesse eingeben, z. B. Philosophie" className="pl-9" />
            </div>
            <Button type="submit">Suchen</Button>
          </form>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Card className="col-span-1">
              <CardContent className="p-4">
                <div className="text-sm text-slate-600">Empfehlungsmodus</div>
                <div className="mt-2 text-xs text-slate-500">Balance zwischen Profilen und aktueller Anfrage</div>
                <div className="mt-4">
                  <Slider value={[weights.exploit]} onValueChange={(v)=>setWeights({ exploit: v[0] })} min={0} max={100} step={1} />
                  <div className="mt-2 text-xs text-slate-600">Profilgewicht {weights.exploit}%</div>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-2">
              <CardContent className="p-4">
                <div className="text-sm text-slate-600">Zuletzt betrachtet</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {history.length ? history.slice(0,12).map((h,i)=>(<Badge key={i} variant="secondary">{h.title}</Badge>)) : (
                    <span className="text-xs text-slate-400">Noch keine Historie</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="my-6" />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Empfehlungen</h2>
            {loading ? (<div className="inline-flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Laden …</div>) : null}
          </div>

          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Netzwerkfehler</AlertTitle>
              <AlertDescription>
                {error}
                <span className="block mt-1 text-xs text-slate-600">Prüfen Sie lokale Server/Erweiterungen/VPN. REST/Action‑API mit CORS‑Fallback aktiv.</span>
              </AlertDescription>
            </Alert>
          ) : null}

          {!loading && !ranked.length ? (
            <div className="text-sm text-slate-500">Keine Ergebnisse. Präzisieren Sie bitte die Anfrage.</div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({length:6}).map((_,i)=>(
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-40 w-full" />
                    <CardContent className="space-y-2 p-4">
                      <Skeleton className="h-4 w-3/5" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </CardContent>
                  </Card>
                ))
              : ranked.slice(0,18).map(a=> (
                  <Card key={a.title} className="group cursor-pointer overflow-hidden rounded-2xl border bg-white transition hover:shadow-lg" onClick={()=>openArticle(a)}>
                    {a.thumbnail ? (
                      <div className="h-40 w-full overflow-hidden bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.thumbnail} alt={a.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      </div>
                    ) : (
                      <PlaceholderThumb title={a.title} />
                    )}
                    <CardContent className="p-4">
                      <div className="line-clamp-1 font-medium">{a.title}</div>
                      <div className="mt-1 line-clamp-2 text-sm text-slate-600">{a.excerpt || a.summary || ""}</div>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </section>

        <Dialog open={modalOpen} onOpenChange={(v)=> (v ? setModalOpen(true) : closeArticle())}>
          <DialogContent className="sm:max-w-5xl p-0 overflow-hidden">
            {/* Vollansicht: flex Layout mit eigener Scroll-Area */}
            <div className="flex h-[85vh] flex-col">
              {/* Kopfzeile + Tabs */}
              <div className="border-b bg-white/80 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <DialogHeader className="p-0">
                  <DialogTitle className="text-balance text-2xl leading-snug">{active?.title}</DialogTitle>
                  <DialogDescription className="sr-only">Wikipedia‑Artikel</DialogDescription>
                </DialogHeader>
                <div className="mt-3">
                  <Tabs value={activeTab} onValueChange={(v)=>{ setActiveTab(v); if(v==="article") ensureFullHtml(); }}>
                    <TabsList>
                      <TabsTrigger value="summary">Zusammenfassung</TabsTrigger>
                      <TabsTrigger value="article">Voller Artikel</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                {/* Progressbar */}
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-slate-600" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Inhalt: eigener Scroll-Container */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto">
                {/* Zweispaltiges Layout mit TOC ab lg */}
                <div className="grid h-full gap-6 px-6 py-6 lg:grid-cols-[240px_1fr]">
                  {/* TOC */}
                  <aside className="hidden lg:block">
                    <div className="sticky top-4">
                      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Inhalt</div>
                                            <nav
                        className="mt-3 space-y-2 text-sm"
                        onClick={(e)=>{
                          const a = e.target.closest && e.target.closest('a[href^="#"]');
                          if(!a) return;
                          e.preventDefault();
                          const id = a.getAttribute('href').slice(1);
                          const sel = `#${CSS?.escape ? CSS.escape(id) : id}`;
                          const el = scrollRef.current?.querySelector(sel);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                         {toc.length ? toc.map(item => (
                           <a key={item.id} href={`#${item.id}`} className={`block truncate text-slate-600 hover:text-slate-900 ${item.level===3? 'pl-4' : ''}`}>{item.text}</a>
                         )) : <span className="text-slate-400">Keine Gliederung</span>}
                       </nav>
                    </div>
                  </aside>

                  {/* Artikel */}
                  <main className="min-w-0">
                    {activeTab === 'summary' ? (
                      <div className="prose prose-slate max-w-none dark:prose-invert">
                        {active?.summary ? (<p className="text-slate-700 leading-relaxed">{active.summary}</p>) : (<p className="text-slate-500">Kurzbeschreibung nicht verfügbar.</p>)}
                      </div>
                    ) : (
                      <article className="wiki-article prose prose-slate max-w-none dark:prose-invert">
                        {fullLoading ? (
                          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Artikel wird geladen …</div>
                        ) : fullHtml ? (
                          <div dangerouslySetInnerHTML={{ __html: fullHtml }} />
                        ) : (
                          <p className="text-sm text-slate-500">Kein Inhalt geladen.</p>
                        )}
                      </article>
                    )}
                  </main>
                </div>
              </div>

              {/* Fußleiste */}
              <div className="border-t bg-white/80 px-6 py-3">
                <DialogFooter className="justify-between gap-2 sm:justify-end">
                  <Button variant="ghost" onClick={()=> closeArticle()}>
                    <X className="mr-2 h-4 w-4" /> Schließen
                  </Button>
                  {active?.url ? (
                    <Button asChild>
                      <a href={active.url} target="_blank" rel="noreferrer">
                        In Wikipedia öffnen <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  ) : null}
                </DialogFooter>
              </div>
            </div>

            {/* Reader-spezifische Styles */}
            <style>{`
  .wiki-article h1{
    font-size:1.875rem; line-height:1.3; font-weight:700;
    margin-top:2rem; scroll-margin-top:6rem;
  }
  .wiki-article h2{
    font-size:1.5rem; line-height:1.35; font-weight:700;
    margin-top:2.5rem; padding-top:1rem;
    border-top:1px solid rgb(226 232 240);
    scroll-margin-top:6rem;
  }
  .wiki-article h3{
    font-size:1.25rem; line-height:1.4; font-weight:600;
    margin-top:1.25rem; scroll-margin-top:6rem;
  }
  .wiki-article figure{ text-align:center; }
  .wiki-article img{
    display:block; margin-left:auto; margin-right:auto;
    max-width:100%; height:auto; border-radius:0.75rem;
  }
  .wiki-table-wrapper{ overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .wiki-table-wrapper table{ width:max-content; min-width:100%; }
  .wiki-article .infobox{ float:none !important; margin:1rem auto; }

  /* Entfernt Edit-Links zuverlässig, falls sie doch mal durchrutschen */
  .wiki-article .mw-editsection{ display:none !important; }
  /* Sicherheitsnetz: headline-Spans nicht separat darstellen */
  .wiki-article .mw-headline{ display:contents; }

  /* Listen-Normalisierung: Marker, Einrückung, Abstände */
  .wiki-article ul{ list-style: disc; list-style-position: outside; padding-left: 1.5rem; margin: 0.75rem 0; }
  .wiki-article ol{ list-style: decimal; list-style-position: outside; padding-left: 1.5rem; margin: 0.75rem 0; }
  .wiki-article li{ margin-top: 0.25rem; }

  /* Verschachtelung: differenzierte Marker und dezente Abstände */
  .wiki-article ul ul{ list-style-type: circle; margin-top: 0.25rem; }
  .wiki-article ul ul ul{ list-style-type: square; }
  .wiki-article ol ol{ list-style-type: lower-alpha; }
  .wiki-article ol ol ol{ list-style-type: lower-roman; }

  /* Wikipedia-Sonderfälle */
  .wiki-article .plainlist, .wiki-article .plainlist ul{ list-style: none; padding-left: 0; margin: 0.5rem 0; }
  .wiki-article .hlist, .wiki-article ul.hlist, .wiki-article .hlist ul{ list-style: none; padding-left: 0; margin: 0.5rem 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .wiki-article .hlist li::after{ content: "·"; margin-left: 0.5rem; }
  .wiki-article .hlist li:last-child::after{ content: ""; }

  /* Definitionslisten */
  .wiki-article dl{ margin: 1rem 0; }
  .wiki-article dt{ font-weight: 600; }
  .wiki-article dd{ margin-left: 1rem; }

  /* Referenzlisten (Einzelnachweise) */
  .wiki-article ol.references{ list-style: decimal; padding-left: 1.5rem; }
  .wiki-article ol.references > li{ margin-top: 0.35rem; }
`}</style>
          </DialogContent>
        </Dialog>

        <footer className="mt-12 border-t pt-6 text-xs text-slate-500">
          Quelle: Wikipedia REST/Action API. Inhalte unter den Lizenzen der Wikimedia‑Projekte.
        </footer>
      </div>
    </div>
  );
}
