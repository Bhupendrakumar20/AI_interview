-- ─────────────────────────────────────────────────────────────────────────────
-- DSA ROOM DATABASE SCHEMA
-- PostgreSQL Schema for persistent storage of rooms, submissions, and stats
-- ─────────────────────────────────────────────────────────────────────────────

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  skillLevel VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- DSA QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS dsa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(20) NOT NULL, -- easy, medium, hard
  category VARCHAR(100) NOT NULL, -- arrays, linked-lists, trees, etc
  examples JSONB NOT NULL, -- { input, output, explanation }[]
  test_cases JSONB NOT NULL, -- { input, expected_output }[]
  hidden_test_cases JSONB NOT NULL, -- { input, expected_output }[]
  time_limit_mins INT DEFAULT 30,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- DSA ROOMS TABLE
CREATE TABLE IF NOT EXISTS dsa_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(20) UNIQUE NOT NULL, -- e.g., "DSA-7X4K9"
  host_id UUID NOT NULL REFERENCES users(id),
  question_id UUID REFERENCES dsa_questions(id),
  status VARCHAR(20) DEFAULT 'lobby', -- lobby, voting, active, review, closed
  max_players INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  config JSONB DEFAULT '{}', -- { questionMode, timeLimit, ... }
  INDEX idx_room_status (status),
  INDEX idx_room_code (room_code)
);

-- ROOM USERS (Participants) TABLE
CREATE TABLE IF NOT EXISTS room_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES dsa_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'member', -- host, member
  points INT DEFAULT 0,
  solved_at TIMESTAMP,
  language VARCHAR(20) DEFAULT 'javascript',
  status VARCHAR(20) DEFAULT 'coding', -- coding, solved, attempted
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (room_id, user_id),
  INDEX idx_room_users (room_id)
);

-- SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES dsa_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  question_id UUID NOT NULL REFERENCES dsa_questions(id),
  code TEXT NOT NULL,
  language VARCHAR(20) NOT NULL,
  submission_order INT NOT NULL, -- 1st, 2nd, 3rd submission
  test_results JSONB DEFAULT '{}', -- { passed, failed, total, details }
  judge0_token VARCHAR(255), -- Judge0 submission token
  judge0_status VARCHAR(50), -- In Queue, Processing, Accepted, etc
  first_blood BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  execution_time_ms INT,
  INDEX idx_room_submissions (room_id),
  INDEX idx_user_submissions (user_id)
);

-- VOTES TABLE
CREATE TABLE IF NOT EXISTS room_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES dsa_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  vote_type VARCHAR(50) NOT NULL, -- questionMode, timeLimit, etc
  vote_value VARCHAR(50) NOT NULL, -- same, different, 30, 45, 60
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (room_id, user_id, vote_type)
);

-- USER STATISTICS TABLE
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_rooms INT DEFAULT 0,
  total_wins INT DEFAULT 0,
  total_solved INT DEFAULT 0,
  avg_points DECIMAL(10, 2) DEFAULT 0,
  current_streak INT DEFAULT 0,
  best_streak INT DEFAULT 0,
  first_bloods INT DEFAULT 0,
  favorite_language VARCHAR(20),
  favorite_difficulty VARCHAR(20),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ACHIEVEMENTS/BADGES TABLE
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_name VARCHAR(100) NOT NULL, -- "first-blood-master", "speedrunner", etc
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  room_id UUID REFERENCES dsa_rooms(id),
  UNIQUE (user_id, badge_name)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- VIEWS FOR LEADERBOARDS & ANALYTICS
-- ─────────────────────────────────────────────────────────────────────────────

-- Real-time room leaderboard
CREATE OR REPLACE VIEW v_room_leaderboard AS
SELECT
  ru.room_id,
  u.id,
  u.username,
  u.avatar_url,
  ru.points,
  ru.solved_at,
  ru.status,
  ru.language,
  RANK() OVER (PARTITION BY ru.room_id ORDER BY ru.points DESC, ru.solved_at ASC) AS rank
FROM room_users ru
JOIN users u ON ru.user_id = u.id
WHERE ru.room_id IS NOT NULL;

-- Global user rankings
CREATE OR REPLACE VIEW v_user_rankings AS
SELECT
  u.id,
  u.username,
  u.avatar_url,
  us.total_rooms,
  us.total_wins,
  us.total_solved,
  us.avg_points,
  us.current_streak,
  us.first_bloods,
  RANK() OVER (ORDER BY us.avg_points DESC) AS global_rank,
  ROW_NUMBER() OVER (ORDER BY us.current_streak DESC) AS streak_rank
FROM users u
LEFT JOIN user_stats us ON u.id = us.user_id
WHERE us.total_rooms > 0
ORDER BY us.avg_points DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_rooms_host ON dsa_rooms(host_id);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_judge0 ON submissions(judge0_token);
CREATE INDEX idx_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_stats_total_wins ON user_stats(total_wins DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_update_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_timestamp();

CREATE OR REPLACE FUNCTION update_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stats_update_timestamp
BEFORE UPDATE ON user_stats
FOR EACH ROW
EXECUTE FUNCTION update_stats_timestamp();
