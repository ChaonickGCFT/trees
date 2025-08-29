🌳 Aporion Genealogy – Unverified Family Trees

A minimal Supabase + Netlify + HTML project for managing unverified, private family trees.
Users sign in with GitHub or email, build draft trees, and export JSON. Living people are never shown publicly.

✨ Features

Email / GitHub auth (Supabase)

Private draft trees (RLS on by default)

Simple person & relationship model (parent/child edges)

JSON export (download your draft)

Vanilla stack: HTML/CSS/JS (no framework)

Drop-in deployment on Netlify

📦 Stack

Supabase — Auth, Postgres, Storage

Netlify — Static hosting & environment variables

Vanilla HTML + CSS + JS (no build step required)

🗺️ Architecture (tiny)
/public
  index.html         # landing + auth UI
  app.js             # Supabase client + CRUD + export
  styles.css
  favicon.ico


Supabase schema (minimal):

profiles(id uuid primary key, email text unique, created_at timestamp)

trees(id uuid primary key default uuid_generate_v4(), owner uuid references auth.users, title text, created_at timestamp)

persons(id uuid primary key default uuid_generate_v4(), tree uuid references trees(id) on delete cascade, given text, family text, birth text, death text, notes text)

edges(parent uuid references persons(id) on delete cascade, child uuid references persons(id) on delete cascade, primary key(parent, child))

You can extend later (sources, places, events), but this is enough to sketch drafts.

🛠 Setup
1) Clone
git clone https://github.com/ChaonickGCFT/trees.git
cd trees

2) Create a Supabase project

Go to Supabase → New project

Grab Project URL and anon/public key

SQL: tables

Run this in SQL Editor:

-- enable extension (usually already on)
create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id uuid primary key default auth.uid(),
  email text unique,
  created_at timestamp with time zone default now()
);

create table if not exists trees (
  id uuid primary key default uuid_generate_v4(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled tree',
  created_at timestamp with time zone default now()
);

create table if not exists persons (
  id uuid primary key default uuid_generate_v4(),
  tree uuid not null references trees(id) on delete cascade,
  given text,
  family text,
  birth text,
  death text,
  notes text,
  created_at timestamp with time zone default now()
);

create table if not exists edges (
  parent uuid not null references persons(id) on delete cascade,
  child  uuid not null references persons(id) on delete cascade,
  primary key (parent, child)
);

Row-Level Security (RLS) policies
alter table profiles enable row level security;
alter table trees    enable row level security;
alter table persons  enable row level security;
alter table edges    enable row level security;

-- profiles
create policy "profiles are self-readable/writable" on profiles
for select using (id = auth.uid());
create policy "upsert own profile" on profiles
for insert with check (id = auth.uid());
create policy "update own profile" on profiles
for update using (id = auth.uid());

-- trees
create policy "read own trees" on trees for select using (owner = auth.uid());
create policy "insert own tree" on trees for insert with check (owner = auth.uid());
create policy "update own tree" on trees for update using (owner = auth.uid());
create policy "delete own tree" on trees for delete using (owner = auth.uid());

-- persons (through ownership of tree)
create policy "read persons in own trees" on persons
for select using (exists (select 1 from trees t where t.id = persons.tree and t.owner = auth.uid()));
create policy "write persons in own trees" on persons
for all using (exists (select 1 from trees t where t.id = persons.tree and t.owner = auth.uid()))
with check   (exists (select 1 from trees t where t.id = persons.tree and t.owner = auth.uid()));

-- edges (both ends must be in a tree you own)
create policy "rw edges in own trees" on edges
for all using (
  exists (
    select 1
    from persons p
    join trees   t on t.id = p.tree
    where (p.id = edges.parent or p.id = edges.child) and t.owner = auth.uid()
  )
) with check (
  exists (
    select 1
    from persons p
    join trees   t on t.id = p.tree
    where (p.id = edges.parent or p.id = edges.child) and t.owner = auth.uid()
  )
);

3) Auth settings

Supabase → Auth → URL Configuration

Site URL: https://<your-netlify-site>.netlify.app (and local if needed)

Redirect URLs:

https://<your-netlify-site>.netlify.app/

http://localhost:5173 (or your local server port)

Enable GitHub provider (optional): set Client ID/Secret and add the same redirect URL(s).

4) Environment variables

Create Netlify env vars (or a local .env used by your static server):

VITE_SUPABASE_URL = https://YOUR-PROJECT.supabase.co

VITE_SUPABASE_ANON_KEY = ey...

VITE_REDIRECT_URL = your public/root URL

For plain HTML, we read these via a small <script> that injects from window.__ENV or Netlify’s env. See index.html snippet below.

▶️ Run locally

No build step needed. Any static server works:

# pick one
npx http-server public -p 5173
# or
python -m http.server 5173 -d public


Open http://localhost:5173.

🚀 Deploy on Netlify

New site from Git → connect repo

Build command: none

