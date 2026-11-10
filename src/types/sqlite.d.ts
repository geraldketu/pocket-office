// Local preview lab requires Node 24; production data never uses this in-memory adapter.
declare module "node:sqlite" {
 export class DatabaseSync {
  constructor(location:string);
  exec(sql:string):void;
  close():void;
  prepare(sql:string):{run:(...args:unknown[])=>{changes:number|bigint};get:(...args:unknown[])=>Record<string,unknown>|undefined;all:(...args:unknown[])=>Record<string,unknown>[]};
 }
}
