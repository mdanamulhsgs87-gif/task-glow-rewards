ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nid_number text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS village_area text,
  ADD COLUMN IF NOT EXISTS post_office text,
  ADD COLUMN IF NOT EXISTS thana_upazila text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS full_address text;