Publish directory: public

Add the three env vars under Site settings → Environment

Redeploy

🧩 HTML & JS (drop-in)

public/index.html (essentials; keep IDs as-is so buttons bind correctly):

<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aporion Genealogy — Unverified Family Trees</title>

  <link rel="stylesheet" href="./styles.css" />
  <!-- Supabase UMD -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

  <script>
    // In Netlify, you can inject via a small inline script or read from data-* attributes.
    window.__ENV = {
      SUPABASE_URL:  "{{ VITE_SUPABASE_URL }}",
      SUPABASE_ANON_KEY: "{{ VITE_SUPABASE_ANON_KEY }}",
      REDIRECT_URL: "{{ VITE_REDIRECT_URL }}"
    };
  </script>
</head>
<body>
  <main>
    <h1>🌳 Unverified Family Trees</h1>

    <section class="auth-card">
      <div class="auth-left">
        <label>Email</label>
        <input id="email" type="email" placeholder="you@example.com" />
        <input id="password" type="password" placeholder="Password (optional)" />
        <div class="row">
          <button id="signupBtn" type="button">Sign up</button>
          <button id="signinBtn" type="button">Sign in</button>
          <button id="magicBtn"  type="button">Magic Link</button>
        </div>
      </div>

      <div class="auth-right">
        <h3>Or</h3>
        <button id="githubBtn" type="button">Sign in with GitHub</button>
        <p class="muted">We never show living people publicly. These trees are your private, unverified notes.</p>
      </div>
    </section>

    <section id="app" hidden>
      <div class="row">
        <input id="treeTitle" placeholder="Tree title" />
        <button id="createTreeBtn" type="button">New tree</button>
        <button id="exportBtn"     type="button">Export JSON</button>
        <button id="signoutBtn"    type="button">Sign out</button>
      </div>

      <div class="grid">
        <div>
          <h3>People</h3>
          <div class="row">
            <input id="given"  placeholder="Given name" />
            <input id="family" placeholder="Family name" />
            <input id="birth"  placeholder="Birth (free text)" />
            <button id="addPersonBtn" type="button">Add</button>
          </div>
          <ul id="people"></ul>
        </div>

        <div>
          <h3>Relationships</h3>
          <div class="row">
            <select id="parentSelect"></select>
            <select id="childSelect"></select>
            <button id="linkBtn" type="button">Link parent → child</button>
          </div>
          <ul id="edges"></ul>
        </div>
      </div>
    </section>
  </main>

  <script src="./app.js"></script>
</body>
</html>


public/app.js (minimal client; includes the button re-bind guard so clicks work after soft reloads):

const { SUPABASE_URL, SUPABASE_ANON_KEY, REDIRECT_URL } = window.__ENV;
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----- auth wiring (idempotent for rebinds)
function wireAuth() {
  const email = document.getElementById('email');
  const pass  = document.getElementById('password');
  const sUp   = document.getElementById('signupBtn');
  const sIn   = document.getElementById('signinBtn');
  const magic = document.getElementById('magicBtn');
  const gh    = document.getElementById('githubBtn');

  // not on this page
  if (!email || !sUp) return;

  // de-dupe listeners
  [sUp, sIn, magic, gh].forEach(b => {
    if (!b) return; const c = b.cloneNode(true); b.parentNode.replaceChild(c, b);
  });

  document.getElementById('magicBtn')?.addEventListener('click', async () => {
    const { error } = await sb.auth.signInWithOtp({
      email: email.value,
      options: { emailRedirectTo: REDIRECT_URL }
    });
    alert(error ? error.message : 'Magic link sent. Check your inbox.');
  });

  document.getElementById('signupBtn')?.addEventListener('click', async () => {
    const { error } = await sb.auth.signUp({ email: email.value, password: pass.value });
    alert(error ? error.message : 'Check your email to confirm.');
  });

  document.getElementById('signinBtn')?.addEventListener('click', async () => {
    const { error } = await sb.auth.signInWithPassword({ email: email.value, password: pass.value });
    if (error) return alert(error.message);
    await onAuthed();
  });

  document.getElementById('githubBtn')?.addEventListener('click', async () => {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: REDIRECT_URL }
    });
    if (error) alert(error.message);
  });
}

// ----- app state + CRUD

let currentTree = null;
const el = (id) => document.getElementById(id);

async function onAuthed() {
  document.getElementById('app').hidden = false;

  // profile upsert
  const session = (await sb.auth.getSession()).data.session;
  if (session?.user?.email) {
    await sb.from('profiles').upsert({ id: session.user.id, email: session.user.email }).select();
  }
  await refreshLists();
}

async function refreshLists() {
  if (!currentTree) {
    // ensure at least one tree
    const { data } = await sb.from('trees').select('*').order('created_at', { ascending: false }).limit(1);
    if (data?.[0]) currentTree = data[0].id;
  }
  await loadPeople();
  await loadEdges();
}

