"""
Tests for the new Goals & Period Comparison feature
- POST /api/goals - Save a salesperson's goal for a pay period
- GET /api/goals - Get goal for a specific pay period
- GET /api/goals/comparison - Get current vs previous period KPIs + goal
- Also tests backend refactoring (routers working properly)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SALESPERSON_EMAIL = "Bcardarelli@fshac.com"
SALESPERSON_PASSWORD = "Benja123"
ADMIN_EMAIL = "Bsanchezcar@gmail.com"
ADMIN_PASSWORD = "Benja123"

# Pay period for testing
TEST_PAY_PERIOD = "Feb 05, 2026 - Feb 18, 2026"
PREV_PAY_PERIOD = "Jan 22, 2026 - Feb 04, 2026"


@pytest.fixture(scope="module")
def salesperson_token():
    """Get authentication token for salesperson"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALESPERSON_EMAIL,
        "password": SALESPERSON_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get authentication token for admin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture
def salesperson_headers(salesperson_token):
    return {"Authorization": f"Bearer {salesperson_token}", "Content-Type": "application/json"}


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestBackendRefactoring:
    """Test that backend routers work after refactoring from monolithic server.py"""
    
    def test_root_api(self):
        """Test root API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        assert "message" in response.json()
    
    def test_auth_routes_working(self, salesperson_headers):
        """Test auth routes (auth_routes.py) work"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=salesperson_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"].lower() == SALESPERSON_EMAIL.lower()
        assert data["role"] == "salesperson"
    
    def test_admin_routes_working(self, admin_headers):
        """Test admin routes (admin.py) work"""
        response = requests.get(f"{BASE_URL}/api/admin/salespeople", headers=admin_headers)
        assert response.status_code == 200
        assert "users" in response.json()
    
    def test_pipeline_routes_working(self, salesperson_headers):
        """Test pipeline routes (pipeline.py) work"""
        response = requests.get(f"{BASE_URL}/api/followup/actions", headers=salesperson_headers)
        assert response.status_code == 200
        assert "actions" in response.json()
    
    def test_dashboard_kpis_working(self, salesperson_headers):
        """Test dashboard KPIs from server.py work"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", 
                               params={"pay_period": TEST_PAY_PERIOD},
                               headers=salesperson_headers)
        assert response.status_code == 200
        data = response.json()
        # Check key KPI fields are present
        assert "total_revenue" in data
        assert "closed_deals" in data
        assert "total_commission" in data


class TestGoalsEndpoints:
    """Test Goals CRUD endpoints (goals.py)"""
    
    def test_save_goal(self, salesperson_headers):
        """POST /api/goals - Save a new goal"""
        goal_data = {
            "pay_period": TEST_PAY_PERIOD,
            "revenue_goal": 60000,
            "deals_goal": 12,
            "commission_goal": 6000
        }
        response = requests.post(f"{BASE_URL}/api/goals", 
                                json=goal_data, 
                                headers=salesperson_headers)
        assert response.status_code == 200
        assert response.json()["message"] == "Goal saved"
    
    def test_get_goal(self, salesperson_headers):
        """GET /api/goals - Retrieve saved goal"""
        response = requests.get(f"{BASE_URL}/api/goals",
                               params={"pay_period": TEST_PAY_PERIOD},
                               headers=salesperson_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["pay_period"] == TEST_PAY_PERIOD
        assert data["revenue_goal"] == 60000
        assert data["deals_goal"] == 12
        assert data["commission_goal"] == 6000
    
    def test_get_goal_no_goal_set(self, salesperson_headers):
        """GET /api/goals - Returns defaults when no goal is set"""
        # Use a period that likely has no goal
        response = requests.get(f"{BASE_URL}/api/goals",
                               params={"pay_period": "Dec 10, 2026 - Dec 23, 2026"},
                               headers=salesperson_headers)
        assert response.status_code == 200
        data = response.json()
        # Should return defaults
        assert data["revenue_goal"] == 0
        assert data["deals_goal"] == 0
        assert data["commission_goal"] == 0
    
    def test_update_goal(self, salesperson_headers):
        """POST /api/goals - Update existing goal (upsert)"""
        updated_goal = {
            "pay_period": TEST_PAY_PERIOD,
            "revenue_goal": 75000,
            "deals_goal": 15,
            "commission_goal": 7500
        }
        response = requests.post(f"{BASE_URL}/api/goals",
                                json=updated_goal,
                                headers=salesperson_headers)
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/goals",
                                   params={"pay_period": TEST_PAY_PERIOD},
                                   headers=salesperson_headers)
        data = get_response.json()
        assert data["revenue_goal"] == 75000
        assert data["deals_goal"] == 15
        assert data["commission_goal"] == 7500


class TestGoalsComparison:
    """Test Period Comparison endpoint"""
    
    def test_comparison_endpoint_structure(self, salesperson_headers):
        """GET /api/goals/comparison - Returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/goals/comparison",
                               params={"pay_period": TEST_PAY_PERIOD},
                               headers=salesperson_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert "current" in data
        assert "previous" in data
        assert "goal" in data
    
    def test_comparison_current_kpis(self, salesperson_headers):
        """Current period KPIs have all required fields"""
        response = requests.get(f"{BASE_URL}/api/goals/comparison",
                               params={"pay_period": TEST_PAY_PERIOD},
                               headers=salesperson_headers)
        data = response.json()
        current = data["current"]
        
        # Required KPI fields
        required_fields = ["total_leads", "closed_deals", "total_revenue", 
                          "total_commission", "closing_rate", "avg_ticket", "period_name"]
        for field in required_fields:
            assert field in current, f"Missing field: {field}"
        
        # Period name should match
        assert current["period_name"] == TEST_PAY_PERIOD
    
    def test_comparison_previous_period(self, salesperson_headers):
        """Previous period data is returned when available"""
        response = requests.get(f"{BASE_URL}/api/goals/comparison",
                               params={"pay_period": TEST_PAY_PERIOD},
                               headers=salesperson_headers)
        data = response.json()
        
        # Previous should be the period before TEST_PAY_PERIOD
        if data["previous"] is not None:
            assert "period_name" in data["previous"]
            assert data["previous"]["period_name"] == PREV_PAY_PERIOD
            assert "total_leads" in data["previous"]
            assert "closed_deals" in data["previous"]
    
    def test_comparison_goal_data(self, salesperson_headers):
        """Goal data is included in comparison response"""
        response = requests.get(f"{BASE_URL}/api/goals/comparison",
                               params={"pay_period": TEST_PAY_PERIOD},
                               headers=salesperson_headers)
        data = response.json()
        goal = data["goal"]
        
        assert "revenue_goal" in goal
        assert "deals_goal" in goal
        assert "commission_goal" in goal
    
    def test_comparison_invalid_period(self, salesperson_headers):
        """Invalid pay period returns 400 error"""
        response = requests.get(f"{BASE_URL}/api/goals/comparison",
                               params={"pay_period": "Invalid Period"},
                               headers=salesperson_headers)
        assert response.status_code == 400
    
    def test_comparison_first_period_no_previous(self, salesperson_headers):
        """First pay period has no previous period"""
        first_period = "Dec 25, 2025 - Jan 07, 2026"
        response = requests.get(f"{BASE_URL}/api/goals/comparison",
                               params={"pay_period": first_period},
                               headers=salesperson_headers)
        assert response.status_code == 200
        data = response.json()
        # Previous should be None for first period
        assert data["previous"] is None


