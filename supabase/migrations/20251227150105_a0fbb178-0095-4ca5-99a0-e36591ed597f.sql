-- Add status column to guide_unavailability table for approval workflow
ALTER TABLE public.guide_unavailability 
ADD COLUMN status text NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add admin_notes column for rejection reasons
ALTER TABLE public.guide_unavailability 
ADD COLUMN admin_notes text;

-- Add responded_at timestamp
ALTER TABLE public.guide_unavailability 
ADD COLUMN responded_at timestamp with time zone;

-- Add responded_by to track which admin responded
ALTER TABLE public.guide_unavailability 
ADD COLUMN responded_by uuid REFERENCES auth.users(id);

-- Update existing records to be approved (backwards compatibility)
UPDATE public.guide_unavailability SET status = 'approved' WHERE status = 'pending';