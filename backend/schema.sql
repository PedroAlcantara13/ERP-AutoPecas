-- Remove tabelas antigas se existirem para recriar do zero
DROP TABLE IF EXISTS itens_venda CASCADE;
DROP TABLE IF EXISTS vendas CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;

-- Tabela de Produtos
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'PECA',
    categoria VARCHAR(100) DEFAULT 'GERAL',
    codigo_interno VARCHAR(50),
    sku VARCHAR(50) UNIQUE NOT NULL,
    marca VARCHAR(100),
    modelo_aplicacao VARCHAR(255),
    validade_dias INT DEFAULT 0,
    unidade_medida VARCHAR(10) DEFAULT 'UN',
    valor_custo DECIMAL(10, 2) DEFAULT 0.00,
    valor_venda DECIMAL(10, 2) NOT NULL,
    estoque_atual DECIMAL(10, 3) DEFAULT 0.000,
    estoque_minimo DECIMAL(10, 3) DEFAULT 0.000,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(20) UNIQUE,
    telefone VARCHAR(20),
    email VARCHAR(100),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Vendas
CREATE TABLE vendas (
    id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(id) ON DELETE SET NULL,
    desconto DECIMAL(10, 2) DEFAULT 0.00,
    forma_pagamento VARCHAR(50) NOT NULL,
    usuario VARCHAR(100) DEFAULT 'Atendente Balcão',
    total DECIMAL(10, 2) DEFAULT 0.00,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Itens da Venda
CREATE TABLE itens_venda (
    id SERIAL PRIMARY KEY,
    venda_id INT REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id INT REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade DECIMAL(10, 3) NOT NULL,
    valor_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

-- Dados Iniciais de Teste (Produtos Autopeças)
INSERT INTO produtos (nome, tipo, categoria, codigo_interno, sku, marca, modelo_aplicacao, unidade_medida, valor_custo, valor_venda, estoque_atual, estoque_minimo) VALUES
('Óleo Sintético 5W30 1L', 'LUBRIFICANTE', 'Óleos', 'OLEO-5W30', 'SKU-001', 'Havoline', 'Universal Motor Flex/Gasolina', 'UN', 25.00, 45.00, 50.000, 10.000),
('Pastilha de Freio Dianteira', 'PECA', 'Freios', 'PAS-002', 'SKU-002', 'Fras-le', 'Gol G5 / Fox 1.0 1.6', 'UN', 40.00, 85.00, 12.000, 3.000),
('Filtro de Ar do Motor', 'FILTRO', 'Filtros', 'FIL-003', 'SKU-003', 'Tecfil', 'Onix / Prisma 1.0 1.4', 'UN', 15.00, 32.00, 20.000, 5.000),
('Graxa Chassi Lubrificante', 'GRAXA', 'Químicos', 'GRX-004', 'SKU-004', 'Tutela', 'Geral / Oficina', 'KG', 18.00, 35.00, 15.500, 2.000);