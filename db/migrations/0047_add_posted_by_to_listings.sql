-- Migration to add show_posted_by visibility to listings table
ALTER TABLE listings 
  ADD COLUMN show_posted_by boolean NOT NULL DEFAULT false;
