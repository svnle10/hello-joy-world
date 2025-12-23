-- Create issues table for problem documentation
CREATE TABLE public.issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL,
  booking_reference TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Guides can view their own issues
CREATE POLICY "Guides can view their own issues" 
ON public.issues 
FOR SELECT 
USING (auth.uid() = guide_id);

-- Guides can create their own issues
CREATE POLICY "Guides can create their own issues" 
ON public.issues 
FOR INSERT 
WITH CHECK (auth.uid() = guide_id);

-- Guides can update their own issues
CREATE POLICY "Guides can update their own issues" 
ON public.issues 
FOR UPDATE 
USING (auth.uid() = guide_id);

-- Guides can delete their own issues
CREATE POLICY "Guides can delete their own issues" 
ON public.issues 
FOR DELETE 
USING (auth.uid() = guide_id);

-- Admins can view all issues
CREATE POLICY "Admins can view all issues" 
ON public.issues 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete all issues
CREATE POLICY "Admins can delete all issues" 
ON public.issues 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_issues_updated_at
BEFORE UPDATE ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create issues_attachments table for files
CREATE TABLE public.issue_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.issue_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments for issues they can see
CREATE POLICY "Users can view attachments for their issues" 
ON public.issue_attachments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.issues 
    WHERE issues.id = issue_attachments.issue_id 
    AND (issues.guide_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Guides can create attachments for their issues
CREATE POLICY "Guides can create attachments for their issues" 
ON public.issue_attachments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.issues 
    WHERE issues.id = issue_attachments.issue_id 
    AND issues.guide_id = auth.uid()
  )
);

-- Guides can delete attachments for their issues
CREATE POLICY "Guides can delete attachments for their issues" 
ON public.issue_attachments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.issues 
    WHERE issues.id = issue_attachments.issue_id 
    AND issues.guide_id = auth.uid()
  )
);

-- Create storage bucket for issue files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'issue-files', 
  'issue-files', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
);

-- Storage policies for issue files
CREATE POLICY "Authenticated users can upload issue files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'issue-files');

CREATE POLICY "Anyone can view issue files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'issue-files');

CREATE POLICY "Users can delete their own issue files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'issue-files' AND auth.uid()::text = (storage.foldername(name))[1]);