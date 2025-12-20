-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'guide');

-- Create guides profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create daily activities options table
CREATE TABLE public.activity_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  emoji TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily activity reports table
CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES public.activity_options(id) ON DELETE CASCADE NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (guide_id, activity_id, report_date)
);

-- Create email logs table
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_email TEXT NOT NULL,
  customer_language TEXT NOT NULL,
  pickup_time TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for activity_options (everyone can read, admins can manage)
CREATE POLICY "Everyone can view activities" ON public.activity_options
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage activities" ON public.activity_options
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for daily_reports
CREATE POLICY "Guides can view their own reports" ON public.daily_reports
  FOR SELECT USING (auth.uid() = guide_id);

CREATE POLICY "Guides can create their own reports" ON public.daily_reports
  FOR INSERT WITH CHECK (auth.uid() = guide_id);

CREATE POLICY "Admins can view all reports" ON public.daily_reports
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for email_logs
CREATE POLICY "Guides can view their own email logs" ON public.email_logs
  FOR SELECT USING (auth.uid() = guide_id);

CREATE POLICY "Guides can create email logs" ON public.email_logs
  FOR INSERT WITH CHECK (auth.uid() = guide_id);

CREATE POLICY "Admins can view all email logs" ON public.email_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'full_name', new.email));
  RETURN new;
END;
$$;

-- Trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles timestamp
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default activities
INSERT INTO public.activity_options (name, name_ar, emoji, sort_order) VALUES
  ('Customer Contacted', 'تم التواصل مع الزبائن', '📞', 1),
  ('Departure to camp', 'الانطلاق إلى الكامب', '🚐', 2),
  ('Start Visit to Argan Cooperative', 'بدء زيارة تعاونية الأركان', '🏛️', 3),
  ('Start Quad Biking Session', 'بدء نشاط الدراجات الرباعية', '🏍️', 4),
  ('Start Camel Ride', 'بدء نشاط الجمال', '🐪', 5),
  ('Dinner', 'العشاء', '🍽️', 6),
  ('Start Fire Show & Entertainment', 'بدء عرض النار والترفيه', '🔥', 7),
  ('Return to Meeting Point', 'العودة إلى نقطة الالتقاء', '🏁', 8);