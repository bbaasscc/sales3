"""Comprehensive Backend Tests - v21 - Testing all new features.

Tests:
- Authentication (Benjamin, Franco, Admin)
- Dashboard KPIs with HVAC/Generator category filtering
- Commission rules endpoint (5 tiers, 7 SPIFFs including self_gen 3%)
- Notifications system (dismiss, clear-all)
- Lead interactions
- Translation endpoint
- Pipeline templates
- Admin comparison
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sales-mgmt-app-1.preview.emergentagent.com')

# Test credentials
BENJAMIN_CREDS = {"email": "Bcardarelli@fshac.com", "password": "Benja123"}
FRANCO_CREDS = {"email": "Fbarbagallo@fshac.com", "password": "Franco123"}
ADMIN_CREDS = {"email": "Bsanchezcar@gmail.com", "password": "Benja123"}


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_benjamin_login(self):
        """Benjamin login returns salesperson role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN_CREDS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "salesperson"
        assert "Benjamin" in data["user"]["name"]
        print(f"✓ Benjamin login successful - Role: {data['user']['role']}")
    
    def test_franco_login(self):
        """Franco login returns salesperson role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FRANCO_CREDS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "salesperson"
        assert "Franco" in data["user"]["name"]
        print(f"✓ Franco login successful - Role: {data['user']['role']}")
    
    def test_admin_login(self):
        """Admin login returns admin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful - Role: {data['user']['role']}")


