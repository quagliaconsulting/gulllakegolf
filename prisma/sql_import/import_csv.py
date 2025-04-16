#!/usr/bin/env python3
import os
import psycopg2
import csv
import re
import uuid
from datetime import datetime

def parse_db_url(url):
    """Parse the DATABASE_URL to get connection parameters"""
    # Extract parts from URL: postgresql://user:password@host:port/dbname
    match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)', url)
    if match:
        return {
            'user': match.group(1),
            'password': match.group(2),
            'host': match.group(3),
            'port': match.group(4),
            'dbname': match.group(5)
        }
    return None

def load_env():
    """Load environment variables from .env file"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    env_vars = {}
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                # Skip comments and empty lines
                if line.strip() and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    # Remove quotes if they exist
                    env_vars[key] = value.strip('"')
    
    return env_vars

def connect_to_db(params):
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**params)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def import_csv_to_table(conn, table_name, csv_path):
    """Import data from CSV to table"""
    try:
        print(f"Importing {csv_path} to {table_name}...")
        
        # Read CSV header and data
        with open(csv_path, 'r') as f:
            reader = csv.reader(f)
            header = next(reader)
            rows = list(reader)
        
        if not rows:
            print(f"  No data found in {csv_path}")
            return
        
        # Connect columns with placeholders for SQL
        columns = ', '.join([f'"{col}"' for col in header])
        placeholders = ', '.join(['%s' for _ in header])
        
        # Prepare SQL
        sql = f'INSERT INTO "{table_name}" ({columns}) VALUES ({placeholders})'
        
        # Execute inserts
        cursor = conn.cursor()
        for row in rows:
            # Convert empty strings to None for database compatibility
            values = []
            for val in row:
                if val == '':
                    values.append(None)
                elif val.lower() == 'true':
                    values.append(True)
                elif val.lower() == 'false':
                    values.append(False)
                else:
                    values.append(val)
            
            cursor.execute(sql, values)
        
        conn.commit()
        print(f"  Successfully imported {len(rows)} rows to {table_name}")
    
    except Exception as e:
        conn.rollback()
        print(f"Error importing {csv_path} to {table_name}: {e}")

def clear_table(conn, table_name):
    """Clear data from table"""
    try:
        cursor = conn.cursor()
        cursor.execute(f'TRUNCATE TABLE "{table_name}" CASCADE')
        conn.commit()
        print(f"Cleared table {table_name}")
    except Exception as e:
        conn.rollback()
        print(f"Error clearing table {table_name}: {e}")

def create_hole_data(conn):
    """Create hole data for courses"""
    try:
        cursor = conn.cursor()
        
        # First make sure uuid extension is installed
        cursor.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
        
        # Clear existing holes
        cursor.execute('TRUNCATE TABLE "Hole" CASCADE')
        
        # Query for courses
        cursor.execute('SELECT id, name FROM "Course"')
        courses = cursor.fetchall()
        
        for course_id, course_name in courses:
            # Create 9 holes for each course
            for hole_num in range(1, 10):
                # Determine if it's a par 3
                is_par3 = hole_num % 3 == 0
                par = 3 if is_par3 else (4 if hole_num % 2 == 0 else 5)
                distance = 170 if is_par3 else (400 if par == 4 else 530)
                
                # Insert the hole
                cursor.execute(
                    'INSERT INTO "Hole" (id, number, par, handicap, distance, "isPar3", "courseId", "createdAt", "updatedAt") '
                    'VALUES (uuid_generate_v4(), %s, %s, %s, %s, %s, %s, %s, %s)',
                    (hole_num, par, hole_num * 2 - 1, distance, is_par3, course_id, datetime.now(), datetime.now())
                )
        
        conn.commit()
        print(f"Created hole data for {len(courses)} courses")
    
    except Exception as e:
        conn.rollback()
        print(f"Error creating hole data: {e}")

def update_tournament_ctp_skins(conn):
    """Update tournament with CTP and Skins settings"""
    try:
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE "Tournament" SET '
            '"buyIn" = 200.0, '
            '"totalPrize" = 1600.0, '
            '"ctpPrizeAmount" = 100.0, '
            '"skinsPrizeAmount" = 20.0, '
            '"hasCTP" = true, '
            '"hasSkins" = true, '
            '"payoutStructure" = \'{"first": 0.5, "second": 0.3, "third": 0.2}\''
        )
        conn.commit()
        print("Updated tournament with CTP and Skins settings")
    except Exception as e:
        conn.rollback()
        print(f"Error updating tournament: {e}")

def update_format_multipliers(conn):
    """Update FormatMultiplier table with points and halfPoints"""
    try:
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE "FormatMultiplier" SET '
            '"points" = 1.0, '
            '"halfPoints" = 0.5 '
            'WHERE "points" IS NULL'
        )
        conn.commit()
        print("Updated FormatMultiplier with points and halfPoints")
    except Exception as e:
        conn.rollback()
        print(f"Error updating format multipliers: {e}")

def fix_boolean_values(conn):
    """Fix boolean values in tables"""
    try:
        cursor = conn.cursor()
        
        # Fix PlayerPairing.isHomeTeam
        cursor.execute(
            'UPDATE "PlayerPairing" SET "isHomeTeam" = '
            'CASE '
            'WHEN "isHomeTeam" = \'True\' THEN true '
            'WHEN "isHomeTeam" = \'False\' THEN false '
            'ELSE "isHomeTeam" END'
        )
        
        # Fix HoleResult.isSkin
        cursor.execute(
            'UPDATE "HoleResult" SET "isSkin" = '
            'CASE '
            'WHEN "isSkin" = \'True\' THEN true '
            'WHEN "isSkin" = \'False\' THEN false '
            'ELSE "isSkin" END'
        )
        
        # Fix FormatMultiplier.isFourManTeam
        cursor.execute(
            'UPDATE "FormatMultiplier" SET "isFourManTeam" = '
            'CASE '
            'WHEN "isFourManTeam" = \'True\' THEN true '
            'WHEN "isFourManTeam" = \'False\' THEN false '
            'ELSE "isFourManTeam" END'
        )
        
        conn.commit()
        print("Fixed boolean values in tables")
    except Exception as e:
        conn.rollback()
        print(f"Error fixing boolean values: {e}")

def main():
    # Load environment variables
    env_vars = load_env()
    if 'DATABASE_URL' not in env_vars:
        print("DATABASE_URL not found in .env file")
        return
    
    # Parse DB URL
    conn_params = parse_db_url(env_vars['DATABASE_URL'])
    if not conn_params:
        print("Failed to parse DATABASE_URL")
        return
    
    # Connect to database
    print("Connecting to database...")
    conn = connect_to_db(conn_params)
    if not conn:
        return
    
    try:
        print("Starting data import process...")
        
        # Import order matters due to foreign key constraints
        table_mapping = [
            ("User", "User.csv"),
            ("Tournament", "Tournament.csv"),
            ("Team", "Team.csv"),
            ("Accommodation", "Accommodation.csv"),
            ("Course", "Course.csv"),
            ("Schedule", "Schedule.csv"),
            ("FormatMultiplier", "FormatMultiplier.csv"),
            ("Player", "Player.csv"),
            ("Match", "Match.csv"),
            ("PlayerPairing", "PlayerPairing.csv"),
            ("MatchPoints", "MatchPoints.csv"),
            ("HoleResult", "HoleResult.csv"),
            ("GalleryPhoto", "GalleryPhoto.csv"),
            ("Report", "Report.csv")
        ]
        
        # Clear and import each table
        for table_name, csv_file in table_mapping:
            csv_path = os.path.join(os.path.dirname(__file__), '..', '..', 'db_backup', csv_file)
            if os.path.exists(csv_path):
                clear_table(conn, table_name)
                import_csv_to_table(conn, table_name, csv_path)
            else:
                print(f"CSV file not found: {csv_path}")
        
        # Create hole data
        create_hole_data(conn)
        
        # Update tournament with CTP and Skins settings
        update_tournament_ctp_skins(conn)
        
        # Update format multipliers
        update_format_multipliers(conn)
        
        # Fix boolean values
        fix_boolean_values(conn)
        
        # Create empty tables for new models
        for table in ["CTPResult", "SkinsResult", "PlayerPayment"]:
            clear_table(conn, table)
        
        print("Data import completed successfully!")
    
    except Exception as e:
        print(f"Error during import process: {e}")
    
    finally:
        conn.close()

if __name__ == "__main__":
    main()