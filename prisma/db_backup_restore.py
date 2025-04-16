#!/usr/bin/env python3
import psycopg2
import csv
import os
import sys
import dotenv
import argparse
from pathlib import Path

def load_env_config():
    """Load database configuration from .env file"""
    dotenv.load_dotenv()
    
    # Parse the DATABASE_URL from .env
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("DATABASE_URL not found in .env file.")
        sys.exit(1)
    
    print(f"Database URL found: {db_url}")
    
    # Parse the connection parameters from the URL
    # Format: postgresql://user:password@host:port/database?schema=public
    try:
        # Remove protocol prefix
        db_url = db_url.replace('postgresql://', '')
        
        # Split auth and host parts
        parts = db_url.split('@')
        user_pass = parts[0].split(':')
        
        # Handle the rest of the URL
        host_db_params = parts[1].split('/')
        
        # Parse host and port
        if ':' in host_db_params[0]:
            host, port = host_db_params[0].split(':')
        else:
            host = host_db_params[0]
            port = 5432  # Default PostgreSQL port
        
        # Extract database name, removing query parameters
        database = host_db_params[1].split('?')[0] if '?' in host_db_params[1] else host_db_params[1]
        
        user = user_pass[0]
        password = user_pass[1] if len(user_pass) > 1 else ''
        
        config = {
            "host": host,
            "port": port,
            "database": database,
            "user": user,
            "password": password
        }
        
        print(f"Parsed database config: host={host}, port={port}, database={database}, user={user}")
        return config
        
    except Exception as e:
        print(f"Error parsing DATABASE_URL: {e}")
        print("Please ensure your DATABASE_URL is in the format: postgresql://user:password@host:port/database?schema=public")
        sys.exit(1)

def connect_to_db(params):
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**params)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def get_all_tables(conn):
    """Get list of all tables in the public schema"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        """)
        return [row[0] for row in cur.fetchall()]
        
def print_all_table_names(conn):
    """Print all actual table names in the database for debugging"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        """)
        tables = [row[0] for row in cur.fetchall()]
        print("\nActual tables in database:")
        for table in tables:
            print(f"  - {table}")

def get_table_columns(conn, table_name):
    """Get the column names and types for a table"""
    # Remove quotes for the query
    table_name_clean = table_name.replace('"', '')
    
    # Get a list of all columns, data types, and nullability
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = '{table_name_clean}'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
    
    # Debug: Print the actual columns in the database table
    print(f"Columns in database table '{table_name_clean}':")
    for col in columns:
        print(f"  - {col[0]} ({col[1]}, nullable: {col[2]})")
    
    return {row[0]: {'type': row[1], 'nullable': row[2] == 'YES'} for row in columns}

