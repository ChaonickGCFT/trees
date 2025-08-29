import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase.from('trees').select('*');
  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Data:', data);
  }
}

test();
