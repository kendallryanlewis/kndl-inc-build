#!/bin/bash

# Firebase Functions Recovery Script
# Use this script to restore your functions if they get overwritten

echo "🔄 Firebase Functions Recovery Script"
echo "====================================="

# Check if backup directory exists
BACKUP_DIR="backups/functions-$(date +%Y%m%d)"
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ No backup found for today. Looking for latest backup..."
    LATEST_BACKUP=$(ls -1 backups/ | grep functions- | sort -r | head -1)
    if [ -z "$LATEST_BACKUP" ]; then
        echo "❌ No backups found! Please check backups directory."
        exit 1
    fi
    BACKUP_DIR="backups/$LATEST_BACKUP"
    echo "📁 Found backup: $BACKUP_DIR"
fi

echo "📋 Current functions directory contents:"
ls -la functions/

echo ""
read -p "⚠️  This will restore functions from backup. Continue? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Restoring functions from $BACKUP_DIR..."
    
    # Backup current state first
    echo "📦 Creating emergency backup of current state..."
    cp -r functions/ "backups/emergency-backup-$(date +%Y%m%d-%H%M%S)/"
    
    # Restore from backup
    echo "♻️  Restoring from backup..."
    cp -r "$BACKUP_DIR"/* functions/
    
    echo "✅ Functions restored successfully!"
    echo "📝 Next steps:"
    echo "   1. Check functions/.env.example and create functions/.env"
    echo "   2. Run: cd functions && npm install"
    echo "   3. Test with: firebase emulators:start --only functions"
    echo "   4. Deploy with: firebase deploy --only functions"
else
    echo "❌ Recovery cancelled."
fi