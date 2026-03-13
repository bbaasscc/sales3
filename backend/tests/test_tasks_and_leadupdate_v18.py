"""
Iteration 18: Testing new features
- P0: Pending Installation Reminder/Tasks system
  - When lead's install_date is set to 'PENDING', a task is auto-created
  - When a real date is set, the task auto-completes
- P1: LeadUpdate model fix - additional_phones, products, sale_accessories, is_self_gen, promo_code now save correctly
- P1: Tasks endpoints (GET /api/tasks, PUT /api/tasks/{id}/complete, PUT /api/tasks/{id}/dismiss)
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# =============== FIXTURES ===============

@pytest.fixture
def salesperson_token():
    """Get salesperson token (Benjamin Cardarelli)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "Bcardarelli@fshac.com",
        "password": "Benja123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Salesperson login failed")


@pytest.fixture
def admin_token():
    """Get admin token (Benjamin Sanchez)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "Bsanchezcar@gmail.com",
        "password": "Benja123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin login failed")


@pytest.fixture
def salesperson_headers(salesperson_token):
    """Headers for salesperson requests"""
    return {"Authorization": f"Bearer {salesperson_token}"}


@pytest.fixture
def admin_headers(admin_token):
    """Headers for admin requests"""
    return {"Authorization": f"Bearer {admin_token}"}


# =============== TASKS SYSTEM TESTS ===============

class TestTasksEndpoints:
    """Test Tasks API endpoints"""
    
    def test_get_tasks_endpoint(self, salesperson_headers):
        """Test GET /api/tasks returns tasks for logged-in salesperson"""
        response = requests.get(f"{BASE_URL}/api/tasks", headers=salesperson_headers)
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        assert isinstance(data["tasks"], list)
        print(f"PASS: GET /api/tasks returned {len(data['tasks'])} tasks")
    
    def test_admin_gets_all_tasks(self, admin_headers):
        """Test admin can get all tasks (no salesperson filter)"""
        response = requests.get(f"{BASE_URL}/api/tasks", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        print(f"PASS: Admin GET /api/tasks returned {len(data['tasks'])} tasks")
    
    def test_tasks_with_status_filter(self, salesperson_headers):
        """Test GET /api/tasks with status filter"""
        response = requests.get(f"{BASE_URL}/api/tasks?status=pending", headers=salesperson_headers)
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        # All returned tasks should have pending status
        for task in data["tasks"]:
            assert task["status"] == "pending", f"Task {task['task_id']} should be pending"
        print(f"PASS: Filtered tasks by status=pending, got {len(data['tasks'])} tasks")


class TestTasksAutoCreation:
    """Test auto-creation of tasks when install_date is set to PENDING"""
    
    def test_auto_create_task_on_pending_install(self, salesperson_headers):
        """When a SALE lead's install_date is set to PENDING, a task should be auto-created"""
        # First, create a new lead
        unique_name = f"TEST_TASK_{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "name": unique_name,
            "city": "CHICAGO",
            "phone": "555-1234",
            "unit_type": "AC",
            "ticket_value": 5000,
            "status": "SALE",
            "visit_date": "2026-01-10",
            "install_date": ""  # Start with no install date
        }
        
        create_response = requests.post(f"{BASE_URL}/api/leads", json=create_payload, headers=salesperson_headers)
        assert create_response.status_code == 200, f"Failed to create lead: {create_response.text}"
        lead_id = create_response.json()["lead"]["lead_id"]
        print(f"Created test lead: {lead_id} ({unique_name})")
        
        try:
            # Now update the lead to have install_date = PENDING
            update_payload = {"install_date": "PENDING"}
            update_response = requests.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_payload, headers=salesperson_headers)
            assert update_response.status_code == 200, f"Failed to update lead: {update_response.text}"
            print("Set install_date to PENDING")
            
            # Small wait for async operations
            time.sleep(0.5)
            
            # Check that a task was created
            tasks_response = requests.get(f"{BASE_URL}/api/tasks?status=pending", headers=salesperson_headers)
            assert tasks_response.status_code == 200
            tasks = tasks_response.json()["tasks"]
            
            # Find task for this lead
            task_for_lead = next((t for t in tasks if t["lead_id"] == lead_id), None)
            assert task_for_lead is not None, f"No pending task found for lead {lead_id}"
            
            # Verify task properties
            assert task_for_lead["lead_name"] == unique_name
            assert task_for_lead["lead_city"] == "CHICAGO"
            assert task_for_lead["task_type"] == "pending_install"
            assert task_for_lead["status"] == "pending"
            print(f"PASS: Task auto-created for lead with PENDING install_date")
            print(f"  Task ID: {task_for_lead['task_id']}")
            print(f"  Description: {task_for_lead['description']}")
            
        finally:
            # Cleanup: delete the test lead
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=salesperson_headers)
            print(f"Cleaned up test lead: {lead_id}")
    
    def test_auto_complete_task_on_date_set(self, salesperson_headers):
        """When a real install date is set, the pending task should auto-complete"""
        # Create a new lead WITHOUT install_date initially
        unique_name = f"TEST_COMPLETE_{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "name": unique_name,
            "city": "SKOKIE",
            "phone": "555-5678",
            "unit_type": "FURNACE",
            "ticket_value": 8000,
            "status": "SALE",
            "visit_date": "2026-01-10",
            "install_date": ""  # Start empty
        }
        
        create_response = requests.post(f"{BASE_URL}/api/leads", json=create_payload, headers=salesperson_headers)
        assert create_response.status_code == 200
        lead_id = create_response.json()["lead"]["lead_id"]
        print(f"Created test lead: {lead_id}")
        
        try:
            # First UPDATE to set install_date to PENDING (this triggers task creation)
            update_pending = {"install_date": "PENDING"}
            requests.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_pending, headers=salesperson_headers)
            print("Set install_date to PENDING via UPDATE")
            
            # Wait for task creation
            time.sleep(0.5)
            
            # Verify task exists
            tasks_response = requests.get(f"{BASE_URL}/api/tasks?status=pending", headers=salesperson_headers)
            tasks = tasks_response.json()["tasks"]
            task_for_lead = next((t for t in tasks if t["lead_id"] == lead_id), None)
            assert task_for_lead is not None, "Task should exist after UPDATE sets install_date=PENDING"
            task_id = task_for_lead["task_id"]
            print(f"Task created: {task_id}")
            
            # Now set a real install date
            real_date = "2026-02-15"
            update_payload = {"install_date": real_date}
            update_response = requests.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_payload, headers=salesperson_headers)
            assert update_response.status_code == 200
            print(f"Set install_date to {real_date}")
            
            # Wait for task completion
            time.sleep(0.5)
            
            # Check that the task is now completed
            all_tasks = requests.get(f"{BASE_URL}/api/tasks", headers=salesperson_headers)
            all_tasks_list = all_tasks.json()["tasks"]
            completed_task = next((t for t in all_tasks_list if t["task_id"] == task_id), None)
            
            assert completed_task is not None, "Task should still exist"
            assert completed_task["status"] == "completed", f"Task status should be 'completed', got '{completed_task['status']}'"
            assert completed_task.get("install_date_set") == real_date, "Task should record the install_date_set"
            print(f"PASS: Task auto-completed when real date set")
            print(f"  Task status: {completed_task['status']}")
            print(f"  Install date set: {completed_task.get('install_date_set')}")
            
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=salesperson_headers)
            print(f"Cleaned up test lead: {lead_id}")


