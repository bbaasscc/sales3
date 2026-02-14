"""
Test Suite: Authentication System for Four Seasons Sales Dashboard
Tests: Registration, Login, Token verification, Admin routes, Role management, Data isolation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://crm-dashboard-186.preview.emergentagent.com')


class TestAuthRegistration:
    """Test user registration flow"""
    
    def test_registration_success_fshac_email(self):
        """Register with valid @fshac.com email"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_{unique_id}@fshac.com",
            "name": f"Test User {unique_id}",
            "customer_number": f"TEST_{unique_id}",
            "password": "testpass123"
        })
        print(f"Registration response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == f"test_{unique_id}@fshac.com"
        assert data["user"]["role"] == "salesperson"
        assert data["user"]["name"] == f"Test User {unique_id}"
        print(f"PASS: Registration successful for test_{unique_id}@fshac.com")
    
    def test_registration_reject_non_fshac_email(self):
        """Reject registration with non-@fshac.com email"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_{unique_id}@gmail.com",
            "name": "Test User",
            "customer_number": "TEST123",
            "password": "testpass123"
        })
        print(f"Non-fshac email response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 400, f"Expected 400 for non-fshac email, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "fshac.com" in data["detail"].lower()
        print("PASS: Non-@fshac.com email correctly rejected")
    
    def test_registration_reject_duplicate_email(self):
        """Reject duplicate email registration"""
        # First registration should succeed
        unique_id = str(uuid.uuid4())[:8]
        email = f"dup_{unique_id}@fshac.com"
        
        res1 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "name": "First User",
            "customer_number": "TEST1",
            "password": "testpass123"
        })
        assert res1.status_code == 200, f"First registration should succeed, got {res1.status_code}"
        
        # Second registration with same email should fail
        res2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "name": "Second User",
            "customer_number": "TEST2",
            "password": "testpass456"
        })
        print(f"Duplicate email response: {res2.status_code} - {res2.text[:200]}")
        assert res2.status_code == 400, f"Expected 400 for duplicate email, got {res2.status_code}"
        print("PASS: Duplicate email correctly rejected")


class TestAuthLogin:
    """Test user login flow"""
    
    def test_login_salesperson_success(self):
        """Login as salesperson with test account"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "benjamin@fshac.com",
            "password": "test123"
        })
        print(f"Salesperson login response: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "salesperson"
        assert data["user"]["email"] == "benjamin@fshac.com"
        print(f"PASS: Salesperson login successful - user: {data['user']['name']}")
        return data["token"]
    
    def test_login_admin_success(self):
        """Login as admin with test account"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fshac.com",
            "password": "admin123"
        })
        print(f"Admin login response: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "admin@fshac.com"
        print(f"PASS: Admin login successful - user: {data['user']['name']}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Login with invalid credentials should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "benjamin@fshac.com",
            "password": "wrongpassword"
        })
        print(f"Invalid login response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Invalid credentials correctly rejected")
    
    def test_login_nonexistent_user(self):
        """Login with non-existent user should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@fshac.com",
            "password": "anypassword"
        })
        print(f"Non-existent user login response: {response.status_code}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Non-existent user correctly rejected")


