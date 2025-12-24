-- Create bookings table for individual bookings within a group
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  booking_reference TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  number_of_people INTEGER NOT NULL DEFAULT 1,
  language TEXT NOT NULL DEFAULT 'English',
  meeting_point TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS policies for bookings
CREATE POLICY "Admins can manage all bookings"
  ON public.bookings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Guides can view bookings for their groups"
  ON public.bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = bookings.group_id
      AND groups.guide_id = auth.uid()
    )
  );

-- Remove booking-specific columns from groups table (keep only group-level info)
ALTER TABLE public.groups DROP COLUMN IF EXISTS booking_reference;
ALTER TABLE public.groups DROP COLUMN IF EXISTS customer_name;
ALTER TABLE public.groups DROP COLUMN IF EXISTS phone;
ALTER TABLE public.groups DROP COLUMN IF EXISTS email;
ALTER TABLE public.groups DROP COLUMN IF EXISTS number_of_people;
ALTER TABLE public.groups DROP COLUMN IF EXISTS language;
ALTER TABLE public.groups DROP COLUMN IF EXISTS meeting_point;

-- Add total_participants to groups (calculated or stored)
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS total_participants INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX idx_bookings_group_id ON public.bookings(group_id);
CREATE INDEX idx_bookings_meeting_point ON public.bookings(meeting_point);