"""
Backend tests for Admin Panel features - specifically testing the redesigned admin comparison endpoint
and verifying all new fields for the ranking table.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminPanelFeatures:
    """Test suite for admin panel functionality including ranking table and overview"""
    
    @pytest.fixture(scope='class')
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "Bsanchezcar@gmail.com",
            "password": "Benja123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data["user"]["role"] == "admin", "User is not admin"
        return data["token"]
    
    @pytest.fixture(scope='class')
    def headers(self, admin_token):
        """Auth headers for admin requests"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_admin_login_success(self):
        """Test admin login works correctly"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "Bsanchezcar@gmail.com",
            "password": "Benja123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "bsanchezcar@gmail.com"
        print("✅ Admin login successful")
    
    def test_admin_comparison_endpoint_returns_correct_structure(self, headers):
        """Test that /admin/comparison returns the expected structure with all new fields"""
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify top-level structure
        assert "comparison" in data, "Missing comparison array"
        assert "totals" in data, "Missing totals object"
        print("✅ Comparison endpoint returns comparison and totals")
    
    def test_admin_comparison_totals_has_all_required_fields(self, headers):
        """Test that totals include all required fields for Overview tab"""
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        data = response.json()
        totals = data["totals"]
        
        # Required totals fields for Overview tab
        required_fields = [
            "total_leads", "closed_deals", "lost_deals",
            "total_revenue", "total_commission", "closing_rate",
            "avg_ticket", "access_pct", "pm_jobs", "pm_pct", "gp_pct"
        ]
        
        for field in required_fields:
            assert field in totals, f"Missing totals field: {field}"
            print(f"  ✓ totals.{field} = {totals[field]}")
        
        print("✅ All required totals fields present")
    
    def test_admin_comparison_salesperson_has_all_required_fields(self, headers):
        """Test each salesperson has all fields needed for the ranking table"""
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        data = response.json()
        
        if len(data["comparison"]) == 0:
            pytest.skip("No salespeople data to test")
        
        sp = data["comparison"][0]
        
        # Required fields for ranking table columns
        required_fields = [
            "user_id", "name", "email",
            # Metrics
            "closing_rate", "access_pct", "closed_deals", "avg_ticket",
            "total_revenue", "total_leads", "pm_jobs", "pm_pct", "gp_pct",
            # Rank fields
            "closing_rate_rank", "access_pct_rank", "closed_deals_rank",
            "avg_ticket_rank", "total_revenue_rank", "total_leads_rank",
            "gp_pct_rank", "pm_pct_rank",
            # Overall rank
            "overall_rank", "overall_position"
        ]
        
        for field in required_fields:
            assert field in sp, f"Missing salesperson field: {field}"
            print(f"  ✓ {field} = {sp[field]}")
        
        print("✅ All salesperson fields present for ranking table")
    
    def test_admin_comparison_ranking_logic(self, headers):
        """Test that rankings are computed correctly"""
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        data = response.json()
        comparison = data["comparison"]
        
        if len(comparison) < 2:
            pytest.skip("Need at least 2 salespeople to test ranking")
        
        # Verify sorting by overall_position
        positions = [sp["overall_position"] for sp in comparison]
        assert positions == sorted(positions), "Comparison not sorted by overall_position"
        
        # Verify overall_position is sequential starting from 1
        for i, sp in enumerate(comparison):
            assert sp["overall_position"] == i + 1, f"Overall position mismatch at index {i}"
        
        print("✅ Ranking logic correct - sorted by overall_position")
    
    def test_admin_comparison_rank_badges_are_valid(self, headers):
        """Test that rank values are valid (1 to N where N = total salespeople)"""
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        data = response.json()
        comparison = data["comparison"]
        total = len(comparison)
        
        if total == 0:
            pytest.skip("No salespeople to test")
        
        rank_fields = [
            "closing_rate_rank", "access_pct_rank", "closed_deals_rank",
            "avg_ticket_rank", "total_revenue_rank", "total_leads_rank",
            "gp_pct_rank", "pm_pct_rank"
        ]
        
        for sp in comparison:
            for field in rank_fields:
                rank = sp.get(field)
                assert rank is not None, f"Missing {field} for {sp['name']}"
                assert 1 <= rank <= total, f"{field} = {rank} out of range [1, {total}]"
        
        print(f"✅ All rank badges valid (range 1-{total})")
    
    def test_admin_comparison_with_pay_period_filter(self, headers):
        """Test that comparison endpoint accepts pay_period filter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            headers=headers,
            params={"pay_period": "Jan 08, 2026 - Jan 21, 2026"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "comparison" in data
        assert "totals" in data
        print("✅ Pay period filter accepted")
    
    def test_admin_comparison_with_date_filter(self, headers):
        """Test that comparison endpoint accepts date_filter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            headers=headers,
            params={"date_filter": "month"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "comparison" in data
        print("✅ Date filter accepted")
    
    def test_admin_salespeople_endpoint(self, headers):
        """Test /admin/salespeople endpoint for User Management section"""
        response = requests.get(f"{BASE_URL}/api/admin/salespeople", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "users" in data, "Missing users array"
        
        if len(data["users"]) > 0:
            user = data["users"][0]
            assert "user_id" in user
            assert "name" in user
            assert "email" in user
            assert "role" in user
            assert "password_hash" not in user, "Password hash should not be exposed"
        
        print(f"✅ Salespeople endpoint returns {len(data['users'])} users")
    
    def test_admin_role_change_endpoint(self, headers):
        """Test that role change endpoint exists and validates properly"""
        # First get a non-admin user
        response = requests.get(f"{BASE_URL}/api/admin/salespeople", headers=headers)
        users = response.json()["users"]
        
        salesperson = next((u for u in users if u["role"] == "salesperson"), None)
        if not salesperson:
            pytest.skip("No salesperson found to test role change")
        
        # Try to change role with invalid value - should fail
        response = requests.put(
            f"{BASE_URL}/api/auth/user/{salesperson['user_id']}/role",
            headers=headers,
            json={"role": "invalid_role"}
        )
        assert response.status_code == 400, "Should reject invalid role"
        print("✅ Role change endpoint validates role values")
    
    def test_non_admin_cannot_access_comparison(self):
        """Test that non-admin users cannot access admin endpoints"""
        # Login as salesperson
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "Bcardarelli@fshac.com",
            "password": "Benja123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Salesperson login failed")
        
        token = login_response.json()["token"]
        
        # Try to access admin comparison
        response = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403, "Non-admin should not access admin endpoints"
        print("✅ Admin endpoints properly protected")


class TestOverviewTabData:
    """Tests specifically for the Overview tab data requirements"""
    
    @pytest.fixture(scope='class')
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "Bsanchezcar@gmail.com",
            "password": "Benja123"
        })
        return response.json()["token"]
    
    @pytest.fixture(scope='class')
    def headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_overview_company_totals(self, headers):
        """Test Company Totals section data: Revenue, Commission, Closed, Total Leads, Lost"""
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        totals = response.json()["totals"]
        
        # These are shown in the Company Totals card
        assert "total_revenue" in totals
        assert "total_commission" in totals
        assert "closed_deals" in totals
        assert "total_leads" in totals
        assert "lost_deals" in totals
        
        assert totals["total_revenue"] >= 0
        assert totals["total_commission"] >= 0
        assert totals["closed_deals"] >= 0
        
        print(f"✅ Company Totals: Revenue=${totals['total_revenue']}, Commission=${totals['total_commission']}, Closed={totals['closed_deals']}, Leads={totals['total_leads']}, Lost={totals['lost_deals']}")
    
    def test_overview_key_rates(self, headers):
        """Test Key Rates section: R%, Access%, Avg Ticket, GP%, PM Jobs, PM%"""
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        totals = response.json()["totals"]
        
        # Key rates shown in the Overview tab
        assert "closing_rate" in totals  # R%
        assert "access_pct" in totals    # Access %
        assert "avg_ticket" in totals    # Avg Ticket
        assert "gp_pct" in totals        # GP %
        assert "pm_jobs" in totals       # PM Jobs
        assert "pm_pct" in totals        # PM %
        
        print(f"✅ Key Rates: R%={totals['closing_rate']}, Access%={totals['access_pct']}, AvgTicket=${totals['avg_ticket']}, GP%={totals['gp_pct']}, PMJobs={totals['pm_jobs']}, PM%={totals['pm_pct']}")
    
    def test_overview_lead_status_pie_data(self, headers):
        """Test data for Lead Status pie chart: Closed/Pending/Lost"""
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        totals = response.json()["totals"]
        
        # Pie chart needs: Closed, Pending (calculated), Lost
        closed = totals.get("closed_deals", 0)
        lost = totals.get("lost_deals", 0)
        total = totals.get("total_leads", 0)
        pending = total - closed - lost
        
        assert total >= closed + lost, "Total leads should >= closed + lost"
        assert pending >= 0, "Pending should be non-negative"
        
        print(f"✅ Lead Status Pie: Closed={closed}, Pending={pending}, Lost={lost}")


class TestSalespeopleTabData:
    """Tests specifically for the Salespeople tab ranking table"""
    
    @pytest.fixture(scope='class')
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "Bsanchezcar@gmail.com",
            "password": "Benja123"
        })
        return response.json()["token"]
    
    @pytest.fixture(scope='class')
    def headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_ranking_table_all_columns(self, headers):
        """Test all columns for ranking table:
        Overall, Salesperson, R%, Access%, Sales, Avg Ticket, Net Value, Total Jobs, PM Jobs, GP%, PM%
        """
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        comparison = response.json()["comparison"]
        
        if len(comparison) == 0:
            pytest.skip("No salespeople data")
        
        sp = comparison[0]
        
        # Map table columns to API fields
        column_mapping = {
            "Overall": "overall_position",
            "Salesperson": "name",
            "R%": "closing_rate",
            "Access %": "access_pct",
            "Sales": "closed_deals",
            "Avg Ticket": "avg_ticket",
            "Net Value": "total_revenue",
            "Total Jobs": "total_leads",
            "PM Jobs": "pm_jobs",
            "GP %": "gp_pct",
            "PM %": "pm_pct",
        }
        
        for column, field in column_mapping.items():
            assert field in sp, f"Missing field '{field}' for column '{column}'"
            print(f"  ✓ {column}: {sp[field]}")
        
        print("✅ All ranking table columns have data")
    
    def test_rank_badges_for_each_metric(self, headers):
        """Test that each metric has an associated rank badge"""
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        comparison = response.json()["comparison"]
        
        if len(comparison) == 0:
            pytest.skip("No salespeople data")
        
        sp = comparison[0]
        
        # Metrics that should have rank badges
        metrics_with_ranks = [
            ("R%", "closing_rate_rank"),
            ("Access %", "access_pct_rank"),
            ("Sales", "closed_deals_rank"),
            ("Avg Ticket", "avg_ticket_rank"),
            ("Net Value", "total_revenue_rank"),
            ("Total Jobs", "total_leads_rank"),
            ("GP %", "gp_pct_rank"),
            ("PM %", "pm_pct_rank"),
        ]
        
        for metric, rank_field in metrics_with_ranks:
            assert rank_field in sp, f"Missing rank field '{rank_field}' for metric '{metric}'"
            rank = sp[rank_field]
            assert isinstance(rank, int) and rank >= 1, f"Invalid rank for {metric}: {rank}"
            print(f"  ✓ {metric} Rank: #{rank}")
        
        print("✅ All metrics have valid rank badges")
    
    def test_top_performer_data(self, headers):
        """Test that first salesperson in list is the top performer"""
        response = requests.get(f"{BASE_URL}/api/admin/comparison", headers=headers)
        comparison = response.json()["comparison"]
        
        if len(comparison) == 0:
            pytest.skip("No salespeople data")
        
        top = comparison[0]
        
        # Top performer should have overall_position = 1
        assert top["overall_position"] == 1, "First salesperson should be #1"
        
        # Should have name, closing_rate, total_revenue, closed_deals for banner
        assert "name" in top
        assert "closing_rate" in top
        assert "total_revenue" in top
        assert "closed_deals" in top
        
        print(f"✅ Top Performer: {top['name']} - R% {top['closing_rate']}%, ${top['total_revenue']} revenue, {top['closed_deals']} sales")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
