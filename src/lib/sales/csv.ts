import {SalesInputError} from './input-error.ts';
// Bounded RFC4180-style parser: quoted newlines/commas, escaped quotes, BOM.
export function parseCsv(input:string){
 if(new TextEncoder().encode(input).length>1_500_000)throw new SalesInputError('Import a CSV of up to 1.5 MB / 1,000 prospects per batch.');
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,afterQuote=false;
 input=input.replace(/^\uFEFF/,'');
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(quoted){if(c==='"'){if(input[i+1]==='"'){cell+='"';i++;}else{quoted=false;afterQuote=true;}}else cell+=c;}
  else if(c==='"'){if(cell||afterQuote)throw new SalesInputError('Malformed CSV quoting.');quoted=true;}
  else if(c===','||c==='\n'||c==='\r'){
   row.push(cell);cell='';afterQuote=false;
   if(c!==','){if(c==='\r'&&input[i+1]==='\n')i++;if(row.some(x=>x.trim()))rows.push(row);row=[];}
  }else {if(afterQuote&&!/\s/.test(c))throw new SalesInputError('Unexpected text after a quoted CSV field.');if(!afterQuote)cell+=c;}
  if(cell.length>10000||rows.length>1001||row.length>200)throw new SalesInputError('CSV exceeds safe batch or field limits.');
 }
 if(quoted)throw new SalesInputError('CSV has an unclosed quoted field.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length<2||rows.length>1001)throw new SalesInputError('Include a header and 1–1,000 data rows.');return rows;
}
const aliases:Record<string,string[]>={company_name:['company_name','legal_name','legal name'],contact_name:['contact_name','contact person','contact'],usdot:['usdot','dot_number','usdot number'],phone:['phone','telephone'],email:['email','email_address'],city:['city','phy_city'],state:['state','phy_state'],registration_date:['registration_date','add_date'],fleet_size:['fleet_size','nbr_power_unit','power_units'],notes:['notes','call notes']};
export function importProspects(csv:string){
 const all=parseCsv(csv),headers=all.shift()!.map(h=>h.trim().toLowerCase());if(new Set(headers).size!==headers.length)throw new SalesInputError('CSV headers must be unique.');
 const index=Object.fromEntries(Object.entries(aliases).map(([key,names])=>[key,headers.findIndex(h=>names.includes(h))]));
 if(index.company_name<0||index.usdot<0)throw new SalesInputError('Required headers: LEGAL_NAME/company_name and DOT_NUMBER/usdot.');
 const seen=new Set<string>(),rows:Record<string,string|number|null>[]=[],errors:{row:number;message:string}[]=[];let duplicates=0;
 all.forEach((cells,i)=>{try{
  if(cells.length!==headers.length)throw new SalesInputError('Column count differs from the header.');
  const get=(key:string,max=200)=>index[key]<0?'':(cells[index[key]]||'').trim().slice(0,max);
  const company_name=get('company_name'),usdot=get('usdot',20);if(!company_name||!/^\d{1,8}$/.test(usdot))throw new SalesInputError('Company name and numeric USDOT required.');
  if(seen.has(usdot)){duplicates++;return;}seen.add(usdot);
  let registration_date:string|null=get('registration_date')||null;
  if(registration_date){if(/^\d{8}$/.test(registration_date))registration_date=registration_date.slice(0,4)+'-'+registration_date.slice(4,6)+'-'+registration_date.slice(6);else if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(registration_date)){const [m,d,y]=registration_date.split('/');registration_date=y+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0');}if(!/^\d{4}-\d{2}-\d{2}$/.test(registration_date)||!Number.isFinite(Date.parse(registration_date))||new Date(registration_date).toISOString().slice(0,10)!==registration_date)throw new SalesInputError('Registration date must be a valid YYYY-MM-DD, YYYYMMDD or MM/DD/YYYY date.');}
  const fleet=get('fleet_size');if(fleet&&!/^\d{1,7}$/.test(fleet))throw new SalesInputError('Fleet size must be a nonnegative integer.');
  const address=get('email',254).toLowerCase();if(address&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))throw new SalesInputError('Email is invalid.');
  rows.push({company_name,usdot,contact_name:get('contact_name',120),phone:get('phone',50),email:address,city:get('city',100),state:get('state',2).toUpperCase(),registration_date,fleet_size:fleet?Number(fleet):null,notes:get('notes',4000)});
 }catch(e){errors.push({row:i+2,message:e instanceof Error?e.message:'Invalid row'});}});
 return {rows,errors,duplicates,total:all.length};
}
