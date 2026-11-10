import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3004'],{stdio:'inherit',env:{...process.env,OLIVERFEE_ADMIN_LAB:'1',NEXT_PUBLIC_OLIVERFEE_ADMIN_LAB:'1'}});
child.on('exit',code=>process.exit(code??0));
