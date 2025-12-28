-- Allow guides to insert their own groups
CREATE POLICY "Guides can create their own groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = guide_id);

-- Allow guides to update their own groups
CREATE POLICY "Guides can update their own groups" 
ON public.groups 
FOR UPDATE 
USING (auth.uid() = guide_id);

-- Allow guides to insert bookings for their groups
CREATE POLICY "Guides can create bookings for their groups" 
ON public.bookings 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM groups 
  WHERE groups.id = bookings.group_id 
  AND groups.guide_id = auth.uid()
));

-- Allow guides to update bookings for their groups
CREATE POLICY "Guides can update bookings for their groups" 
ON public.bookings 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM groups 
  WHERE groups.id = bookings.group_id 
  AND groups.guide_id = auth.uid()
));