def export_table(conn, table_name, backup_dir):
    """Export a table to a CSV file"""
    os.makedirs(backup_dir, exist_ok=True)
    
    # Remove quotes for the filename
    file_table_name = table_name.replace('"', '')
    output_file = os.path.join(backup_dir, f"{file_table_name}.csv")
    
    try:
        # Get column names
        with conn.cursor() as cur:
            cur.execute(f"SELECT * FROM {table_name} LIMIT 0")
            columns = [desc[0] for desc in cur.description]
        
        # Export data
        with conn.cursor() as cur:
            with open(output_file, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(columns)  # Write header
                
                cur.execute(f"SELECT * FROM {table_name}")
                for row in cur:
                    # Convert any None values to empty strings to avoid CSV issues
                    processed_row = ['' if val is None else val for val in row]
                    writer.writerow(processed_row)
        
        print(f"Exported {table_name} to {output_file}")
        return True
    except Exception as e:
        print(f"Error exporting {table_name}: {e}")
        return False

def normalize_column_name(name):
    """Normalize column names for case-insensitive comparison"""
    return name.lower().replace('_', '')

def check_table_has_data(conn, table_name):
    """Check if a table already has data"""
    try:
        with conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cur.fetchone()[0]
            return count > 0
    except Exception as e:
        print(f"Error checking if table has data: {e}")
        return False

def import_table(conn, table_name, csv_file, skip_id=False):
    """Import data from CSV to table, handling missing columns"""
    # Check if table already has data
    has_data = check_table_has_data(conn, table_name)
    if has_data:
        print(f"Table {table_name} already has data - skipping import")
        return True
    
    # Get table columns
    table_columns = get_table_columns(conn, table_name)
    
    # Check if file exists
    if not os.path.exists(csv_file):
        print(f"CSV file not found: {csv_file}")
        return False
    
    # Read CSV headers
    try:
        with open(csv_file, 'r') as f:
            reader = csv.reader(f)
            csv_headers = next(reader)
            
            # Check if there are any rows
            first_row = next(reader, None)
            has_data = first_row is not None
            
            # Debug: Print CSV headers
            print(f"CSV headers for {os.path.basename(csv_file)}:")
            for idx, header in enumerate(csv_headers):
                value = first_row[idx] if first_row and idx < len(first_row) else 'N/A'
                print(f"  - {header} (example: {value})")
    except Exception as e:
        print(f"Error reading CSV file {csv_file}: {e}")
        return False
    
    # If no data, just report success
    if not has_data:
        print(f"No data to import for {table_name}")
        return True
    
    # Create a mapping from normalized CSV headers to actual headers
    csv_header_map = {normalize_column_name(header): header for header in csv_headers}
    
    # Create a mapping from normalized table columns to actual columns
    table_column_map = {normalize_column_name(col): col for col in table_columns.keys()}
    
    # Create a mapping from CSV headers to table columns
    column_mapping = {}
    for csv_norm, csv_actual in csv_header_map.items():
        # Skip 'id' column if requested
        if skip_id and csv_norm == 'id':
            print("Skipping 'id' column as requested")
            continue
            
        if csv_norm in table_column_map:
            column_mapping[csv_actual] = table_column_map[csv_norm]
    
    print(f"Column mapping from CSV to DB:")
    for csv_col, db_col in column_mapping.items():
        print(f"  - {csv_col} -> {db_col}")
    
    # Find missing columns in CSV
    missing_columns = set(table_columns.keys()) - set(column_mapping.values())
    default_values = {}
    
    # Prompt for default values for missing columns
    if missing_columns:
        print(f"\nTable '{table_name}' has columns not in CSV: {missing_columns}")
        for col in missing_columns:
            col_info = table_columns[col]
            
            # Skip auto-generated columns or columns that can be NULL
            if col in ["id", "createdAt", "updatedAt", "created_at", "updated_at"] or col_info['nullable']:
                continue
                
            # Prompt for required columns
            data_type = col_info['type']
            if data_type.startswith("bool"):
                default = input(f"Enter default value for '{col}' (true/false): ").lower() == 'true'
            elif data_type.startswith("int"):
                default = int(input(f"Enter default value for '{col}' (number): ") or "0")
            elif data_type.startswith("numeric") or data_type.startswith("float") or data_type.startswith("double"):
                default = float(input(f"Enter default value for '{col}' (number): ") or "0")
            else:
                default = input(f"Enter default value for '{col}': ")
            default_values[col] = default
    
    # Clear table and reset sequences
    try:
        table_name_clean = table_name.replace('"', '')
        with conn.cursor() as cur:
            try:
                # First try TRUNCATE which resets sequences
                cur.execute(f"TRUNCATE TABLE {table_name} CASCADE")
                conn.commit()
                print(f"Truncated table '{table_name}'")
            except Exception as e:
                print(f"Could not truncate table, falling back to DELETE: {e}")
                cur.execute(f"DELETE FROM {table_name}")
                conn.commit()
                print(f"Cleared existing data from '{table_name}'")
                
            # Now let's explicitly reset any sequences associated with the table
            try:
                # Get sequence information for this table
                cur.execute(f"""
                    SELECT pg_get_serial_sequence('{table_name_clean}', 'id') as seq_name
                """)
                seq_result = cur.fetchone()
                
                if seq_result and seq_result[0]:
                    seq_name = seq_result[0]
                    print(f"Resetting sequence: {seq_name}")
                    cur.execute(f"ALTER SEQUENCE {seq_name} RESTART WITH 1")
                    conn.commit()
            except Exception as seq_error:
                print(f"Warning: Could not reset sequence: {seq_error}")
    except Exception as e:
        conn.rollback()
        print(f"Warning: Could not clear table '{table_name}': {e}")
        print("Proceeding with import anyway - might encounter duplicate key errors")
    
    # If we have no data, return success
    if not has_data:
        conn.commit()
        return True
    
    # Read CSV data and insert into table
    row_count = 0
    try:
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            
            # Re-add the first row we read earlier
            if first_row:
                data = dict(zip(csv_headers, first_row))
                
                # Create a new dict with mapped column names
                mapped_data = {}
                for csv_col, value in data.items():
                    if csv_col in column_mapping:
                        db_col = column_mapping[csv_col]
                        mapped_data[db_col] = value
                
                # Add default values for missing columns
                for col, val in default_values.items():
                    mapped_data[col] = val
                
                # Get columns for the insert
                db_columns = list(mapped_data.keys())
                
                # Skip if no valid columns
                if not db_columns:
                    print(f"Warning: No valid columns found for {table_name}")
                    return False
                
                # Build values list
                values = []
                for col in db_columns:
                    val = mapped_data[col]
                    # Handle empty strings for non-text fields
                    if val == '' and table_columns[col]['type'] != 'text' and table_columns[col]['nullable']:
                        val = None
                    values.append(val)
                
                # Execute insert
                placeholders = ', '.join(['%s'] * len(db_columns))
                columns_str = ', '.join(f'"{col}"' for col in db_columns)
                
                with conn.cursor() as cur:
                    query = f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})"
                    cur.execute(query, values)
                    row_count += 1
            
            # Process the rest of the rows
            for row in reader:
                # Create a new dict with mapped column names
                mapped_data = {}
                for csv_col, value in row.items():
                    if csv_col in column_mapping:
                        db_col = column_mapping[csv_col]
                        mapped_data[db_col] = value
                
                # Add default values for missing columns
                for col, val in default_values.items():
                    mapped_data[col] = val
                
                # Get columns for the insert
                db_columns = list(mapped_data.keys())
                
                # Skip if no valid columns
                if not db_columns:
                    continue
                
                # Build values list
                values = []
                for col in db_columns:
                    val = mapped_data[col]
                    # Handle empty strings for non-text fields
                    if val == '' and table_columns[col]['type'] != 'text' and table_columns[col]['nullable']:
                        val = None
                    values.append(val)
                
                # Execute insert
                placeholders = ', '.join(['%s'] * len(db_columns))
                columns_str = ', '.join(f'"{col}"' for col in db_columns)
                
                with conn.cursor() as cur:
                    query = f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})"
                    cur.execute(query, values)
                    row_count += 1
        
        conn.commit()
        print(f"Successfully imported {row_count} rows into '{table_name}'")
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error importing data into '{table_name}': {e}")
        print(f"Last attempted query: INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})")
        return False

