-- À coller dans Supabase > SQL Editor > New Query

-- Table des profils utilisateurs
create table if not exists profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  nom text, metier text, adresse text, siret text,
  email text, tel text, iban text, bic text, tva_num text,
  forme_juridique text, capital text, rcs text, ape text,
  conditions_paiement text default 'Paiement à 30 jours',
  modes_paiement text, cgv text, taux_defaut text,
  logo text, tva_actif boolean default false,
  categories jsonb default '["Graphisme","Développement web","Conseil","Travaux","Formation","Vêtements","Autre"]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table des documents (devis & factures)
create table if not exists documents (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('devis', 'facture')),
  date text,
  client_nom text,
  client_type text,
  total_ht numeric default 0,
  total_ttc numeric default 0,
  status text default 'en_attente',
  category text default '',
  trashed boolean default false,
  deleted_at text,
  payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sécurité : chaque utilisateur ne voit que ses données
alter table profiles enable row level security;
alter table documents enable row level security;

create policy "Users see own profile" on profiles for all using (auth.uid() = user_id);
create policy "Users see own documents" on documents for all using (auth.uid() = user_id);
