-- Compteur "gouttes de soutien" — une goutte par personne, via son email —
-- à exécuter une fois dans l'éditeur SQL de Supabase
-- (Project > SQL Editor > New query, coller ce fichier, Run).

-- Si l'ancienne version (compteur libre, sans email) a déjà été posée,
-- on la retire : le modèle change pour "un email = une goutte".
drop function if exists public.increment_drops();
drop table if exists public.drop_counter;

create table if not exists public.drop_supporters (
  email text primary key,
  created_at timestamptz not null default now()
);

-- RLS activé mais sans policy de lecture publique : les emails ne sont
-- jamais exposés au navigateur. Seules les fonctions ci-dessous (security
-- definer) peuvent lire/écrire la table, et elles ne renvoient qu'un total.
alter table public.drop_supporters enable row level security;

create or replace function public.get_drops_count()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint from public.drop_supporters;
$$;

-- Ajoute une goutte pour cet email (une seule fois par email, contrainte
-- unique sur la colonne). Renvoie uniquement le total à jour : on ne
-- renvoie jamais si CET email précis existait déjà, pour ne pas exposer
-- un oracle permettant de tester en masse si une adresse a déjà participé.
create or replace function public.add_drop(p_email text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if v_email is null or v_email = '' or v_email !~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$' then
    raise exception 'invalid_email';
  end if;

  insert into public.drop_supporters (email) values (v_email)
  on conflict (email) do nothing;

  return (select count(*)::bigint from public.drop_supporters);
end;
$$;

grant execute on function public.get_drops_count() to anon;
grant execute on function public.add_drop(text) to anon;
