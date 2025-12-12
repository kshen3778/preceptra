
  create table "public"."Codes" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "expiry" timestamp with time zone,
    "code" text,
    "type" text,
    "email" text
      );


alter table "public"."Codes" enable row level security;


  create table "public"."Organization_Users" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "organization_id" uuid,
    "user_id" uuid,
    "role" text
      );


alter table "public"."Organization_Users" enable row level security;


  create table "public"."Organizations" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text
      );


alter table "public"."Organizations" enable row level security;


  create table "public"."UserProfiles" (
    "id" uuid not null default auth.uid(),
    "created_at" timestamp with time zone not null default now(),
    "first_name" text,
    "last_name" text,
    "permissions" text,
    "phone_number" text,
    "email" text,
    "selected_organization_id" uuid
      );


alter table "public"."UserProfiles" enable row level security;

CREATE UNIQUE INDEX codes_pkey ON public."Codes" USING btree (id);

CREATE UNIQUE INDEX organization_users_pkey ON public."Organization_Users" USING btree (id);

CREATE UNIQUE INDEX organizations_pkey ON public."Organizations" USING btree (id);

CREATE UNIQUE INDEX userprofiles_pkey ON public."UserProfiles" USING btree (id);

alter table "public"."Codes" add constraint "codes_pkey" PRIMARY KEY using index "codes_pkey";

alter table "public"."Organization_Users" add constraint "organization_users_pkey" PRIMARY KEY using index "organization_users_pkey";

alter table "public"."Organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."UserProfiles" add constraint "userprofiles_pkey" PRIMARY KEY using index "userprofiles_pkey";

alter table "public"."Organization_Users" add constraint "organization_users_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public."Organizations"(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."Organization_Users" validate constraint "organization_users_organization_id_fkey";

alter table "public"."Organization_Users" add constraint "organization_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."UserProfiles"(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."Organization_Users" validate constraint "organization_users_user_id_fkey";

