-- Create super admin user
-- Email: admin@medplusafrica.com
-- Password: MedPlus2024!Admin

-- Note: This migration creates a super admin user directly in the auth.users table
-- The password hash is for 'MedPlus2024!Admin'

-- Insert the admin user into auth.users
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
) VALUES (
    gen_random_uuid(),
    'admin@medplusafrica.com',
    '$2a$10$1qJZrN8FQsQh0X9.XfkEXOvtLG2Z5K8hR3TcFY5vV7lJH2.Mb9Quy', -- MedPlus2024!Admin
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    null,
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Super Administrator"}',
    false,
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false,
    null
) ON CONFLICT (email) DO NOTHING;

-- Insert/Update the corresponding profile
INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    status,
    company_id,
    department,
    position,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM auth.users WHERE email = 'admin@medplusafrica.com'),
    'admin@medplusafrica.com',
    'Super Administrator',
    'admin',
    'active',
    (SELECT id FROM companies LIMIT 1), -- Assign to first company or null if none exists
    'IT',
    'System Administrator',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    department = EXCLUDED.department,
    position = EXCLUDED.position,
    updated_at = NOW();

-- Ensure all admin permissions are granted
INSERT INTO user_permissions (user_id, permission_name, granted)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'admin@medplusafrica.com'),
    permission_name,
    TRUE
FROM (
    VALUES 
    ('manage_users'),
    ('manage_company'),
    ('view_reports'),
    ('manage_inventory'),
    ('manage_finance'),
    ('manage_sales'),
    ('manage_settings'),
    ('view_dashboard'),
    ('create_quotations'),
    ('view_customers'),
    ('manage_credit_notes'),
    ('manage_invoices'),
    ('manage_lpos'),
    ('manage_delivery_notes'),
    ('manage_payments')
) AS permissions(permission_name)
ON CONFLICT (user_id, permission_name) DO UPDATE SET
    granted = TRUE,
    granted_at = NOW();

-- Add a comment documenting the super admin credentials
COMMENT ON TABLE profiles IS 'Super Admin Credentials: Email: admin@medplusafrica.com, Password: MedPlus2024!Admin';