class TestTaskManualActions:
    """Test manual task actions (complete, dismiss)"""
    
    def test_dismiss_task(self, salesperson_headers):
        """Test PUT /api/tasks/{id}/dismiss marks task as dismissed"""
        # Create a lead and UPDATE to PENDING to generate a task
        unique_name = f"TEST_DISMISS_{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "name": unique_name,
            "city": "EVANSTON",
            "status": "SALE",
            "install_date": "",  # Start empty
            "ticket_value": 3000
        }
        
        create_response = requests.post(f"{BASE_URL}/api/leads", json=create_payload, headers=salesperson_headers)
        assert create_response.status_code == 200
        lead_id = create_response.json()["lead"]["lead_id"]
        
        try:
            # Update to PENDING to trigger task creation
            requests.put(f"{BASE_URL}/api/leads/{lead_id}", json={"install_date": "PENDING"}, headers=salesperson_headers)
            time.sleep(0.5)
            
            # Get the task
            tasks_response = requests.get(f"{BASE_URL}/api/tasks?status=pending", headers=salesperson_headers)
            tasks = tasks_response.json()["tasks"]
            task = next((t for t in tasks if t["lead_id"] == lead_id), None)
            assert task is not None, "Task should exist after UPDATE to PENDING"
            task_id = task["task_id"]
            
            # Dismiss the task
            dismiss_response = requests.put(f"{BASE_URL}/api/tasks/{task_id}/dismiss", headers=salesperson_headers)
            assert dismiss_response.status_code == 200
            assert dismiss_response.json()["message"] == "Task dismissed"
            
            # Verify task is dismissed
            all_tasks = requests.get(f"{BASE_URL}/api/tasks", headers=salesperson_headers)
            dismissed_task = next((t for t in all_tasks.json()["tasks"] if t["task_id"] == task_id), None)
            assert dismissed_task is not None
            assert dismissed_task["status"] == "dismissed"
            print(f"PASS: Task dismissed successfully")
            
        finally:
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=salesperson_headers)
    
    def test_complete_task_manually(self, salesperson_headers):
        """Test PUT /api/tasks/{id}/complete marks task as completed"""
        # Create a lead and UPDATE to PENDING to generate a task
        unique_name = f"TEST_MANUAL_COMPLETE_{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "name": unique_name,
            "city": "OAK PARK",
            "status": "SALE",
            "install_date": "",  # Start empty
            "ticket_value": 4500
        }
        
        create_response = requests.post(f"{BASE_URL}/api/leads", json=create_payload, headers=salesperson_headers)
        assert create_response.status_code == 200
        lead_id = create_response.json()["lead"]["lead_id"]
        
        try:
            # Update to PENDING to trigger task creation
            requests.put(f"{BASE_URL}/api/leads/{lead_id}", json={"install_date": "PENDING"}, headers=salesperson_headers)
            time.sleep(0.5)
            
            # Get the task
            tasks_response = requests.get(f"{BASE_URL}/api/tasks?status=pending", headers=salesperson_headers)
            tasks = tasks_response.json()["tasks"]
            task = next((t for t in tasks if t["lead_id"] == lead_id), None)
            assert task is not None, "Task should exist after UPDATE to PENDING"
            task_id = task["task_id"]
            
            # Complete the task manually
            complete_response = requests.put(f"{BASE_URL}/api/tasks/{task_id}/complete", headers=salesperson_headers)
            assert complete_response.status_code == 200
            assert complete_response.json()["message"] == "Task completed"
            
            # Verify task is completed
            all_tasks = requests.get(f"{BASE_URL}/api/tasks", headers=salesperson_headers)
            completed_task = next((t for t in all_tasks.json()["tasks"] if t["task_id"] == task_id), None)
            assert completed_task is not None
            assert completed_task["status"] == "completed"
            print(f"PASS: Task manually completed successfully")
            
        finally:
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=salesperson_headers)


