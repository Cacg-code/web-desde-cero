-- ============================================================
-- Backend gratuito (Supabase) para "Desarrollo web desde cero"
-- Pégalo completo en Supabase → SQL Editor → Run.
--
-- Idea anti-trampas: el navegador NUNCA escribe tablas directamente.
-- Solo puede llamar a funciones (RPC) que validan en el servidor:
--   · la lección existe en la lista oficial,
--   · no se repite,
--   · pasaron al menos 45 s desde la anterior (nadie lee una lección en 2 s),
--   · máximo 25 lecciones por día,
--   · el reto diario se corrige en el servidor y solo hay 1 intento al día.
-- El XP y el nivel se CALCULAN aquí, no los envía el cliente.
-- Limitación honesta: alguien muy decidido puede completar lecciones sin leerlas,
-- pero solo a ritmo humano. No sirve como certificación; sí para una comunidad.
-- ============================================================

create table if not exists perfiles (
  user_id uuid primary key references auth.users on delete cascade,
  apodo text unique not null check (apodo ~ '^[A-Za-z0-9_\-]{3,20}$'),
  avatar int not null default 0 check (avatar between 0 and 7),
  publico boolean not null default true,
  creado timestamptz not null default now()
);

create table if not exists lecciones (
  id text primary key               -- p. ej. 01, css-03, node-P
);

create table if not exists progreso (
  user_id uuid not null references auth.users on delete cascade,
  leccion text not null references lecciones(id),
  creado timestamptz not null default now(),
  primary key (user_id, leccion)
);

create table if not exists retos (
  dia int primary key,              -- índice del banco de preguntas
  correcta int not null
);

create table if not exists retos_resueltos (
  user_id uuid not null references auth.users on delete cascade,
  dia date not null,
  acierto boolean not null,
  primary key (user_id, dia)
);

-- Seguridad por filas: nadie escribe directo; cada quien lee lo suyo
alter table perfiles enable row level security;
alter table lecciones enable row level security;
alter table progreso enable row level security;
alter table retos enable row level security;
alter table retos_resueltos enable row level security;

create policy "ver mi perfil o los públicos" on perfiles for select using (publico or user_id = auth.uid());
create policy "ver mi progreso" on progreso for select using (user_id = auth.uid());
create policy "ver mis retos" on retos_resueltos for select using (user_id = auth.uid());
create policy "ver lista de lecciones" on lecciones for select using (true);
-- (sin políticas de insert/update/delete: solo las funciones de abajo escriben)

-- Lista oficial de lecciones válidas (ajusta cuando se agreguen más)
insert into lecciones (id)
select x from unnest(array[
  '01','02','03','04','05','06','07','08','09','10','11','P',
  'css-01','css-02','css-03','css-04','css-05','css-06','css-07','css-08','css-09','css-10','css-11','css-P',
  'js-01','js-02','js-03','js-04','js-05','js-06','js-07','js-08','js-09','js-10','js-11','js-P',
  'react-01','react-02','react-03','react-04','react-05','react-06','react-07','react-08','react-09','react-10','react-11','react-P',
  'node-01','node-02','node-03','node-04','node-05','node-06','node-07','node-08','node-P',
  'bd-01','bd-02','bd-03','bd-04','bd-05','bd-06','bd-07','bd-08','bd-P'
]) as x on conflict do nothing;

-- Crear / cambiar mi perfil
create or replace function guardar_perfil(p_apodo text, p_avatar int default 0)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'inicia sesión'; end if;
  insert into perfiles (user_id, apodo, avatar) values (auth.uid(), p_apodo, p_avatar)
  on conflict (user_id) do update set apodo = excluded.apodo, avatar = excluded.avatar;
end $$;

-- Completar una lección (con límites)
create or replace function completar_leccion(p_leccion text)
returns json language plpgsql security definer set search_path = public as $$
declare ultimo timestamptz; hoy int;
begin
  if auth.uid() is null then raise exception 'inicia sesión'; end if;
  if not exists (select 1 from lecciones where id = p_leccion) then raise exception 'lección inválida'; end if;
  if exists (select 1 from progreso where user_id = auth.uid() and leccion = p_leccion) then
    return json_build_object('ok', true, 'repetida', true);
  end if;
  select max(creado) into ultimo from progreso where user_id = auth.uid();
  if ultimo is not null and now() - ultimo < interval '45 seconds' then
    return json_build_object('ok', false, 'motivo', 'demasiado rápido: tómate tu tiempo en la lección');
  end if;
  select count(*) into hoy from progreso where user_id = auth.uid() and creado >= date_trunc('day', now());
  if hoy >= 25 then return json_build_object('ok', false, 'motivo', 'límite diario alcanzado'); end if;
  insert into progreso (user_id, leccion) values (auth.uid(), p_leccion);
  return json_build_object('ok', true);
end $$;

-- Reto del día: el servidor corrige; 1 intento por día
create or replace function responder_reto(p_dia int, p_respuesta int)
returns json language plpgsql security definer set search_path = public as $$
declare c int; ok boolean;
begin
  if auth.uid() is null then raise exception 'inicia sesión'; end if;
  if exists (select 1 from retos_resueltos where user_id = auth.uid() and dia = current_date) then
    return json_build_object('ok', false, 'motivo', 'ya respondiste hoy');
  end if;
  select correcta into c from retos where dia = p_dia;
  if c is null then raise exception 'reto inválido'; end if;
  ok := (c = p_respuesta);
  insert into retos_resueltos (user_id, dia, acierto) values (auth.uid(), current_date, ok);
  return json_build_object('ok', true, 'acierto', ok, 'correcta', c);
end $$;

-- Mi estado calculado en el servidor (XP, nivel, racha) — el cliente solo lo muestra
create or replace function mi_estado()
returns json language sql stable security definer set search_path = public as $$
  with p as (select count(*) n from progreso where user_id = auth.uid()),
       r as (select count(*) n from retos_resueltos where user_id = auth.uid() and acierto)
  select json_build_object(
    'lecciones', (select n from p),
    'xp', (select n from p) * 100 + (select n from r) * 25,
    'nivel', floor(sqrt(((select n from p) * 100 + (select n from r) * 25) / 100.0)) + 1,
    'completadas', (select coalesce(json_agg(leccion), '[]'::json) from progreso where user_id = auth.uid())
  );
$$;

-- Tabla de clasificación semanal (solo apodo, avatar y XP; solo perfiles públicos)
create or replace view clasificacion_semanal as
  select pf.apodo, pf.avatar, count(pg.leccion) * 100 as xp_semana
  from perfiles pf join progreso pg on pg.user_id = pf.user_id
  where pf.publico and pg.creado >= now() - interval '7 days'
  group by pf.apodo, pf.avatar order by xp_semana desc limit 20;
grant select on clasificacion_semanal to anon, authenticated;

grant execute on function guardar_perfil, completar_leccion, responder_reto, mi_estado to authenticated;
revoke execute on function guardar_perfil, completar_leccion, responder_reto, mi_estado from anon;

-- Banco del reto diario: las respuestas correctas viven SOLO aquí (índice = día % 22)
insert into retos (dia, correcta) values
 (0,0),(1,1),(2,0),(3,1),(4,1),(5,2),(6,0),(7,0),(8,1),(9,1),(10,0),
 (11,1),(12,0),(13,1),(14,0),(15,0),(16,1),(17,1),(18,0),(19,1),(20,1),(21,0)
on conflict do nothing;
