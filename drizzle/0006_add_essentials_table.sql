-- Add essentials table
CREATE TABLE essentials (
  id CHAR(36) PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  merit TEXT,
  intent TEXT,
  max_score INT NOT NULL,
  value_1 INT NOT NULL,
  value_2 INT NOT NULL,
  value_3 INT NOT NULL,
  value_4 INT NOT NULL,
  value_5 INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add index for category
CREATE INDEX essentials_category_idx ON essentials(category);

-- Add essential_id column to happiness_questions table
ALTER TABLE happiness_questions 
ADD COLUMN essential_id CHAR(36) REFERENCES essentials(id);

-- Add index for essential_id
CREATE INDEX happiness_questions_essential_id_idx ON happiness_questions(essential_id);