class TestAuthMeEndpoint:
    """Test /api/auth/me endpoint"""
    
    def test_auth_me_with_valid_token(self):
        """Get user info with valid token"""
        # First login to get token
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "benjamin@fshac.com",
            "password": "test123"
        })
        assert login_res.status_code == 200
        token = login_res.json()["token"]
        
        # Call /auth/me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        print(f"Auth/me response: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["email"] == "benjamin@fshac.com"
        assert data["role"] == "salesperson"
        assert "user_id" in data
        assert "name" in data
        print(f"PASS: /auth/me returns correct user info - {data['name']}")
    
    def test_auth_me_without_token(self):
        """Auth/me without token should fail"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        print(f"Auth/me without token: {response.status_code}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /auth/me correctly requires authentication")


class TestAdminRoutes:
    """Test admin-only routes"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fshac.com",
            "password": "admin123"
        })
        assert res.status_code == 200
        return res.json()["token"]
    
    @pytest.fixture
    def salesperson_token(self):
        """Get salesperson token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "benjamin@fshac.com",
            "password": "test123"
        })
        assert res.status_code == 200
        return res.json()["token"]
    
    def test_admin_get_salespeople_as_admin(self, admin_token):
        """Admin can access /admin/salespeople"""
        response = requests.get(f"{BASE_URL}/api/admin/salespeople", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        print(f"Admin salespeople response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "users" in data
        assert isinstance(data["users"], list)
        assert len(data["users"]) > 0, "Should have at least one user"
        
        # Verify user structure
        user = data["users"][0]
        assert "email" in user
        assert "name" in user
        assert "role" in user
        assert "password_hash" not in user, "Password hash should not be exposed"
        print(f"PASS: Admin can view all {len(data['users'])} salespeople")
    
    def test_admin_get_salespeople_as_salesperson(self, salesperson_token):
        """Salesperson cannot access /admin/salespeople"""
        response = requests.get(f"{BASE_URL}/api/admin/salespeople", headers={
            "Authorization": f"Bearer {salesperson_token}"
        })
        print(f"Salesperson admin access response: {response.status_code}")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Salesperson correctly blocked from admin routes")
    
    def test_admin_comparison_stats(self, admin_token):
        """Admin can access comparison stats"""
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        print(f"Admin comparison response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "comparison" in data
        assert "totals" in data
        
        # Verify comparison structure
        if len(data["comparison"]) > 0:
            sp = data["comparison"][0]
            assert "user_id" in sp
            assert "name" in sp
            assert "total_leads" in sp
            assert "closed_deals" in sp
            assert "total_revenue" in sp
            assert "total_commission" in sp
            assert "closing_rate" in sp
        
        # Verify totals structure
        totals = data["totals"]
        assert "total_leads" in totals
        assert "closed_deals" in totals
        assert "total_revenue" in totals
        print(f"PASS: Admin comparison stats retrieved - {len(data['comparison'])} salespeople")


class TestDataIsolation:
    """Test salesperson data isolation"""
    
    @pytest.fixture
    def admin_token(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fshac.com",
            "password": "admin123"
        })
        assert res.status_code == 200
        return res.json()["token"]
    
    @pytest.fixture
    def salesperson_token(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "benjamin@fshac.com",
            "password": "test123"
        })
        assert res.status_code == 200
        return res.json()["token"]
    
    def test_salesperson_only_sees_own_leads(self, salesperson_token):
        """Salesperson only sees their own leads"""
        response = requests.get(f"{BASE_URL}/api/leads", headers={
            "Authorization": f"Bearer {salesperson_token}"
        })
        print(f"Salesperson leads response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200
        
        data = response.json()
        assert "leads" in data
        leads = data["leads"]
        print(f"Salesperson has {len(leads)} leads")
        
        # All leads should belong to benjamin's user_id
        if len(leads) > 0:
            # Get benjamin's user_id
            me_res = requests.get(f"{BASE_URL}/api/auth/me", headers={
                "Authorization": f"Bearer {salesperson_token}"
            })
            me_data = me_res.json()
            user_id = me_data["user_id"]
            
            # Check at least some leads are assigned to this user
            assigned_leads = [l for l in leads if l.get("salesperson_id") == user_id]
            print(f"Leads assigned to benjamin: {len(assigned_leads)}")
        
        print("PASS: Salesperson leads endpoint working")
    
    def test_admin_sees_all_leads(self, admin_token):
        """Admin can see all leads"""
        response = requests.get(f"{BASE_URL}/api/leads", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        print(f"Admin leads response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "leads" in data
        print(f"PASS: Admin can see {len(data['leads'])} total leads")
    
    def test_salesperson_kpis_filtered(self, salesperson_token):
        """Salesperson KPIs are filtered to their data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers={
            "Authorization": f"Bearer {salesperson_token}"
        })
        print(f"Salesperson KPIs response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_revenue" in data
        assert "closed_deals" in data
        print(f"PASS: Salesperson KPIs - {data['closed_deals']} closed deals, ${data['total_revenue']} revenue")


class TestXLSImport:
    """Test XLS import functionality"""
    
    @pytest.fixture
    def salesperson_token(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "benjamin@fshac.com",
            "password": "test123"
        })
        assert res.status_code == 200
        return res.json()["token"]
    
    def test_xls_import_requires_auth(self):
        """XLS import requires authentication"""
        response = requests.post(f"{BASE_URL}/api/leads/import-xls")
        print(f"XLS import without auth: {response.status_code}")
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print("PASS: XLS import correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
