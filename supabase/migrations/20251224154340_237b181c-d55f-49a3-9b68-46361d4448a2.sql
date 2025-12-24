-- Create groups table for managing tour group bookings
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_number INTEGER NOT NULL,
  booking_reference TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  number_of_people INTEGER NOT NULL DEFAULT 1,
  language TEXT NOT NULL DEFAULT 'English',
  meeting_point TEXT NOT NULL,
  meeting_time TEXT NOT NULL,
  tour_date DATE NOT NULL DEFAULT CURRENT_DATE,
  guide_id UUID REFERENCES public.profiles(user_id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all groups" 
ON public.groups 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Guides can view their assigned groups" 
ON public.groups 
FOR SELECT 
USING (auth.uid() = guide_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_groups_tour_date ON public.groups(tour_date);
CREATE INDEX idx_groups_guide_id ON public.groups(guide_id);
CREATE INDEX idx_groups_status ON public.groups(status);