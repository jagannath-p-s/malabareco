// Script to check for is_active column references in database objects
import { supabase } from '../src/supabase.js';

async function checkIsActiveReferences() {
  console.log("Checking for is_active column references in database objects...");
  
  // Check for views referencing is_active
  const viewQuery = `
    SELECT v.schemaname, v.viewname, v.definition
    FROM pg_views v
    WHERE v.definition ILIKE '%is_active%'
    ORDER BY v.schemaname, v.viewname;
  `;
  
  // Check for functions/procedures referencing is_active
  const functionQuery = `
    SELECT n.nspname AS schema_name, p.proname AS function_name, 
           pg_get_functiondef(p.oid) AS function_definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE pg_get_functiondef(p.oid) ILIKE '%is_active%'
    ORDER BY n.nspname, p.proname;
  `;
  
  // Check for triggers that might use is_active
  const triggerQuery = `
    SELECT tgname AS trigger_name, 
           relname AS table_name, 
           nspname AS schema_name,
           pg_get_triggerdef(t.oid) AS trigger_definition
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE pg_get_triggerdef(t.oid) ILIKE '%is_active%'
    ORDER BY nspname, relname, tgname;
  `;
  
  // Check for materialized views referencing is_active
  const matViewQuery = `
    SELECT n.nspname AS schema_name, c.relname AS matview_name,
           pg_get_viewdef(c.oid) AS view_definition
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relkind = 'm'
    AND pg_get_viewdef(c.oid) ILIKE '%is_active%'
    ORDER BY n.nspname, c.relname;
  `;
  
  // Check for RLS policies referencing is_active
  const rlsQuery = `
    SELECT n.nspname AS schema_name, c.relname AS table_name,
           pol.polname AS policy_name, 
           pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) AS policy_definition
    FROM pg_policy pol
    JOIN pg_class c ON pol.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%is_active%'
    ORDER BY n.nspname, c.relname, pol.polname;
  `;
  
  // List tables with is_active column
  const tablesWithColumnQuery = `
    SELECT c.table_schema, c.table_name, c.column_name
    FROM information_schema.columns c
    WHERE c.column_name = 'is_active'
    ORDER BY c.table_schema, c.table_name;
  `;
  
  try {
    console.log("\n--- VIEWS REFERENCING is_active ---");
    const { data: viewData, error: viewError } = await supabase.rpc('pgmoon_query', { query: viewQuery });
    if (viewError) throw viewError;
    console.log(viewData || "No views found referencing is_active");
    
    console.log("\n--- FUNCTIONS REFERENCING is_active ---");
    const { data: functionData, error: functionError } = await supabase.rpc('pgmoon_query', { query: functionQuery });
    if (functionError) throw functionError;
    console.log(functionData || "No functions found referencing is_active");
    
    console.log("\n--- TRIGGERS REFERENCING is_active ---");
    const { data: triggerData, error: triggerError } = await supabase.rpc('pgmoon_query', { query: triggerQuery });
    if (triggerError) throw triggerError;
    console.log(triggerData || "No triggers found referencing is_active");
    
    console.log("\n--- MATERIALIZED VIEWS REFERENCING is_active ---");
    const { data: matViewData, error: matViewError } = await supabase.rpc('pgmoon_query', { query: matViewQuery });
    if (matViewError) throw matViewError;
    console.log(matViewData || "No materialized views found referencing is_active");
    
    console.log("\n--- RLS POLICIES REFERENCING is_active ---");
    const { data: rlsData, error: rlsError } = await supabase.rpc('pgmoon_query', { query: rlsQuery });
    if (rlsError) throw rlsError;
    console.log(rlsData || "No RLS policies found referencing is_active");
    
    console.log("\n--- TABLES WITH is_active COLUMN ---");
    const { data: columnData, error: columnError } = await supabase.rpc('pgmoon_query', { query: tablesWithColumnQuery });
    if (columnError) throw columnError;
    console.log(columnData || "No tables found with is_active column");
    
  } catch (error) {
    console.error("Error executing database queries:", error);
  } finally {
    console.log("\nDatabase check complete");
  }
}

// Execute the function
checkIsActiveReferences(); 