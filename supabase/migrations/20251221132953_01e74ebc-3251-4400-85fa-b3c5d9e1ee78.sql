-- Create daily_assignments table to track which guides work each day and their group
CREATE TABLE public.daily_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL,
  assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  group_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(guide_id, assignment_date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can manage all assignments
CREATE POLICY "Admins can manage assignments"
ON public.daily_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Guides can view their own assignments
CREATE POLICY "Guides can view their own assignments"
ON public.daily_assignments
FOR SELECT
USING (auth.uid() = guide_id);

-- Create index for faster lookups
CREATE INDEX idx_daily_assignments_date ON public.daily_assignments(assignment_date);
CREATE INDEX idx_daily_assignments_guide ON public.daily_assignments(guide_id);