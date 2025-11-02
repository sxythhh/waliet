-- Add hide_from_leaderboard column to profiles table
ALTER TABLE profiles ADD COLUMN hide_from_leaderboard BOOLEAN NOT NULL DEFAULT false;