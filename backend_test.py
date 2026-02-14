import requests
import sys
from datetime import datetime
import json

class SalesDashboardAPITester:
    def __init__(self, base_url="https://sales-dashboard-340.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, test_name, success, response_data, status_code, error_msg=None):
        """Log test result"""
        result = {
            'test_name': test_name,
            'success': success,
            'status_code': status_code,
            'response_data': response_data,
            'error_msg': error_msg,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - Status: {status_code}")
        else:
            print(f"❌ {test_name} - Expected success, got {status_code}")
            if error_msg:
                print(f"   Error: {error_msg}")

    def run_test(self, name, method, endpoint, expected_status=200, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            
            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json() if response.text else {}
            except:
                response_data = {"raw_response": response.text[:200]}
            
            error_msg = None if success else f"Expected {expected_status}, got {response.status_code}"
            
            self.log_result(name, success, response_data, response.status_code, error_msg)
            
            return success, response_data, response.status_code

        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            print(f"❌ {name} - Error: {error_msg}")
            self.log_result(name, False, {}, 0, error_msg)
            return False, {}, 0

    def test_root_endpoint(self):
        """Test GET /api/ endpoint"""
        success, response, status_code = self.run_test(
            "Root Endpoint",
            "GET", 
            "",
            200
        )
        return success

    def test_set_excel_config(self):
        """Test POST /api/config/excel endpoint"""
        test_excel_url = "https://customer-assets.emergentagent.com/job_sales-dashboard-321/artifacts/xdsih8ll_Stats_FSHAC_v22%20%284%29.xlsx"
        
        success, response, status_code = self.run_test(
            "Set Excel Config",
            "POST",
            "config/excel",
            200,
            data={"excel_url": test_excel_url}
        )
        
        if success and response:
            print(f"   Config ID: {response.get('id', 'N/A')}")
            
        return success

    def test_get_excel_config(self):
        """Test GET /api/config/excel endpoint"""
        success, response, status_code = self.run_test(
            "Get Excel Config",
            "GET",
            "config/excel",
            200
        )
        
        if success and response:
            print(f"   Excel URL: {response.get('excel_url', 'N/A')[:50]}...")
            
        return success

    def test_dashboard_kpis_all_time(self):
        """Test GET /api/dashboard/kpis with all time filter - NEW FEATURES"""
        success, response, status_code = self.run_test(
            "Dashboard KPIs (All Time) - New Features",
            "GET",
            "dashboard/kpis",
            200,
            params={"date_filter": "all"}
        )
        
        if success and response:
            # Verify NEW KPI structure as per KPIResponse model
            required_kpis = [
                # Main Summary KPIs
                'total_revenue', 'total_commission', 'closed_deals', 'closing_rate', 
                'total_visits', 'average_ticket', 'avg_sales_cycle_days',
                # NEW: Price Margin (5% commission sales)
                'price_margin_total', 'price_margin_sales_count', 'price_margin_commission',
                # NEW: SPIFF Section
                'spiff_total', 'spiff_breakdown',
                # Other metrics
                'avg_commission_percent', 'unit_type_count', 'unit_type_revenue',
                'monthly_data', 'status_distribution', 'records', 'pay_periods'
            ]
            
            missing_kpis = [kpi for kpi in required_kpis if kpi not in response]
            if missing_kpis:
                print(f"   ⚠️  Missing KPIs: {missing_kpis}")
            else:
                print(f"   ✓ All required KPIs present")
                
            print(f"   Total Revenue: ${response.get('total_revenue', 0):,.2f}")
            print(f"   Total Commission: ${response.get('total_commission', 0):,.2f}")
            print(f"   Closed Deals: {response.get('closed_deals', 0)}")
            print(f"   Closing Rate: {response.get('closing_rate', 0):.1f}%")
            
            # NEW: Price Margin Analysis
            print(f"   Price Margin Total: ${response.get('price_margin_total', 0):,.2f}")
            print(f"   Price Margin Sales Count: {response.get('price_margin_sales_count', 0)}")
            print(f"   Price Margin Commission: ${response.get('price_margin_commission', 0):,.2f}")
            
            # NEW: SPIFF Breakdown
            print(f"   SPIFF Total: ${response.get('spiff_total', 0):,.2f}")
            spiff_breakdown = response.get('spiff_breakdown', {})
            print(f"   SPIFF Brands: {list(spiff_breakdown.keys())}")
            for brand, data in spiff_breakdown.items():
                print(f"     {brand}: {data.get('count', 0)} sales, ${data.get('commission', 0):,.2f}, {data.get('percent_of_sales', 0):.1f}%")
            
            print(f"   Monthly Data Points: {len(response.get('monthly_data', []))}")
            print(f"   Pay Periods Available: {len(response.get('pay_periods', []))}")
            print(f"   Records: {len(response.get('records', []))}")
            
        return success

    def test_dashboard_kpis_filtered(self):
        """Test GET /api/dashboard/kpis with different date filters"""
        filters = ["week", "2weeks", "month", "year"]
        all_passed = True
        
        for filter_name in filters:
            success, response, status_code = self.run_test(
                f"Dashboard KPIs ({filter_name})",
                "GET",
                "dashboard/kpis",
                200,
                params={"date_filter": filter_name}
            )
            
            if success and response:
                print(f"   Revenue: ${response.get('total_revenue', 0):,.2f}")
                print(f"   Deals: {response.get('closed_deals', 0)}")
            
            all_passed = all_passed and success
        
        return all_passed

    def test_pay_periods_endpoint(self):
        """Test GET /api/pay-periods endpoint"""
        success, response, status_code = self.run_test(
            "Pay Periods Endpoint",
            "GET",
            "pay-periods",
            200
        )
        
        if success and response:
            pay_periods = response.get('pay_periods', [])
            print(f"   Pay Periods Available: {len(pay_periods)}")
            if pay_periods:
                print(f"   First Period: {pay_periods[0].get('name', 'N/A')}")
                print(f"   Last Period: {pay_periods[-1].get('name', 'N/A')}")
            
        return success

    def test_pay_period_filtering(self):
        """Test pay period filtering functionality"""
        # Test with specific pay period
        test_pay_period = "Jan 08, 2026 - Jan 21, 2026"
        
        success, response, status_code = self.run_test(
            "Pay Period Filtering",
            "GET",
            "dashboard/kpis",
            200,
            params={"pay_period": test_pay_period}
        )
        
        if success and response:
            print(f"   Selected Pay Period: {response.get('selected_pay_period', 'N/A')}")
            print(f"   Total Revenue: ${response.get('total_revenue', 0):,.2f}")
            print(f"   Filtered Records: {len(response.get('records', []))}")
            
            # Verify chronological monthly data
            monthly_data = response.get('monthly_data', [])
            if len(monthly_data) >= 2:
                print(f"   Monthly Data (Chronological): {[m['month'] for m in monthly_data[:3]]}")
            
        return success

    def test_dashboard_refresh(self):
        """Test POST /api/dashboard/refresh endpoint"""
        success, response, status_code = self.run_test(
            "Dashboard Refresh",
            "POST",
            "dashboard/refresh",
            200,
            params={"date_filter": "all"}
        )
        
        if success and response:
            print(f"   Message: {response.get('message', 'N/A')}")
            kpis = response.get('kpis', {})
            if kpis:
                print(f"   Records in KPIs: {len(kpis.get('records', []))}")
            
        return success

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Sales Dashboard API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            ("Root Endpoint", self.test_root_endpoint),
            ("Set Excel Config", self.test_set_excel_config), 
            ("Get Excel Config", self.test_get_excel_config),
            ("Pay Periods Endpoint", self.test_pay_periods_endpoint),
            ("Dashboard KPIs All Time", self.test_dashboard_kpis_all_time),
            ("Pay Period Filtering", self.test_pay_period_filtering),
            ("Dashboard KPIs Filtered", self.test_dashboard_kpis_filtered),
            ("Dashboard Refresh", self.test_dashboard_refresh)
        ]
        
        for test_name, test_func in tests:
            try:
                test_func()
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {str(e)}")
                self.tests_run += 1
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Save detailed results
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump({
                'summary': {
                    'tests_run': self.tests_run,
                    'tests_passed': self.tests_passed,
                    'success_rate': self.tests_passed/self.tests_run if self.tests_run > 0 else 0,
                    'timestamp': datetime.now().isoformat()
                },
                'detailed_results': self.test_results
            }, f, indent=2)
        
        return self.tests_passed == self.tests_run

def main():
    tester = SalesDashboardAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())