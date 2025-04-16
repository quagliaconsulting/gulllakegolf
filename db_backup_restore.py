import os
import sys
import argparse
import psycopg2
from dotenv import load_dotenv
from psycopg2 import sql
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode # Import URL parsing utilities

# --- Configuration ---
# List of tables to back up (add any others if needed)
TABLES_TO_BACKUP = [
    "Tournament",
    "User",
    "Team",
    "Course",
    "FormatMultiplier",
    "Schedule",
    "GalleryPhoto",
    "Player",
    "Match",
    "PlayerPayment",
    # Add other tables here if necessary
]

# ORDER MATTERS FOR IMPORT due to foreign keys!
TABLE_IMPORT_ORDER = [
    "Tournament",
    "User",
    "Team",
    "Course",
    "FormatMultiplier",
    "Schedule",
    "GalleryPhoto",
    "Player", # Depends on Team
    "Match", # Depends on Tournament, Schedule, FormatMultiplier, Team, Course
    "PlayerPayment", # Depends on Tournament, Player
    # Add other tables here in the correct dependency order if necessary
]

DEFAULT_BACKUP_DIR = './db_backup_csvs'
DEFAULT_ENV_PATH = '.env'
# --- End Configuration ---

def get_db_connection():
    """Establishes connection to the PostgreSQL database using DATABASE_URL,
       removing the 'schema' parameter if present.
    """
    database_url_raw = os.getenv("DATABASE_URL")
    if not database_url_raw:
        print(f"Error: DATABASE_URL not found in environment or {DEFAULT_ENV_PATH}.", file=sys.stderr)
        sys.exit(1)

    # Parse the URL and remove the 'schema' query parameter
    try:
        parsed = urlparse(database_url_raw)
        query_params = parse_qs(parsed.query)
        if 'schema' in query_params:
            del query_params['schema']
        
        # Reconstruct the URL without the schema param
        # Note: urlencode converts list values from parse_qs back correctly
        cleaned_query = urlencode(query_params, doseq=True) 
        
        # Create a new ParseResult tuple with the cleaned query
        # Indexes: 0=scheme, 1=netloc, 2=path, 3=params, 4=query, 5=fragment
        cleaned_parts = list(parsed)
        cleaned_parts[4] = cleaned_query
        database_url_cleaned = urlunparse(cleaned_parts)
        
    except Exception as e:
        print(f"Error parsing DATABASE_URL '{database_url_raw}': {e}", file=sys.stderr)
        print("Using the raw URL as fallback.")
        database_url_cleaned = database_url_raw # Fallback if parsing fails

    print(f"Connecting to database (schema parameter removed if present)...")
    try:
        conn = psycopg2.connect(database_url_cleaned)
        print("Database connection successful.")
        return conn
    except psycopg2.OperationalError as e:
        # Provide more specific feedback if the error persists
        if "invalid URI query parameter" in str(e):
             print(f"Error connecting to database: {e}", file=sys.stderr)
             print("Even after attempting to remove 'schema', psycopg2 rejected the URL.", file=sys.stderr)
             print(f"Cleaned URL used: {database_url_cleaned}", file=sys.stderr)
             print("Original URL: {database_url_raw}", file=sys.stderr)
        else:
             print(f"Error connecting to database: {e}", file=sys.stderr)
             print("Please check your DATABASE_URL and ensure PostgreSQL is running.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred during database connection: {e}", file=sys.stderr)
        sys.exit(1)


def export_table(conn, table_name, file_path):
    """Exports a table to a CSV file using COPY TO."""
    print(f"  Exporting table \"{table_name}\" to {file_path}...")
    sql_command = sql.SQL("COPY {} TO STDOUT WITH (FORMAT CSV, HEADER)").format(
        sql.Identifier(table_name)
    )
    try:
        with open(file_path, 'w', encoding='utf-8') as f_output:
            with conn.cursor() as cur:
                cur.copy_expert(sql_command, f_output)
        print(f"  Successfully exported \"{table_name}\".")
        # Check if file is empty (indicates table was empty)
        if os.path.getsize(file_path) <= 1: # Check for empty or just header
             print(f"  Warning: Exported file for \"{table_name}\" is empty or contains only header.")

    except FileNotFoundError:
        print(f"  Error: Could not write to file path {file_path}. Check permissions or path.", file=sys.stderr)
    except psycopg2.Error as e:
        print(f"  Error exporting table \"{table_name}\": {e}", file=sys.stderr)
        conn.rollback() # Rollback any potential transaction state change
    except Exception as e:
         print(f"  An unexpected error occurred exporting \"{table_name}\": {e}", file=sys.stderr)


