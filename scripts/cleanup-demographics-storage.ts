/**
 * One-time cleanup script to purge demographic submission videos from Supabase storage.
 *
 * This script:
 * 1. Lists all files in the verification-screenshots bucket
 * 2. Finds files for approved/rejected submissions (should have been deleted)
 * 3. Finds orphaned files (no matching database record)
 * 4. Deletes them from storage
 * 5. Updates database records to clear screenshot_url
 *
 * Run with: npx tsx scripts/cleanup-demographics-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.log('Make sure you have a .env file with:');
  console.log('  VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CleanupStats {
  totalFilesFound: number;
  reviewedFilesDeleted: number;
  orphanedFilesDeleted: number;
  failedDeletions: number;
  bytesFreed: number;
}

async function listAllStorageFiles(): Promise<{ name: string; size: number }[]> {
  const allFiles: { name: string; size: number }[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from('verification-screenshots')
      .list('', { limit, offset });

    if (error) {
      console.error('Error listing files:', error);
      break;
    }

    if (!data || data.length === 0) break;

    // List files in each user directory
    for (const item of data) {
      if (item.id) {
        // It's a directory (user ID folder)
        const { data: userFiles, error: userError } = await supabase.storage
          .from('verification-screenshots')
          .list(item.name, { limit: 1000 });

        if (userError) {
          console.error(`Error listing files in ${item.name}:`, userError);
          continue;
        }

        for (const file of userFiles || []) {
          if (file.name && !file.id) {
            // It's a file, not a directory
            allFiles.push({
              name: `${item.name}/${file.name}`,
              size: file.metadata?.size || 0,
            });
          }
        }
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return allFiles;
}

async function getReviewedSubmissions(): Promise<Set<string>> {
  const reviewedUrls = new Set<string>();

  const { data, error } = await supabase
    .from('demographic_submissions')
    .select('screenshot_url')
    .in('status', ['approved', 'rejected'])
    .not('screenshot_url', 'is', null);

  if (error) {
    console.error('Error fetching reviewed submissions:', error);
    return reviewedUrls;
  }

  for (const row of data || []) {
    if (row.screenshot_url) {
      // Extract path from URL
      const match = row.screenshot_url.match(/verification-screenshots\/(.+)$/);
      if (match) {
        reviewedUrls.add(match[1]);
      }
    }
  }

  return reviewedUrls;
}

async function getAllSubmissionUrls(): Promise<Set<string>> {
  const allUrls = new Set<string>();

  const { data, error } = await supabase
    .from('demographic_submissions')
    .select('screenshot_url')
    .not('screenshot_url', 'is', null);

  if (error) {
    console.error('Error fetching all submissions:', error);
    return allUrls;
  }

  for (const row of data || []) {
    if (row.screenshot_url) {
      const match = row.screenshot_url.match(/verification-screenshots\/(.+)$/);
      if (match) {
        allUrls.add(match[1]);
      }
    }
  }

  return allUrls;
}

async function deleteFile(path: string): Promise<boolean> {
  const { error } = await supabase.storage
    .from('verification-screenshots')
    .remove([path]);

  if (error) {
    console.error(`Failed to delete ${path}:`, error);
    return false;
  }

  return true;
}

async function clearDatabaseUrls(): Promise<number> {
  const { data, error } = await supabase
    .from('demographic_submissions')
    .update({ screenshot_url: null })
    .in('status', ['approved', 'rejected'])
    .not('screenshot_url', 'is', null)
    .select('id');

  if (error) {
    console.error('Error clearing database URLs:', error);
    return 0;
  }

  return data?.length || 0;
}

async function main() {
  console.log('=== Demographics Storage Cleanup Script ===\n');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log('');

  const stats: CleanupStats = {
    totalFilesFound: 0,
    reviewedFilesDeleted: 0,
    orphanedFilesDeleted: 0,
    failedDeletions: 0,
    bytesFreed: 0,
  };

  // Step 1: List all files in storage
  console.log('Step 1: Listing all files in verification-screenshots bucket...');
  const allFiles = await listAllStorageFiles();
  stats.totalFilesFound = allFiles.length;
  console.log(`  Found ${allFiles.length} files\n`);

  if (allFiles.length === 0) {
    console.log('No files found in storage. Nothing to clean up.');
    return;
  }

  // Calculate total size
  const totalBytes = allFiles.reduce((sum, f) => sum + f.size, 0);
  console.log(`  Total storage used: ${(totalBytes / 1024 / 1024).toFixed(2)} MB\n`);

  // Step 2: Get files that should be deleted (reviewed submissions)
  console.log('Step 2: Fetching reviewed submissions...');
  const reviewedPaths = await getReviewedSubmissions();
  console.log(`  Found ${reviewedPaths.size} reviewed submissions with files\n`);

  // Step 3: Get all submission URLs (to find orphaned files)
  console.log('Step 3: Fetching all submission URLs...');
  const allSubmissionPaths = await getAllSubmissionUrls();
  console.log(`  Found ${allSubmissionPaths.size} total submissions with files\n`);

  // Step 4: Identify files to delete
  console.log('Step 4: Identifying files to delete...');
  const filesToDelete: { path: string; reason: 'reviewed' | 'orphaned'; size: number }[] = [];

  for (const file of allFiles) {
    if (reviewedPaths.has(file.name)) {
      filesToDelete.push({ path: file.name, reason: 'reviewed', size: file.size });
    } else if (!allSubmissionPaths.has(file.name)) {
      filesToDelete.push({ path: file.name, reason: 'orphaned', size: file.size });
    }
  }

  const reviewedCount = filesToDelete.filter(f => f.reason === 'reviewed').length;
  const orphanedCount = filesToDelete.filter(f => f.reason === 'orphaned').length;
  const bytesToFree = filesToDelete.reduce((sum, f) => sum + f.size, 0);

  console.log(`  Files from reviewed submissions: ${reviewedCount}`);
  console.log(`  Orphaned files (no DB record): ${orphanedCount}`);
  console.log(`  Total to delete: ${filesToDelete.length}`);
  console.log(`  Storage to free: ${(bytesToFree / 1024 / 1024).toFixed(2)} MB\n`);

  if (filesToDelete.length === 0) {
    console.log('No files to delete. Storage is clean!');
    return;
  }

  // Step 5: Confirm deletion
  console.log('Step 5: Deleting files...');
  console.log('  (This may take a while for large numbers of files)\n');

  let deleted = 0;
  for (const file of filesToDelete) {
    const success = await deleteFile(file.path);
    if (success) {
      deleted++;
      stats.bytesFreed += file.size;
      if (file.reason === 'reviewed') {
        stats.reviewedFilesDeleted++;
      } else {
        stats.orphanedFilesDeleted++;
      }
    } else {
      stats.failedDeletions++;
    }

    // Progress indicator
    if (deleted % 10 === 0) {
      process.stdout.write(`  Deleted ${deleted}/${filesToDelete.length} files...\r`);
    }
  }
  console.log(`  Deleted ${deleted}/${filesToDelete.length} files    \n`);

  // Step 6: Clear database URLs for reviewed submissions
  console.log('Step 6: Clearing database URLs for reviewed submissions...');
  const clearedUrls = await clearDatabaseUrls();
  console.log(`  Cleared ${clearedUrls} database records\n`);

  // Summary
  console.log('=== Cleanup Complete ===\n');
  console.log(`Total files found:     ${stats.totalFilesFound}`);
  console.log(`Reviewed files deleted: ${stats.reviewedFilesDeleted}`);
  console.log(`Orphaned files deleted: ${stats.orphanedFilesDeleted}`);
  console.log(`Failed deletions:      ${stats.failedDeletions}`);
  console.log(`Storage freed:         ${(stats.bytesFreed / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(console.error);
