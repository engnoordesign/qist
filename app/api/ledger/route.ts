import {env} from 'cloudflare:workers';
import {schedule} from '@/lib/ledger';
function db(){const d=(env as any).DB;if(!d)throw Error('Storage unavailable');return d;}
export async function GET(){try {const d=db();const [buyers,contracts,installments]=await d.batch([d.prepare('SELECT * FROM buyers ORDER BY name'),d.prepare('SELECT * FROM contracts ORDER BY created DESC'),d.prepare('SELECT i.*,p.paid_at,p.receipt FROM installments i LEFT JOIN payments p ON p.installment_id=i.id ORDER BY i.due,i.number')]);return Response.json({buyers:buyers.results,contracts:contracts.results,installments:installments.results},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e);return Response.json({error:'Unable to load records. Please retry. / تعذر تحميل البيانات، يرجى المحاولة مجدداً'},{status:503});}}
export async function POST(req:Request){
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Forbidden'},{status:403});
 try{const b:any=await req.json(),d=db();
 if(b.action==='pay'){
 if(typeof b.id!=='string')throw Error('Invalid installment');
 const r=await d.prepare("INSERT INTO payments (installment_id,paid_at,receipt) SELECT id,?,? FROM installments WHERE id=? ON CONFLICT(installment_id) DO NOTHING").bind(new Date().toISOString(),'R-'+crypto.randomUUID().slice(0,8).toUpperCase(),b.id).run();
 if(!r.meta.changes)return Response.json({error:'Already paid or installment missing / القسط مسدد أو غير موجود'},{status:409});return Response.json({ok:true});}
 if(b.action!=='create')throw Error('Invalid action');
 const str=(v:any,max:number)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max)throw Error('Check required fields / تحقق من الحقول المطلوبة');return v.trim();};
 const product=str(b.product,160);if(!['USD','IQD'].includes(b.currency))throw Error('Invalid currency');const factor=b.currency==='USD'?100:1;
 const money=(v:any)=>{const n=Number(v),units=n*factor;if(!Number.isFinite(n)||n<0||n>1e12||Math.abs(units-Math.round(units))>0.0001)throw Error('Invalid amount / مبلغ غير صالح');return Math.round(units);};
 const total=money(b.total),initial=money(b.initial);if(total<=initial)throw Error('Price must exceed initial payment / السعر يجب أن يتجاوز المقدمة');
 const rows=schedule(b.start,Number(b.months),Number(b.period),total-initial,b.amount?money(b.amount):undefined);
 const id='D-'+crypto.randomUUID().slice(0,8).toUpperCase();let buyerId=b.buyerId;const batch=[];
 if(buyerId){if(!await d.prepare('SELECT id FROM buyers WHERE id=?').bind(buyerId).first())throw Error('Buyer not found');}else{buyerId='B-'+crypto.randomUUID().slice(0,8).toUpperCase();batch.push(d.prepare('INSERT INTO buyers (id,name,phone) VALUES (?,?,?)').bind(buyerId,str(b.name,120),String(b.phone||'').slice(0,40)));}
 batch.push(d.prepare('INSERT INTO contracts (id,buyer_id,product,currency,total,initial,months,period,start,created) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,buyerId,product,b.currency,total,initial,Number(b.months),Number(b.period),b.start,new Date().toISOString()));
 for(const r of rows)batch.push(d.prepare('INSERT INTO installments (id,contract_id,number,due,amount) VALUES (?,?,?,?,?)').bind(id+'-'+r.number,id,r.number,r.due,r.amount));
 await d.batch(batch);return Response.json({ok:true,id,buyerId});
 }catch(e){console.error(e);return Response.json({error:e instanceof Error?e.message:'Unable to save / تعذر الحفظ'},{status:400});}}
