-- Malabar Eco Solutions - Database Schema
-- This file contains the complete database schema definition in logical order
-- from base tables to transaction tables and finally triggers and functions.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- 1. CORE TABLES - User Authentication and Settings
-- ===============================================

-- Users table for authentication and staff management
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR NOT NULL UNIQUE,
    password VARCHAR NOT NULL,
    role VARCHAR NOT NULL CHECK (role IN ('staff', 'manager', 'admin')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Bank accounts for financial tracking
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    opening_balance NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Locations table for all types of locations (LSGIs, MRFs, buyers, etc.)
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    district TEXT,
    address TEXT,
    contact_person TEXT,
    contact_number TEXT,
    commission_rate NUMERIC DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Materials table for waste types
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    unit TEXT NOT NULL DEFAULT 'kg',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- 2. TRANSACTION TABLES - Main business operations
-- ===============================================

-- Rejected waste inward entries (waste collection)
CREATE TABLE IF NOT EXISTS public.rejected_waste_inward (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_number TEXT NOT NULL UNIQUE,
    transaction_date DATE NOT NULL,
    from_location_id UUID NOT NULL REFERENCES public.locations(id),
    to_location_id UUID NOT NULL REFERENCES public.locations(id),
    collection_agent_id UUID REFERENCES public.locations(id),
    vehicle_number TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    rate_per_kg NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    labor_rate_per_kg NUMERIC NOT NULL,
    labor_amount NUMERIC NOT NULL,
    commission_amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Labor distributions for rejected waste inward
CREATE TABLE IF NOT EXISTS public.rejected_waste_inward_labor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inward_id UUID NOT NULL REFERENCES public.rejected_waste_inward(id),
    staff_id UUID NOT NULL REFERENCES public.users(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Segregated waste outward entries (sales of segregated materials)
CREATE TABLE IF NOT EXISTS public.segregated_waste_outward (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_number TEXT NOT NULL UNIQUE,
    transaction_date DATE NOT NULL,
    buyer_id UUID NOT NULL REFERENCES public.locations(id),
    vehicle_number TEXT NOT NULL,
    total_quantity NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    segregation_rate_per_kg NUMERIC NOT NULL,
    segregation_amount NUMERIC NOT NULL,
    bailing_rate_per_kg NUMERIC NOT NULL,
    bailing_amount NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Segregated waste outward items (material-level details)
CREATE TABLE IF NOT EXISTS public.segregated_waste_outward_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outward_id UUID NOT NULL REFERENCES public.segregated_waste_outward(id),
    material_type TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    rate_per_kg NUMERIC NOT NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Labor distributions for segregated waste outward
CREATE TABLE IF NOT EXISTS public.segregated_waste_outward_labor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outward_id UUID NOT NULL REFERENCES public.segregated_waste_outward(id),
    staff_id UUID NOT NULL REFERENCES public.users(id),
    labor_type TEXT NOT NULL CHECK (labor_type IN ('SEGREGATION', 'BAILING')),
    amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Rejected waste outward entries (disposal or sales of rejected waste)
CREATE TABLE IF NOT EXISTS public.rejected_waste_outward (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_number TEXT NOT NULL UNIQUE,
    transaction_date DATE NOT NULL,
    recipient_id UUID NOT NULL REFERENCES public.locations(id),
    vehicle_number TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    rate_per_kg NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    is_expense BOOLEAN NOT NULL,
    bailing_rate_per_kg NUMERIC NOT NULL,
    bailing_amount NUMERIC NOT NULL,
    loading_rate_per_kg NUMERIC NOT NULL,
    loading_amount NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Labor distributions for rejected waste outward
CREATE TABLE IF NOT EXISTS public.rejected_waste_outward_labor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outward_id UUID NOT NULL REFERENCES public.rejected_waste_outward(id),
    staff_id UUID NOT NULL REFERENCES public.users(id),
    labor_type TEXT NOT NULL CHECK (labor_type IN ('BAILING', 'LOADING')),
    amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- 3. SUPPORT TABLES - Financial and inventory tracking
-- ===============================================

-- Inventory tracking
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES public.materials(id),
    location_id UUID NOT NULL REFERENCES public.locations(id),
    quantity NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(material_id, location_id)
);

-- Inventory adjustments for manual changes
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES public.locations(id),
    material_id UUID NOT NULL REFERENCES public.materials(id),
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('COUNT', 'ADD', 'REMOVE', 'LOSS')),
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    previous_qty NUMERIC NOT NULL,
    new_qty NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    adjustment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_type TEXT NOT NULL,
    transaction_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL,
    reference_number TEXT,
    bank_account_id UUID REFERENCES public.bank_accounts(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_credit BOOLEAN NOT NULL DEFAULT TRUE,
    staff_id UUID REFERENCES public.users(id)
);

-- Staff ledger for tracking payments to staff
CREATE TABLE IF NOT EXISTS public.staff_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.users(id),
    amount NUMERIC NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    reference_number TEXT,
    is_payment_to_staff BOOLEAN NOT NULL,
    running_balance NUMERIC NOT NULL,
    payment_id UUID REFERENCES public.payments(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Bank transactions
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_number TEXT,
    description TEXT,
    performed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- 4. FUNCTIONS - Database logic for business operations
-- ===============================================

-- Function to update inventory when rejected waste is received
CREATE OR REPLACE FUNCTION update_inventory_on_rejected_inward()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update inventory for rejected waste
    INSERT INTO inventory (material_id, location_id, quantity)
    VALUES (
        (SELECT id FROM materials WHERE code = 'RW' LIMIT 1), -- Rejected Waste
        NEW.to_location_id, -- The destination MRF/facility
        NEW.quantity
    )
    ON CONFLICT (material_id, location_id)
    DO UPDATE SET
        quantity = inventory.quantity + NEW.quantity,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update inventory when rejected waste is sent out
CREATE OR REPLACE FUNCTION update_inventory_on_rejected_outward()
RETURNS TRIGGER AS $$
BEGIN
    -- Reduce inventory for rejected waste
    UPDATE inventory
    SET quantity = quantity - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE material_id = (SELECT id FROM materials WHERE code = 'RW' LIMIT 1)
    AND location_id = NEW.recipient_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update inventory for segregated waste items
CREATE OR REPLACE FUNCTION update_inventory_on_segregated_outward_items()
RETURNS TRIGGER AS $$
DECLARE
    location_id UUID;
BEGIN
    -- Get the location ID from the parent transaction
    SELECT buyer_id INTO location_id
    FROM segregated_waste_outward
    WHERE id = NEW.outward_id;
    
    -- Find material ID by material_type (assuming material_type matches code or name)
    -- Update inventory for the specific material
    UPDATE inventory
    SET quantity = quantity - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE location_id = location_id
    AND material_id = (
        SELECT id FROM materials 
        WHERE code = NEW.material_type OR name = NEW.material_type
        LIMIT 1
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to distribute labor for segregated waste outward
CREATE OR REPLACE FUNCTION distribute_segregated_labor_payment()
RETURNS TRIGGER AS $$
DECLARE
    segregation_staff_count INTEGER;
    bailing_staff_count INTEGER;
    segregation_per_staff NUMERIC(12, 2);
    bailing_per_staff NUMERIC(12, 2);
    staff_rec RECORD;
BEGIN
    -- Get counts of staff by type - removing is_active filter
    SELECT COUNT(*) INTO segregation_staff_count FROM users 
    WHERE role = 'staff';
    
    -- Calculate per-staff amounts
    IF segregation_staff_count > 0 THEN
        segregation_per_staff := NEW.segregation_amount / segregation_staff_count;
        bailing_per_staff := NEW.bailing_amount / segregation_staff_count;
        
        -- Distribute segregation labor - removing is_active filter
        FOR staff_rec IN SELECT id FROM users 
                        WHERE role = 'staff'
        LOOP
            -- Insert segregation labor
            INSERT INTO segregated_waste_outward_labor (
                outward_id, staff_id, labor_type, amount
            ) VALUES (
                NEW.id, staff_rec.id, 'SEGREGATION', segregation_per_staff
            );
            
            -- Update staff ledger for segregation
            INSERT INTO staff_ledger (
                staff_id, amount, transaction_date, description,
                payment_method, is_payment_to_staff, running_balance
            ) 
            SELECT 
                staff_rec.id, segregation_per_staff, NEW.transaction_date, 
                'Segregation labor for voucher: ' || NEW.voucher_number,
                'labor_charge', true, 
                COALESCE((SELECT running_balance FROM staff_ledger 
                         WHERE staff_id = staff_rec.id 
                         ORDER BY created_at DESC LIMIT 1), 0) + segregation_per_staff;
                         
            -- Insert bailing labor
            INSERT INTO segregated_waste_outward_labor (
                outward_id, staff_id, labor_type, amount
            ) VALUES (
                NEW.id, staff_rec.id, 'BAILING', bailing_per_staff
            );
            
            -- Update staff ledger for bailing
            INSERT INTO staff_ledger (
                staff_id, amount, transaction_date, description,
                payment_method, is_payment_to_staff, running_balance
            ) 
            SELECT 
                staff_rec.id, bailing_per_staff, NEW.transaction_date, 
                'Bailing labor for voucher: ' || NEW.voucher_number,
                'labor_charge', true, 
                COALESCE((SELECT running_balance FROM staff_ledger 
                         WHERE staff_id = staff_rec.id 
                         ORDER BY created_at DESC LIMIT 1), 0) + bailing_per_staff;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to distribute labor for rejected waste outward
CREATE OR REPLACE FUNCTION distribute_rejected_outward_labor()
RETURNS TRIGGER AS $$
DECLARE
    staff_count INTEGER;
    bailing_per_staff NUMERIC(12, 2);
    loading_per_staff NUMERIC(12, 2);
    staff_rec RECORD;
BEGIN
    -- Get count of staff (removed is_active filter)
    SELECT COUNT(*) INTO staff_count FROM users 
    WHERE role = 'staff';
    
    -- Calculate per-staff amounts
    IF staff_count > 0 THEN
        bailing_per_staff := NEW.bailing_amount / staff_count;
        loading_per_staff := NEW.loading_amount / staff_count;
        
        -- Distribute labor (removed is_active filter)
        FOR staff_rec IN SELECT id FROM users 
                        WHERE role = 'staff'
        LOOP
            -- Insert bailing labor
            INSERT INTO rejected_waste_outward_labor (
                outward_id, staff_id, labor_type, amount
            ) VALUES (
                NEW.id, staff_rec.id, 'BAILING', bailing_per_staff
            );
            
            -- Update staff ledger for bailing
            INSERT INTO staff_ledger (
                staff_id, amount, transaction_date, description,
                payment_method, is_payment_to_staff, running_balance
            ) 
            SELECT 
                staff_rec.id, bailing_per_staff, NEW.transaction_date, 
                'Bailing labor for outward voucher: ' || NEW.voucher_number,
                'labor_charge', true, 
                COALESCE((SELECT running_balance FROM staff_ledger 
                         WHERE staff_id = staff_rec.id 
                         ORDER BY created_at DESC LIMIT 1), 0) + bailing_per_staff;
                
            -- Insert loading labor
            INSERT INTO rejected_waste_outward_labor (
                outward_id, staff_id, labor_type, amount
            ) VALUES (
                NEW.id, staff_rec.id, 'LOADING', loading_per_staff
            );
            
            -- Update staff ledger for loading
            INSERT INTO staff_ledger (
                staff_id, amount, transaction_date, description,
                payment_method, is_payment_to_staff, running_balance
            ) 
            SELECT 
                staff_rec.id, loading_per_staff, NEW.transaction_date, 
                'Loading labor for outward voucher: ' || NEW.voucher_number,
                'labor_charge', true, 
                COALESCE((SELECT running_balance FROM staff_ledger 
                         WHERE staff_id = staff_rec.id 
                         ORDER BY created_at DESC LIMIT 1), 0) + loading_per_staff;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle staff labor payments for rejected waste inward
CREATE OR REPLACE FUNCTION add_staff_labor_payment(p_inward_id uuid, p_staff_id uuid, p_amount numeric)
RETURNS VOID AS $$
DECLARE
    v_voucher_number text;
    v_transaction_date date;
BEGIN
    -- Get voucher number and transaction date
    SELECT voucher_number, transaction_date INTO v_voucher_number, v_transaction_date
    FROM rejected_waste_inward
    WHERE id = p_inward_id;
    
    -- Insert into rejected_waste_inward_labor
    INSERT INTO rejected_waste_inward_labor (
        inward_id, staff_id, amount, created_at
    ) VALUES (
        p_inward_id, p_staff_id, p_amount, CURRENT_TIMESTAMP
    );
    
    -- Add entry to staff_ledger
    INSERT INTO staff_ledger (
        staff_id, 
        amount, 
        transaction_date, 
        description,
        payment_method, 
        is_payment_to_staff, 
        running_balance
    ) 
    SELECT 
        p_staff_id, 
        p_amount, 
        v_transaction_date, 
        'Labor payment for voucher: ' || v_voucher_number,
        'labor_charge', 
        true, 
        COALESCE((
            SELECT running_balance 
            FROM staff_ledger 
            WHERE staff_id = p_staff_id 
            ORDER BY created_at DESC 
            LIMIT 1
        ), 0) + p_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to handle commission for collection agents
CREATE OR REPLACE FUNCTION distribute_labor_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate numeric(10, 2);
BEGIN
    -- Calculate commission if collection agent exists
    IF NEW.collection_agent_id IS NOT NULL THEN
        -- Get commission rate from locations table
        SELECT commission_rate INTO v_commission_rate 
        FROM locations 
        WHERE id = NEW.collection_agent_id;
        
        -- Set commission amount in the record
        NEW.commission_amount := NEW.quantity * v_commission_rate;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle bank transaction balances
CREATE OR REPLACE FUNCTION update_bank_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update bank account balance
    UPDATE public.bank_accounts
    SET 
        current_balance = current_balance + 
            CASE 
                WHEN NEW.transaction_type = 'DEPOSIT' THEN NEW.amount
                WHEN NEW.transaction_type = 'WITHDRAWAL' THEN -NEW.amount
            END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.bank_account_id;

    -- Check if balance would go negative
    IF (SELECT current_balance FROM public.bank_accounts WHERE id = NEW.bank_account_id) < 0 THEN
        RAISE EXCEPTION 'Insufficient balance for withdrawal';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to reverse bank transactions on deletion
CREATE OR REPLACE FUNCTION reverse_bank_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Reverse the transaction amount
    UPDATE public.bank_accounts
    SET 
        current_balance = current_balance - 
            CASE 
                WHEN OLD.transaction_type = 'DEPOSIT' THEN OLD.amount
                WHEN OLD.transaction_type = 'WITHDRAWAL' THEN -OLD.amount
            END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.bank_account_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to set payment credit flag
CREATE OR REPLACE FUNCTION set_payment_is_credit()
RETURNS TRIGGER AS $$
BEGIN
    -- Set is_credit based on transaction_type
    IF NEW.transaction_type IN ('REVENUE', 'COMMISSION') THEN
        NEW.is_credit := true;
    ELSIF NEW.transaction_type IN ('EXPENSE', 'STAFF_PAYMENT') THEN
        NEW.is_credit := false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure payment transaction ID
CREATE OR REPLACE FUNCTION ensure_payment_transaction_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If transaction_id is not provided, generate one
    IF NEW.transaction_id IS NULL THEN
        NEW.transaction_id := uuid_generate_v4();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle payment deletion
CREATE OR REPLACE FUNCTION handle_payment_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Reverse bank account transaction if it exists
    IF OLD.bank_account_id IS NOT NULL THEN
        UPDATE bank_accounts 
        SET 
            current_balance = current_balance + (CASE WHEN OLD.is_credit THEN -OLD.amount ELSE OLD.amount END),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.bank_account_id;
    END IF;

    -- If it's a staff payment, update subsequent staff ledger entries
    IF OLD.transaction_type = 'STAFF_PAYMENT' THEN
        -- Delete the staff ledger entry for this payment
        DELETE FROM staff_ledger WHERE payment_id = OLD.id;
        
        -- Recalculate running balances for all subsequent transactions
        WITH ordered_transactions AS (
            SELECT 
                id,
                amount,
                is_payment_to_staff,
                ROW_NUMBER() OVER (ORDER BY transaction_date, created_at) as rn
            FROM staff_ledger
            WHERE staff_id = OLD.staff_id
            AND (transaction_date > OLD.payment_date 
                OR (transaction_date = OLD.payment_date AND created_at > OLD.created_at))
            ORDER BY transaction_date, created_at
        )
        UPDATE staff_ledger sl
        SET running_balance = (
            SELECT SUM(CASE WHEN is_payment_to_staff THEN -amount ELSE amount END)
            FROM ordered_transactions ot2
            WHERE ot2.rn <= ot1.rn
        )
        FROM ordered_transactions ot1
        WHERE sl.id = ot1.id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to create initial staff ledger entry
CREATE OR REPLACE FUNCTION tr_create_staff_ledger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only add initial entry for staff members
    IF NEW.role = 'staff' THEN
        INSERT INTO staff_ledger (
            staff_id,
            amount,
            transaction_date,
            description,
            payment_method,
            is_payment_to_staff,
            running_balance
        ) VALUES (
            NEW.id,
            0,
            CURRENT_DATE,
            'Initial account creation',
            'system',
            false,
            0
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 5. TRIGGERS - Connect functions to database events
-- ===============================================

-- Inventory triggers
DROP TRIGGER IF EXISTS tr_update_inventory_on_rejected_inward ON rejected_waste_inward;
CREATE TRIGGER tr_update_inventory_on_rejected_inward
AFTER INSERT ON rejected_waste_inward
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_rejected_inward();

DROP TRIGGER IF EXISTS tr_update_inventory_on_rejected_outward ON rejected_waste_outward;
CREATE TRIGGER tr_update_inventory_on_rejected_outward
AFTER INSERT ON rejected_waste_outward
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_rejected_outward();

DROP TRIGGER IF EXISTS tr_update_inventory_on_segregated_outward_items ON segregated_waste_outward_items;
CREATE TRIGGER tr_update_inventory_on_segregated_outward_items
AFTER INSERT ON segregated_waste_outward_items
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_segregated_outward_items();

-- Labor distribution triggers
DROP TRIGGER IF EXISTS tr_distribute_segregated_labor_payment ON segregated_waste_outward;
CREATE TRIGGER tr_distribute_segregated_labor_payment
AFTER INSERT ON segregated_waste_outward
FOR EACH ROW
EXECUTE FUNCTION distribute_segregated_labor_payment();

DROP TRIGGER IF EXISTS tr_distribute_rejected_outward_labor ON rejected_waste_outward;
CREATE TRIGGER tr_distribute_rejected_outward_labor
AFTER INSERT ON rejected_waste_outward
FOR EACH ROW
EXECUTE FUNCTION distribute_rejected_outward_labor();

-- Bank transaction triggers
DROP TRIGGER IF EXISTS tr_update_bank_balance_on_transaction ON bank_transactions;
CREATE TRIGGER tr_update_bank_balance_on_transaction
AFTER INSERT ON bank_transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_balance_on_transaction();

DROP TRIGGER IF EXISTS tr_reverse_bank_transaction ON bank_transactions;
CREATE TRIGGER tr_reverse_bank_transaction
AFTER DELETE ON bank_transactions
FOR EACH ROW
EXECUTE FUNCTION reverse_bank_transaction();

-- Payment triggers
DROP TRIGGER IF EXISTS tr_set_payment_is_credit ON payments;
CREATE TRIGGER tr_set_payment_is_credit
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION set_payment_is_credit();

DROP TRIGGER IF EXISTS tr_ensure_payment_transaction_id ON payments;
CREATE TRIGGER tr_ensure_payment_transaction_id
BEFORE INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION ensure_payment_transaction_id();

DROP TRIGGER IF EXISTS tr_handle_payment_deletion ON payments;
CREATE TRIGGER tr_handle_payment_deletion
BEFORE DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION handle_payment_deletion();

-- User triggers
DROP TRIGGER IF EXISTS tr_create_staff_ledger ON users;
CREATE TRIGGER tr_create_staff_ledger
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION tr_create_staff_ledger();

-- ===============================================
-- 6. INDEXES - Optimize query performance
-- ===============================================

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_inventory_material_location ON inventory(material_id, location_id);
CREATE INDEX IF NOT EXISTS idx_rejected_inward_date ON rejected_waste_inward(transaction_date);
CREATE INDEX IF NOT EXISTS idx_segregated_outward_date ON segregated_waste_outward(transaction_date);
CREATE INDEX IF NOT EXISTS idx_rejected_outward_date ON rejected_waste_outward(transaction_date);
CREATE INDEX IF NOT EXISTS idx_staff_ledger_staff ON staff_ledger(staff_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(transaction_type); 