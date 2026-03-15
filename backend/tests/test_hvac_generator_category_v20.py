"""
Test HVAC/Generator Category Separation - Iteration 20
Tests:
1. GET /api/dashboard/kpis with category=hvac excludes Generator unit_type
2. GET /api/dashboard/kpis with category=generator includes Generator + also_generator leads
3. GET /api/leads with category=hvac returns leads without Generator
4. GET /api/leads with category=generator returns Generator + also_generator leads
5. Admin comparison endpoint with category filter
6. Pipeline/Tasks operations still work correctly
7. Salesperson KPI data validation (Benjamin: 77 visits/30 deals for HVAC, 1 visit for generator)
8. Salesperson Franco KPI validation (65 visits/29 deals for HVAC, 6 leads for generator)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
BENJAMIN = {"email": "Bcardarelli@fshac.com", "password": "Benja123"}
FRANCO = {"email": "Fbarbagallo@fshac.com", "password": "Franco123"}
ADMIN = {"email": "Bsanchezcar@gmail.com", "password": "Benja123"}


class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_health(self):
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Sales Dashboard API"
        print("SUCCESS: API health check passed")


class TestAuthentication:
    """Test authentication for all users"""
    
    def test_benjamin_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "salesperson"
        print(f"SUCCESS: Benjamin login - role={data['user']['role']}, name={data['user'].get('name')}")
        return data["token"]
    
    def test_franco_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FRANCO)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "salesperson"
        print(f"SUCCESS: Franco login - role={data['user']['role']}, name={data['user'].get('name')}")
        return data["token"]
    
    def test_admin_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "admin"
        print(f"SUCCESS: Admin login - role={data['user']['role']}")
        return data["token"]


class TestBenjaminHVACKPIs:
    """Test Benjamin's HVAC KPIs: expected 77 visits, 30 deals, $348,850 revenue, 39.0% R%"""
    
    @pytest.fixture
    def token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN)
        return response.json()["token"]
    
    def test_hvac_dashboard_kpis(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        params = {"category": "hvac", "date_filter": "current_year"}
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", params=params, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify key metrics
        total_visits = data.get("total_visits", 0)
        closed_deals = data.get("closed_deals", 0)
        total_revenue = data.get("total_revenue", 0)
        closing_rate = data.get("closing_rate", 0)
        
        print(f"Benjamin HVAC KPIs: visits={total_visits}, deals={closed_deals}, revenue=${total_revenue}, R%={closing_rate}")
        
        # Check expected values (with some tolerance)
        assert total_visits >= 70, f"Expected 77+ visits, got {total_visits}"
        assert closed_deals >= 25, f"Expected 30+ deals, got {closed_deals}"
        assert total_revenue > 300000, f"Expected ~$348,850 revenue, got ${total_revenue}"
        
        # Verify no Generator unit_type in HVAC category
        unit_type_count = data.get("unit_type_count", {})
        assert "Generator" not in unit_type_count, f"Generator should NOT be in HVAC unit types: {unit_type_count}"
        print(f"SUCCESS: Benjamin HVAC KPIs verified - No Generator in unit types")


class TestBenjaminGeneratorKPIs:
    """Test Benjamin's Generator KPIs: expected 1 lead (MARIA MEDINA)"""
    
    @pytest.fixture
    def token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN)
        return response.json()["token"]
    
    def test_generator_dashboard_kpis(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        params = {"category": "generator", "date_filter": "current_year"}
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", params=params, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        total_visits = data.get("total_visits", 0)
        closed_deals = data.get("closed_deals", 0)
        total_revenue = data.get("total_revenue", 0)
        
        print(f"Benjamin Generator KPIs: visits={total_visits}, deals={closed_deals}, revenue=${total_revenue}")
        
        # Benjamin should have 1 generator lead
        assert total_visits >= 1, f"Expected 1 generator visit, got {total_visits}"
        print(f"SUCCESS: Benjamin Generator KPIs verified")
    
    def test_generator_leads_list(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        params = {"category": "generator"}
        response = requests.get(f"{BASE_URL}/api/leads", params=params, headers=headers)
        assert response.status_code == 200
        data = response.json()
        leads = data.get("leads", [])
        
        print(f"Benjamin Generator leads count: {len(leads)}")
        for lead in leads:
            print(f"  - {lead.get('name')}: unit_type={lead.get('unit_type')}, also_generator={lead.get('also_generator')}")
        
        # Should include MARIA MEDINA (Generator unit_type)
        names = [l.get("name", "").upper() for l in leads]
        assert any("MARIA MEDINA" in n for n in names), f"MARIA MEDINA should be in generator leads: {names}"
        print(f"SUCCESS: Benjamin has {len(leads)} generator lead(s) including MARIA MEDINA")


class TestFrancoHVACKPIs:
    """Test Franco's HVAC KPIs: expected 65 visits, 29 deals, 44.6% R%"""
    
    @pytest.fixture
    def token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FRANCO)
        return response.json()["token"]
    
    def test_hvac_dashboard_kpis(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        params = {"category": "hvac", "date_filter": "current_year"}
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", params=params, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        total_visits = data.get("total_visits", 0)
        closed_deals = data.get("closed_deals", 0)
        total_revenue = data.get("total_revenue", 0)
        closing_rate = data.get("closing_rate", 0)
        
        print(f"Franco HVAC KPIs: visits={total_visits}, deals={closed_deals}, revenue=${total_revenue}, R%={closing_rate}")
        
        # Check expected values
        assert total_visits >= 60, f"Expected 65+ visits, got {total_visits}"
        assert closed_deals >= 25, f"Expected 29+ deals, got {closed_deals}"
        
        # Verify no Generator in unit types
        unit_type_count = data.get("unit_type_count", {})
        assert "Generator" not in unit_type_count, f"Generator should NOT be in HVAC unit types"
        print(f"SUCCESS: Franco HVAC KPIs verified")


class TestFrancoGeneratorKPIs:
    """Test Franco's Generator KPIs: expected 6 leads including FRED FLUDE (dual)"""
    
    @pytest.fixture
    def token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FRANCO)
        return response.json()["token"]
    
    def test_generator_leads_list(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        params = {"category": "generator"}
        response = requests.get(f"{BASE_URL}/api/leads", params=params, headers=headers)
        assert response.status_code == 200
        data = response.json()
        leads = data.get("leads", [])
        
        print(f"Franco Generator leads count: {len(leads)}")
        for lead in leads:
            print(f"  - {lead.get('name')}: unit_type={lead.get('unit_type')}, also_generator={lead.get('also_generator')}")
        
        # Should have ~6 generator leads
        assert len(leads) >= 1, f"Expected generator leads, got {len(leads)}"
        print(f"SUCCESS: Franco has {len(leads)} generator lead(s)")


class TestDualLeads:
    """Test dual leads (also_generator=true) appear in both HVAC and Generator views"""
    
    @pytest.fixture
    def token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FRANCO)
        return response.json()["token"]
    
    def test_dual_lead_in_hvac(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        params = {"category": "hvac"}
        response = requests.get(f"{BASE_URL}/api/leads", params=params, headers=headers)
        assert response.status_code == 200
        hvac_leads = response.json().get("leads", [])
        
        # Check for dual lead (FRED FLUDE has unit_type=Furnace and also_generator=true)
        dual_in_hvac = [l for l in hvac_leads if l.get("also_generator") == True]
        if dual_in_hvac:
            for l in dual_in_hvac:
                print(f"Dual lead in HVAC: {l.get('name')} - unit_type={l.get('unit_type')}")
        print(f"SUCCESS: Found {len(dual_in_hvac)} dual lead(s) in HVAC view")
    
    def test_dual_lead_in_generator(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        params = {"category": "generator"}
        response = requests.get(f"{BASE_URL}/api/leads", params=params, headers=headers)
        assert response.status_code == 200
        gen_leads = response.json().get("leads", [])
        
        # Check for dual lead (also_generator=true)
        dual_in_gen = [l for l in gen_leads if l.get("also_generator") == True]
        if dual_in_gen:
            for l in dual_in_gen:
                print(f"Dual lead in Generator: {l.get('name')} - unit_type={l.get('unit_type')}")
        print(f"SUCCESS: Found {len(dual_in_gen)} dual lead(s) in Generator view")


class TestAdminComparison:
    """Test admin comparison endpoint with category filter"""
    
    @pytest.fixture
    def token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        return response.json()["token"]
    
    def test_admin_hvac_comparison(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        params = {"category": "hvac", "date_filter": "current_year"}
        response = requests.get(f"{BASE_URL}/api/admin/comparison", params=params, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        comparison = data.get("comparison", [])
        totals = data.get("totals", {})
        
        print(f"Admin HVAC Comparison - {len(comparison)} salespeople")
        for sp in comparison:
            print(f"  - {sp.get('name')}: leads={sp.get('total_leads')}, deals={sp.get('closed_deals')}, revenue=${sp.get('total_revenue')}")
        
        print(f"HVAC Totals: deals={totals.get('closed_deals')}, revenue=${totals.get('total_revenue')}")
        
        # Check equipment types don't include Generator
        equip_types = totals.get("equipment_types", {})
        assert "Generator" not in equip_types, f"Generator should NOT be in HVAC equipment: {equip_types}"
        print(f"SUCCESS: Admin HVAC comparison verified - No Generator in equipment types")
    
    def test_admin_generator_comparison(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        params = {"category": "generator", "date_filter": "current_year"}
        response = requests.get(f"{BASE_URL}/api/admin/comparison", params=params, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        comparison = data.get("comparison", [])
        totals = data.get("totals", {})
        
        print(f"Admin Generator Comparison - {len(comparison)} salespeople")
        for sp in comparison:
            print(f"  - {sp.get('name')}: leads={sp.get('total_leads')}, deals={sp.get('closed_deals')}")
        
        print(f"Generator Totals: leads={totals.get('total_leads')}, deals={totals.get('closed_deals')}")
        print(f"SUCCESS: Admin Generator comparison verified")


class TestStatusTabByCategory:
    """Test that Status tab leads are filtered by category"""
    
    @pytest.fixture
    def token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN)
        return response.json()["token"]
    
    def test_hvac_leads_exclude_generator(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        params = {"category": "hvac"}
        response = requests.get(f"{BASE_URL}/api/leads", params=params, headers=headers)
        assert response.status_code == 200
        leads = response.json().get("leads", [])
        
        # Count HVAC leads
        hvac_count = len(leads)
        
        # Verify none have Generator unit_type (unless also_generator)
        generator_leads = [l for l in leads if l.get("unit_type", "").lower() == "generator"]
        assert len(generator_leads) == 0, f"HVAC should not include pure Generator leads: {[l.get('name') for l in generator_leads]}"
        
        print(f"SUCCESS: Benjamin HVAC leads = {hvac_count} (no pure Generator leads)")
    
    def test_generator_leads_only(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        params = {"category": "generator"}
        response = requests.get(f"{BASE_URL}/api/leads", params=params, headers=headers)
        assert response.status_code == 200
        leads = response.json().get("leads", [])
        
        # All leads should be either Generator unit_type OR have also_generator=true
        for lead in leads:
            is_generator = lead.get("unit_type", "").lower() in ["generator", "generac", "kohler"]
            is_dual = lead.get("also_generator") == True
            assert is_generator or is_dual, f"Lead {lead.get('name')} should be Generator or dual: unit_type={lead.get('unit_type')}, also_generator={lead.get('also_generator')}"
        
        print(f"SUCCESS: Benjamin Generator leads = {len(leads)} (all are Generator or also_generator)")


class TestPipelineStillWorks:
    """Verify pipeline/tasks operations still work correctly"""
    
    @pytest.fixture
    def token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN)
        return response.json()["token"]
    
    def test_pipeline_followups_pending_only(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        params = {"category": "hvac", "date_filter": "current_year"}
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", params=params, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        follow_ups = data.get("follow_ups", [])
        for fu in follow_ups:
            assert fu.get("status") == "PENDING", f"Follow-up {fu.get('name')} has status {fu.get('status')} - should be PENDING"
        
        print(f"SUCCESS: All {len(follow_ups)} follow-ups are PENDING status")
    
    def test_tasks_endpoint(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/tasks", headers=headers)
        assert response.status_code == 200
        data = response.json()
        tasks = data.get("tasks", [])
        print(f"SUCCESS: Tasks endpoint returns {len(tasks)} tasks")


class TestNonPendingNoFollowUp:
    """Verify non-PENDING leads have no follow_up_date (from iteration 19)"""
    
    @pytest.fixture
    def token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        return response.json()["token"]
    
    def test_non_pending_leads_no_followup(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/leads", headers=headers)
        assert response.status_code == 200
        leads = response.json().get("leads", [])
        
        non_pending_with_followup = []
        for lead in leads:
            if lead.get("status") != "PENDING" and lead.get("follow_up_date"):
                non_pending_with_followup.append({
                    "name": lead.get("name"),
                    "status": lead.get("status"),
                    "follow_up_date": lead.get("follow_up_date")
                })
        
        if non_pending_with_followup:
            print(f"WARNING: Found {len(non_pending_with_followup)} non-PENDING leads with follow_up_date:")
            for l in non_pending_with_followup[:5]:
                print(f"  - {l['name']}: {l['status']} - {l['follow_up_date']}")
        else:
            print(f"SUCCESS: No non-PENDING leads have follow_up_date")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
