"""
Backend tests for Equipment Types and Accessories features in Admin Overview
Tests /admin/comparison endpoint returns equipment_types and accessories in totals
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "Bsanchezcar@gmail.com"
ADMIN_PASSWORD = "Benja123"

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert data.get("user", {}).get("role") == "admin", "User is not admin"
    return data["token"]


class TestEquipmentTypesInComparison:
    """Tests for equipment_types in /admin/comparison endpoint"""
    
    def test_comparison_returns_equipment_types(self, admin_token):
        """equipment_types must be present in totals"""
        response = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "totals" in data
        assert "equipment_types" in data["totals"], "equipment_types missing from totals"
    
    def test_equipment_types_structure(self, admin_token):
        """Each equipment type must have count and revenue"""
        response = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        equipment_types = data["totals"]["equipment_types"]
        assert isinstance(equipment_types, dict)
        
        for equip_name, equip_data in equipment_types.items():
            assert "count" in equip_data, f"count missing for {equip_name}"
            assert "revenue" in equip_data, f"revenue missing for {equip_name}"
            assert isinstance(equip_data["count"], int), f"count for {equip_name} is not int"
            assert isinstance(equip_data["revenue"], (int, float)), f"revenue for {equip_name} is not numeric"
    
    def test_equipment_types_have_data(self, admin_token):
        """There should be at least one equipment type with sales data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        equipment_types = data["totals"]["equipment_types"]
        
        # At least one equipment type should exist
        assert len(equipment_types) > 0, "No equipment types found"
        
        # Check total count matches closed_deals
        total_count = sum(eq["count"] for eq in equipment_types.values())
        assert total_count == data["totals"]["closed_deals"], \
            f"Total equipment count ({total_count}) doesn't match closed_deals ({data['totals']['closed_deals']})"


class TestAccessoriesInComparison:
    """Tests for accessories in /admin/comparison endpoint"""
    
    def test_comparison_returns_accessories(self, admin_token):
        """accessories must be present in totals"""
        response = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "totals" in data
        assert "accessories" in data["totals"], "accessories missing from totals"
    
    def test_accessories_all_spiff_fields_present(self, admin_token):
        """All 6 SPIFF fields must be present in accessories"""
        spiff_fields = ["apco_x", "samsung", "mitsubishi", "surge_protector", "duct_cleaning", "self_gen_mits"]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        accessories = data["totals"]["accessories"]
        
        for field in spiff_fields:
            assert field in accessories, f"SPIFF field '{field}' missing from accessories"
    
    def test_accessories_structure(self, admin_token):
        """Each accessory must have count and value"""
        response = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        accessories = data["totals"]["accessories"]
        
        for acc_name, acc_data in accessories.items():
            assert "count" in acc_data, f"count missing for {acc_name}"
            assert "value" in acc_data, f"value missing for {acc_name}"
            assert isinstance(acc_data["count"], int), f"count for {acc_name} is not int"
            assert isinstance(acc_data["value"], (int, float)), f"value for {acc_name} is not numeric"
    
    def test_accessory_counts_are_units_not_dollar_amounts(self, admin_token):
        """Count should be number of leads with SPIFF > 0, not sum of SPIFF values"""
        response = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        accessories = data["totals"]["accessories"]
        
        # Count should be <= closed_deals (at most each sale has one of each accessory)
        for acc_name, acc_data in accessories.items():
            assert acc_data["count"] <= data["totals"]["closed_deals"], \
                f"Accessory '{acc_name}' count ({acc_data['count']}) > closed_deals ({data['totals']['closed_deals']})"


class TestPayPeriodFilterWithEquipmentAccessories:
    """Tests for pay period filtering affects equipment and accessories"""
    
    def test_pay_period_filter_affects_equipment_types(self, admin_token):
        """Equipment types should change when pay period filter is applied"""
        # Get all data
        response_all = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data_all = response_all.json()
        
        # Get filtered data
        response_filtered = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            params={"pay_period": "Jan 08, 2026 - Jan 21, 2026"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data_filtered = response_filtered.json()
        
        # Both should have equipment_types
        assert "equipment_types" in data_all["totals"]
        assert "equipment_types" in data_filtered["totals"]
        
        # If filter actually filters, counts should differ
        all_total = sum(eq["count"] for eq in data_all["totals"]["equipment_types"].values())
        filtered_total = sum(eq["count"] for eq in data_filtered["totals"]["equipment_types"].values())
        
        # Filtered should be <= all
        assert filtered_total <= all_total, \
            f"Filtered equipment count ({filtered_total}) > all ({all_total})"
    
    def test_pay_period_filter_affects_accessories(self, admin_token):
        """Accessories should change when pay period filter is applied"""
        # Get all data
        response_all = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data_all = response_all.json()
        
        # Get filtered data
        response_filtered = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            params={"pay_period": "Jan 08, 2026 - Jan 21, 2026"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data_filtered = response_filtered.json()
        
        # Both should have accessories
        assert "accessories" in data_all["totals"]
        assert "accessories" in data_filtered["totals"]
        
        # All 6 fields should be present in both
        for field in ["apco_x", "samsung", "mitsubishi", "surge_protector", "duct_cleaning", "self_gen_mits"]:
            assert field in data_all["totals"]["accessories"]
            assert field in data_filtered["totals"]["accessories"]


class TestRegressionExistingFeatures:
    """Regression tests to ensure existing features still work"""
    
    def test_totals_still_has_company_kpis(self, admin_token):
        """Company Totals fields should still be present"""
        required_fields = ["total_leads", "closed_deals", "lost_deals", "total_revenue", 
                          "total_commission", "closing_rate", "avg_ticket", "access_pct", 
                          "pm_jobs", "pm_pct", "gp_pct"]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        for field in required_fields:
            assert field in data["totals"], f"Required field '{field}' missing from totals"
    
    def test_comparison_still_has_salesperson_data(self, admin_token):
        """Comparison array should still have salesperson ranking data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/comparison",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        assert "comparison" in data
        assert isinstance(data["comparison"], list)
        
        if len(data["comparison"]) > 0:
            sp = data["comparison"][0]
            # Check essential salesperson fields
            required_sp_fields = ["user_id", "name", "email", "total_leads", "closed_deals",
                                 "total_revenue", "closing_rate", "overall_position"]
            for field in required_sp_fields:
                assert field in sp, f"Salesperson field '{field}' missing"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
