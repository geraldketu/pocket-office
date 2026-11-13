import {spawn} from 'node:child_process';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),env={...process.env};
for(const k of Object.keys(env))if(/SUPABASE|STRIPE|RESEND/.test(k))delete env[k];
Object.assign(env,{OLIVERFEE_ADMIN_LAB:'1',NEXT_PUBLIC_OLIVERFEE_ADMIN_LAB:'1',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_ANON_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',RESEND_API_KEY:'',STRIPE_SECRET_KEY:'',SALES_PAYMENTS_ENABLED:'false'});
console.log('Isolated Owner Center preview: http://127.0.0.1:3012/admin-lab');
console.log('Use the preview-only password shown on that page, then open Owner Admin Center. Do not use your real owner password.');
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3012'],{stdio:'inherit',env});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('exit',code=>process.exit(code??0));
