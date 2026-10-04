export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function schedule(start:string,months:number,period:number,balance:number,amount?:number){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isFinite(Date.parse(start))||new Date(start+'T12:00:00Z').toISOString().slice(0,10)!==start) throw Error('Invalid starting date / تاريخ غير صالح');
 if(!Number.isInteger(months)||months<1||months>120||!Number.isInteger(period)||period<1||period>months||months%period) throw Error('Months must be 1–120 and divisible by the payment period / الأشهر يجب أن تقبل القسمة على الفترة');
 const n=months/period,regular=amount||Math.ceil(balance/n); if(!Number.isSafeInteger(balance)||balance<=0||!Number.isSafeInteger(regular)||regular<=0||(n-1)*regular>=balance||n*regular<balance)throw Error('Installment amount does not match the term. Use the suggested amount / مبلغ القسط لا يتوافق مع المدة');
 const [y,m,d]=start.split('-').map(Number);return Array.from({length:n},(_,i)=>{const dt=new Date(Date.UTC(y,m-1+i*period,1));dt.setUTCDate(Math.min(d,new Date(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth()+1,0)).getUTCDate()));return {number:i+1,due:dt.toISOString().slice(0,10),amount:i===n-1?balance-regular*(n-1):regular};});
}
/** Due date for an installment appended after `lastDue`, keeping the plan's original day of month. */
export function nextDue(lastDue:string,period:number,start:string){const [y,m]=lastDue.split('-').map(Number),day=Number(start.slice(8,10));const dt=new Date(Date.UTC(y,m-1+period,1));dt.setUTCDate(Math.min(day,new Date(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth()+1,0)).getUTCDate()));return dt.toISOString().slice(0,10);}
