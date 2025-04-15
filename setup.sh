#!/bin/bash

echo "Setting up Gull Lake Golf Tournament App..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Create database
echo "Creating database schema..."
npx prisma db push

# Seed the database
echo "Seeding the database with initial data..."
npx prisma db seed

echo "Setup completed successfully!"
echo ""
echo "You can now start the development server with: npm run dev"
echo ""
echo "Admin account details:"
echo "- Email: jamesquags@gmail.com"
echo "- Password: password123"
echo ""
echo "Team Captain account:"
echo "- Email: captain@gulllakegolf.com"
echo "- Password: password123"
echo ""
echo "Player account:"
echo "- Email: player@gulllakegolf.com"
echo "- Password: password123"