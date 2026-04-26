-- Add grade column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS grade text
  CHECK (grade IN ('Freshman', 'Sophomore', 'Junior', 'Senior'));

-- Update handle_new_user trigger to capture grade from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, grade)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'member'),
    new.raw_user_meta_data->>'grade'
  );
  RETURN new;
END;
$$;

-- Allow exec users to update profiles (for setting grades)
DROP POLICY IF EXISTS "Exec can update profiles" ON profiles;
CREATE POLICY "Exec can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'exec')
  );
