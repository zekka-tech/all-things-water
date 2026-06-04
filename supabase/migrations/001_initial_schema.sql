-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Products table (mirrors Product type but server-owned stock)
create table public.products (
  id text primary key,
  slug text not null unique,
  name text not null,
  tagline text not null,
  description text not null,
  category text not null check (category in ('bottled-water', 'coolers', 'dispensers', 'accessories')),
  price integer not null check (price > 0),
  cost integer not null default 0,
  unit text not null,
  stock integer not null default 0 check (stock >= 0),
  image text not null,
  features jsonb not null default '[]',
  featured boolean not null default false,
  volume_ml integer,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders table
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_ref text not null unique,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  delivery_address text,
  delivery_city text,
  delivery_postal_code text,
  delivery_notes text,
  delivery_method text not null default 'delivery' check (delivery_method in ('delivery', 'collection')),
  subtotal integer not null,
  delivery_fee integer not null default 0,
  total integer not null,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'expired')),
  payfast_payment_id text,
  whatsapp_optin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order items
create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  product_name text not null,
  product_price integer not null,
  quantity integer not null check (quantity > 0),
  line_total integer not null
);

-- Order status events (audit log)
create table public.order_status_events (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_orders_status on public.orders(status);
create index idx_orders_created_at on public.orders(created_at desc);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_products_category on public.products(category);
create index idx_products_featured on public.products(featured) where featured = true;

-- Updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_products before update on public.products
  for each row execute function public.set_updated_at();

create trigger set_updated_at_orders before update on public.orders
  for each row execute function public.set_updated_at();
