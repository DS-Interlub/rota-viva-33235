-- Adicionar campo de prioridade nas paradas da rota
ALTER TABLE route_stops 
ADD COLUMN priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 3);

COMMENT ON COLUMN route_stops.priority IS '0=Normal, 1=Baixa, 2=Alta, 3=Urgente';
