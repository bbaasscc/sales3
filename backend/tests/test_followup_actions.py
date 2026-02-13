"""
Test suite for Follow-up Actions feature (Email/SMS templates)
Tests the new email and SMS action tracking functionality
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFollowupActionsAPI:
    """Tests for Follow-up Actions endpoints"""
    
    def test_get_followup_actions(self):
        """GET /api/followup/actions - should return list of actions"""
        response = requests.get(f"{BASE_URL}/api/followup/actions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "actions" in data, "Response should have 'actions' key"
        assert isinstance(data["actions"], list), "Actions should be a list"
        
        # Verify existing action for EDITH RODRIGUEZ
        edith_actions = [a for a in data["actions"] if a.get("client_name") == "EDITH RODRIGUEZ"]
        if edith_actions:
            action = edith_actions[0]
            assert action.get("action_type") == "email", "EDITH's action should be email"
            assert action.get("template_id") == 1, "EDITH's action should be template 1"
        print(f"GET actions: Found {len(data['actions'])} actions")
    
    def test_post_email_action(self):
        """POST /api/followup/action - record email action"""
        payload = {
            "client_name": "TEST_CLIENT_EMAIL",
            "client_email": "test@example.com",
            "action_type": "email",
            "template_id": 2
        }
        response = requests.post(f"{BASE_URL}/api/followup/action", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert data["message"] == "Action recorded", f"Unexpected message: {data['message']}"
        assert "action" in data, "Response should have action object"
        
        action = data["action"]
        assert action["client_name"] == "TEST_CLIENT_EMAIL"
        assert action["action_type"] == "email"
        assert action["template_id"] == 2
        assert "timestamp" in action
        print(f"POST email action: {action}")
    
    def test_post_sms_action(self):
        """POST /api/followup/action - record SMS action"""
        payload = {
            "client_name": "TEST_CLIENT_SMS",
            "client_email": "sms@example.com",
            "action_type": "sms",
            "template_id": 3
        }
        response = requests.post(f"{BASE_URL}/api/followup/action", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["action"]["action_type"] == "sms"
        assert data["action"]["template_id"] == 3
        print(f"POST SMS action: {data['action']}")
    
    def test_post_action_all_templates(self):
        """POST /api/followup/action - test all 4 templates for both types"""
        templates_tested = 0
        for action_type in ["email", "sms"]:
            for template_id in [1, 2, 3, 4]:
                payload = {
                    "client_name": f"TEST_TEMPLATE_{action_type}_{template_id}",
                    "client_email": f"template{template_id}@test.com",
                    "action_type": action_type,
                    "template_id": template_id
                }
                response = requests.post(f"{BASE_URL}/api/followup/action", json=payload)
                assert response.status_code == 200, f"Failed for {action_type} template {template_id}"
                templates_tested += 1
        print(f"POST all templates: {templates_tested} templates recorded successfully")
    
    def test_verify_actions_persisted(self):
        """Verify that posted actions are persisted in MongoDB"""
        response = requests.get(f"{BASE_URL}/api/followup/actions")
        assert response.status_code == 200
        
        data = response.json()
        actions = data["actions"]
        
        # Check TEST_CLIENT_EMAIL exists
        email_actions = [a for a in actions if a.get("client_name") == "TEST_CLIENT_EMAIL"]
        assert len(email_actions) >= 1, "TEST_CLIENT_EMAIL action should be persisted"
        
        # Check TEST_CLIENT_SMS exists
        sms_actions = [a for a in actions if a.get("client_name") == "TEST_CLIENT_SMS"]
        assert len(sms_actions) >= 1, "TEST_CLIENT_SMS action should be persisted"
        
        print(f"Verification: Total actions in DB: {len(actions)}")
    
    def test_delete_action(self):
        """DELETE /api/followup/action - remove a specific action"""
        # First create an action to delete
        payload = {
            "client_name": "TEST_DELETE_ME",
            "client_email": "delete@test.com",
            "action_type": "email",
            "template_id": 1
        }
        create_response = requests.post(f"{BASE_URL}/api/followup/action", json=payload)
        assert create_response.status_code == 200
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/followup/action",
            params={
                "client_name": "TEST_DELETE_ME",
                "action_type": "email",
                "template_id": 1
            }
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        data = delete_response.json()
        assert "deleted" in data
        assert data["deleted"] >= 1, "Should have deleted at least 1 action"
        print(f"DELETE action: Deleted {data['deleted']} records")
    
    def test_delete_nonexistent_action(self):
        """DELETE /api/followup/action - handle nonexistent action gracefully"""
        delete_response = requests.delete(
            f"{BASE_URL}/api/followup/action",
            params={
                "client_name": "NONEXISTENT_CLIENT",
                "action_type": "email",
                "template_id": 99
            }
        )
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data["deleted"] == 0, "Should delete 0 records for nonexistent"
        print(f"DELETE nonexistent: Correctly returned deleted=0")


class TestDashboardWithFollowups:
    """Tests for dashboard KPIs endpoint - verifying follow-ups are returned"""
    
    def test_kpis_include_follow_ups(self):
        """GET /api/dashboard/kpis should include follow_ups array"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis")
        assert response.status_code == 200
        
        data = response.json()
        assert "follow_ups" in data, "KPIs should include follow_ups"
        assert isinstance(data["follow_ups"], list)
        
        if len(data["follow_ups"]) > 0:
            follow_up = data["follow_ups"][0]
            # Verify follow-up structure
            assert "name" in follow_up, "Follow-up should have name"
            assert "follow_up_date" in follow_up, "Follow-up should have follow_up_date"
            assert "days_until" in follow_up, "Follow-up should have days_until"
            assert "is_urgent" in follow_up, "Follow-up should have is_urgent"
            print(f"Dashboard follow-ups: {len(data['follow_ups'])} follow-ups found")
            print(f"First follow-up: {follow_up['name']} - {follow_up['follow_up_date']}")
        else:
            print("Dashboard follow-ups: No follow-ups in current period")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self):
        """Clean up TEST_ prefixed data after tests"""
        response = requests.get(f"{BASE_URL}/api/followup/actions")
        data = response.json()
        
        deleted_count = 0
        for action in data.get("actions", []):
            if action.get("client_name", "").startswith("TEST_"):
                del_response = requests.delete(
                    f"{BASE_URL}/api/followup/action",
                    params={
                        "client_name": action["client_name"],
                        "action_type": action["action_type"],
                        "template_id": action["template_id"]
                    }
                )
                if del_response.status_code == 200:
                    deleted_count += del_response.json().get("deleted", 0)
        
        print(f"Cleanup: Deleted {deleted_count} test records")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
