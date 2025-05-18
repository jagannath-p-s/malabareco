// Script to check all tables for is_active column
import { supabase } from '../src/supabase.js';

async function fetchAllTables() {
  try {
    console.log("Fetching list of all tables in the database...");
    
    // First, check what tables we can access through supabase client
    const availableTables = [
      'locations',
      'users',
      'segregated_waste_outward',
      'segregated_waste_outward_items',
      'segregated_waste_outward_labor',
      'rejected_waste_inward',
      'rejected_waste_inward_labor',
      'rejected_waste_outward',
      'inventory',
      'inventory_adjustments',
      'materials',
      'bank_accounts',
      'bank_transactions',
      'payments',
      'staff_ledger',
      'transactions'
    ];
    
    // Check each table
    for (const tableName of availableTables) {
      try {
        console.log(`\nChecking table: ${tableName}`);
        
        // Try to fetch a single row to see column structure
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.error(`Error accessing table ${tableName}:`, error);
          continue;
        }
        
        // If table is empty, we won't see columns, so just report that
        if (!data || data.length === 0) {
          console.log(`Table ${tableName} exists but has no rows to inspect columns.`);
          continue;
        }
        
        // Check for is_active column
        const hasIsActive = Object.keys(data[0]).includes('is_active');
        console.log(`Table ${tableName} has is_active column: ${hasIsActive}`);
        
        // If the table has is_active, try to query with it to confirm it works
        if (hasIsActive) {
          const { data: testData, error: testError } = await supabase
            .from(tableName)
            .select('*')
            .eq('is_active', true)
            .limit(1);
            
          if (testError) {
            console.error(`Error using is_active filter on ${tableName}:`, testError);
          } else {
            console.log(`Successfully queried ${tableName} with is_active filter.`);
          }
        }
      } catch (tableError) {
        console.error(`Error processing table ${tableName}:`, tableError);
      }
    }
  } catch (error) {
    console.error("Error executing database queries:", error);
  } finally {
    console.log("\nDatabase check complete");
  }
}

// Execute the function
fetchAllTables(); 