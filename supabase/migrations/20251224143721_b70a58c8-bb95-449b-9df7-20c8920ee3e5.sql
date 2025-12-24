-- Add issue_type column to issues table
ALTER TABLE public.issues 
ADD COLUMN issue_type text NOT NULL DEFAULT 'problem';

-- Add check constraint for valid issue types
ALTER TABLE public.issues 
ADD CONSTRAINT valid_issue_type CHECK (issue_type IN ('problem', 'no_show', 'postponement'));