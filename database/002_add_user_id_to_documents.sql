-- Migration to add user_id column to documents table
-- This ensures documents are properly scoped to users and prevents cross-user data leakage

USE annotation_tool_db;

-- Add user_id column if it doesn't exist
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id INT;

-- Add foreign key constraint to users table
ALTER TABLE documents ADD CONSTRAINT fk_documents_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create index on user_id for faster queries
CREATE INDEX idx_documents_user_id ON documents(user_id);
