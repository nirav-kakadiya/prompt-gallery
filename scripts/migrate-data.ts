/**
 * Data Migration Script
 * 
 * Migrates data from SQLite to Supabase PostgreSQL.
 * Run test-migration.ts first to verify everything works.
 * 
 * Run with: npx tsx scripts/migrate-data.ts
 * 
 * Options:
 *   --dry-run    Show what would be migrated without making changes
 *   --prompts    Only migrate prompts
 *   --collections Only migrate collections
 *   --tags       Only migrate tags
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// Initialize clients
const prisma = new PrismaClient();
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

interface MigrationStats {
    prompts: { total: number; migrated: number; errors: number };
    tags: { total: number; migrated: number; errors: number };
    collections: { total: number; migrated: number; errors: number };
    categories: { total: number; migrated: number; errors: number };
    startTime: Date;
    endTime?: Date;
}

const stats: MigrationStats = {
    prompts: { total: 0, migrated: 0, errors: 0 },
    tags: { total: 0, migrated: 0, errors: 0 },
    collections: { total: 0, migrated: 0, errors: 0 },
    categories: { total: 0, migrated: 0, errors: 0 },
    startTime: new Date()
};

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const migrateOnlyPrompts = args.includes('--prompts');
const migrateOnlyCollections = args.includes('--collections');
const migrateOnlyTags = args.includes('--tags');
const migrateAll = !migrateOnlyPrompts && !migrateOnlyCollections && !migrateOnlyTags;

async function migrateCategories(): Promise<Map<string, string>> {
    console.log('\n📁 Migrating categories...');
    const categoryIdMap = new Map<string, string>();
    
    const categories = await prisma.category.findMany();
    stats.categories.total = categories.length;
    
    for (const category of categories) {
        if (isDryRun) {
            console.log(`  [DRY RUN] Would migrate category: ${category.name}`);
            stats.categories.migrated++;
            continue;
        }
        
        const { data, error } = await supabase
            .from('categories')
            .upsert({
                name: category.name,
                slug: category.slug,
                description: category.description,
                icon: category.icon,
                prompt_count: category.promptCount,
                display_order: category.displayOrder
            }, { onConflict: 'slug' })
            .select('id')
            .single();
        
        if (error) {
            console.error(`  ✗ Failed to migrate category ${category.name}:`, error.message);
            stats.categories.errors++;
        } else if (data) {
            categoryIdMap.set(category.id, data.id);
            stats.categories.migrated++;
        }
    }
    
    console.log(`  ✓ Categories: ${stats.categories.migrated}/${stats.categories.total} (${stats.categories.errors} errors)`);
    return categoryIdMap;
}

async function migrateTags(): Promise<Map<string, string>> {
    console.log('\n🏷️  Migrating tags...');
    const tagIdMap = new Map<string, string>();
    
    const tags = await prisma.tag.findMany();
    stats.tags.total = tags.length;
    
    for (const tag of tags) {
        if (isDryRun) {
            console.log(`  [DRY RUN] Would migrate tag: ${tag.name}`);
            stats.tags.migrated++;
            continue;
        }
        
        const { data, error } = await supabase
            .from('tags')
            .upsert({
                name: tag.name,
                slug: tag.slug,
                category: tag.category,
                prompt_count: tag.promptCount
            }, { onConflict: 'slug' })
            .select('id')
            .single();
        
        if (error) {
            console.error(`  ✗ Failed to migrate tag ${tag.name}:`, error.message);
            stats.tags.errors++;
        } else if (data) {
            tagIdMap.set(tag.id, data.id);
            stats.tags.migrated++;
        }
    }
    
    console.log(`  ✓ Tags: ${stats.tags.migrated}/${stats.tags.total} (${stats.tags.errors} errors)`);
    return tagIdMap;
}

async function migratePrompts(): Promise<void> {
    console.log('\n📝 Migrating prompts...');
    
    const BATCH_SIZE = 100;
    const totalPrompts = await prisma.prompt.count();
    stats.prompts.total = totalPrompts;
    
    let offset = 0;
    
    while (offset < totalPrompts) {
        const prompts = await prisma.prompt.findMany({
            skip: offset,
            take: BATCH_SIZE,
            include: {
                author: {
                    select: { email: true }
                }
            }
        });
        
        for (const prompt of prompts) {
            if (isDryRun) {
                console.log(`  [DRY RUN] Would migrate prompt: ${prompt.title.substring(0, 50)}...`);
                stats.prompts.migrated++;
                continue;
            }
            
            const tags = JSON.parse(prompt.tags || '[]') as string[];
            const metadata = JSON.parse(prompt.metadata || '{}');
            
            // Insert prompt
            const { data: supaPrompt, error: promptError } = await supabase
                .from('prompts')
                .insert({
                    title: prompt.title,
                    slug: prompt.slug,
                    prompt_text: prompt.promptText,
                    type: prompt.type,
                    status: prompt.status,
                    image_url: prompt.imageUrl,
                    thumbnail_url: prompt.thumbnailUrl,
                    video_url: prompt.videoUrl,
                    blurhash: prompt.blurhash,
                    category: prompt.category,
                    style: prompt.style,
                    source_url: prompt.sourceUrl,
                    source_type: prompt.sourceType as any,
                    metadata: metadata,
                    view_count: prompt.viewCount,
                    copy_count: prompt.copyCount,
                    like_count: prompt.likeCount,
                    legacy_prompt_id: prompt.id,
                    legacy_author_email: prompt.author?.email,
                    created_at: prompt.createdAt.toISOString(),
                    published_at: prompt.publishedAt?.toISOString()
                })
                .select('id')
                .single();
            
            if (promptError) {
                // Check if it's a duplicate slug error
                if (promptError.code === '23505') {
                    console.log(`  ⊘ Skipped (already exists): ${prompt.slug}`);
                } else {
                    console.error(`  ✗ Failed to migrate prompt ${prompt.id}:`, promptError.message);
                    stats.prompts.errors++;
                }
                continue;
            }
            
            // Insert prompt-tag associations
            if (supaPrompt && tags.length > 0) {
                for (const tagName of tags) {
                    // Get or create tag
                    const { data: tag } = await supabase
                        .from('tags')
                        .upsert({
                            name: tagName,
                            slug: tagName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                        }, { onConflict: 'name' })
                        .select('id')
                        .single();
                    
                    if (tag) {
                        await supabase
                            .from('prompt_tags')
                            .upsert({
                                prompt_id: supaPrompt.id,
                                tag_id: tag.id
                            }, { onConflict: 'prompt_id,tag_id' });
                    }
                }
            }
            
            stats.prompts.migrated++;
        }
        
        offset += BATCH_SIZE;
        console.log(`  Progress: ${Math.min(offset, totalPrompts)}/${totalPrompts} prompts processed`);
    }
    
    console.log(`  ✓ Prompts: ${stats.prompts.migrated}/${stats.prompts.total} (${stats.prompts.errors} errors)`);
}

async function migrateCollections(): Promise<void> {
    console.log('\n📚 Migrating collections...');
    
    const collections = await prisma.collection.findMany({
        include: {
            owner: { select: { email: true } },
            prompts: { select: { promptId: true, displayOrder: true } }
        }
    });
    stats.collections.total = collections.length;
    
    for (const collection of collections) {
        if (isDryRun) {
            console.log(`  [DRY RUN] Would migrate collection: ${collection.name}`);
            stats.collections.migrated++;
            continue;
        }
        
        // Insert collection
        const { data: supaCollection, error: collError } = await supabase
            .from('collections')
            .insert({
                name: collection.name,
                description: collection.description,
                cover_image_url: collection.coverImageUrl,
                is_public: collection.isPublic,
                prompt_count: collection.promptCount,
                legacy_collection_id: collection.id,
                legacy_owner_email: collection.owner?.email,
                created_at: collection.createdAt.toISOString()
            })
            .select('id')
            .single();
        
        if (collError) {
            console.error(`  ✗ Failed to migrate collection ${collection.id}:`, collError.message);
            stats.collections.errors++;
            continue;
        }
        
        // Migrate collection-prompt associations
        if (supaCollection && collection.prompts.length > 0) {
            for (const cp of collection.prompts) {
                // Get the Supabase prompt ID by legacy ID
                const { data: supaPrompt } = await supabase
                    .from('prompts')
                    .select('id')
                    .eq('legacy_prompt_id', cp.promptId)
                    .single();
                
                if (supaPrompt) {
                    await supabase
                        .from('collection_prompts')
                        .upsert({
                            collection_id: supaCollection.id,
                            prompt_id: supaPrompt.id,
                            display_order: cp.displayOrder
                        }, { onConflict: 'collection_id,prompt_id' });
                }
            }
        }
        
        stats.collections.migrated++;
    }
    
    console.log(`  ✓ Collections: ${stats.collections.migrated}/${stats.collections.total} (${stats.collections.errors} errors)`);
}

async function runMigration(): Promise<void> {
    console.log('=== DATA MIGRATION SCRIPT ===');
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Started at: ${stats.startTime.toISOString()}\n`);
    
    if (isDryRun) {
        console.log('⚠️  This is a dry run. No data will be modified.\n');
    }
    
    try {
        // Run migrations in order
        if (migrateAll || migrateOnlyTags) {
            await migrateCategories();
            await migrateTags();
        }
        
        if (migrateAll || migrateOnlyPrompts) {
            await migratePrompts();
        }
        
        if (migrateAll || migrateOnlyCollections) {
            await migrateCollections();
        }
        
        stats.endTime = new Date();
        const duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;
        
        console.log('\n=== MIGRATION SUMMARY ===');
        console.log(`Duration: ${duration.toFixed(2)} seconds`);
        console.log(`Categories: ${stats.categories.migrated}/${stats.categories.total} (${stats.categories.errors} errors)`);
        console.log(`Tags: ${stats.tags.migrated}/${stats.tags.total} (${stats.tags.errors} errors)`);
        console.log(`Prompts: ${stats.prompts.migrated}/${stats.prompts.total} (${stats.prompts.errors} errors)`);
        console.log(`Collections: ${stats.collections.migrated}/${stats.collections.total} (${stats.collections.errors} errors)`);
        
        const totalErrors = stats.categories.errors + stats.tags.errors + 
                           stats.prompts.errors + stats.collections.errors;
        
        if (totalErrors === 0) {
            console.log('\n✓ Migration completed successfully!');
        } else {
            console.log(`\n⚠️  Migration completed with ${totalErrors} errors. Review logs above.`);
        }
        
    } catch (error) {
        console.error('\n✗ Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Migration script error:', error);
        process.exit(1);
    });
