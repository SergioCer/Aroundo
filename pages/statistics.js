import { requireAuth } from './auth-check.js';
await requireAuth();
import { supabase } from '../supabase.js';
async function init(){
    console.log("Statistics");
}
init();
