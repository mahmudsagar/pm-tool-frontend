// Demo data for table and kanban views
import useStatusStore from '@/stores/useStatusStore';

// Function to get dummy data with dynamic status options
export const getDummyDataView = () => {
  const statusOptions = useStatusStore.getState().getStatusOptions();
  
  return {
    "property_name": [ // column name or table heading
        {
            "type": "text",
            "label": "Task ID",
            "name": "task_id"
        },
        {
            "type": "text",
            "label": "Title",
            "name": "title"
        },
        {
            "type": "text",
            "label": "Description",
            "name": "description"
        },
        {
            "type": "select",
            "label": "Status",
            "props": {
                "optionsData": statusOptions
            },
            "name": "status"
        },
      {
          "type": "select",
          "label": "Assignee",
          "props": {
              "optionsData": [
                  {
                      "label": "Muhtasim Fuad Fahim",
                      "value": "muhtasim_fuad_fahim"
                  },
                  {
                      "label": "Mahmudul Hasan",
                      "value": "mahmudul_hasan"
                  },
                  {
                      "label": "Sarah Johnson",
                      "value": "sarah_johnson"
                  },
                  {
                      "label": "Alex Chen",
                      "value": "alex_chen"
                  }
              ]
          },
          "name": "assignee"
      },
      {
          "type": "select",
          "label": "Priority",
          "props": {
              "optionsData": [
                  {
                      "label": "Low",
                      "value": "low"
                  },
                  {
                      "label": "Medium",
                      "value": "medium"
                  },
                  {
                      "label": "High",
                      "value": "high"
                  },
                  {
                      "label": "Critical",
                      "value": "critical"
                  }
              ]
          },
          "name": "priority"
      },
      {
          "type": "date",
          "label": "Due Date",
          "name": "due_date"
      },
      {
          "type": "date",
          "label": "Start Date",
          "name": "start_date"
      },
      {
          "type": "text",
          "label": "Sprint",
          "name": "sprint"
      },
      {
          "type": "text",
          "label": "Type",
          "name": "type"
      }
  ],
  "property_values": [ // column values or table body or data
      {
          "id": "task-1",
          "task_id": "BNH-001",
          "title": "Implement user authentication system",
          "description": "Create login/logout functionality with JWT tokens and secure session management.",
          "status": "in-progress",
          "priority": "high",
          "assignee": "muhtasim_fuad_fahim",
          "due_date": new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday (overdue)
          "start_date": new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], // Week ago
          "sprint": "Sprint 1",
          "type": "feature"
      },
      {
          "id": "task-2",
          "task_id": "BNH-002",
          "title": "Design database schema",
          "description": "Create comprehensive database design for user management and content storage.",
          "status": "done",
          "priority": "high",
          "assignee": "mahmudul_hasan",
          "due_date": new Date().toISOString().split('T')[0], // Today
          "start_date": new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0], // 3 days ago
          "sprint": "Sprint 1",
          "type": "backend"
      },
      {
          "id": "task-3",
          "task_id": "BNH-003",
          "title": "Create responsive dashboard layout",
          "description": "Build modern dashboard with sidebar navigation and responsive grid system.",
          "status": "todo",
          "priority": "medium",
          "assignee": "sarah_johnson",
          "due_date": new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
          "start_date": new Date().toISOString().split('T')[0], // Today
          "sprint": "Sprint 1",
          "type": "frontend"
      },
      {
          "id": "task-4",
          "task_id": "BNH-004",
          "title": "API endpoint testing",
          "description": "Comprehensive testing of all REST API endpoints with automated test suite.",
          "status": "review",
          "priority": "medium",
          "assignee": "alex_chen",
          "due_date": new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], // 5 days from now
          "start_date": new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
          "sprint": "Sprint 2",
          "type": "testing"
      },
      {
          "id": "task-5",
          "task_id": "BNH-005",
          "title": "Security vulnerability audit",
          "description": "Perform comprehensive security audit and implement necessary fixes.",
          "status": "todo",
          "priority": "critical",
          "assignee": "muhtasim_fuad_fahim",
          "due_date": new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], // 2 weeks from now
          "start_date": new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], // Next week
          "sprint": "Sprint 2",
          "type": "security"
      },
      {
          "id": "task-6",
          "task_id": "BNH-006",
          "title": "Update project documentation",
          "description": "Comprehensive update of API documentation and user guides.",
          "status": "todo",
          "priority": "low",
          "assignee": "sarah_johnson",
          "due_date": null, // No date
          "start_date": null,
          "sprint": "Sprint 3",
          "type": "documentation"
      }
  ]
  };
};

// Default export for backward compatibility
export default getDummyDataView();