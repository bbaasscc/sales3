"""
Test suite for Iteration 19: Pipeline filtering and auto-cleanup features
Tests:
- GET /api/dashboard/kpis follow_ups only contains PENDING leads
- PUT /api/leads/{id} auto-clears follow_up_date when status changes from PENDING
- POST /api/pipeline/remove-client removes lead from pipeline without deleting
- General health check endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://sales-mgmt-app-1.preview.emergentagent.com"

# Test credentials
SALESPERSON_EMAIL = "Bcardarelli@fshac.com"
SALESPERSON_PASSWORD = "Benja123"
ADMIN_EMAIL = "Bsanchezcar@gmail.com"
ADMIN_PASSWORD = "Benja123"


@pytest.fixture(scope="module")
def salesperson_token():
    """Get auth token for salesperson."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALESPERSON_EMAIL,
        "password": SALESPERSON_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Login failed: {response.text}")
    return response.json().get("token")


@pytest.fixture(scope="module")
def admin_token():
    """Get auth token for admin."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return response.json().get("token")


@pytest.fixture
def auth_headers(salesperson_token):
    """Get auth headers for salesperson."""
    return {"Authorization": f"Bearer {salesperson_token}", "Content-Type": "application/json"}


@pytest.fixture
def admin_headers(admin_token):
    """Get auth headers for admin."""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestHealthCheck:
    """Basic health check endpoints."""

    def test_api_root_returns_message(self):
        """GET /api/ returns welcome message."""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Sales Dashboard API" in data["message"]


class TestFollowUpsOnlyPendingLeads:
    """Test that follow_ups in KPIs only contain PENDING leads."""

    def test_follow_ups_all_have_pending_status(self, auth_headers):
        """GET /api/dashboard/kpis follow_ups should only contain PENDING status leads."""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        follow_ups = data.get("follow_ups", [])
        # All follow-ups must have PENDING status
        non_pending = [fu for fu in follow_ups if fu.get("status") != "PENDING"]
        
        assert len(non_pending) == 0, f"Found {len(non_pending)} non-PENDING leads in follow_ups: {non_pending[:3]}"
        print(f"✓ All {len(follow_ups)} follow_ups have PENDING status")

    def test_no_non_pending_leads_have_follow_up_date_in_db(self, auth_headers):
        """GET /api/leads should not have any non-PENDING leads with follow_up_date set."""
        response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        leads = data.get("leads", [])
        # Check for non-PENDING leads that still have follow_up_date
        invalid_leads = [
            l for l in leads 
            if l.get("follow_up_date") and l.get("follow_up_date") != "" and l.get("status") != "PENDING"
        ]
        
        assert len(invalid_leads) == 0, f"Found {len(invalid_leads)} non-PENDING leads with follow_up_date: {invalid_leads[:3]}"
        print(f"✓ Database clean: No non-PENDING leads have follow_up_date set")


class TestAutoCleanupOnStatusChange:
    """Test that changing status from PENDING auto-clears follow_up_date."""

    def test_status_change_to_sale_clears_follow_up_date(self, auth_headers):
        """PUT /api/leads/{id} changing PENDING to SALE should clear follow_up_date."""
        # Create a PENDING lead with follow_up_date
        create_response = requests.post(f"{BASE_URL}/api/leads", headers=auth_headers, json={
            "name": "TEST_AUTO_CLEANUP_SALE",
            "status": "PENDING",
            "visit_date": "2026-01-15",
            "follow_up_date": "2026-01-20",
            "city": "TESTCITY"
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        lead_id = create_response.json()["lead"]["lead_id"]
        
        try:
            # Change status to SALE
            update_response = requests.put(f"{BASE_URL}/api/leads/{lead_id}", headers=auth_headers, json={
                "status": "SALE"
            })
            assert update_response.status_code == 200
            
            # Verify follow_up_date was cleared
            leads_response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
            lead = next((l for l in leads_response.json()["leads"] if l["lead_id"] == lead_id), None)
            
            assert lead is not None, "Lead not found after update"
            assert lead["status"] == "SALE", f"Status should be SALE, got {lead['status']}"
            assert lead["follow_up_date"] == "" or lead["follow_up_date"] is None, \
                f"follow_up_date should be cleared, got {lead['follow_up_date']}"
            print(f"✓ Status change PENDING→SALE auto-cleared follow_up_date")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=auth_headers)

    def test_status_change_to_lost_clears_follow_up_date(self, auth_headers):
        """PUT /api/leads/{id} changing PENDING to LOST should clear follow_up_date."""
        # Create a PENDING lead with follow_up_date
        create_response = requests.post(f"{BASE_URL}/api/leads", headers=auth_headers, json={
            "name": "TEST_AUTO_CLEANUP_LOST",
            "status": "PENDING",
            "visit_date": "2026-01-15",
            "follow_up_date": "2026-01-20",
            "city": "TESTCITY"
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        lead_id = create_response.json()["lead"]["lead_id"]
        
        try:
            # Change status to LOST
            update_response = requests.put(f"{BASE_URL}/api/leads/{lead_id}", headers=auth_headers, json={
                "status": "LOST"
            })
            assert update_response.status_code == 200
            
            # Verify follow_up_date was cleared
            leads_response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
            lead = next((l for l in leads_response.json()["leads"] if l["lead_id"] == lead_id), None)
            
            assert lead is not None, "Lead not found after update"
            assert lead["status"] == "LOST", f"Status should be LOST, got {lead['status']}"
            assert lead["follow_up_date"] == "" or lead["follow_up_date"] is None, \
                f"follow_up_date should be cleared, got {lead['follow_up_date']}"
            print(f"✓ Status change PENDING→LOST auto-cleared follow_up_date")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=auth_headers)


class TestRemoveClientFromPipeline:
    """Test POST /api/pipeline/remove-client endpoint."""

    def test_remove_client_clears_follow_up_without_deleting_lead(self, auth_headers):
        """POST /api/pipeline/remove-client removes from pipeline without deleting the lead."""
        # Create a PENDING lead with follow_up_date
        create_response = requests.post(f"{BASE_URL}/api/leads", headers=auth_headers, json={
            "name": "TEST_REMOVE_PIPELINE",
            "status": "PENDING",
            "visit_date": "2026-01-15",
            "follow_up_date": "2026-01-25",
            "city": "TESTCITY"
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        lead_id = create_response.json()["lead"]["lead_id"]
        lead_name = "TEST_REMOVE_PIPELINE"
        
        try:
            # Remove from pipeline
            remove_response = requests.post(f"{BASE_URL}/api/pipeline/remove-client", headers=auth_headers, json={
                "lead_id": lead_id,
                "client_name": lead_name
            })
            assert remove_response.status_code == 200, f"Remove failed: {remove_response.text}"
            assert remove_response.json().get("message") == "Lead removed from pipeline"
            
            # Verify lead still exists but follow_up_date is cleared
            leads_response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
            lead = next((l for l in leads_response.json()["leads"] if l["lead_id"] == lead_id), None)
            
            assert lead is not None, "Lead should still exist after removal from pipeline"
            assert lead["status"] == "PENDING", f"Status should still be PENDING, got {lead['status']}"
            assert lead["follow_up_date"] == "" or lead["follow_up_date"] is None, \
                f"follow_up_date should be cleared, got {lead['follow_up_date']}"
            print(f"✓ Remove from pipeline clears follow_up_date without deleting lead")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=auth_headers)

    def test_remove_client_requires_lead_id_or_client_name(self, auth_headers):
        """POST /api/pipeline/remove-client should handle missing parameters gracefully."""
        # Empty request
        response = requests.post(f"{BASE_URL}/api/pipeline/remove-client", headers=auth_headers, json={})
        assert response.status_code == 200  # Returns message about required params
        assert "required" in response.json().get("message", "").lower()


class TestTasksEndpoint:
    """Test GET /api/tasks endpoint."""

    def test_get_tasks_returns_tasks_list(self, auth_headers):
        """GET /api/tasks returns a list of tasks."""
        response = requests.get(f"{BASE_URL}/api/tasks", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        assert isinstance(data["tasks"], list)
        print(f"✓ GET /api/tasks returns {len(data['tasks'])} tasks")


class TestLeadUpdateWithExtraFields:
    """Test PUT /api/leads with additional_phones, products, sale_accessories."""

    def test_update_lead_with_additional_phones(self, auth_headers):
        """PUT /api/leads/{id} with additional_phones saves correctly."""
        # Create a lead
        create_response = requests.post(f"{BASE_URL}/api/leads", headers=auth_headers, json={
            "name": "TEST_ADDITIONAL_PHONES",
            "status": "PENDING",
            "visit_date": "2026-01-15",
            "city": "TESTCITY"
        })
        assert create_response.status_code == 200
        lead_id = create_response.json()["lead"]["lead_id"]
        
        try:
            # Update with additional_phones
            update_response = requests.put(f"{BASE_URL}/api/leads/{lead_id}", headers=auth_headers, json={
                "additional_phones": [
                    {"label": "Wife", "number": "555-0001"},
                    {"label": "Work", "number": "555-0002"}
                ]
            })
            assert update_response.status_code == 200
            
            # Verify
            leads_response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
            lead = next((l for l in leads_response.json()["leads"] if l["lead_id"] == lead_id), None)
            assert lead is not None
            assert len(lead.get("additional_phones", [])) == 2
            print(f"✓ additional_phones saved correctly")
        finally:
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=auth_headers)


class TestAdminEndpoints:
    """Test admin-specific endpoints."""

    def test_admin_login_returns_admin_role(self):
        """POST /api/auth/login with admin credentials returns admin role."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("user", {}).get("role") == "admin"
        print(f"✓ Admin login successful with role=admin")

    def test_admin_can_view_all_leads(self, admin_headers):
        """GET /api/leads as admin returns all leads (no salesperson filter)."""
        response = requests.get(f"{BASE_URL}/api/leads", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        # Admin sees all leads including salesperson_name field
        if len(data["leads"]) > 0:
            first_lead = data["leads"][0]
            assert "salesperson_name" in first_lead or "salesperson_id" in first_lead
        print(f"✓ Admin can view all {len(data['leads'])} leads")


class TestDashboardKPIStructure:
    """Test that dashboard KPIs have expected structure."""

    def test_kpi_response_has_required_fields(self, auth_headers):
        """GET /api/dashboard/kpis returns expected fields."""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check core fields exist
        required_fields = [
            "total_revenue", "total_commission", "closed_deals", "closing_rate",
            "follow_ups", "status_distribution", "monthly_data"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ KPIs contain all required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
