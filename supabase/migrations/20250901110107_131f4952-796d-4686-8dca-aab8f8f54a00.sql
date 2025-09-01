-- Atualizar função handle_new_user para incluir driver_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, role, driver_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'driver'),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'driver_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'driver_id')::uuid
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$function$;