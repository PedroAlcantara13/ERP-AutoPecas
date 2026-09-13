-- Execute uma vez nos bancos já existentes antes de publicar o Crediário.
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS status_pagamento VARCHAR(20);
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP;

UPDATE vendas
SET status_pagamento = 'pago',
    data_pagamento = COALESCE(data_pagamento, criado_em)
WHERE status_pagamento IS NULL;

ALTER TABLE vendas ALTER COLUMN status_pagamento SET DEFAULT 'pago';
ALTER TABLE vendas ALTER COLUMN status_pagamento SET NOT NULL;

ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_status_check;
ALTER TABLE vendas ADD CONSTRAINT vendas_status_check CHECK (status IN ('CONCLUIDA', 'PENDENTE', 'CANCELADA'));
