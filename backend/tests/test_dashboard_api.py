"""
Sales Dashboard API Tests
Tests for Four Seasons Heating & Cooling KPI Dashboard
Features: Dashboard KPIs, Pay Period filtering, Settings, Follow-ups
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """API Health Check"""
    
    def test_api_root_health(self):
        """Test API root endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data
        print(f"✓ Health check passed: {data['message']}")


class TestDashboardKPIs:
    """Dashboard KPI endpoint tests"""
    
    def test_kpis_without_filter(self):
        """Test KPIs endpoint returns data without filters"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check main KPI fields exist
        required_fields = [
            'total_revenue', 'total_commission', 'closed_deals',
            'closing_rate', 'total_visits', 'average_ticket'
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Data type assertions
        assert isinstance(data['total_revenue'], (int, float))
        assert isinstance(data['total_commission'], (int, float))
        assert isinstance(data['closed_deals'], int)
        assert isinstance(data['closing_rate'], (int, float))
        assert isinstance(data['total_visits'], int)
        assert isinstance(data['average_ticket'], (int, float))
        
        print(f"✓ KPIs loaded: Revenue ${data['total_revenue']:,.2f}, Deals {data['closed_deals']}")
    
    def test_kpis_with_pay_period_filter(self):
        """Test KPIs endpoint with current pay period filter (Feb 05 - Feb 18, 2026)"""
        pay_period = "Feb 05, 2026 - Feb 18, 2026"
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", params={"pay_period": pay_period})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check pay period is reflected
        assert data.get('selected_pay_period') == pay_period
        
        # All main KPIs should be present
        assert 'total_revenue' in data
        assert 'total_commission' in data
        assert 'closed_deals' in data
        
        print(f"✓ Pay period filter works: {pay_period}, Deals: {data['closed_deals']}")
    
    def test_kpis_commission_payment_section(self):
        """Test Commission Payment section - based on install_date"""
        pay_period = "Feb 05, 2026 - Feb 18, 2026"
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", params={"pay_period": pay_period})
        assert response.status_code == 200
        data = response.json()
        
        # Check Commission Payment fields
        required_cp_fields = [
            'commission_payment_count', 'commission_payment_revenue',
            'commission_payment_amount', 'commission_payment_spiff'
        ]
        for field in required_cp_fields:
            assert field in data, f"Missing Commission Payment field: {field}"
            assert isinstance(data[field], (int, float))
        
        print(f"✓ Commission Payment: {data['commission_payment_count']} installs, ${data['commission_payment_amount']:,.2f}")
    
    def test_kpis_under_book_price_section(self):
        """Test Under Book Price section - 5% commission rate sales"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis")
        assert response.status_code == 200
        data = response.json()
        
        # Check Price Margin (Under Book Price) fields
        required_pm_fields = [
            'price_margin_total', 'price_margin_sales_count', 'price_margin_commission'
        ]
        for field in required_pm_fields:
            assert field in data, f"Missing Under Book Price field: {field}"
            assert isinstance(data[field], (int, float))
        
        print(f"✓ Under Book Price: {data['price_margin_sales_count']} sales, ${data['price_margin_commission']:,.2f}")
    
    def test_kpis_spiff_breakdown(self):
        """Test SPIFF Breakdown section by brand"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis")
        assert response.status_code == 200
        data = response.json()
        
        # Check SPIFF fields
        assert 'spiff_total' in data
        assert 'spiff_breakdown' in data
        assert isinstance(data['spiff_total'], (int, float))
        assert isinstance(data['spiff_breakdown'], dict)
        
        # Each brand should have count, commission, percent_of_sales
        for brand, brand_data in data['spiff_breakdown'].items():
            assert 'count' in brand_data
            assert 'commission' in brand_data
            assert 'percent_of_sales' in brand_data
        
        print(f"✓ SPIFF Total: ${data['spiff_total']:,.2f}, Brands: {list(data['spiff_breakdown'].keys())}")
    
    def test_kpis_follow_ups(self):
        """Test Pending Follow-ups section"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis")
        assert response.status_code == 200
        data = response.json()
        
        assert 'follow_ups' in data
        assert isinstance(data['follow_ups'], list)
        
        # Check follow-up structure
        if len(data['follow_ups']) > 0:
            follow_up = data['follow_ups'][0]
            required_fields = ['name', 'city', 'follow_up_date', 'days_until', 'is_urgent']
            for field in required_fields:
                assert field in follow_up, f"Missing follow-up field: {field}"
        
        print(f"✓ Follow-ups: {len(data['follow_ups'])} pending")
    
    def test_kpis_sales_records_table(self):
        """Test Sales Records for table display"""
        pay_period = "Feb 05, 2026 - Feb 18, 2026"
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", params={"pay_period": pay_period})
        assert response.status_code == 200
        data = response.json()
        
        assert 'records' in data
        assert isinstance(data['records'], list)
        
        # Check record structure
        if len(data['records']) > 0:
            record = data['records'][0]
            required_fields = ['name', 'city', 'unit_type', 'ticket_value', 'commission_value', 'install_date']
            for field in required_fields:
                assert field in record, f"Missing record field: {field}"
        
        print(f"✓ Sales Records: {len(data['records'])} records")
    
    def test_kpis_charts_data(self):
        """Test chart data for Sales Analysis and Performance Trends"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis")
        assert response.status_code == 200
        data = response.json()
        
        # Unit Type Distribution (Pie chart)
        assert 'unit_type_count' in data
        assert isinstance(data['unit_type_count'], dict)
        
        # Revenue by Unit Type (Bar chart)
        assert 'unit_type_revenue' in data
        assert isinstance(data['unit_type_revenue'], dict)
        
        # Deal Status Distribution (Bar chart)
        assert 'status_distribution' in data
        assert isinstance(data['status_distribution'], dict)
        
        # Monthly Revenue Trend (Area chart)
        assert 'monthly_data' in data
        assert isinstance(data['monthly_data'], list)
        
        print(f"✓ Charts data: Unit types {len(data['unit_type_count'])}, Monthly data {len(data['monthly_data'])}")
    
    def test_kpis_quick_date_filters(self):
        """Test quick date filter options"""
        date_filters = ['week', '2weeks', 'month', 'year', 'all']
        
        for filter_option in date_filters:
            response = requests.get(f"{BASE_URL}/api/dashboard/kpis", params={"date_filter": filter_option})
            assert response.status_code == 200, f"Failed for filter: {filter_option}"
            data = response.json()
            assert 'total_revenue' in data
        
        print(f"✓ All date filters working: {date_filters}")


class TestExcelConfig:
    """Excel configuration endpoint tests"""
    
    def test_get_excel_config(self):
        """Test getting Excel config"""
        response = requests.get(f"{BASE_URL}/api/config/excel")
        assert response.status_code == 200
        data = response.json()
        # Should return excel_url or empty
        assert isinstance(data, dict)
        print(f"✓ Excel config retrieved")
    
    def test_set_excel_config(self):
        """Test setting Excel URL config"""
        test_url = "https://docs.google.com/spreadsheets/d/1h2ZMumcAsYYYvV1JTQPRXTa3kOcZ5K4-/edit"
        response = requests.post(f"{BASE_URL}/api/config/excel", json={"excel_url": test_url})
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Excel config set successfully")


class TestPayPeriods:
    """Pay Period endpoint tests"""
    
    def test_get_pay_periods(self):
        """Test getting list of pay periods"""
        response = requests.get(f"{BASE_URL}/api/pay-periods")
        assert response.status_code == 200
        data = response.json()
        
        assert 'pay_periods' in data
        assert isinstance(data['pay_periods'], list)
        assert len(data['pay_periods']) > 0
        
        # Check period structure
        period = data['pay_periods'][0]
        assert 'name' in period
        assert 'start' in period
        assert 'end' in period
        
        print(f"✓ Pay periods: {len(data['pay_periods'])} periods available")


class TestDashboardRefresh:
    """Dashboard refresh endpoint tests"""
    
    def test_refresh_dashboard(self):
        """Test dashboard refresh endpoint"""
        response = requests.post(f"{BASE_URL}/api/dashboard/refresh")
        assert response.status_code == 200
        data = response.json()
        
        assert 'message' in data
        assert 'kpis' in data
        
        # Verify KPIs are returned
        kpis = data['kpis']
        assert 'total_revenue' in kpis
        assert 'closed_deals' in kpis
        
        print(f"✓ Dashboard refreshed: {kpis['closed_deals']} deals")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