alter table "public"."UserProfiles" add constraint "UserProfiles_selected_organization_id_fkey" FOREIGN KEY (selected_organization_id) REFERENCES public."Organizations"(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."UserProfiles" validate constraint "UserProfiles_selected_organization_id_fkey";

alter table "public"."UserProfiles" add constraint "userprofiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."UserProfiles" validate constraint "userprofiles_id_fkey";

grant delete on table "public"."Codes" to "anon";

grant insert on table "public"."Codes" to "anon";

grant references on table "public"."Codes" to "anon";

grant select on table "public"."Codes" to "anon";

grant trigger on table "public"."Codes" to "anon";

grant truncate on table "public"."Codes" to "anon";

grant update on table "public"."Codes" to "anon";

grant delete on table "public"."Codes" to "authenticated";

grant insert on table "public"."Codes" to "authenticated";

grant references on table "public"."Codes" to "authenticated";

grant select on table "public"."Codes" to "authenticated";

grant trigger on table "public"."Codes" to "authenticated";

grant truncate on table "public"."Codes" to "authenticated";

grant update on table "public"."Codes" to "authenticated";

grant delete on table "public"."Codes" to "postgres";

grant insert on table "public"."Codes" to "postgres";

grant references on table "public"."Codes" to "postgres";

grant select on table "public"."Codes" to "postgres";

grant trigger on table "public"."Codes" to "postgres";

grant truncate on table "public"."Codes" to "postgres";

grant update on table "public"."Codes" to "postgres";

grant delete on table "public"."Codes" to "service_role";

grant insert on table "public"."Codes" to "service_role";

grant references on table "public"."Codes" to "service_role";

grant select on table "public"."Codes" to "service_role";

grant trigger on table "public"."Codes" to "service_role";

grant truncate on table "public"."Codes" to "service_role";

grant update on table "public"."Codes" to "service_role";

grant delete on table "public"."Organization_Users" to "anon";

grant insert on table "public"."Organization_Users" to "anon";

grant references on table "public"."Organization_Users" to "anon";

grant select on table "public"."Organization_Users" to "anon";

grant trigger on table "public"."Organization_Users" to "anon";

grant truncate on table "public"."Organization_Users" to "anon";

grant update on table "public"."Organization_Users" to "anon";

grant delete on table "public"."Organization_Users" to "authenticated";

grant insert on table "public"."Organization_Users" to "authenticated";

grant references on table "public"."Organization_Users" to "authenticated";

grant select on table "public"."Organization_Users" to "authenticated";

grant trigger on table "public"."Organization_Users" to "authenticated";

grant truncate on table "public"."Organization_Users" to "authenticated";

grant update on table "public"."Organization_Users" to "authenticated";

grant delete on table "public"."Organization_Users" to "postgres";

grant insert on table "public"."Organization_Users" to "postgres";

grant references on table "public"."Organization_Users" to "postgres";

grant select on table "public"."Organization_Users" to "postgres";

grant trigger on table "public"."Organization_Users" to "postgres";

grant truncate on table "public"."Organization_Users" to "postgres";

grant update on table "public"."Organization_Users" to "postgres";

grant delete on table "public"."Organization_Users" to "service_role";

grant insert on table "public"."Organization_Users" to "service_role";

grant references on table "public"."Organization_Users" to "service_role";

grant select on table "public"."Organization_Users" to "service_role";

grant trigger on table "public"."Organization_Users" to "service_role";

grant truncate on table "public"."Organization_Users" to "service_role";

grant update on table "public"."Organization_Users" to "service_role";

grant delete on table "public"."Organizations" to "anon";

grant insert on table "public"."Organizations" to "anon";

grant references on table "public"."Organizations" to "anon";

grant select on table "public"."Organizations" to "anon";

grant trigger on table "public"."Organizations" to "anon";

grant truncate on table "public"."Organizations" to "anon";

grant update on table "public"."Organizations" to "anon";

grant delete on table "public"."Organizations" to "authenticated";

grant insert on table "public"."Organizations" to "authenticated";

grant references on table "public"."Organizations" to "authenticated";

grant select on table "public"."Organizations" to "authenticated";

grant trigger on table "public"."Organizations" to "authenticated";

grant truncate on table "public"."Organizations" to "authenticated";

grant update on table "public"."Organizations" to "authenticated";

grant delete on table "public"."Organizations" to "postgres";

grant insert on table "public"."Organizations" to "postgres";

grant references on table "public"."Organizations" to "postgres";

grant select on table "public"."Organizations" to "postgres";

grant trigger on table "public"."Organizations" to "postgres";

grant truncate on table "public"."Organizations" to "postgres";

grant update on table "public"."Organizations" to "postgres";

grant delete on table "public"."Organizations" to "service_role";

grant insert on table "public"."Organizations" to "service_role";

grant references on table "public"."Organizations" to "service_role";

grant select on table "public"."Organizations" to "service_role";

grant trigger on table "public"."Organizations" to "service_role";

grant truncate on table "public"."Organizations" to "service_role";

grant update on table "public"."Organizations" to "service_role";

grant delete on table "public"."UserProfiles" to "anon";

grant insert on table "public"."UserProfiles" to "anon";

grant references on table "public"."UserProfiles" to "anon";

grant select on table "public"."UserProfiles" to "anon";

grant trigger on table "public"."UserProfiles" to "anon";

grant truncate on table "public"."UserProfiles" to "anon";

grant update on table "public"."UserProfiles" to "anon";

grant delete on table "public"."UserProfiles" to "authenticated";

grant insert on table "public"."UserProfiles" to "authenticated";

grant references on table "public"."UserProfiles" to "authenticated";

grant select on table "public"."UserProfiles" to "authenticated";

grant trigger on table "public"."UserProfiles" to "authenticated";

grant truncate on table "public"."UserProfiles" to "authenticated";

grant update on table "public"."UserProfiles" to "authenticated";

grant delete on table "public"."UserProfiles" to "postgres";

grant insert on table "public"."UserProfiles" to "postgres";

grant references on table "public"."UserProfiles" to "postgres";

grant select on table "public"."UserProfiles" to "postgres";

grant trigger on table "public"."UserProfiles" to "postgres";

grant truncate on table "public"."UserProfiles" to "postgres";

grant update on table "public"."UserProfiles" to "postgres";

grant delete on table "public"."UserProfiles" to "service_role";

grant insert on table "public"."UserProfiles" to "service_role";

grant references on table "public"."UserProfiles" to "service_role";

grant select on table "public"."UserProfiles" to "service_role";

grant trigger on table "public"."UserProfiles" to "service_role";

grant truncate on table "public"."UserProfiles" to "service_role";

grant update on table "public"."UserProfiles" to "service_role";


