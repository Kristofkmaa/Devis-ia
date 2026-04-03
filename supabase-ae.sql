-- À coller dans Supabase > SQL Editor > New Query
-- NOUVELLES TABLES pour l'app auto-entrepreneur

-- Profil auto-entrepreneur
create table if not exists ae_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  prenom text,
  nom text,
  activite text, -- ex: "Développeur web freelance"
  secteur text,  -- 'services_bnc' | 'services_bic' | 'ventes' | 'liberal'
  date_creation date,
  regime_declaration text default 'trimestriel', -- 'mensuel' | 'trimestriel'
  acre boolean default false,
  acre_fin date,
  objectif_ca numeric default 0,
  created_at timestamptz default now()
);

-- Déclarations CA (URSSAF)
create table if not exists ae_declarations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  periode text not null, -- ex: "2025-01" ou "2025-T1"
  type_periode text not null, -- 'mensuel' | 'trimestriel'
  ca_declare numeric default 0,
  cotisations_payees numeric default 0,
  statut text default 'a_faire', -- 'a_faire' | 'faite' | 'en_retard'
  date_limite text,
  date_declaration text,
  notes text,
  created_at timestamptz default now()
);

-- Questions posées à l'assistant IA
create table if not exists ae_questions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  question text not null,
  reponse text,
  created_at timestamptz default now()
);

-- Revenus mensuels
create table if not exists ae_revenus (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  mois text not null, -- ex: "2025-01"
  montant numeric default 0,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, mois)
);

-- Sécurité
alter table ae_profiles    enable row level security;
alter table ae_declarations enable row level security;
alter table ae_questions   enable row level security;
alter table ae_revenus     enable row level security;

create policy "Users own ae_profiles"     on ae_profiles    for all using (auth.uid() = user_id);
create policy "Users own ae_declarations" on ae_declarations for all using (auth.uid() = user_id);
create policy "Users own ae_questions"    on ae_questions   for all using (auth.uid() = user_id);
create policy "Users own ae_revenus"      on ae_revenus     for all using (auth.uid() = user_id);