def export_all_tables(db_params, backup_dir):
    """Export all tables to CSV files"""
    conn = connect_to_db(db_params)
    
    # Print the actual table names for debugging
    print_all_table_names(conn)
    
    tables = get_all_tables(conn)
    print(f"Found {len(tables)} tables to export")
    
    results = {}
    for table in tables:
        try:
            # Make sure to use quotes around table names to handle case sensitivity
            table_quoted = f'"{table}"' if not table.islower() else table
            results[table] = export_table(conn, table_quoted, backup_dir)
        except Exception as e:
            print(f"Failed to export {table}: {e}")
            results[table] = False
    
    conn.close()
    
    # Print summary
    success_count = sum(1 for result in results.values() if result)
    print(f"\nExport Summary: {success_count}/{len(tables)} tables successfully exported")
    
    # Print failed tables
    failed = [table for table, result in results.items() if not result]
    if failed:
        print(f"Failed tables: {', '.join(failed)}")

def import_all_tables(db_params, backup_dir, skip_id=False):
    """Import all tables from CSV files"""
    conn = connect_to_db(db_params)
    
    # Print the actual table names in the target database
    print_all_table_names(conn)
    
    # Get all CSV files
    csv_files = [f for f in os.listdir(backup_dir) if f.endswith('.csv')]
    print(f"Found {len(csv_files)} CSV files to import")
    
    # Sort tables to handle dependencies (order matters for foreign keys)
    # Using actual table names from the exported CSV files
    tables_order = [
        "User", "Tournament", "Team", "Player", "Course", "Hole", "Schedule", 
        "Match", "HoleResult", "PlayerPairing", "MatchPoints", "FormatMultiplier",
        "Accommodation", "GalleryPhoto", "Report"
    ]
    
    # Add any tables not in the predefined order
    csv_tables = [os.path.splitext(f)[0] for f in csv_files]
    for table in csv_tables:
        if table not in tables_order:
            tables_order.append(table)
    
    # Filter to only include tables that have CSV files
    tables_to_import = [table for table in tables_order if f"{table}.csv" in csv_files]
    
    results = {}
    for table in tables_to_import:
        # Get the actual table name with correct case from the database
        actual_table_name = table
        csv_file = os.path.join(backup_dir, f"{table}.csv")
        print(f"\nProcessing table: {actual_table_name}")
        
        try:
            # Use quoted identifier for case-sensitive table names
            quoted_table = f'"{actual_table_name}"'
            success = import_table(conn, quoted_table, csv_file, skip_id)
            results[table] = success
            
            if not success:
                retry = input(f"Retry table {actual_table_name}? (y/n): ").lower() == 'y'
                if retry:
                    results[table] = import_table(conn, quoted_table, csv_file, skip_id)
        except Exception as e:
            print(f"Error processing table {actual_table_name}: {e}")
            results[table] = False
            retry = input(f"Retry table {actual_table_name}? (y/n): ").lower() == 'y'
            if retry:
                try:
                    results[table] = import_table(conn, quoted_table, csv_file)
                except Exception as e:
                    print(f"Failed on retry: {e}")
                    results[table] = False
    
    conn.close()
    
    # Print summary
    success_count = sum(1 for result in results.values() if result)
    print(f"\nImport Summary: {success_count}/{len(tables_to_import)} tables successfully imported")
    
    # Print failed tables
    failed = [table for table, result in results.items() if not result]
    if failed:
        print(f"Failed tables: {', '.join(failed)}")

def main():
    parser = argparse.ArgumentParser(description='Database backup and restore utility for Gull Lake')
    parser.add_argument('action', choices=['export', 'import'], help='Action to perform')
    parser.add_argument('--dir', default='db_backup', help='Directory for backup/restore files')
    parser.add_argument('--skip-id', action='store_true', help='Skip importing ID fields (use generated IDs)')
    args = parser.parse_args()
    
    # Load database config from .env
    db_params = load_env_config()
    
    if args.action == 'export':
        print(f"Exporting all tables to {args.dir}/")
        export_all_tables(db_params, args.dir)
    else:
        print(f"Importing all tables from {args.dir}/")
        import_all_tables(db_params, args.dir, args.skip_id)

if __name__ == "__main__":
    main()