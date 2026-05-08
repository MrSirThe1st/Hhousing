-- Create maintenance-photos storage bucket for tenant photo uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'maintenance-photos',
  'maintenance-photos',
  true,
  5242880, -- 5 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do nothing;

drop policy if exists "Tenants can upload maintenance photos" on storage.objects;
drop policy if exists "Tenants can update their maintenance photos" on storage.objects;
drop policy if exists "Tenants can delete their maintenance photos" on storage.objects;
drop policy if exists "Public read access for maintenance photos" on storage.objects;

-- Allow authenticated users to upload to their own folder (user_id prefix)
create policy "Tenants can upload maintenance photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'maintenance-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update/overwrite their own files
create policy "Tenants can update their maintenance photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'maintenance-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
create policy "Tenants can delete their maintenance photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'maintenance-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read access (bucket is public, photos are referenced by URL in the app)
create policy "Public read access for maintenance photos"
on storage.objects for select
using (bucket_id = 'maintenance-photos');
