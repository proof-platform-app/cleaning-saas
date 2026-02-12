#!/usr/bin/env python
"""
Setup test users for Settings API v1.1 RBAC verification
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.accounts.models import Company

User = get_user_model()

def setup_test_users():
    """Create test users for each role"""

    # Create test company
    company, created = Company.objects.get_or_create(
        name='Test Company',
        defaults={
            'plan': Company.PLAN_ACTIVE,
            'is_trial': False,
            'contact_email': 'test@example.com'
        }
    )
    if created:
        print(f'✓ Created company: {company.name}')
    else:
        print(f'✓ Using existing company: {company.name}')

    # Create Owner
    owner, created = User.objects.get_or_create(
        email='owner@test.com',
        defaults={
            'full_name': 'Test Owner',
            'role': User.ROLE_OWNER,
            'company': company,
            'is_active': True,
            'auth_type': User.AUTH_TYPE_PASSWORD
        }
    )
    if created or not owner.check_password('testpass123!'):
        owner.set_password('testpass123!')
        owner.save()
    print(f'✓ Owner: owner@test.com (password auth)')

    # Create Manager
    manager, created = User.objects.get_or_create(
        email='manager@test.com',
        defaults={
            'full_name': 'Test Manager',
            'role': User.ROLE_MANAGER,
            'company': company,
            'is_active': True,
            'auth_type': User.AUTH_TYPE_PASSWORD
        }
    )
    if created or not manager.check_password('testpass123!'):
        manager.set_password('testpass123!')
        manager.save()
    print(f'✓ Manager: manager@test.com (password auth)')

    # Create Staff
    staff, created = User.objects.get_or_create(
        email='staff@test.com',
        defaults={
            'full_name': 'Test Staff',
            'role': User.ROLE_STAFF,
            'company': company,
            'is_active': True,
            'auth_type': User.AUTH_TYPE_PASSWORD
        }
    )
    if created or not staff.check_password('testpass123!'):
        staff.set_password('testpass123!')
        staff.save()
    print(f'✓ Staff: staff@test.com (password auth)')

    # Create SSO user (Owner with SSO auth)
    sso_owner, created = User.objects.get_or_create(
        email='sso@test.com',
        defaults={
            'full_name': 'SSO Test User',
            'role': User.ROLE_OWNER,
            'company': company,
            'is_active': True,
            'auth_type': User.AUTH_TYPE_SSO
        }
    )
    if not created:
        sso_owner.auth_type = User.AUTH_TYPE_SSO
        sso_owner.save()
    # Set a password for login, but mark as SSO
    if created or not sso_owner.check_password('testpass123!'):
        sso_owner.set_password('testpass123!')
        sso_owner.save()
    print(f'✓ SSO Owner: sso@test.com (SSO auth)')

    print('\n✓ All test users created successfully')
    print('\nTest credentials:')
    print('  Owner (password):  owner@test.com / testpass123!')
    print('  Manager (password): manager@test.com / testpass123!')
    print('  Staff (password):   staff@test.com / testpass123!')
    print('  Owner (SSO):        sso@test.com / testpass123!')

if __name__ == '__main__':
    setup_test_users()
