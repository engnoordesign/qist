'use client';
import {useEffect,useState} from 'react';
import {LedgerApp} from './ledger-app';
import {LoginScreen,SetupScreen} from './auth-screens';

type Gate='loading'|'setup'|'login'|'app'|'error';

export default function Home(){
  const [gate,setGate]=useState<Gate>('loading'),[ar,setAr]=useState(false),[error,setError]=useState('');
  async function check(){
    try{setAr(localStorage.getItem('qist-lang')==='ar')}catch{}
    try{
      const r=await fetch('/api/auth',{cache:'no-store'});const d:any=await r.json();
      if(!r.ok)throw Error(d.error||'Unable to reach the server');
      setGate(d.needsSetup?'setup':d.user?'app':'login');
    }catch(e:any){setError(e.message);setGate('error');}
  }
  useEffect(()=>{try{setAr(localStorage.getItem('qist-lang')==='ar')}catch{}check();},[]);
  useEffect(()=>{document.documentElement.lang=ar?'ar':'en';document.documentElement.dir=ar?'rtl':'ltr'},[ar]);
  if(gate==='app')return <LedgerApp onSignedOut={()=>{setGate('loading');check();}}/>;
  if(gate==='setup')return <SetupScreen ar={ar} setAr={setAr} onDone={check}/>;
  if(gate==='login')return <LoginScreen ar={ar} setAr={setAr} onDone={check}/>;
  return <div className="auth-page"><div className="auth-card"><p role={gate==='error'?'alert':undefined}>{gate==='error'?error:(ar?'جارٍ التحميل…':'Loading…')}</p>{gate==='error'&&<button className="secondary" onClick={()=>{setGate('loading');check();}}>{ar?'إعادة المحاولة':'Retry'}</button>}</div></div>;
}
