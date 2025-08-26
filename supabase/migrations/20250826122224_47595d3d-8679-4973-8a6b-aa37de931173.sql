-- Adicionar campos de peso e volume às paradas de rota
ALTER TABLE route_stops 
ADD COLUMN weight_kg DECIMAL(10,2) DEFAULT 0,
ADD COLUMN volume_m3 DECIMAL(10,3) DEFAULT 0,
ADD COLUMN material_description TEXT;