-- Reemplazá 'TU_EMAIL_ACA' por el email con el que te registraste
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'TU_EMAIL_ACA';
