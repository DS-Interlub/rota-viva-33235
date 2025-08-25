-- Adicionar campos necessários para as entregas nas paradas da rota
ALTER TABLE route_stops 
ADD COLUMN arrival_time time,
ADD COLUMN departure_time time,
ADD COLUMN receiver_name text,
ADD COLUMN receiver_email text,
ADD COLUMN receiver_department text;

-- Adicionar campos para horários na base nas rotas
ALTER TABLE routes
ADD COLUMN base_departure_time time,
ADD COLUMN base_arrival_time time;