export const serviceNames = {DOT:"USDOT registration assistance",KYU:"Kentucky KYU","NY HUT":"New York HUT",UCR:"UCR filing assistance",IFTA:"IFTA setup assistance",DQF:"Driver Qualification File"} as const;
export type Service = keyof typeof serviceNames;
export type Choice = "help" | "have" | "self" | "process";
export type Interview = {company:string;scope:string;base:string;weight:string;states:string[];filings:Partial<Record<Service,Choice>>;kyWeight:string;nyWeight:string};
export function reviewInterview(data:Interview) {
  const services=(Object.keys(serviceNames) as Service[]).filter(key=>data.filings[key]==="help").map(key=>({key,label:serviceNames[key],serviceCents:key==="DOT"||key==="UCR"?2500:key==="IFTA"?0:key==="DQF"?9999:null,governmentCents:key==="DOT"||key==="DQF"?0:null}));
  const pending=services.some(row=>row.serviceCents===null||row.governmentCents===null);
  return {services,pending,knownCents:services.reduce((sum,row)=>sum+(row.serviceCents||0)+(row.governmentCents||0),0),paymentStatus:"unpaid" as const,checkoutEnabled:false as const};
}
export function calculateBid(offer:number,miles:number,rate:number,tolls:number,other:number) {
  if (![offer,miles,rate,tolls,other].every(Number.isFinite)||offer<0||miles<=0||rate<0||tolls<0||other<0) throw new Error("Enter valid, non-negative amounts and mileage greater than zero.");
  const minimum=offer+tolls+other,goal=Math.max(offer,miles*rate)+tolls+other;
  if(!Number.isFinite(goal))throw new Error("Enter smaller amounts.");
  return {minimum,middle:(minimum+goal)/2,goal,mileageTarget:miles*rate,addons:tolls+other};
}
