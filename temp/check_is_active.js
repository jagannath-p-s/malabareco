// Script to check for is_active column references in database tables
import { supabase } from '../src/supabase.js';

async function checkIsActiveReferences() {
  console.log("Checking for is_active column in database tables...");
  
  try {
    // First, let's create a simpler query to directly check for is_active in each table
    // We'll run this individually for key tables
    
    console.log("\nChecking locations table...");
    const { data: locationsColumns, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .limit(1);
    
    if (locationsError) {
      console.error("Error checking locations:", locationsError);
    } else {
      const hasIsActive = locationsColumns && 
        Object.keys(locationsColumns[0] || {}).includes('is_active');
      console.log(`locations table has is_active column: ${hasIsActive}`);
    }
    
    console.log("\nChecking users table...");
    const { data: usersColumns, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error("Error checking users:", usersError);
    } else {
      const hasIsActive = usersColumns && 
        Object.keys(usersColumns[0] || {}).includes('is_active');
      console.log(`users table has is_active column: ${hasIsActive}`);
    }
    
    // Try to execute a query with is_active filter to see where the error happens
    console.log("\nAttempting query with is_active filter on locations...");
    const { data: locationTest, error: locationTestError } = await supabase
      .from('locations')
      .select('id, name')
      .eq('is_active', true)
      .limit(1);
      
    if (locationTestError) {
      console.error("Error with is_active filter on locations:", locationTestError);
    } else {
      console.log("Query with is_active filter on locations succeeded");
    }
    
    console.log("\nAttempting query with is_active filter on users...");
    const { data: usersTest, error: usersTestError } = await supabase
      .from('users')
      .select('id, email')
      .eq('is_active', true)
      .limit(1);
      
    if (usersTestError) {
      console.error("Error with is_active filter on users:", usersTestError);
    } else {
      console.log("Query with is_active filter on users succeeded");
    }
    
  } catch (error) {
    console.error("Error executing database queries:", error);
  } finally {
    console.log("\nDatabase check complete");
  }
}

// Execute the function
checkIsActiveReferences(); 