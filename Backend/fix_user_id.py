#!/usr/bin/env python3
"""
Script to replace user.id with user.userId in controller files
where user comes from AuthenticatedRequest
"""

import re
import os

# Files to process
files_to_fix = [
    'src/controllers/VotingController.ts',
    'src/controllers/ElectionController.ts',
    'src/controllers/MonitoringController.ts',
    'src/controllers/AnalyticsController.ts',
]

def fix_file(filepath):
    """Fix user.id references in a file"""
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace user.id with user.userId
    # But be careful not to replace things like updatedUser.id or election.creator_id
    original_content = content
    
    # Replace patterns like "user.id" but not "someUser.id" or "User.id"
    content = re.sub(r'\buser\.id\b', 'user.userId', content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
    else:
        print(f"No changes needed: {filepath}")

if __name__ == '__main__':
    for file in files_to_fix:
        fix_file(file)
    print("Done!")
