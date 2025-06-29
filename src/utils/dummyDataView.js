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
          "type": "text",
          "label": "Due Date",
          "name": "due_date"
      },
      {
          "type": "select",
          "label": "Sprint",
          "props": {
              "optionsData": [
                  {
                      "label": "Sprint 1",
                      "value": "sprint-1"
                  },
                  {
                      "label": "Sprint 2",
                      "value": "sprint-2"
                  },
                  {
                      "label": "Sprint 3",
                      "value": "sprint-3"
                  }
              ]
          },
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
          "title": "Design System Implementation",
          "status": "todo",
          "priority": "high",
          "assignee": "sarah_johnson",
          "due_date": "2025-07-15",
          "sprint": "sprint-1",
          "type": "feature",
          "description": "Implement the design system components for the new dashboard"
      },
      {
          "id": "task-2",
          "task_id": "BNH-002",
          "title": "User Authentication API",
          "status": "in-progress",
          "priority": "critical",
          "assignee": "muhtasim_fuad_fahim",
          "due_date": "2025-07-10",
          "sprint": "sprint-1",
          "type": "backend",
          "description": "Develop secure user authentication endpoints"
      },
      {
          "id": "task-3",
          "task_id": "BNH-003",
          "title": "Mobile Responsive Layout",
          "status": "review",
          "priority": "medium",
          "assignee": "alex_chen",
          "due_date": "2025-07-12",
          "sprint": "sprint-1",
          "type": "frontend",
          "description": "Make the application responsive for mobile devices"
      },
      {
          "id": "task-4",
          "task_id": "BNH-004",
          "title": "Database Migration Scripts",
          "status": "done",
          "priority": "medium",
          "assignee": "mahmudul_hasan",
          "due_date": "2025-07-05",
          "sprint": "sprint-1",
          "type": "backend",
          "description": "Create migration scripts for the new database schema"
      },
      {
          "id": "task-5",
          "task_id": "BNH-005",
          "title": "Unit Test Coverage",
          "status": "todo",
          "priority": "medium",
          "assignee": "alex_chen",
          "due_date": "2025-07-20",
          "sprint": "sprint-2",
          "type": "testing",
          "description": "Increase unit test coverage to 80%"
      },
      {
          "id": "task-6",
          "task_id": "BNH-006",
          "title": "Performance Optimization",
          "status": "in-progress",
          "priority": "high",
          "assignee": "sarah_johnson",
          "due_date": "2025-07-18",
          "sprint": "sprint-2",
          "type": "optimization",
          "description": "Optimize application performance and reduce load times"
      },
      {
          "id": "task-7",
          "task_id": "BNH-007",
          "title": "Documentation Update",
          "status": "review",
          "priority": "low",
          "assignee": "muhtasim_fuad_fahim",
          "due_date": "2025-07-25",
          "sprint": "sprint-2",
          "type": "documentation",
          "description": "Update API documentation with latest changes"
      },
      {
          "id": "task-8",
          "task_id": "BNH-008",
          "title": "Security Audit",
          "status": "done",
          "priority": "critical",
          "assignee": "mahmudul_hasan",
          "due_date": "2025-07-01",
          "sprint": "sprint-1",
          "type": "security",
          "description": "Conduct comprehensive security audit"
      },
      {
          "id": "task-9",
          "task_id": "BNH-009",
          "title": "Email Notification System",
          "status": "todo",
          "priority": "medium",
          "assignee": "alex_chen",
          "due_date": "2025-07-30",
          "sprint": "sprint-3",
          "type": "feature",
          "description": "Implement email notification system for user actions"
      },
      {
          "id": "task-10",
          "task_id": "BNH-010",
          "title": "Dashboard Analytics",
          "status": "in-progress",
          "priority": "high",
          "assignee": "sarah_johnson",
          "due_date": "2025-07-22",
          "sprint": "sprint-2",
          "type": "feature",
          "description": "Create analytics dashboard with charts and metrics"
      },
      {
          "id": "task-11",
          "task_id": "BNH-011",
          "title": "API Rate Limiting",
          "status": "review",
          "priority": "high",
          "assignee": "muhtasim_fuad_fahim",
          "due_date": "2025-07-14",
          "sprint": "sprint-1",
          "type": "backend",
          "description": "Implement rate limiting for API endpoints"
      },
      {
          "id": "task-12",
          "task_id": "BNH-012",
          "title": "Code Review Process",
          "status": "done",
          "priority": "medium",
          "assignee": "mahmudul_hasan",
          "due_date": "2025-06-28",
          "sprint": "sprint-1",
          "type": "process",
          "description": "Establish code review process and guidelines"
      }
  ]
  };
};

// Default export for backward compatibility
export default getDummyDataView();