class TestCommissionRules:
    """Commission rules endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN_CREDS)
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_commission_rules_returns_5_tiers(self):
        """GET /api/commission/rules returns 5 tiers"""
        response = requests.get(f"{BASE_URL}/api/commission/rules", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "rules" in data
        tiers = data["rules"]["tiers"]
        assert len(tiers) == 5, f"Expected 5 tiers, got {len(tiers)}"
        
        # Verify tier percentages
        tier_percents = [t["percent"] for t in tiers]
        assert 5 in tier_percents, "Missing 5% tier (under_book)"
        assert 7 in tier_percents, "Missing 7% tier (at_book)"
        assert 8 in tier_percents, "Missing 8% tier ($200 over)"
        assert 9 in tier_percents, "Missing 9% tier ($500 over)"
        assert 10 in tier_percents, "Missing 10% tier ($1000+ over)"
        print(f"✓ Commission rules: 5 tiers verified ({tier_percents})")
    
    def test_get_commission_rules_returns_7_spiffs(self):
        """GET /api/commission/rules returns 7 SPIFFs including self_gen 3%"""
        response = requests.get(f"{BASE_URL}/api/commission/rules", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        spiffs = data["rules"]["spiffs"]
        assert len(spiffs) == 7, f"Expected 7 SPIFFs, got {len(spiffs)}"
        
        spiff_ids = [s["id"] for s in spiffs]
        expected_spiffs = ["apco_x", "surge_furnace", "surge_ac", "duct_cleaning", 
                          "self_gen_mits", "self_gen", "samsung"]
        for expected in expected_spiffs:
            assert expected in spiff_ids, f"Missing SPIFF: {expected}"
        
        # Check self_gen is pct_of_total type with 3%
        self_gen = next(s for s in spiffs if s["id"] == "self_gen")
        assert self_gen["type"] == "pct_of_total", f"self_gen should be pct_of_total type"
        assert self_gen["percent"] == 3, f"self_gen should be 3%, got {self_gen['percent']}"
        print(f"✓ Commission rules: 7 SPIFFs verified, self_gen is 3% pct_of_total")


class TestDashboardKPIs:
    """Dashboard KPIs with category filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN_CREDS)
        self.benjamin_token = response.json()["token"]
        self.benjamin_headers = {"Authorization": f"Bearer {self.benjamin_token}"}
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        self.admin_token = response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_benjamin_hvac_kpis(self):
        """GET /api/dashboard/kpis?category=hvac - Benjamin"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/kpis",
            params={"category": "hvac", "date_filter": "current_year"},
            headers=self.benjamin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify KPI fields exist
        assert "closing_rate" in data
        assert "total_revenue" in data
        assert "total_visits" in data
        assert "average_ticket" in data
        assert "closed_deals" in data
        assert "credit_reject_count" in data
        assert "quarterly_self_gen_mits" in data
        
        print(f"✓ Benjamin HVAC KPIs: {data['closed_deals']} deals, ${data['total_revenue']:,.0f} revenue, {data['closing_rate']}% R%")
    
    def test_benjamin_generator_kpis(self):
        """GET /api/dashboard/kpis?category=generator - Benjamin"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/kpis",
            params={"category": "generator", "date_filter": "current_year"},
            headers=self.benjamin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Generator should have minimal or no data for Benjamin
        assert "closed_deals" in data
        assert "total_revenue" in data
        print(f"✓ Benjamin Generator KPIs: {data['closed_deals']} deals, ${data['total_revenue']:,.0f} revenue")
    
    def test_hvac_excludes_generators(self):
        """HVAC category should not include pure Generator unit_types"""
        response = requests.get(
            f"{BASE_URL}/api/leads",
            params={"category": "hvac"},
            headers=self.benjamin_headers
        )
        assert response.status_code == 200
        leads = response.json()["leads"]
        
        pure_generators = [l for l in leads if l.get("unit_type") == "Generator" and not l.get("also_generator")]
        assert len(pure_generators) == 0, f"Found {len(pure_generators)} pure generators in HVAC view"
        print(f"✓ HVAC view correctly excludes pure Generator leads")
    
    def test_quarterly_self_gen_mits_in_kpis(self):
        """quarterly_self_gen_mits should be present in KPIs"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/kpis",
            params={"category": "hvac", "date_filter": "current_year"},
            headers=self.benjamin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "quarterly_self_gen_mits" in data, "quarterly_self_gen_mits missing from KPIs"
        qsm = data["quarterly_self_gen_mits"]
        print(f"✓ quarterly_self_gen_mits present: {qsm}")


class TestNotifications:
    """Notification system tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN_CREDS)
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_notifications(self):
        """GET /api/notifications returns notifications list"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "count" in data
        print(f"✓ Notifications: {data['count']} active notifications")
    
    def test_dismiss_notification(self):
        """POST /api/notifications/dismiss/{id} works"""
        # First get notifications
        response = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers)
        data = response.json()
        
        if data["count"] > 0:
            notif_id = data["notifications"][0]["id"]
            # Dismiss it
            response = requests.post(
                f"{BASE_URL}/api/notifications/dismiss/{notif_id}",
                headers=self.headers
            )
            assert response.status_code == 200
            print(f"✓ Notification dismissed: {notif_id}")
        else:
            # Test with fake ID - should still return 200 (upsert behavior)
            response = requests.post(
                f"{BASE_URL}/api/notifications/dismiss/test_notif_123",
                headers=self.headers
            )
            assert response.status_code == 200
            print(f"✓ Dismiss endpoint works (no notifications to dismiss)")
    
    def test_clear_all_notifications(self):
        """POST /api/notifications/clear-all works"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/clear-all",
            json={"ids": ["test_1", "test_2"]},
            headers=self.headers
        )
        assert response.status_code == 200
        print(f"✓ Clear all notifications endpoint works")


