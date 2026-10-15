-- =======================================================
-- JARVIS CLOUD - PostgreSQL Production Schema
-- Adapté pour VPS Linux avec PostgreSQL 14+
-- =======================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS bot_instances (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(32),
    name VARCHAR(128) NOT NULL DEFAULT 'JARVIS Assistant',
    status VARCHAR(32) NOT NULL DEFAULT 'OFFLINE',
    config JSONB NOT NULL DEFAULT '{
        "botName": "JARVIS",
        "prefix": ".",
        "autoRead": false,
        "reactToStatus": false,
        "antiDelete": false,
        "antiSpam": true,
        "welcomeMessage": "Bienvenue sur le bot JARVIS !",
        "enabledCommands": ["help", "ping", "ai", "sticker", "calc", "info", "speed", "runtime"]
    }'::jsonb,
    stats JSONB NOT NULL DEFAULT '{
        "messagesHandled": 0,
        "commandsExecuted": 0,
        "reconnectAttempts": 0
    }'::jsonb,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bot_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_bots_status ON bot_instances(status);

CREATE TABLE IF NOT EXISTS bot_logs (
    id VARCHAR(64) PRIMARY KEY,
    bot_id VARCHAR(64) NOT NULL REFERENCES bot_instances(id) ON DELETE CASCADE,
    level VARCHAR(16) NOT NULL,
    message TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_bot_id_time ON bot_logs(bot_id, timestamp DESC);
