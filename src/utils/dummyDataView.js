// Notion Table SRS: https://silicon-gem-624.notion.site/Table-SRS-8334d652e48c4dcb80b884fc24c25190?pvs=4

export default {
  "property_name": [ // column name or table heading
      /*
      *
      * Text fields where user will write something
      */
      {
          // ...
          "type": "text",
          "label": "Task ID",
          "name": "task_id"
      },
      /*
      *
      * Select field with predefind values
      */
      {
          //...
          "type": "select",
          "label": "Assignee",
          "props": { // all the member list those are in the notion team
              "optionsData": [
                  {
                      "label": "Muhtasim Fuad Fahim",
                      "value": "muhtasim_fuad_fahim"
                  },
                  {
                      "label": "Mahmudul Hasan",
                      "value": "mahmudul_hasan"
                  }
              ]
          },
          "name": "assignee"
      },
      {
          //...
          "type": "select",
          "label": "Priority",
          "props": {
              "optionsData": [
                  {
                      "label": "Low",
                      "value": "Low"
                  },
                  {
                      "label": "Medium",
                      "value": "Medium"
                  },
                  {
                      "label": "High",
                      "value": "High"
                  }
              ]
          },
          "name": "priority"
          // ...
      },
      /*
      *
      * Select feild but have to call on API for values
      */
      {
          // ...
          "type": "select",
          "label": "Sprint",
          "props": {
              "searchColumn": "sprint",
              "searchLabel": "sprint_structure",
              "optionsApi": "http://lcoalhost:3000/component/modules/sprint-structure"
          },
          "name": "sprint"
          // ...
      },
      {
          // ...
          "type": "select",
          "label": "Requirements",
          "props": {
              "searchColumn": "requirements",
              "searchLabel": "requirements_structure",
              "optionsApi": "http://lcoalhost:3000/component/modules/requirements-structure"
          },
          "name": "requirements"
          // ...
      }
  ],
  "property_values": [ // column values or table body or data
      // each objects from the property_name array will take place in one object
      {
          // ...
          "task_id": "BNH-3",
          "title": "Task Title",
          "sprint": "Sprint 1",
          "priority": "Low",
          "assignee": "muhtasim_fuad_fahim", // value 
          "requirements": "document_id" // any document id so that user can link it here
      },
      {
          // ...
          "task_id": "BNH-4",
          "title": "Task Title 2",
          "sprint": "Sprint 1",
          "priority": "Low",
          "assignee": "",
          "requirements": ""
      }
  ]
}