-- Create table for guide unavailability
CREATE TABLE public.guide_unavailability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL,
  unavailable_date DATE NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guide_unavailability ENABLE ROW LEVEL SECURITY;

-- Guides can view their own unavailability records
CREATE POLICY "Guides can view their own unavailability"
ON public.guide_unavailability
FOR SELECT
USING (auth.uid() = guide_id);

-- Guides can create their own unavailability records
CREATE POLICY "Guides can create their own unavailability"
ON public.guide_unavailability
FOR INSERT
WITH CHECK (auth.uid() = guide_id);

-- Guides can delete their own unavailability records
CREATE POLICY "Guides can delete their own unavailability"
ON public.guide_unavailability
FOR DELETE
USING (auth.uid() = guide_id);

-- Admins can view all unavailability records
CREATE POLICY "Admins can view all unavailability"
ON public.guide_unavailability
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all unavailability records
CREATE POLICY "Admins can manage all unavailability"
ON public.guide_unavailability
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX idx_guide_unavailability_unique 
ON public.guide_unavailability (guide_id, unavailable_date);