def import_table(conn, table_name, file_path):
    """Imports data from a CSV file to a table using COPY FROM."""
    if not os.path.exists(file_path):
        print(f"  Warning: CSV file not found for table \"{table_name}\" at {file_path}. Skipping import.", file=sys.stderr)
        return

    print(f"  Importing data for table \"{table_name}\" from {file_path}...")
    # Check if file is empty before trying to import
    # Read enough to check beyond just a header line
    try:
         with open(file_path, 'r', encoding='utf-8') as f_check:
            header = f_check.readline()
            first_data_line = f_check.readline()
            if not first_data_line: # Only header exists or file is completely empty
                 print(f"  Skipping import for \"{table_name}\": File is empty or contains only header.")
                 return
    except Exception as e:
        print(f"  Error reading file {file_path} to check for emptiness: {e}", file=sys.stderr)
        return

    sql_command = sql.SQL("COPY {} FROM STDIN WITH (FORMAT CSV, HEADER)").format(
        sql.Identifier(table_name)
    )
    try:
        with open(file_path, 'r', encoding='utf-8') as f_input:
            with conn.cursor() as cur:
                 # Disable triggers temporarily for potentially faster import and fewer FK issues during load
                 # cur.execute(sql.SQL("ALTER TABLE {} DISABLE TRIGGER ALL;").format(sql.Identifier(table_name)))

                 cur.copy_expert(sql_command, f_input)

                 # Re-enable triggers
                 # cur.execute(sql.SQL("ALTER TABLE {} ENABLE TRIGGER ALL;").format(sql.Identifier(table_name)))
                 
                 # Important: Commit after each successful table import
                 conn.commit()
        print(f"  Successfully imported data for \"{table_name}\".")
    except psycopg2.Error as e:
        print(f"  Error importing data for table \"{table_name}\": {e}", file=sys.stderr)
        print(f"  Import for \"{table_name}\" failed. Subsequent imports might also fail due to dependencies.", file=sys.stderr)
        conn.rollback() # Rollback the failed COPY
    except Exception as e:
        print(f"  An unexpected error occurred importing \"{table_name}\": {e}", file=sys.stderr)
        conn.rollback()


def main():
    parser = argparse.ArgumentParser(description="Export or Import PostgreSQL table data to/from CSV.")
    parser.add_argument("action", choices=['export', 'import'], help="Action to perform: 'export' or 'import'")
    parser.add_argument("--backup-dir", default=DEFAULT_BACKUP_DIR, help=f"Directory to store/load CSV files (default: {DEFAULT_BACKUP_DIR})")
    parser.add_argument("--env-file", default=DEFAULT_ENV_PATH, help=f"Path to the .env file (default: {DEFAULT_ENV_PATH})")

    args = parser.parse_args()

    # Load environment variables
    load_dotenv(dotenv_path=args.env_file)

    conn = None # Initialize connection variable
    try:
        conn = get_db_connection()

        if args.action == 'export':
            print(f"\nStarting Export to directory: {args.backup_dir}")
            os.makedirs(args.backup_dir, exist_ok=True)
            for table in TABLES_TO_BACKUP:
                file_path = os.path.join(args.backup_dir, f"{table.lower()}.csv")
                export_table(conn, table, file_path)
            print("\nExport process completed.")
            print(f"IMPORTANT: Please verify the contents of the CSV files in '{args.backup_dir}' before proceeding.")

        elif args.action == 'import':
            print(f"\nStarting Import from directory: {args.backup_dir}")
            print("IMPORTANT: Ensure you have run 'npx prisma migrate reset --force' BEFORE running the import.")
            print("Data will be imported in a specific order to respect foreign keys.")
            user_confirmation = input("Proceed with import? (yes/no): ")
            if user_confirmation.lower() != 'yes':
                print("Import cancelled by user.")
                sys.exit(0)

            for table in TABLE_IMPORT_ORDER:
                file_path = os.path.join(args.backup_dir, f"{table.lower()}.csv")
                import_table(conn, table, file_path)
            print("\nImport process completed.")
            print("Please check your application and database for data integrity.")

    finally:
        if conn:
            conn.close()
            print("\nDatabase connection closed.")

if __name__ == "__main__":
    main()