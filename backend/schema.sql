-- Esquema PostgreSQL do ERP Autopeças.
-- ATENÇÃO: este script recria as tabelas e remove os dados existentes.
DROP TABLE IF EXISTS itens_venda CASCADE;
DROP TABLE IF EXISTS orcamento_itens CASCADE;
DROP TABLE IF EXISTS orcamentos CASCADE;
DROP TABLE IF EXISTS vendas CASCADE;
DROP TABLE IF EXISTS pessoas CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;

CREATE TABLE pessoas (
    id SERIAL PRIMARY KEY,
    pessoa_fisica BOOLEAN DEFAULT TRUE,
    nome_fantasia VARCHAR(255) NOT NULL,
    cnpj_cpf VARCHAR(20) UNIQUE,
    logradouro VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(255),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    whatsapp VARCHAR(20),
    cliente BOOLEAN DEFAULT TRUE,
    fornecedor BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    marca VARCHAR(100),
    fornecedor_padrao VARCHAR(255),
    codigo_nfe VARCHAR(100),
    codigo_fornecedor_padrao VARCHAR(100),
    ean VARCHAR(50),
    ncm VARCHAR(20),
    cfop VARCHAR(10),
    preco_custo NUMERIC(10,2) DEFAULT 0.00,
    valor_preco_fixado NUMERIC(10,2) NOT NULL,
    unidade_comercial VARCHAR(20) DEFAULT 'UN',
    sku VARCHAR(100),
    estoque_atual NUMERIC(10,3) DEFAULT 0.000,
    estoque_minimo NUMERIC(10,3) DEFAULT 0.000,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendas (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES pessoas(id) ON DELETE SET NULL,
    desconto NUMERIC(10,2) DEFAULT 0.00,
    forma_pagamento VARCHAR(50) NOT NULL,
    usuario VARCHAR(100) DEFAULT 'Atendente Balcão',
    total NUMERIC(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'CONCLUIDA' CHECK (status IN ('CONCLUIDA', 'PENDENTE', 'CANCELADA')),
    status_pagamento VARCHAR(20) NOT NULL DEFAULT 'pago' CHECK (status_pagamento IN ('pago', 'pendente')),
    data_pagamento TIMESTAMP,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE itens_venda (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade NUMERIC(10,3) NOT NULL CHECK (quantidade > 0),
    valor_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);

CREATE TABLE orcamentos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES pessoas(id) ON DELETE SET NULL,
    desconto NUMERIC(10,2) DEFAULT 0.00,
    total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'cancelado')),
    venda_id INTEGER UNIQUE REFERENCES vendas(id) ON DELETE SET NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orcamento_itens (
    id SERIAL PRIMARY KEY,
    orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade NUMERIC(10,3) NOT NULL CHECK (quantidade > 0),
    valor_unitario NUMERIC(10,2) NOT NULL CHECK (valor_unitario >= 0),
    subtotal NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_pessoas_cliente ON pessoas (cliente) WHERE cliente = TRUE;
CREATE INDEX idx_pessoas_fornecedor ON pessoas (fornecedor) WHERE fornecedor = TRUE;
CREATE INDEX idx_produtos_ean ON produtos (ean);
CREATE INDEX idx_produtos_codigo_nfe ON produtos (codigo_nfe);
CREATE INDEX idx_vendas_criado_em ON vendas (criado_em DESC);
CREATE INDEX idx_orcamentos_criado_em ON orcamentos (criado_em DESC);
CREATE INDEX idx_orcamentos_status ON orcamentos (status);
