import {screen,numberValue,qualifiedFuelVehicle,type Answers,type Vehicle} from "./screening.ts";
export const serviceNames = {DOT:"USDOT registration assistance",KYU:"Kentucky KYU","NY HUT":"New York HUT",UCR:"UCR filing assistance",IFTA:"IFTA setup assistance",DQF:"Driver Qualification File"} as const;
export type Service = string;
export type Choice = "help" | "have" | "self" | "process";
export const pricing = {basicMonthlyCents:4999,startupBundleCents:39900,ucrServiceCents:0} as const;
export type Interview = {company:string;scope:string;base:string;weight:string;states:string[];filings:Partial<Record<Service,Choice>>;kyWeight:string;nyWeight:string;packageSelection?:"services"|"startup";answers?:Answers;vehicles?:Vehicle[]};
export function reviewInterview(data:Interview) {
  const bundle=data.packageSelection==="startup";
  const screening=screen({states:data.states,base:data.base,scope:data.scope,answers:data.answers||{},vehicles:data.vehicles||[]});
  const services=screening.filter(r=>data.filings[r.rule.id]==="help").map(r=>{
    const key=r.rule.id;
    let governmentCents:number|null=key==="DOT"||key==="DQF"?0:null;
    let feeSource:string|null=key==="DOT"?"https://www.fmcsa.dot.gov/registration/do-i-need-usdot-number":null;
    // Only quote a verified fixed fee when its required scope and quantity are supplied.
    if(key==="MC"&&r.status==="Required"&&data.answers?.authorityTypeCount==="1"){governmentCents=30000;feeSource=r.rule.sources[0].url;}
    if(key==="CA-FUEL"&&r.status==="Required"&&data.answers?.caFuelOption==="Four-day trip permit"&&data.answers?.caFuelCountVerified==="Yes"){
      const counts=(data.vehicles||[]).map(v=>numberValue(v.count));
      if(counts.length&&(data.vehicles||[]).every(v=>qualifiedFuelVehicle(v)===true)&&counts.every(n=>n!==null&&Number.isInteger(n)&&n>0)){governmentCents=(counts as number[]).reduce((n,x)=>n+x,0)*3000;feeSource=r.rule.sources[0].url;}
    }
    return {key,label:r.rule.label,serviceCents:key==="UCR"?pricing.ucrServiceCents:key==="DOT"?(bundle?0:2500):key==="IFTA"?0:key==="MC"&&bundle?0:key==="DQF"?9999:null,governmentCents,feeSource,status:r.status};
  });
  const bundleCents=bundle?pricing.startupBundleCents:0;
  const pending=bundle||services.some(row=>row.serviceCents===null||row.governmentCents===null||row.status!=="Required");
  const serviceFeeCents=bundleCents+services.reduce((sum,row)=>sum+(row.serviceCents||0),0);
  const outsideFeeCents=services.reduce((sum,row)=>sum+(row.governmentCents||0),0);
  return {services,bundleCents,pending,serviceFeeCents,outsideFeeCents,knownCents:serviceFeeCents+outsideFeeCents,paymentStatus:"unpaid" as const,checkoutEnabled:false as const};
}
export function calculateBid(offer:number,miles:number,rate:number,tolls:number,other:number) {
  if (![offer,miles,rate,tolls,other].every(Number.isFinite)||offer<0||miles<=0||rate<0||tolls<0||other<0) throw new Error("Enter valid, non-negative amounts and mileage greater than zero.");
  const minimum=offer+tolls+other,goal=Math.max(offer,miles*rate)+tolls+other;
  if(!Number.isFinite(goal))throw new Error("Enter smaller amounts.");
  return {minimum,middle:minimum+(goal-minimum)/2,goal,mileageTarget:miles*rate,addons:tolls+other};
}