class TestRoleBasedAccess:
    """Test role-based access for salesperson vs admin"""
    
    def test_salesperson_login_role(self, salesperson_headers):
        """Salesperson has correct role"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=salesperson_headers)
        assert response.json()["role"] == "salesperson"
    
    def test_admin_login_role(self, admin_headers):
        """Admin has correct role"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert response.json()["role"] == "admin"
    
    def test_admin_cannot_set_goals_for_self(self, admin_headers):
        """Goals are salesperson-specific - admin can set their own if they have goals"""
        # This should work - admin can set their own goals
        response = requests.post(f"{BASE_URL}/api/goals",
                                json={"pay_period": TEST_PAY_PERIOD, 
                                      "revenue_goal": 100000, 
                                      "deals_goal": 20, 
                                      "commission_goal": 10000},
                                headers=admin_headers)
        # Should succeed - any authenticated user can set their own goals
        assert response.status_code == 200
    
    def test_salesperson_cannot_access_admin_comparison(self, salesperson_headers):
        """Salesperson cannot access /admin/comparison"""
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=salesperson_headers)
        assert response.status_code == 403


class TestDataPersistence:
    """Test that goal data persists correctly"""
    
    def test_goal_persistence_across_requests(self, salesperson_headers):
        """Goal data persists between requests"""
        # Set a specific goal
        test_goal = {
            "pay_period": "Mar 05, 2026 - Mar 18, 2026",
            "revenue_goal": 55555,
            "deals_goal": 11,
            "commission_goal": 5555
        }
        requests.post(f"{BASE_URL}/api/goals", json=test_goal, headers=salesperson_headers)
        
        # Retrieve and verify
        response = requests.get(f"{BASE_URL}/api/goals",
                               params={"pay_period": test_goal["pay_period"]},
                               headers=salesperson_headers)
        data = response.json()
        assert data["revenue_goal"] == 55555
        assert data["deals_goal"] == 11
        assert data["commission_goal"] == 5555
    
    def test_goal_in_comparison_matches_saved_goal(self, salesperson_headers):
        """Goal returned in comparison matches separately saved goal"""
        # Get goal directly
        goal_response = requests.get(f"{BASE_URL}/api/goals",
                                    params={"pay_period": TEST_PAY_PERIOD},
                                    headers=salesperson_headers)
        saved_goal = goal_response.json()
        
        # Get goal from comparison
        comparison_response = requests.get(f"{BASE_URL}/api/goals/comparison",
                                          params={"pay_period": TEST_PAY_PERIOD},
                                          headers=salesperson_headers)
        comparison_goal = comparison_response.json()["goal"]
        
        assert saved_goal["revenue_goal"] == comparison_goal["revenue_goal"]
        assert saved_goal["deals_goal"] == comparison_goal["deals_goal"]
        assert saved_goal["commission_goal"] == comparison_goal["commission_goal"]