# =============== LEADUPDATE MODEL FIX TESTS ===============

class TestLeadUpdateAdditionalFields:
    """Test that additional_phones, products, sale_accessories, is_self_gen, promo_code now save correctly"""
    
    def test_additional_phones_saves(self, salesperson_headers):
        """Test that additional_phones field saves and returns correctly"""
        # Create a lead
        unique_name = f"TEST_PHONES_{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "name": unique_name,
            "phone": "555-1111",
            "status": "PENDING"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/leads", json=create_payload, headers=salesperson_headers)
        assert create_response.status_code == 200
        lead_id = create_response.json()["lead"]["lead_id"]
        
        try:
            # Update with additional_phones
            additional_phones = [
                {"label": "Work", "number": "555-2222"},
                {"label": "Mobile", "number": "555-3333"}
            ]
            update_payload = {"additional_phones": additional_phones}
            update_response = requests.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_payload, headers=salesperson_headers)
            assert update_response.status_code == 200
            
            # GET the lead and verify additional_phones was saved
            get_response = requests.get(f"{BASE_URL}/api/leads", headers=salesperson_headers)
            leads = get_response.json()["leads"]
            lead = next((l for l in leads if l["lead_id"] == lead_id), None)
            assert lead is not None
            
            assert "additional_phones" in lead, "additional_phones field should exist"
            assert lead["additional_phones"] == additional_phones, f"additional_phones mismatch: {lead['additional_phones']}"
            print(f"PASS: additional_phones saves correctly")
            print(f"  Saved phones: {lead['additional_phones']}")
            
        finally:
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=salesperson_headers)
    
    def test_products_field_saves(self, salesperson_headers):
        """Test that products field saves correctly"""
        unique_name = f"TEST_PRODUCTS_{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "name": unique_name,
            "status": "SALE"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/leads", json=create_payload, headers=salesperson_headers)
        assert create_response.status_code == 200
        lead_id = create_response.json()["lead"]["lead_id"]
        
        try:
            products = [
                {"manufacturer": "Lennox", "model": "XC21"},
                {"manufacturer": "Carrier", "model": "Infinity 26"}
            ]
            update_payload = {"products": products}
            update_response = requests.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_payload, headers=salesperson_headers)
            assert update_response.status_code == 200
            
            # Verify
            get_response = requests.get(f"{BASE_URL}/api/leads", headers=salesperson_headers)
            leads = get_response.json()["leads"]
            lead = next((l for l in leads if l["lead_id"] == lead_id), None)
            assert lead is not None
            assert "products" in lead
            assert lead["products"] == products
            print(f"PASS: products field saves correctly")
            
        finally:
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=salesperson_headers)
    
    def test_sale_accessories_field_saves(self, salesperson_headers):
        """Test that sale_accessories field saves correctly"""
        unique_name = f"TEST_ACCESSORIES_{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "name": unique_name,
            "status": "SALE"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/leads", json=create_payload, headers=salesperson_headers)
        assert create_response.status_code == 200
        lead_id = create_response.json()["lead"]["lead_id"]
        
        try:
            accessories = [
                {"name": "Thermostat", "price": "250"},
                {"name": "Air Purifier", "price": "500"}
            ]
            update_payload = {"sale_accessories": accessories}
            update_response = requests.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_payload, headers=salesperson_headers)
            assert update_response.status_code == 200
            
            # Verify
            get_response = requests.get(f"{BASE_URL}/api/leads", headers=salesperson_headers)
            leads = get_response.json()["leads"]
            lead = next((l for l in leads if l["lead_id"] == lead_id), None)
            assert lead is not None
            assert "sale_accessories" in lead
            assert lead["sale_accessories"] == accessories
            print(f"PASS: sale_accessories field saves correctly")
            
        finally:
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=salesperson_headers)
    
    def test_is_self_gen_field_saves(self, salesperson_headers):
        """Test that is_self_gen boolean field saves correctly"""
        unique_name = f"TEST_SELFGEN_{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "name": unique_name,
            "status": "SALE"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/leads", json=create_payload, headers=salesperson_headers)
        assert create_response.status_code == 200
        lead_id = create_response.json()["lead"]["lead_id"]
        
        try:
            # Test setting to True
            update_payload = {"is_self_gen": True}
            update_response = requests.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_payload, headers=salesperson_headers)
            assert update_response.status_code == 200
            
            # Verify
            get_response = requests.get(f"{BASE_URL}/api/leads", headers=salesperson_headers)
            leads = get_response.json()["leads"]
            lead = next((l for l in leads if l["lead_id"] == lead_id), None)
            assert lead is not None
            assert "is_self_gen" in lead
            assert lead["is_self_gen"] == True
            print(f"PASS: is_self_gen=True saves correctly")
            
            # Test setting to False
            update_payload = {"is_self_gen": False}
            update_response = requests.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_payload, headers=salesperson_headers)
            assert update_response.status_code == 200
            
            get_response = requests.get(f"{BASE_URL}/api/leads", headers=salesperson_headers)
            leads = get_response.json()["leads"]
            lead = next((l for l in leads if l["lead_id"] == lead_id), None)
            assert lead["is_self_gen"] == False
            print(f"PASS: is_self_gen=False saves correctly")
            
        finally:
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=salesperson_headers)
    
    def test_promo_code_field_saves(self, salesperson_headers):
        """Test that promo_code field saves correctly"""
        unique_name = f"TEST_PROMO_{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "name": unique_name,
            "status": "SALE"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/leads", json=create_payload, headers=salesperson_headers)
        assert create_response.status_code == 200
        lead_id = create_response.json()["lead"]["lead_id"]
        
        try:
            promo_code = "WINTER2026"
            update_payload = {"promo_code": promo_code}
            update_response = requests.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_payload, headers=salesperson_headers)
            assert update_response.status_code == 200
            
            # Verify
            get_response = requests.get(f"{BASE_URL}/api/leads", headers=salesperson_headers)
            leads = get_response.json()["leads"]
            lead = next((l for l in leads if l["lead_id"] == lead_id), None)
            assert lead is not None
            assert "promo_code" in lead
            assert lead["promo_code"] == promo_code
            print(f"PASS: promo_code field saves correctly")
            
        finally:
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=salesperson_headers)
    
    def test_all_new_fields_together(self, salesperson_headers):
        """Test updating all new fields together"""
        unique_name = f"TEST_ALL_FIELDS_{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "name": unique_name,
            "status": "SALE",
            "ticket_value": 10000
        }
        
        create_response = requests.post(f"{BASE_URL}/api/leads", json=create_payload, headers=salesperson_headers)
        assert create_response.status_code == 200
        lead_id = create_response.json()["lead"]["lead_id"]
        
        try:
            # Update with all new fields
            update_payload = {
                "additional_phones": [{"label": "Alt", "number": "555-9999"}],
                "products": [{"manufacturer": "Trane", "model": "XV20i"}],
                "sale_accessories": [{"name": "UV Light", "price": "350"}],
                "is_self_gen": True,
                "promo_code": "BIGDEAL"
            }
            update_response = requests.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_payload, headers=salesperson_headers)
            assert update_response.status_code == 200
            
            # Verify all fields saved
            get_response = requests.get(f"{BASE_URL}/api/leads", headers=salesperson_headers)
            leads = get_response.json()["leads"]
            lead = next((l for l in leads if l["lead_id"] == lead_id), None)
            assert lead is not None
            
            assert lead["additional_phones"] == update_payload["additional_phones"]
            assert lead["products"] == update_payload["products"]
            assert lead["sale_accessories"] == update_payload["sale_accessories"]
            assert lead["is_self_gen"] == True
            assert lead["promo_code"] == "BIGDEAL"
            print(f"PASS: All new fields save correctly together")
            
        finally:
            requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=salesperson_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
