-- Políticas RLS para bucket delivery-photos
CREATE POLICY "Drivers can upload delivery photos for their routes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'delivery-photos' AND
  auth.uid() IN (
    SELECT p.user_id 
    FROM profiles p
    JOIN routes r ON r.driver_id = p.driver_id
    WHERE r.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Drivers can view delivery photos for their routes" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'delivery-photos' AND
  (
    auth.uid() IN (
      SELECT p.user_id 
      FROM profiles p
      JOIN routes r ON r.driver_id = p.driver_id
      WHERE r.id::text = (storage.foldername(name))[1]
    ) OR
    -- Admins can view all photos
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

CREATE POLICY "Drivers can delete delivery photos for their routes" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'delivery-photos' AND
  auth.uid() IN (
    SELECT p.user_id 
    FROM profiles p
    JOIN routes r ON r.driver_id = p.driver_id
    WHERE r.id::text = (storage.foldername(name))[1]
  )
);

-- Políticas RLS para bucket signatures
CREATE POLICY "Drivers can upload signatures for their routes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'signatures' AND
  auth.uid() IN (
    SELECT p.user_id 
    FROM profiles p
    JOIN routes r ON r.driver_id = p.driver_id
    WHERE r.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Drivers can view signatures for their routes" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'signatures' AND
  (
    auth.uid() IN (
      SELECT p.user_id 
      FROM profiles p
      JOIN routes r ON r.driver_id = p.driver_id
      WHERE r.id::text = (storage.foldername(name))[1]
    ) OR
    -- Admins can view all signatures
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

CREATE POLICY "Drivers can delete signatures for their routes" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'signatures' AND
  auth.uid() IN (
    SELECT p.user_id 
    FROM profiles p
    JOIN routes r ON r.driver_id = p.driver_id
    WHERE r.id::text = (storage.foldername(name))[1]
  )
);

-- Políticas RLS para bucket receipts (para admins)
CREATE POLICY "Admins can manage receipts" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'receipts' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);