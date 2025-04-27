-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Create backup user with restricted privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'backup_user') THEN
        CREATE USER backup_user WITH PASSWORD 'backup_password';
    END IF;
END
$$;

-- Grant backup privileges
GRANT CONNECT ON DATABASE financial_bot TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;

-- Create read-only user for reporting
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'readonly_user') THEN
        CREATE USER readonly_user WITH PASSWORD 'readonly_password';
    END IF;
END
$$;

-- Grant read-only privileges
GRANT CONNECT ON DATABASE financial_bot TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;

-- Create function to automatically set updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit log function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        old_data = row_to_json(OLD)::JSONB;
        new_data = NULL;
    ELSIF (TG_OP = 'UPDATE') THEN
        old_data = row_to_json(OLD)::JSONB;
        new_data = row_to_json(NEW)::JSONB;
    ELSIF (TG_OP = 'INSERT') THEN
        old_data = NULL;
        new_data = row_to_json(NEW)::JSONB;
    END IF;

    INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        user_id,
        ip_address
    )
    VALUES (
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        TG_OP,
        old_data,
        new_data,
        current_setting('app.current_user_id', true)::UUID,
        inet(current_setting('app.current_ip', true))
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to set session context
CREATE OR REPLACE FUNCTION set_session_context(user_id UUID, ip_address INET)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::TEXT, false);
    PERFORM set_config('app.current_ip', ip_address::TEXT, false);
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Create function for soft delete
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    NEW.deleted_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create view for active records
CREATE OR REPLACE VIEW active_records AS
SELECT *
FROM (
    SELECT *
    FROM users
    WHERE deleted_at IS NULL
    UNION ALL
    SELECT *
    FROM transactions
    WHERE deleted_at IS NULL
    UNION ALL
    SELECT *
    FROM budgets
    WHERE deleted_at IS NULL
) AS active;

-- Create materialized view for financial reports
CREATE MATERIALIZED VIEW IF NOT EXISTS financial_summary AS
SELECT
    u.id AS user_id,
    u.username,
    DATE_TRUNC('month', t.date) AS month,
    t.type,
    t.category,
    COUNT(*) AS transaction_count,
    SUM(t.amount) AS total_amount
FROM users u
JOIN transactions t ON u.id = t.user_id
WHERE t.deleted_at IS NULL
GROUP BY u.id, u.username, DATE_TRUNC('month', t.date), t.type, t.category;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_summary 
ON financial_summary (user_id, month, type, category);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_financial_summary()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY financial_summary;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh materialized view
CREATE TRIGGER refresh_financial_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_financial_summary();

-- Grant privileges on materialized view
GRANT SELECT ON financial_summary TO readonly_user;

-- Create function for budget alerts
CREATE OR REPLACE FUNCTION check_budget_alerts()
RETURNS TRIGGER AS $$
DECLARE
    budget_amount DECIMAL;
    spent_amount DECIMAL;
    budget_threshold DECIMAL;
BEGIN
    -- Get budget amount
    SELECT amount INTO budget_amount
    FROM budgets
    WHERE user_id = NEW.user_id
    AND category = NEW.category
    AND period = 'MONTHLY'
    AND DATE_TRUNC('month', startDate) = DATE_TRUNC('month', NEW.date);

    IF FOUND THEN
        -- Calculate total spent
        SELECT COALESCE(SUM(amount), 0) INTO spent_amount
        FROM transactions
        WHERE user_id = NEW.user_id
        AND category = NEW.category
        AND type = 'EXPENSE'
        AND DATE_TRUNC('month', date) = DATE_TRUNC('month', NEW.date);

        -- Check if spent amount exceeds threshold
        budget_threshold := budget_amount * 0.8; -- 80% threshold
        
        IF spent_amount > budget_threshold THEN
            -- Insert notification
            INSERT INTO notifications (
                user_id,
                type,
                message,
                data
            ) VALUES (
                NEW.user_id,
                'BUDGET_ALERT',
                'Budget threshold exceeded for ' || NEW.category,
                jsonb_build_object(
                    'category', NEW.category,
                    'budget', budget_amount,
                    'spent', spent_amount,
                    'threshold', budget_threshold
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for budget alerts
CREATE TRIGGER check_budget_alerts_trigger
AFTER INSERT ON transactions
FOR EACH ROW
WHEN (NEW.type = 'EXPENSE')
EXECUTE FUNCTION check_budget_alerts();

-- Set default permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO backup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO readonly_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO backup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO readonly_user;
