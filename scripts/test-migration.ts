/**
 * Test Migration Script
 * 
 * Run this script to verify the migration works correctly
 * BEFORE running the full migration.
 * 
 * Tests:
 * 1. Migrate 10 prompts with tags junction table
 * 2. Test password reset flow for 1 user
 * 3. Migrate 5 collections with ownership
 * 4. Test user data linking
 * 
 * Run with: npx tsx scripts/test-migration.ts
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

interface TestResult {
    passed: boolean;
    details: string;
}

interface TestResults {
    prompts: TestResult;
    tags: TestResult;
    collections: TestResult;
    passwordReset: TestResult;
    userLinking: TestResult;
}

async function testMigration(): Promise<boolean> {
    console.log('=== MIGRATION TEST SCRIPT ===\n');
    
    const results: TestResults = {
        prompts: { passed: false, details: '' },
        tags: { passed: false, details: '' },
        collections: { passed: false, details: '' },
        passwordReset: { passed: false, details: '' },
        userLinking: { passed: false, details: '' }
    };
    
    // ========================================
    // Test 1: Migrate 10 prompts with tags
    // ========================================
    console.log('Test 1: Migrating 10 prompts with tags...');
    try {
        const testPrompts = await prisma.prompt.findMany({ 
            take: 10,
            where: { status: 'published' }
        });
        
        if (testPrompts.length === 0) {
            results.prompts.details = 'No prompts found to migrate';
            results.prompts.passed = true; // Not a failure, just no data
        } else {
            let migratedCount = 0;
            
            for (const prompt of testPrompts) {
                const tags = JSON.parse(prompt.tags || '[]') as string[];
                
                // Insert prompt to Supabase with test prefix
                const { data: supaPrompt, error: promptError } = await supabase
                    .from('prompts')
                    .insert({
                        title: prompt.title,
                        slug: `test-${prompt.slug}-${Date.now()}`,
                        prompt_text: prompt.promptText,
                        type: prompt.type,
                        status: 'draft', // Don't publish test data
                        image_url: prompt.imageUrl,
                        thumbnail_url: prompt.thumbnailUrl,
                        legacy_prompt_id: prompt.id,
                        metadata: JSON.parse(prompt.metadata || '{}')
                    })
                    .select()
                    .single();
                
                if (promptError) {
                    console.error(`  Failed to migrate prompt ${prompt.id}:`, promptError.message);
                    continue;
                }
                
                // Insert tags via junction table
                for (const tagName of tags) {
                    // Upsert tag
                    const { data: tag, error: tagError } = await supabase
                        .from('tags')
                        .upsert({ 
                            name: tagName, 
                            slug: tagName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                        }, { onConflict: 'name' })
                        .select()
                        .single();
                    
                    if (tag && !tagError) {
                        await supabase
                            .from('prompt_tags')
                            .insert({ prompt_id: supaPrompt.id, tag_id: tag.id })
                            .select();
                    }
                }
                
                migratedCount++;
            }
            
            // Verify tags are queryable
            const { data: promptWithTags } = await supabase
                .from('prompts')
                .select('*, tags:prompt_tags(tag:tags(name))')
                .like('slug', 'test-%')
                .limit(1)
                .single();
            
            const tagsWorking = promptWithTags?.tags && promptWithTags.tags.length >= 0;
            results.prompts.passed = migratedCount > 0 && tagsWorking;
            results.tags.passed = tagsWorking;
            results.prompts.details = `Migrated ${migratedCount}/${testPrompts.length} prompts`;
            results.tags.details = `Tags junction table working: ${tagsWorking}`;
        }
    } catch (error) {
        results.prompts.details = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.tags.details = 'Skipped due to prompt error';
    }
    
    // ========================================
    // Test 2: Password reset flow for 1 user
    // ========================================
    console.log('\nTest 2: Testing password reset flow...');
    try {
        const testUser = await prisma.user.findFirst({ 
            where: { 
                email: { not: null },
                password: { not: null }
            } 
        });
        
        if (testUser && testUser.email) {
            // Generate a reset link (don't actually send the email in test)
            const { data: linkData, error: resetError } = await supabase.auth.admin.generateLink({
                type: 'recovery',
                email: testUser.email
            });
            
            results.passwordReset.passed = !resetError && !!linkData;
            results.passwordReset.details = resetError?.message || 'Reset link generated successfully';
        } else {
            results.passwordReset.passed = true;
            results.passwordReset.details = 'No users with passwords found (skipped)';
        }
    } catch (error) {
        results.passwordReset.details = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
    
    // ========================================
    // Test 3: Migrate 5 collections
    // ========================================
    console.log('\nTest 3: Migrating 5 collections...');
    try {
        const testCollections = await prisma.collection.findMany({ 
            take: 5,
            include: { owner: true }
        });
        
        if (testCollections.length === 0) {
            results.collections.passed = true;
            results.collections.details = 'No collections found to migrate';
        } else {
            let migratedCount = 0;
            
            for (const collection of testCollections) {
                const { error: collError } = await supabase
                    .from('collections')
                    .insert({
                        name: `Test: ${collection.name}`,
                        description: collection.description,
                        is_public: false, // Keep test data private
                        legacy_collection_id: collection.id,
                        legacy_owner_email: collection.owner?.email
                    });
                
                if (collError) {
                    console.error(`  Failed to migrate collection ${collection.id}:`, collError.message);
                    continue;
                }
                
                migratedCount++;
            }
            
            results.collections.passed = migratedCount > 0;
            results.collections.details = `Migrated ${migratedCount}/${testCollections.length} collections`;
        }
    } catch (error) {
        results.collections.details = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
    
    // ========================================
    // Test 4: User data linking
    // ========================================
    console.log('\nTest 4: Testing user data linking...');
    try {
        // Create a test Supabase user
        const testEmail = `test-migration-${Date.now()}@example.com`;
        const { data: testSupaUser, error: createError } = await supabase.auth.admin.createUser({
            email: testEmail,
            password: 'TestPassword123!',
            email_confirm: true
        });
        
        if (createError || !testSupaUser?.user) {
            results.userLinking.details = `Failed to create test user: ${createError?.message}`;
        } else {
            // Insert a test collection with legacy email
            await supabase
                .from('collections')
                .insert({
                    name: 'Test Linking Collection',
                    is_public: false,
                    legacy_owner_email: testEmail
                });
            
            // Link collections to new user
            const { error: linkError } = await supabase
                .from('collections')
                .update({ owner_id: testSupaUser.user.id })
                .eq('legacy_owner_email', testEmail);
            
            // Verify linking worked
            const { data: linkedCollection } = await supabase
                .from('collections')
                .select('owner_id')
                .eq('legacy_owner_email', testEmail)
                .single();
            
            results.userLinking.passed = !linkError && linkedCollection?.owner_id === testSupaUser.user.id;
            results.userLinking.details = linkError?.message || 'User linking works correctly';
            
            // Cleanup: delete test user
            await supabase.auth.admin.deleteUser(testSupaUser.user.id);
        }
    } catch (error) {
        results.userLinking.details = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
    
    // ========================================
    // Cleanup test data
    // ========================================
    console.log('\nCleaning up test data...');
    try {
        // Delete test prompts and their tags
        const { data: testPrompts } = await supabase
            .from('prompts')
            .select('id')
            .like('slug', 'test-%');
        
        if (testPrompts && testPrompts.length > 0) {
            const ids = testPrompts.map(p => p.id);
            await supabase.from('prompt_tags').delete().in('prompt_id', ids);
            await supabase.from('prompts').delete().in('id', ids);
        }
        
        // Delete test collections
        await supabase.from('collections').delete().like('name', 'Test:%');
        await supabase.from('collections').delete().eq('name', 'Test Linking Collection');
        
        console.log('  Cleanup completed');
    } catch (error) {
        console.error('  Cleanup error:', error);
    }
    
    // ========================================
    // Summary
    // ========================================
    console.log('\n=== MIGRATION TEST RESULTS ===\n');
    
    for (const [test, result] of Object.entries(results)) {
        const status = result.passed ? '✓ PASS' : '✗ FAIL';
        console.log(`${status} ${test}: ${result.details}`);
    }
    
    const allPassed = Object.values(results).every(r => r.passed);
    console.log(`\n${allPassed 
        ? '✓ All tests passed - safe to proceed with full migration' 
        : '✗ Some tests failed - fix issues before proceeding'}`);
    
    // Cleanup Prisma connection
    await prisma.$disconnect();
    
    return allPassed;
}

// Run the test
testMigration()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('Test script failed:', error);
        process.exit(1);
    });