async function loadPeople() {
  const { data, error } = await sb.from('persons').select('*').eq('tree', currentTree);
  if (error) return console.error(error);

  const list = el('people'); list.innerHTML = '';
  const parentSel = el('parentSelect'); parentSel.innerHTML = '';
  const childSel  = el('childSelect');  childSel.innerHTML  = '';

  (data || []).forEach(p => {
    const li = document.createElement('li');
    li.textContent = `${p.given ?? ''} ${p.family ?? ''} ${p.birth ? '('+p.birth+')' : ''}`;
    list.appendChild(li);

    const opt1 = new Option(`${p.given} ${p.family}`, p.id);
    const opt2 = new Option(`${p.given} ${p.family}`, p.id);
    parentSel.add(opt1); childSel.add(opt2);
  });
}

async function loadEdges() {
  const { data, error } = await sb.rpc('list_edges_with_names', { tree_id: currentTree }).select?.() ?? {};
  // fallback if RPC not present
  const list = el('edges'); list.innerHTML = '';
  if (!data) return;
  data.forEach(e => {
    const li = document.createElement('li');
    li.textContent = `${e.parent_name} → ${e.child_name}`;
    list.appendChild(li);
  });
}

// buttons inside app
function wireApp() {
  el('createTreeBtn')?.addEventListener('click', async () => {
    const title = el('treeTitle').value || 'Untitled tree';
    const user  = (await sb.auth.getUser()).data.user;
    const { data, error } = await sb.from('trees').insert({ title, owner: user.id }).select().single();
    if (!error) { currentTree = data.id; await refreshLists(); }
  });

  el('addPersonBtn')?.addEventListener('click', async () => {
    const given  = el('given').value;
    const family = el('family').value;
    const birth  = el('birth').value;
    const { error } = await sb.from('persons').insert({ tree: currentTree, given, family, birth });
    if (!error) { el('given').value = el('family').value = el('birth').value = ''; await loadPeople(); }
  });

  el('linkBtn')?.addEventListener('click', async () => {
    const parent = el('parentSelect').value;
    const child  = el('childSelect').value;
    if (!parent || !child || parent === child) return;
    const { error } = await sb.from('edges').insert({ parent, child });
    if (!error) await loadEdges();
  });

  el('exportBtn')?.addEventListener('click', async () => {
    const [people, edges] = await Promise.all([
      sb.from('persons').select('*').eq('tree', currentTree),
      sb.from('edges').select('*')
    ]);
    const blob = new Blob([JSON.stringify({ tree: currentTree, people: people.data, edges: edges.data }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tree-${currentTree}.json`;
    a.click();
  });

  el('signoutBtn')?.addEventListener('click', async () => {
    await sb.auth.signOut(); location.reload();
  });
}

// optional RPC for nicer edge list (names)
async function ensureRpc() {
  const sql = `
  create or replace function list_edges_with_names(tree_id uuid)
  returns table(parent_name text, child_name text)
  language sql security definer set search_path = public as $$
    select (pp.given || ' ' || coalesce(pp.family,''))::text as parent_name,
           (pc.given || ' ' || coalesce(pc.family,''))::text as child_name
    from edges e
    join persons pp on pp.id = e.parent
    join persons pc on pc.id = e.child
    where pp.tree = tree_id and pc.tree = tree_id
  $$;`;

  // execute once manually in SQL editor, or ignore this helper
  console.info('Tip: add RPC list_edges_with_names in Supabase SQL for prettier edges.');
}

document.addEventListener('DOMContentLoaded', async () => {
  wireAuth();
  wireApp();
  const { data: { user } } = await sb.auth.getUser();
  if (user) await onAuthed();
});


public/styles.css (tiny defaults + click-through safety):

:root { --bg:#0b0b0b; --fg:#f0f0f0; --muted:#a0a0a0; --card:#151515; --accent:#9ddf9d; }
* { box-sizing: border-box; }
body { margin:0; font:16px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:var(--fg); background:var(--bg); }
main { max-width: 980px; margin: 48px auto; padding: 0 16px; }
h1 { font-size: 2.2rem; margin-bottom: 12px; }
.muted { color: var(--muted); }

.auth-card {
  display:flex; gap:28px; padding:24px; background:var(--card); border-radius:12px;
  position:relative; z-index:3; /* ensure clicks land */
}
.auth-left, .auth-right { flex:1; }
input, select, button { padding:10px 12px; border:1px solid #333; background:#0f0f0f; color:var(--fg); border-radius:8px; }
button { cursor:pointer; background:#182c18; border:1px solid #2c4a2c; }
button:hover { background:#1f3a1f; }
input { width:100%; margin:6px 0 10px; }
.row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.grid { display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-top:24px; }
ul { margin:10px 0; padding-left:18px; }

🔒 Privacy

RLS policies restrict every table to the authenticated owner.

Never render living persons to public pages. This app is private drafts only
