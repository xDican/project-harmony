-- Migration: Remove deprecated users.role column
-- Description: This removes the old single-role column from users table
--              All role management is now handled through the user_roles table
-- Prerequisites: Verify that all code has been updated to use user_roles table

-- Remove the deprecated role column from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS role;

-- Add comment to users table documenting the change
COMMENT ON TABLE public.users IS 'User accounts table. Roles are managed in user_roles table using app_role enum.';
