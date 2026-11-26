import fs from 'node:fs';
const source=fs.readFileSync('tests/sales-database.test.mjs','utf8'),start=source.indexOf('const owner='),end=source.indexOf('\ntest(');
fs.writeFileSync('tests/helpers/import-sales-db.mjs',"import fs from 'node:fs';import {PGlite} from '@electric-sql/pglite';\n"+source.slice(start,end).replace('async function database','export async function database').replaceAll('../supabase/','../../supabase/'));
