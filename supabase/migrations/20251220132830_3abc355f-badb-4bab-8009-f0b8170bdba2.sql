-- Add webhook URL column to profiles
ALTER TABLE public.profiles 
ADD COLUMN webhook_url TEXT;