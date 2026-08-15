-- Server-side application routes use the Supabase Data API with the trusted
-- service_role/secret key. PostgreSQL privileges are still required even though
-- service_role bypasses RLS, so grant the backend role access explicitly.

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Keep future V1 tables/functions usable by the same server-mediated backend
-- without relying on dashboard-side default privilege settings.
alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;
