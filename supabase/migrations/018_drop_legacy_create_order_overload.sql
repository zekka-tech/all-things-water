-- Drop the orphaned 14-parameter create_order() overload left behind by
-- migration 007_customer_accounts.sql. That migration added p_user_id and
-- p_delivery_slot via `create or replace function`, but since the parameter
-- list changed, Postgres created a second overload instead of replacing the
-- original 14-param function from 003_order_transaction.sql — nothing ever
-- dropped it.
--
-- Impact: the orders Edge Function calls create_order via supabase-js RPC
-- with named parameters. When p_user_id and p_delivery_slot are both
-- undefined (guest checkout with no delivery-slot selected, or any
-- collection-method order), JSON.stringify drops those keys, so PostgREST
-- receives only the 14 remaining named args — which matches both overloads
-- equally, so PostgREST fails with PGRST203 "Could not choose the best
-- candidate function" and the order creation request 500s.
--
-- Fix: drop the legacy 14-param overload so only the canonical 16-param
-- version (with p_user_id/p_delivery_slot defaulting to null) remains.

drop function if exists public.create_order(
  text, text, text, text, text, text, text, text,
  integer, integer, integer, text, jsonb, boolean
);
