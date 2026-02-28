-- Add protected_classes array column for discrimination-related cases
ALTER TABLE cases ADD COLUMN IF NOT EXISTS protected_classes TEXT[] DEFAULT '{}';
