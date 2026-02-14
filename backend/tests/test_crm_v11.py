"""
CRM Dashboard - Iteration 11 Backend Tests
Tests the new admin/salesperson UI restructure with role-based access
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "bsanchezcar@gmail.com", "password": "Benja123"}
BENJAMIN_CREDS = {"email": "bcardarelli@fshac.com", "password": "Benja123"}
FRANCO_CREDS = {"email": "fbarbagallo@fshac.com", "password": "Franco123"}


class TestAuthentication:
    """Test authentication for all 3 users"""
    
    def test_admin_login(self):
        """Admin login should return admin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "bsanchezcar@gmail.com"
        print(f"✓ Admin login successful: {data['user']['name']}")
    
    def test_benjamin_login(self):
        """Benjamin (salesperson) login should return salesperson role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN_CREDS)
        assert response.status_code == 200, f"Benjamin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "salesperson"
        assert data["user"]["email"] == "bcardarelli@fshac.com"
        print(f"✓ Benjamin login successful: {data['user']['name']}")
    
    def test_franco_login(self):
        """Franco (salesperson) login should return salesperson role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FRANCO_CREDS)
        assert response.status_code == 200, f"Franco login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "salesperson"
        assert data["user"]["email"] == "fbarbagallo@fshac.com"
        print(f"✓ Franco login successful: {data['user']['name']}")
    
    def test_invalid_login(self):
        """Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")


class TestAdminEndpoints:
    """Test admin-only endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        return response.json()["token"]
    
    @pytest.fixture
    def benjamin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN_CREDS)
        return response.json()["token"]
    
    def test_admin_comparison_endpoint(self, admin_token):
        """Admin comparison shows global KPIs and salesperson breakdown"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check totals
        totals = data["totals"]
        assert totals["total_revenue"] == 216906.0, f"Expected $216,906, got {totals['total_revenue']}"
        assert totals["closed_deals"] == 22, f"Expected 22 closed, got {totals['closed_deals']}"
        assert totals["total_leads"] == 53, f"Expected 53 leads, got {totals['total_leads']}"
        assert totals["closing_rate"] == 41.5, f"Expected 41.5% rate, got {totals['closing_rate']}"
        
        # Check Benjamin is #1
        comparison = data["comparison"]
        assert len(comparison) >= 1
        benjamin = next((sp for sp in comparison if "Benjamin" in sp["name"]), None)
        assert benjamin is not None, "Benjamin not found in comparison"
        assert benjamin["total_leads"] == 53
        assert benjamin["closed_deals"] == 22
        assert benjamin["total_revenue"] == 216906.0
        
        print(f"✓ Admin comparison: {len(comparison)} salespeople, totals verified")
    
    def test_admin_salespeople_endpoint(self, admin_token):
        """Admin salespeople endpoint shows user management data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/salespeople", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        users = data["users"]
        assert len(users) >= 2, "Should have at least 2 users"
        
        # Check both salespeople exist
        emails = [u["email"] for u in users]
        assert "bcardarelli@fshac.com" in emails, "Benjamin not in user list"
        assert "fbarbagallo@fshac.com" in emails, "Franco not in user list"
        
        print(f"✓ Admin salespeople: {len(users)} users found")
    
    def test_salesperson_blocked_from_admin_endpoints(self, benjamin_token):
        """Salespeople should get 403 on admin endpoints"""
        headers = {"Authorization": f"Bearer {benjamin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        response = requests.get(f"{BASE_URL}/api/admin/salespeople", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        print("✓ Salesperson correctly blocked from admin endpoints")


class TestDashboardKPIs:
    """Test dashboard KPIs for different user roles"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        return response.json()["token"]
    
    @pytest.fixture
    def benjamin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN_CREDS)
        return response.json()["token"]
    
    @pytest.fixture
    def franco_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FRANCO_CREDS)
        return response.json()["token"]
    
    def test_admin_kpis_global(self, admin_token):
        """Admin without filter sees global KPIs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Admin should see all data
        assert data["total_revenue"] >= 216000, f"Expected ~$216K+ revenue"
        assert data["total_visits"] >= 53, f"Expected 53+ leads"
        print(f"✓ Admin global KPIs: ${data['total_revenue']} revenue, {data['total_visits']} leads")
    
    def test_admin_kpis_filtered_by_salesperson(self, admin_token):
        """Admin can filter KPIs by salesperson_id"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get Benjamin's user_id first
        sp_response = requests.get(f"{BASE_URL}/api/admin/salespeople", headers=headers)
        users = sp_response.json()["users"]
        benjamin = next((u for u in users if u["email"] == "bcardarelli@fshac.com"), None)
        
        if benjamin:
            # Filter by Benjamin
            response = requests.get(
                f"{BASE_URL}/api/dashboard/kpis",
                params={"salesperson_id": benjamin["user_id"]},
                headers=headers
            )
            assert response.status_code == 200
            data = response.json()
            print(f"✓ Admin filtered by Benjamin: ${data['total_revenue']} revenue")
    
    def test_benjamin_kpis_own_data(self, benjamin_token):
        """Benjamin sees his own KPIs"""
        headers = {"Authorization": f"Bearer {benjamin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Benjamin has data
        assert data["total_revenue"] > 0, "Benjamin should have revenue"
        assert data["closed_deals"] > 0, "Benjamin should have closed deals"
        print(f"✓ Benjamin KPIs: ${data['total_revenue']} revenue, {data['closed_deals']} closed")


class TestLeadsEndpoints:
    """Test leads CRUD operations"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        return response.json()["token"]
    
    @pytest.fixture
    def benjamin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN_CREDS)
        return response.json()["token"]
    
    def test_admin_sees_all_leads_with_salesperson_name(self, admin_token):
        """Admin sees all leads with salesperson_name enrichment"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/leads", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        leads = data["leads"]
        assert len(leads) == 53, f"Expected 53 leads, got {len(leads)}"
        
        # Check salesperson_name enrichment for admin
        for lead in leads[:5]:  # Check first 5
            if lead.get("salesperson_id"):
                assert "salesperson_name" in lead, "Admin should see salesperson_name"
        
        print(f"✓ Admin sees {len(leads)} leads with salesperson names")
    
    def test_benjamin_sees_own_leads(self, benjamin_token):
        """Benjamin sees his 53 leads"""
        headers = {"Authorization": f"Bearer {benjamin_token}"}
        response = requests.get(f"{BASE_URL}/api/leads", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        leads = data["leads"]
        assert len(leads) == 53, f"Benjamin should see 53 leads, got {len(leads)}"
        print(f"✓ Benjamin sees {len(leads)} leads")
    
    def test_delete_lead_requires_auth(self):
        """Delete lead without token should fail with 401"""
        response = requests.delete(f"{BASE_URL}/api/leads/fake-lead-id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "Not authenticated" in response.json()["detail"]
        print("✓ Delete lead requires authentication (401 without token)")


class TestFrancoEmptyData:
    """Test Franco sees empty data (0 leads assigned)"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        return response.json()["token"]
    
    def test_admin_comparison_shows_franco_with_zero(self, admin_token):
        """Admin comparison shows Franco with 0 leads, 0 revenue"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        comparison = data["comparison"]
        franco = next((sp for sp in comparison if "Franco" in sp["name"]), None)
        
        assert franco is not None, "Franco not found in comparison"
        assert franco["total_leads"] == 0, f"Franco should have 0 leads, got {franco['total_leads']}"
        assert franco["closed_deals"] == 0, f"Franco should have 0 closed, got {franco['closed_deals']}"
        assert franco["total_revenue"] == 0, f"Franco should have $0 revenue, got {franco['total_revenue']}"
        assert franco["closing_rate"] == 0, f"Franco should have 0% rate, got {franco['closing_rate']}"
        
        print(f"✓ Admin comparison shows Franco with 0 data")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
