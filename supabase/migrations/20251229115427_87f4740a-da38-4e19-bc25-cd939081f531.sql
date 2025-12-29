-- Enable realtime for daily_reports table
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_reports;

-- Enable realtime for groups table
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;

-- Enable realtime for bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Enable realtime for guide_unavailability table
ALTER PUBLICATION supabase_realtime ADD TABLE public.guide_unavailability;

-- Enable realtime for daily_assignments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_assignments;