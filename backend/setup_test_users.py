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
    # Always ensure owner is in Test Company
    if not created:
        owner.company = company
        owner.role = User.ROLE_OWNER
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
    # Always ensure manager is in Test Company
    if not created:
        manager.company = company
        manager.role = User.ROLE_MANAGER
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
    # Always ensure staff is in Test Company
    if not created:
        staff.company = company
        staff.role = User.ROLE_STAFF
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
    # Always ensure SSO owner is in Test Company
    if not created:
        sso_owner.company = company
        sso_owner.auth_type = User.AUTH_TYPE_SSO
    # Set a password for login, but mark as SSO
    if created or not sso_owner.check_password('testpass123!'):
        sso_owner.set_password('testpass123!')
    sso_owner.save()
    print(f'✓ SSO Owner: sso@test.com (SSO auth)')

    # Create or update Cleaner (phone + PIN)
    from django.contrib.auth.hashers import make_password
    # Get or create cleaner - use first one if multiple exist
    cleaners = User.objects.filter(phone='+971500000001', role=User.ROLE_CLEANER)
    if cleaners.exists():
        cleaner = cleaners.first()
    else:
        cleaner = User.objects.create(
            phone='+971500000001',
            full_name='Test Cleaner',
            role=User.ROLE_CLEANER,
            company=company,
            is_active=True,
            auth_type=User.AUTH_TYPE_PASSWORD
        )
    # Update cleaner settings and set PIN
    cleaner.full_name = 'Test Cleaner'
    cleaner.company = company
    cleaner.is_active = True
    cleaner.pin_hash = make_password('1234')
    cleaner.must_change_password = False
    cleaner.save()
    print(f'✓ Cleaner: +971500000001 / PIN 1234')

    # Create test location for trial enforcement tests
    from apps.locations.models import Location
    location, created = Location.objects.get_or_create(
        company=company,
        name='Test Location',
        defaults={
            'address': '123 Test Street',
            'is_active': True,
        }
    )
    if created:
        print(f'✓ Created test location: {location.name}')
    else:
        print(f'✓ Using existing test location: {location.name}')

    print('\n✓ All test users created successfully')
    print('\nTest credentials:')
    print('  Owner (password):   owner@test.com / testpass123!')
    print('  Manager (password): manager@test.com / testpass123!')
    print('  Staff (password):   staff@test.com / testpass123!')
    print('  Owner (SSO):        sso@test.com / testpass123!')
    print('  Cleaner (phone+PIN): +971500000001 / PIN 1234')

if __name__ == '__main__':
    setup_test_users()
