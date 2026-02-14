"""
Comprehensive backend tests for Sales Dashboard - Post Goals Removal
Tests: Auth, Dashboard, Leads CRUD, Admin, Pipeline, Follow-ups
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

@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def salesperson_token(api_client):
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALESPERSON_EMAIL,
        "password": SALESPERSON_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Salesperson login failed - skipping tests")

@pytest.fixture(scope="module")
def admin_token(api_client):
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin login failed - skipping tests")


# ==================== ROOT & HEALTH ====================

class TestRootAPI:
    """Test root API endpoint"""
    
    def test_root_endpoint(self, api_client):
        """API root returns success"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Root API accessible: {data}")


# ==================== AUTHENTICATION ====================

class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_salesperson_login(self, api_client):
        """Salesperson can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALESPERSON_EMAIL,
            "password": SALESPERSON_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "salesperson"
        assert data["user"]["email"].lower() == SALESPERSON_EMAIL.lower()
        print(f"✓ Salesperson login successful: {data['user']['name']}")
    
    def test_admin_login(self, api_client):
        """Admin can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful: {data['user']['name']}")
    
    def test_invalid_login(self, api_client):
        """Invalid credentials return 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")
    
    def test_auth_me_endpoint(self, api_client, salesperson_token):
        """Auth me endpoint returns current user"""
        response = api_client.get(f"{BASE_URL}/api/auth/me", 
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "role" in data
        print(f"✓ Auth me endpoint works: {data['email']}")


# ==================== DASHBOARD KPIs ====================

class TestDashboardKPIs:
    """Test dashboard KPI endpoints"""
    
    def test_dashboard_kpis_salesperson(self, api_client, salesperson_token):
        """Salesperson can get their dashboard KPIs"""
        response = api_client.get(f"{BASE_URL}/api/dashboard/kpis",
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code == 200
        data = response.json()
        # Verify all expected KPI fields exist
        expected_fields = [
            "total_revenue", "total_commission", "closed_deals", "closing_rate",
            "total_visits", "average_ticket", "commission_payment_count",
            "commission_payment_amount", "spiff_total", "spiff_breakdown",
            "follow_ups", "unit_type_count", "records", "pay_periods"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ Dashboard KPIs: Revenue=${data['total_revenue']}, Deals={data['closed_deals']}")
    
    def test_dashboard_kpis_with_pay_period(self, api_client, salesperson_token):
        """Dashboard KPIs filter by pay period"""
        response = api_client.get(f"{BASE_URL}/api/dashboard/kpis",
            params={"pay_period": "Jan 22, 2026 - Feb 04, 2026"},
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["selected_pay_period"] == "Jan 22, 2026 - Feb 04, 2026"
        print(f"✓ Dashboard KPIs with pay period filter works")


# ==================== LEADS CRUD ====================

class TestLeadsCRUD:
    """Test leads CRUD operations"""
    
    def test_get_leads_salesperson(self, api_client, salesperson_token):
        """Salesperson can get their leads"""
        response = api_client.get(f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        assert isinstance(data["leads"], list)
        print(f"✓ Salesperson can get leads: {len(data['leads'])} leads found")
    
    def test_create_lead(self, api_client, salesperson_token):
        """Salesperson can create a new lead"""
        lead_data = {
            "name": "TEST_Create Lead API",
            "address": "123 Test Street",
            "city": "Test City",
            "email": "test_create@example.com",
            "status": "PENDING",
            "ticket_value": 5000,
            "commission_percent": 5.5,
            "visit_date": "2026-01-15"
        }
        response = api_client.post(f"{BASE_URL}/api/leads", json=lead_data,
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "lead" in data
        assert data["lead"]["name"] == "TEST_Create Lead API"
        assert "lead_id" in data["lead"]
        print(f"✓ Lead created: {data['lead']['lead_id']}")
        return data["lead"]["lead_id"]
    
    def test_update_lead(self, api_client, salesperson_token):
        """Salesperson can update a lead"""
        # First create a lead
        create_response = api_client.post(f"{BASE_URL}/api/leads", json={
            "name": "TEST_Update Lead",
            "city": "Chicago",
            "status": "PENDING"
        }, headers={"Authorization": f"Bearer {salesperson_token}"})
        assert create_response.status_code == 200
        lead_id = create_response.json()["lead"]["lead_id"]
        
        # Now update it
        update_response = api_client.put(f"{BASE_URL}/api/leads/{lead_id}", json={
            "status": "SALE",
            "ticket_value": 10000
        }, headers={"Authorization": f"Bearer {salesperson_token}"})
        assert update_response.status_code == 200
        
        # Verify update persisted by getting all leads
        get_response = api_client.get(f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {salesperson_token}"})
        leads = get_response.json()["leads"]
        updated_lead = next((l for l in leads if l["lead_id"] == lead_id), None)
        assert updated_lead is not None
        assert updated_lead["status"] == "SALE"
        assert updated_lead["ticket_value"] == 10000
        print(f"✓ Lead updated successfully: {lead_id}")
        return lead_id
    
    def test_delete_lead(self, api_client, salesperson_token):
        """Salesperson can delete a lead"""
        # First create a lead to delete
        create_response = api_client.post(f"{BASE_URL}/api/leads", json={
            "name": "TEST_Delete Lead"
        }, headers={"Authorization": f"Bearer {salesperson_token}"})
        assert create_response.status_code == 200
        lead_id = create_response.json()["lead"]["lead_id"]
        
        # Now delete it
        delete_response = api_client.delete(f"{BASE_URL}/api/leads/{lead_id}",
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert delete_response.status_code == 200
        
        # Verify deletion - lead should not appear in list
        get_response = api_client.get(f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {salesperson_token}"})
        leads = get_response.json()["leads"]
        deleted_lead = next((l for l in leads if l["lead_id"] == lead_id), None)
        assert deleted_lead is None
        print(f"✓ Lead deleted successfully: {lead_id}")


# ==================== ADMIN ENDPOINTS ====================

class TestAdminEndpoints:
    """Test admin-specific endpoints"""
    
    def test_admin_salespeople_list(self, api_client, admin_token):
        """Admin can get list of salespeople"""
        response = api_client.get(f"{BASE_URL}/api/admin/salespeople",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert isinstance(data["users"], list)
        print(f"✓ Admin salespeople list: {len(data['users'])} users")
    
    def test_admin_comparison(self, api_client, admin_token):
        """Admin can get salesperson comparison data"""
        response = api_client.get(f"{BASE_URL}/api/admin/comparison",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "comparison" in data
        assert "totals" in data
        
        # Verify totals structure
        totals = data["totals"]
        expected_total_fields = [
            "total_leads", "closed_deals", "lost_deals", "total_revenue",
            "total_commission", "closing_rate", "avg_ticket",
            "pm_jobs", "pm_pct", "gp_pct", "equipment_types", "accessories"
        ]
        for field in expected_total_fields:
            assert field in totals, f"Missing totals field: {field}"
        
        # Verify equipment_types structure
        assert isinstance(totals["equipment_types"], dict)
        
        # Verify accessories structure
        assert isinstance(totals["accessories"], dict)
        expected_accessories = ["apco_x", "samsung", "mitsubishi", "surge_protector", "duct_cleaning", "self_gen_mits"]
        for acc in expected_accessories:
            assert acc in totals["accessories"], f"Missing accessory: {acc}"
        
        print(f"✓ Admin comparison: {len(data['comparison'])} salespeople, {totals['total_leads']} total leads")
    
    def test_admin_comparison_with_period(self, api_client, admin_token):
        """Admin comparison filters by pay period"""
        response = api_client.get(f"{BASE_URL}/api/admin/comparison",
            params={"pay_period": "Jan 22, 2026 - Feb 04, 2026"},
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "comparison" in data
        assert "totals" in data
        print("✓ Admin comparison with pay period filter works")
    
    def test_salesperson_cannot_access_admin(self, api_client, salesperson_token):
        """Salesperson cannot access admin endpoints"""
        response = api_client.get(f"{BASE_URL}/api/admin/comparison",
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code == 403
        print("✓ Salesperson correctly blocked from admin endpoints")


# ==================== PIPELINE & FOLLOW-UPS ====================

class TestPipelineFollowups:
    """Test pipeline and follow-up endpoints"""
    
    def test_get_followup_actions(self, api_client, salesperson_token):
        """Can get follow-up actions"""
        response = api_client.get(f"{BASE_URL}/api/followup/actions",
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "actions" in data
        assert isinstance(data["actions"], list)
        print(f"✓ Follow-up actions: {len(data['actions'])} actions found")
    
    def test_record_followup_action(self, api_client, salesperson_token):
        """Can record a follow-up action"""
        action_data = {
            "client_name": "TEST_Pipeline Client",
            "step_id": "d0_email"
        }
        response = api_client.post(f"{BASE_URL}/api/followup/action", json=action_data,
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "action" in data
        print(f"✓ Follow-up action recorded: {action_data['step_id']}")
    
    def test_delete_followup_action(self, api_client, salesperson_token):
        """Can delete a follow-up action"""
        # First create one
        api_client.post(f"{BASE_URL}/api/followup/action", json={
            "client_name": "TEST_Delete Action",
            "step_id": "d0_sms"
        }, headers={"Authorization": f"Bearer {salesperson_token}"})
        
        # Now delete it
        response = api_client.delete(f"{BASE_URL}/api/followup/action",
            params={"client_name": "TEST_Delete Action", "step_id": "d0_sms"},
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code == 200
        print("✓ Follow-up action deleted")


# ==================== CLIENT NOTES ====================

class TestClientNotes:
    """Test client notes endpoints"""
    
    def test_save_client_notes(self, api_client, salesperson_token):
        """Can save client notes"""
        notes_data = {
            "client_name": "TEST_Notes Client",
            "next_follow_up": "2026-02-01",
            "comment": "Test note from API",
            "priority": "high"
        }
        response = api_client.post(f"{BASE_URL}/api/client/notes", json=notes_data,
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code == 200
        print("✓ Client notes saved")
    
    def test_get_client_notes(self, api_client, salesperson_token):
        """Can get client notes"""
        # First save notes
        api_client.post(f"{BASE_URL}/api/client/notes", json={
            "client_name": "TEST_Get Notes",
            "comment": "Test retrieval",
            "priority": "medium"
        }, headers={"Authorization": f"Bearer {salesperson_token}"})
        
        # Now retrieve them
        response = api_client.get(f"{BASE_URL}/api/client/notes",
            params={"client_name": "TEST_Get Notes"},
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["client_name"] == "TEST_Get Notes"
        assert data["comment"] == "Test retrieval"
        print(f"✓ Client notes retrieved: {data['comment']}")
    
    def test_get_all_client_notes(self, api_client, salesperson_token):
        """Can get all client notes"""
        response = api_client.get(f"{BASE_URL}/api/client/all-notes",
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "notes" in data
        assert isinstance(data["notes"], list)
        print(f"✓ All client notes: {len(data['notes'])} notes found")


# ==================== PIPELINE SCHEDULES ====================

class TestPipelineSchedules:
    """Test pipeline schedule endpoints"""
    
    def test_get_pipeline_schedule(self, api_client, salesperson_token):
        """Can get pipeline schedule for client"""
        response = api_client.get(f"{BASE_URL}/api/pipeline/schedule",
            params={"client_name": "TEST_Schedule Client"},
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "client_name" in data
        assert "steps" in data
        print("✓ Pipeline schedule retrieved")
    
    def test_save_pipeline_schedule(self, api_client, salesperson_token):
        """Can save custom pipeline schedule"""
        schedule_data = {
            "client_name": "TEST_Custom Schedule",
            "steps": [
                {"id": "d0_email", "scheduled_date": "2026-02-01", "comment": "Initial email"},
                {"id": "d2_email", "scheduled_date": "2026-02-03", "comment": "Follow up"}
            ]
        }
        response = api_client.post(f"{BASE_URL}/api/pipeline/schedule", json=schedule_data,
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code == 200
        print("✓ Pipeline schedule saved")


# ==================== PAY PERIODS ====================

class TestPayPeriods:
    """Test pay period endpoint"""
    
    def test_get_pay_periods(self, api_client):
        """Can get list of pay periods"""
        response = api_client.get(f"{BASE_URL}/api/pay-periods")
        assert response.status_code == 200
        data = response.json()
        assert "pay_periods" in data
        assert isinstance(data["pay_periods"], list)
        assert len(data["pay_periods"]) > 0
        # Verify each period has required fields
        for period in data["pay_periods"][:3]:
            assert "name" in period
            assert "start" in period
            assert "end" in period
        print(f"✓ Pay periods: {len(data['pay_periods'])} periods available")


# ==================== GOALS ENDPOINTS (SHOULD NOT EXIST) ====================

class TestGoalsRemoved:
    """Verify Goals endpoints have been removed"""
    
    def test_goals_endpoint_not_found(self, api_client, salesperson_token):
        """Goals endpoint should return 404 (removed feature)"""
        response = api_client.get(f"{BASE_URL}/api/goals",
            params={"pay_period": "Jan 22, 2026 - Feb 04, 2026"},
            headers={"Authorization": f"Bearer {salesperson_token}"})
        # Should be 404 or 405 if route doesn't exist
        assert response.status_code in [404, 405, 422], f"Goals endpoint still exists: {response.status_code}"
        print("✓ Goals endpoint correctly removed (returns 404/405)")
    
    def test_goals_comparison_not_found(self, api_client, salesperson_token):
        """Goals comparison endpoint should return 404 (removed feature)"""
        response = api_client.get(f"{BASE_URL}/api/goals/comparison",
            params={"pay_period": "Jan 22, 2026 - Feb 04, 2026"},
            headers={"Authorization": f"Bearer {salesperson_token}"})
        assert response.status_code in [404, 405, 422], f"Goals comparison endpoint still exists: {response.status_code}"
        print("✓ Goals comparison endpoint correctly removed (returns 404/405)")


# ==================== ADMIN LEADS (ALL DATA TAB) ====================

class TestAdminLeads:
    """Test admin access to all leads"""
    
    def test_admin_get_all_leads(self, api_client, admin_token):
        """Admin can get all leads with salesperson names"""
        response = api_client.get(f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        # Check if leads have salesperson_name field (admin view)
        if len(data["leads"]) > 0:
            # Admin should see salesperson_name in leads
            lead = data["leads"][0]
            # salesperson_name may be empty if no salesperson assigned
            assert "salesperson_name" in lead or "salesperson_id" in lead
        print(f"✓ Admin can view all leads: {len(data['leads'])} leads")
    
    def test_admin_filter_by_salesperson(self, api_client, admin_token):
        """Admin can filter leads by salesperson"""
        # First get a salesperson ID
        sp_response = api_client.get(f"{BASE_URL}/api/admin/salespeople",
            headers={"Authorization": f"Bearer {admin_token}"})
        salespeople = sp_response.json()["users"]
        if salespeople:
            sp_id = salespeople[0]["user_id"]
            # Filter leads by salesperson
            response = api_client.get(f"{BASE_URL}/api/leads",
                params={"salesperson_id": sp_id},
                headers={"Authorization": f"Bearer {admin_token}"})
            assert response.status_code == 200
            print(f"✓ Admin can filter leads by salesperson")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
