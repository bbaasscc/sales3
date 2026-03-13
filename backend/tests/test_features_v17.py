"""
Iteration 17: Testing new features after major refactoring
- Dashboard restructured (Sales Metrics/Power Rankings, no commissions on main screen)
- Follow-ups + Data tabs combined into 'Status' tab for salesperson
- New 'Earnings' tab for commissions/SPIFFs
- Admin tabs: Overview, Salespeople, All Data, Email Ingest
- Quick filters (week, 2weeks, current_year)
- Email ingest config endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

class TestAuthentication:
    """Test login for both salesperson and admin roles"""
    
    def test_salesperson_login(self):
        """Login as salesperson (Benjamin Cardarelli)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "Bcardarelli@fshac.com",
            "password": "Benja123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "salesperson"
        assert data["user"]["name"] == "Benjamin S. Cardarelli"
        print("PASS: Salesperson login successful")
    
    def test_admin_login(self):
        """Login as admin (Benjamin Sanchez)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "Bsanchezcar@gmail.com",
            "password": "Benja123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["name"] == "Benjamin Sanchez"
        print("PASS: Admin login successful")


@pytest.fixture
def salesperson_token():
    """Get salesperson token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "Bcardarelli@fshac.com",
        "password": "Benja123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Salesperson login failed")


@pytest.fixture
def admin_token():
    """Get admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "Bsanchezcar@gmail.com",
        "password": "Benja123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin login failed")


class TestDashboardKPIs:
    """Test dashboard KPIs endpoint - Sales Metrics"""
    
    def test_dashboard_kpis_basic(self, salesperson_token):
        """Test basic KPIs endpoint returns all required fields for Sales Metrics"""
        headers = {"Authorization": f"Bearer {salesperson_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify Sales Metrics fields exist
        required_fields = [
            "closing_rate", "closed_deals", "total_revenue", "total_visits",
            "average_ticket", "credit_reject_count", "gross_closed",
            "cancel_count", "rescheduled_count"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"PASS: KPIs returned with {data['closed_deals']} closed deals")
    
    def test_dashboard_kpis_commission_fields(self, salesperson_token):
        """Test that commission/payment fields exist for Earnings tab"""
        headers = {"Authorization": f"Bearer {salesperson_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify Earnings tab fields
        earnings_fields = [
            "commission_payment_count", "commission_payment_amount", "commission_payment_spiff",
            "total_commission", "avg_commission_percent", "spiff_total", "spiff_breakdown"
        ]
        for field in earnings_fields:
            assert field in data, f"Missing earnings field: {field}"
        print(f"PASS: Earnings fields present - Total commission: ${data.get('total_commission', 0)}")
    
    def test_dashboard_quick_filter_week(self, salesperson_token):
        """Test quick filter: week"""
        headers = {"Authorization": f"Bearer {salesperson_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis?date_filter=week", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "closed_deals" in data
        print(f"PASS: Week filter - {data['closed_deals']} deals")
    
    def test_dashboard_quick_filter_2weeks(self, salesperson_token):
        """Test quick filter: 2weeks"""
        headers = {"Authorization": f"Bearer {salesperson_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis?date_filter=2weeks", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "closed_deals" in data
        print(f"PASS: 2 weeks filter - {data['closed_deals']} deals")
    
    def test_dashboard_quick_filter_current_year(self, salesperson_token):
        """Test quick filter: current_year"""
        headers = {"Authorization": f"Bearer {salesperson_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis?date_filter=current_year", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "closed_deals" in data
        print(f"PASS: Current year filter - {data['closed_deals']} deals")
    
    def test_dashboard_pay_period_filter(self, salesperson_token):
        """Test pay period filter"""
        headers = {"Authorization": f"Bearer {salesperson_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis?pay_period=Jan 08, 2026 - Jan 21, 2026", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "closed_deals" in data
        print(f"PASS: Pay period filter working")


class TestAdminEndpoints:
    """Test admin-specific endpoints"""
    
    def test_admin_comparison(self, admin_token):
        """Test admin comparison endpoint returns consistent totals"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "comparison" in data
        assert "totals" in data
        
        # Verify totals structure
        totals = data["totals"]
        required_totals = ["total_leads", "closed_deals", "total_revenue", "closing_rate", "avg_ticket"]
        for field in required_totals:
            assert field in totals, f"Missing totals field: {field}"
        
        # Verify comparison contains salespeople
        comparison = data["comparison"]
        assert isinstance(comparison, list)
        
        print(f"PASS: Admin comparison - {totals['closed_deals']} total closed deals, {len(comparison)} salespeople")
    
    def test_admin_salespeople_list(self, admin_token):
        """Test admin salespeople endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/salespeople", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "users" in data
        assert isinstance(data["users"], list)
        print(f"PASS: Admin salespeople list - {len(data['users'])} users")
    
    def test_salesperson_cannot_access_admin_comparison(self, salesperson_token):
        """Verify salesperson cannot access admin endpoints"""
        headers = {"Authorization": f"Bearer {salesperson_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        assert response.status_code == 403
        print("PASS: Salesperson correctly blocked from admin endpoints")


class TestEmailIngestConfig:
    """Test email ingest configuration endpoint (Admin only)"""
    
    def test_admin_can_access_email_ingest_config(self, admin_token):
        """Admin can access email ingest config"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/email-ingest/config", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "config" in data
        print("PASS: Admin can access email ingest config")
    
    def test_salesperson_cannot_access_email_ingest(self, salesperson_token):
        """Salesperson cannot access email ingest config"""
        headers = {"Authorization": f"Bearer {salesperson_token}"}
        response = requests.get(f"{BASE_URL}/api/email-ingest/config", headers=headers)
        assert response.status_code == 403
        print("PASS: Salesperson correctly blocked from email ingest")


class TestLeadsEndpoint:
    """Test leads endpoint for Status tab functionality"""
    
    def test_get_leads_salesperson(self, salesperson_token):
        """Salesperson can get their leads"""
        headers = {"Authorization": f"Bearer {salesperson_token}"}
        response = requests.get(f"{BASE_URL}/api/leads", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        assert isinstance(data["leads"], list)
        print(f"PASS: Salesperson leads - {len(data['leads'])} leads")
    
    def test_get_leads_admin(self, admin_token):
        """Admin can get all leads with salesperson_name"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/leads", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        
        # Verify admin sees salesperson_name field
        if len(data["leads"]) > 0:
            first_lead = data["leads"][0]
            assert "salesperson_name" in first_lead, "Admin should see salesperson_name"
        print(f"PASS: Admin leads - {len(data['leads'])} leads with salesperson names")


class TestFollowupActions:
    """Test followup actions for Pipeline view in Status tab"""
    
    def test_get_followup_actions(self, salesperson_token):
        """Get followup actions list"""
        headers = {"Authorization": f"Bearer {salesperson_token}"}
        response = requests.get(f"{BASE_URL}/api/followup/actions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "actions" in data
        print(f"PASS: Followup actions - {len(data.get('actions', []))} actions")


class TestPayPeriods:
    """Test pay periods endpoint"""
    
    def test_get_pay_periods(self):
        """Get all pay periods"""
        response = requests.get(f"{BASE_URL}/api/pay-periods")
        assert response.status_code == 200
        data = response.json()
        assert "pay_periods" in data
        assert len(data["pay_periods"]) > 0
        
        # Verify structure
        first_period = data["pay_periods"][0]
        assert "name" in first_period
        assert "start" in first_period
        assert "end" in first_period
        print(f"PASS: Pay periods - {len(data['pay_periods'])} periods defined")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
