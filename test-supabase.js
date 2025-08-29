// test-supabase.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hvgaakqmdqvezsfhxcdi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Z2Fha3FtZHF2ZXpzZmh4Y2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0ODY0NzQsImV4cCI6MjA3MjA2MjQ3NH0.zWSG74DiD5aDIb-TeRIP2ZfsQavkh3vszwJZb-1e3lE'
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
