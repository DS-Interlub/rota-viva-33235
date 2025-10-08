-- 1. Adicionar campo para vincular cliente a transportadora
ALTER TABLE customers 
ADD COLUMN transporter_id uuid REFERENCES customers(id) ON DELETE SET NULL;

-- 2. Adicionar campo de observações de entrega
ALTER TABLE customers 
ADD COLUMN delivery_notes text;

-- 3. Adicionar índice para melhorar performance de consultas
CREATE INDEX idx_customers_transporter_id ON customers(transporter_id);

-- 4. Adicionar comentários para documentação
COMMENT ON COLUMN customers.transporter_id IS 'ID da transportadora vinculada (quando o cliente usa transportadora para receber entregas)';
COMMENT ON COLUMN customers.delivery_notes IS 'Observações sobre horários de recebimento, restrições de acesso, etc.';