alter table profiles add column referred_by uuid references profiles(id);
create index idx_profiles_referred_by on profiles(referred_by);
