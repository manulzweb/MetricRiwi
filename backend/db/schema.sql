-- FeedbackAI - Esquema de base de datos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reportes de análisis
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    sentiment_score DECIMAL(5,2),         -- escala 0.00 a 100.00
    positive_themes JSONB,                -- principales elogios
    negative_themes JSONB,                -- principales quejas
    recommended_actions JSONB,            -- acciones recomendadas
    created_at TIMESTAMP DEFAULT NOW()
);

-- Comentarios individuales
CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sentiment VARCHAR(20),                -- positive, negative, neutral
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_analysis_id ON feedbacks(analysis_id);
