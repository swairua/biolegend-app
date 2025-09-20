-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'stock_manager', 'user');

-- Create enum for user status
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');

-- Create profiles table that extends Supabase auth.users
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    status user_status DEFAULT 'pending',
    phone TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    department TEXT,
    position TEXT,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user permissions table for granular permissions
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    permission_name TEXT NOT NULL,
    granted BOOLEAN DEFAULT TRUE,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, permission_name)
);

-- Create user invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role user_role DEFAULT 'user',
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    invitation_token UUID DEFAULT gen_random_uuid(),
    UNIQUE(email, company_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles in their company" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
            AND admin_profile.company_id = profiles.company_id
        )
    );

CREATE POLICY "Admins can insert new profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
        )
    );

CREATE POLICY "Admins can update profiles in their company" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
            AND admin_profile.company_id = profiles.company_id
        )
    );

-- Create policies for user_permissions table
CREATE POLICY "Users can view their own permissions" ON user_permissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage permissions in their company" ON user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles admin_profile 
            JOIN profiles user_profile ON user_profile.id = user_permissions.user_id
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
            AND admin_profile.company_id = user_profile.company_id
        )
    );

-- Create policies for user_invitations table
CREATE POLICY "Admins can manage invitations for their company" ON user_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
            AND admin_profile.company_id = user_invitations.company_id
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_profiles_company_id ON profiles(company_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_name ON user_permissions(permission_name);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_company_id ON user_invitations(company_id);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_token ON user_invitations(invitation_token);

-- Create updated_at trigger for profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TABLE(permission_name TEXT, granted BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT up.permission_name, up.granted
    FROM user_permissions up
    WHERE up.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(user_uuid UUID, permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN DEFAULT FALSE;
    user_role_val user_role;
BEGIN
    -- Get user role
    SELECT role INTO user_role_val
    FROM profiles
    WHERE id = user_uuid;

    -- Admin has all permissions
    IF user_role_val = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Check specific permission
    SELECT COALESCE(granted, FALSE) INTO has_perm
    FROM user_permissions
    WHERE user_id = user_uuid AND permission_name = permission;

    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default permissions for different roles
INSERT INTO user_permissions (user_id, permission_name, granted)
SELECT 
    p.id,
    perm.permission_name,
    TRUE
FROM profiles p
CROSS JOIN (
    VALUES 
    -- Admin permissions
    ('manage_users'),
    ('manage_company'),
    ('view_reports'),
    ('manage_inventory'),
    ('manage_finance'),
    ('manage_sales'),
    ('manage_settings'),
    
    -- Accountant permissions
    ('view_reports'),
    ('manage_finance'),
    ('view_sales'),
    
    -- Stock Manager permissions
    ('manage_inventory'),
    ('view_reports'),
    
    -- Basic user permissions
    ('view_dashboard'),
    ('create_quotations'),
    ('view_customers')
) AS perm(permission_name)
WHERE 
    (p.role = 'admin') OR
    (p.role = 'accountant' AND perm.permission_name IN ('view_reports', 'manage_finance', 'view_sales')) OR
    (p.role = 'stock_manager' AND perm.permission_name IN ('manage_inventory', 'view_reports')) OR
    (p.role = 'user' AND perm.permission_name IN ('view_dashboard', 'create_quotations', 'view_customers'))
ON CONFLICT (user_id, permission_name) DO NOTHING;