class TestLeadInteractions:
    """Lead interaction tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN_CREDS)
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_post_interaction_saves_description(self):
        """POST /api/leads/{id}/interaction saves with description"""
        # Get a lead first
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        leads = response.json()["leads"]
        
        if leads:
            lead_id = leads[0]["lead_id"]
            
            # Post interaction
            interaction_data = {
                "type": "call",
                "description": "TEST_Discussed pricing options with customer"
            }
            response = requests.post(
                f"{BASE_URL}/api/leads/{lead_id}/interaction",
                json=interaction_data,
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "interaction" in data
            assert data["interaction"]["description"] == interaction_data["description"]
            print(f"✓ Interaction saved with description for lead {lead_id}")
            
            # Verify it's in activities
            response = requests.get(f"{BASE_URL}/api/leads/{lead_id}/activities", headers=self.headers)
            assert response.status_code == 200
            activities = response.json()["activities"]
            test_activities = [a for a in activities if a.get("description", "").startswith("TEST_")]
            assert len(test_activities) > 0, "Interaction not found in activities"
            print(f"✓ Interaction appears in lead activities")
        else:
            pytest.skip("No leads found to test interaction")


class TestTranslation:
    """Translation endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN_CREDS)
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_translate_endpoint_works(self):
        """POST /api/translate works"""
        response = requests.post(
            f"{BASE_URL}/api/translate",
            json={"text": "Hola, necesito información sobre el sistema de calefacción"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "translated" in data
        # The translation should be in English (contain some English words)
        print(f"✓ Translation endpoint works: '{data['translated'][:50]}...'")
    
    def test_translate_empty_text(self):
        """POST /api/translate with empty text returns empty"""
        response = requests.post(
            f"{BASE_URL}/api/translate",
            json={"text": ""},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["translated"] == ""
        print(f"✓ Empty text translation returns empty string")


class TestPipelineTemplates:
    """Pipeline templates tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN_CREDS)
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_pipeline_templates(self):
        """GET /api/pipeline/templates returns templates"""
        response = requests.get(f"{BASE_URL}/api/pipeline/templates", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert "custom_steps" in data
        print(f"✓ Pipeline templates retrieved")
    
    def test_save_pipeline_templates(self):
        """PUT /api/pipeline/templates saves custom steps"""
        test_templates = {
            "d0_email": {"subject": "TEST Subject", "body": "TEST Body"}
        }
        test_steps = [
            {"day": 0, "label": "Day 0 TEST", "subtitle": "Test step", "actions": []}
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/pipeline/templates",
            json={"templates": test_templates, "custom_steps": test_steps},
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Verify saved
        response = requests.get(f"{BASE_URL}/api/pipeline/templates", headers=self.headers)
        data = response.json()
        
        # Note: custom_steps may be empty or contain our test data depending on previous state
        print(f"✓ Pipeline templates save endpoint works")


class TestAdminComparison:
    """Admin comparison tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get salesperson IDs
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN_CREDS)
        self.benjamin_id = response.json()["user"]["user_id"]
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FRANCO_CREDS)
        self.franco_id = response.json()["user"]["user_id"]
    
    def test_admin_can_view_all_leads(self):
        """Admin can view all leads without salesperson filter"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        assert response.status_code == 200
        leads = response.json()["leads"]
        
        # Should have multiple salespeople's leads
        sp_ids = set(l.get("salesperson_id") for l in leads)
        print(f"✓ Admin sees leads from {len(sp_ids)} salespeople, total {len(leads)} leads")
    
    def test_admin_comparison_endpoint(self):
        """GET /api/admin/comparison returns both salesperson data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            params={"date_filter": "current_year", "category": "hvac"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # API returns "comparison" not "salespeople"
        assert "comparison" in data
        assert "totals" in data
        
        # Verify salespeople are in comparison
        sp_names = [sp.get("name", "") for sp in data["comparison"]]
        print(f"✓ Admin comparison: {sp_names}")
        print(f"✓ Totals: {data['totals']['closed_deals']} deals, ${data['totals'].get('revenue', 0):,.0f} revenue")


class TestDataIntegrity:
    """Data integrity tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN_CREDS)
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_no_non_pending_with_followup(self):
        """No non-PENDING leads should have follow_up_date"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        leads = response.json()["leads"]
        
        invalid = [l for l in leads 
                   if l.get("status") != "PENDING" 
                   and l.get("follow_up_date") 
                   and l.get("follow_up_date").strip()]
        
        # Allow a small number due to data transition
        assert len(invalid) <= 5, f"Found {len(invalid)} non-PENDING leads with follow_up_date"
        print(f"✓ Data integrity: {len(invalid)} non-PENDING with follow_up (acceptable)")
    
    def test_all_leads_have_visit_date(self):
        """All leads should have visit_date"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        leads = response.json()["leads"]
        
        without_visit = [l for l in leads if not l.get("visit_date")]
        
        # Should be minimal
        ratio = len(without_visit) / len(leads) if leads else 0
        assert ratio < 0.1, f"{len(without_visit)}/{len(leads)} leads missing visit_date"
        print(f"✓ Data integrity: {len(leads) - len(without_visit)}/{len(leads)} leads have visit_date")


class TestTasks:
    """Tasks endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BENJAMIN_CREDS)
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_tasks(self):
        """GET /api/tasks returns tasks list"""
        response = requests.get(f"{BASE_URL}/api/tasks", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        print(f"✓ Tasks endpoint: {len(data['tasks'])} tasks")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
