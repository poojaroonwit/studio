-- Add label column to Grade table
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "label" TEXT;

-- Update existing grades with default labels based on their names
UPDATE "Grade" 
SET "label" = CASE 
  WHEN name = 'Grade 8+' THEN 'Senior Executive'
  WHEN name = 'Grade 6-7' THEN 'Manager'
  WHEN name = 'Grade 3-5' THEN 'Senior Staff'
  WHEN name = 'Grade 1-2 & Contract' THEN 'Staff & Contract'
  ELSE name
END
WHERE "label" IS NULL;


