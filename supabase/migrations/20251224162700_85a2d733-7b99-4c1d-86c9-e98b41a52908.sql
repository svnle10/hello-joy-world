-- Add status and postponed_date columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN status text NOT NULL DEFAULT 'confirmed',
ADD COLUMN postponed_to date NULL,
ADD COLUMN notes text NULL;

-- Add a check constraint for valid statuses
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('confirmed', 'cancelled', 'postponed', 'no_show', 'problem'));