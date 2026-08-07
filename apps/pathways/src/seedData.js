// Seeded from "MOC 2 Test Cases Rev 1.xlsx" (Tallgrass MOC 2, 2026-07-24)
export const SEED = {
 "suites": [
  {
   "id": "ts1",
   "name": "MOC 2 Test Cases",
   "description": "Tallgrass MOC 2 — functional test cases (Rev 1)",
   "caseIds": [
    "tc001",
    "tc002",
    "tc003",
    "tc004",
    "tc005",
    "tc006",
    "tc007",
    "tc008",
    "tc009",
    "tc010",
    "tc011",
    "tc012",
    "tc013",
    "tc014",
    "tc015",
    "tc016",
    "tc017",
    "tc018",
    "tc019",
    "tc020",
    "tc021",
    "tc022",
    "tc023",
    "tc024",
    "tc025",
    "tc026",
    "tc027",
    "tc028",
    "tc029",
    "tc030",
    "tc031"
   ],
   "requirementTypes": [
    {
     "id": "rq1",
     "kind": "screenshot",
     "label": "Screenshot required"
    },
    {
     "id": "rq2",
     "kind": "returnValue",
     "label": "Return value required"
    }
   ]
  },
  {
   "id": "ts2",
   "name": "Negative Test Cases",
   "description": "Error handling and validation-gate scenarios",
   "caseIds": [
    "tc032",
    "tc033",
    "tc034",
    "tc035",
    "tc036",
    "tc037",
    "tc038",
    "tc039",
    "tc040"
   ],
   "requirementTypes": [
    {
     "id": "rq3",
     "kind": "screenshot",
     "label": "Screenshot required"
    }
   ]
  }
 ],
 "cases": [
  {
   "id": "tc001",
   "name": "Role 1 - MOC Coordinator / Initiator: Create and Submit MOC",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc001s1",
     "order": 1,
     "action": "Log in to Maximo as the MOC Coordinator. Open the MOC (HSE) application (plusgmoc) and click Common Actions > New MOC.",
     "expected": "A new MOC record is created with an auto-generated MOC number and Status = NEW. Initiator and Site (TG) default from the logged-in user. NOTE: MOC Coordinator does not default and must be entered manually.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc001s2",
     "order": 2,
     "action": "On the MOC tab, enter the Description. Populate the MOC Coordinator. Initiator field should auto-populate on new record creation.",
     "expected": "Description and MOC Coordinator are accepted; required-field indicators remain until all mandatory fields are filled.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc001s3",
     "order": 3,
     "action": "In Change Details set MOC Type = Permanent (options: Emergency (Temporary) / Permanent / Temporary). Set Scheduled Start/In-Service/Finish and PSM Facility?/AFE Project? as applicable.",
     "expected": "MOC Type saves. If Temporary is chosen, Temporary Until becomes required.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc001s4",
     "order": 4,
     "action": "Select a valid Classification (Class Description auto-fills). Enter Scope and Reason for Change (both required).",
     "expected": "Classification and Class Description populate; Scope and Reason for Change required indicators clear.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc001s5",
     "order": 5,
     "action": "In Change Impact(s) enter the required Impact. Add Location (required) & Asset (if applicable).",
     "expected": "Impact is accepted; Location/Asset resolve.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc001s6",
     "order": 6,
     "action": "Click Save MOC. If any required field is missing, note the error and complete the listed fields.",
     "expected": "On missing fields, BMXAA7998E lists MOC Coordinator, Scope, Impact, and Reason for Change. Once all are supplied, the record saves (toast BMXAA4205I).",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc001s7",
     "order": 7,
     "action": "In the Risk Determination section answer all Risk Questions, once complete the form will auto-populate the Risk Tier level based on the answers input",
     "expected": "The Risk Tier Level field is READ-ONLY and is derived from the completed Risk Determination questionnaire. Attempting to set it directly from its lookup fails with BMXAA2256E. Answering all questions and saving derives the tier (all No = TIER2); TIER2 generates one Technical Approver row. Answering YES to any question sets the Tier level to Risk Tier 1 and will populate multiple Technical approver rows for later approval.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc001s8",
     "order": 8,
     "action": "Set the Accountable Asset Owner (AAO) role to the responsible user (use the logged-in user). Save.",
     "expected": "AAO is set on the record; required for the AAO approval task later in the workflow.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc001s9",
     "order": 9,
     "action": "Go to the Review and Approve tab. Add the required Technical Approver(s) using the lookup, the Technical Authority type field will be auto-populated with the respective assigned type based on the Tehcnical approver selected. Save.",
     "expected": "The Technical Approver row is added from the lookup (populated only after risk questions are answered). Free-text entry fails with BMXAA8123E. Save succeeds (BMXAA4205I).",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc001s10",
     "order": 10,
     "action": "Start the workflow via Workflow > Route Workflow. In the Complete Workflow Assignment dialog keep the forward action (Submit for Approval), add a memo, and click OK.",
     "expected": "Process TGMOC_MAJ starts; record routes NEW -> WAPPR (active node RISKASSESSMENT). 'Initiate MOC' action fails with BMXAA4042E. Toast BMXAA4413I confirms assignments were created.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc001s11",
     "order": 11,
     "action": "Confirm submission via Workflow > View Workflow History / View Workflow Map.",
     "expected": "Workflow History logs the Process TGMOC_MAJ transactions; the map shows the active WAPPR node and the pending approver assignment.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc002",
   "name": "Role 2 - Technical Approver (TECHSERVICES): Technical Review and Approval",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc002s1",
     "order": 1,
     "action": "Log in as the Technical Approver assigned in Role 1. Open the record from the workflow inbox / MOC (HSE) (Status = WAPPR).",
     "expected": "The MOC record opens at Status = WAPPR with a pending WAPPR_APPROVERS assignment for this user.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc002s2",
     "order": 2,
     "action": "Review the Change Details, Scope, Impact, and Risk Determination for technical accuracy.",
     "expected": "All change information is visible and read-appropriate for the approver role.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc002s3",
     "order": 3,
     "action": "On the Review and Approve tab, under the Technical Approver row (sub-menu), answer the Hazard Assessment Questions using the Answer value list (Yes / No / NA); use a mix of Yes and No. Then confirm the Technical Approver 'Completed?' toggle is enabled (it auto-enables and stamps a Completed Date once the questions are answered). Save.",
     "expected": "All Hazard Assessment answers save; the 'Completed?' toggle turns on and a Completed Date is stamped. Approved? must also be enabled (Sign Off Date stamps). If the hazard assessment is incomplete, routing to APPR is blocked.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc002s4",
     "order": 4,
     "action": "Route the record: Workflow > Route Workflow > WAPPR_APPROVERS 'Route to possible statuses', then on the Manual Input node choose 'Route to Approved' (Submit for Approval). Add a memo and click OK.",
     "expected": "Route Workflow on the WAPPR assignment offers Accept, then Manual Input 'Route to Approved' / 'Return for Revision'. Route to Approved advances the record to APPR.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc002s5",
     "order": 5,
     "action": "Alternate (rejection): on the Manual Input node choose 'Route to Revise' instead of Approved.",
     "expected": "The record routes back to the initiator / revise path (MOC_REVISE) for rework rather than advancing to APPR.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc003",
   "name": "Role 3 - Accountable Asset Owner (AAO): Approval and Post-Start Review",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc003s1",
     "order": 1,
     "action": "Log in as the Accountable Asset Owner set in Role 1. Open the MOC record (approval in progress).",
     "expected": "The record opens; the AAO_REVIEW assignment is pending for this user.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc003s2",
     "order": 2,
     "action": "Verify the Accountable Asset Owner field is populated on the record before the approval routes.",
     "expected": "If AAO is blank, approval fails with BMXAA4473E: 'the assignments created for task AAO_REVIEW ... do not include an owner for the task.' With AAO set, routing proceeds.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc003s3",
     "order": 3,
     "action": "Complete the AAO approval: route the approval decision to Approved.",
     "expected": "After Technical Approver Route to Approved the status is APPR. Completing Pre-Start Actions and routing 'Execute Post-Start Actions' advances APPR→POSTSTART. AAO review occurs at POSTSTART.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc003s4",
     "order": 4,
     "action": "At POSTSTART, open the pending 'AAO Review' assignment (Workflow > Route Workflow). Review post-start items and choose 'Route to Complete'. Add a memo and click OK.",
     "expected": "At POSTSTART, open the pending 'Complete Post-Start Action Review (AAO)' assignment. Completing it advances the record POSTSTART→COMP.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc004",
   "name": "Role 4 - MOC Coordinator: Completion Actions and Closure Review",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc004s1",
     "order": 1,
     "action": "Log in as the MOC Coordinator. Open the MOC record at Status = POSTSTART.",
     "expected": "The record opens; Pre-Start and Post-Start Action tables are visible on the Implementation tab.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc004s2",
     "order": 2,
     "action": "On the Implementation tab, complete any required Post-Start Actions (mark Completed? = Yes with Completed By / Sign Off).",
     "expected": "Post-Start action rows are marked complete; ALL_POSTSTART_COMP? evaluates whether all are done.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc004s3",
     "order": 3,
     "action": "Complete the Completion Actions (COMP_ACTIONS) and route the record toward COMP (Complete MOC / Route Workflow).",
     "expected": "VERIFIED this run: routing forward is no longer blocked by the COMP_ACTIONS owner gate. From COMP, completing the Impacted Assignee Reviews advances the record COMP -> POSTCOMP. Toast BMXAA4411I (Process TGMOC_MAJ started) is observed on the forward route.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc004s4",
     "order": 4,
     "action": "Complete the Closure Review (COORD_REVIEW): enter Closure Actions and Closure Review (Coordinator Closure Comments) on the Implementation tab, then route.",
     "expected": "Completing the Impacted Assignee Reviews from COMP advances the record to POSTCOMP; the TGMOC_MAJ process then completes (Process Stopped in Workflow History). Closure comments are retained on the record and in Workflow History. Final closure to CLOSE is performed via the Close MOC action.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc005",
   "name": "Role 5 - Impacted User: Acknowledgement and Close",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc005s1",
     "order": 1,
     "action": "Log in as an impacted reviewer identified on the MOC. Open the record and go to the Impacted section on the Review and Approve tab.",
     "expected": "The impacted reviewer is listed in the Impacted section on the Review and Approve tab, with a 'Reviewed?' toggle for that reviewer.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc005s2",
     "order": 2,
     "action": "Review the change details, then enable the 'Reviewed?' toggle for the impacted reviewer row. Save.",
     "expected": "Enabling the impacted reviewer's 'Reviewed?' toggle stamps Reviewed By (logged-in user) and a Sign Off Date. This satisfies the COMP-stage gate 'Impacted Reviewers Need to Review'.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc005s3",
     "order": 3,
     "action": "Once all impacted reviewers are marked reviewed, the MOC Coordinator can route the record forward from COMP (Complete Impacted Assignee Reviews).",
     "expected": "At COMP, after all Impacted Reviewed? toggles are On: (1) Route Workflow → 'Submit Completed MOC for Review by Coordinator', then (2) Route Workflow → 'Coordinator Completes MOC'. Status advances COMP→POSTCOMP and Process TGMOC_MAJ stops (BMXAA4412I).",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc006",
   "name": "MOC: Coordinator Plans the MOC - MOC Tab",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc006s1",
     "order": 1,
     "action": "Role: MOC Coordinator, log into Maximo",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s2",
     "order": 2,
     "action": "At the Start Center, confirm you are at the Start Center labeled MOC Coordinator",
     "expected": "Depending on your set up there may be additional Start Center Tab options",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s3",
     "order": 3,
     "action": "On the MOC Coordinator Start Center, go to the query 'All Open MOCs'",
     "expected": "All Open MOCs is visible and shows MOCs assigned to the logged in MOC Coordinator",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s4",
     "order": 4,
     "action": "Click on the MOC created previously",
     "expected": "The MOC is opened in the MOC (HSE) application.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s5",
     "order": 5,
     "action": "Click on the Attachments icon, and select Add New Attachments | Add New File. Click Browse to select a file. Name the document. Click OK.",
     "expected": "You are able to attach a file to the MOC.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s6",
     "order": 6,
     "action": "Note the Initiator, On Behalf Of, MOC Coordinator, and Accountable Asset Owner fields under User Information.",
     "expected": "The 'User Information' section contains Initiator (read-only, defaults to logged-in user), On Behalf Of, MOC Coordinator and Accountable Asset Owner. All editable fields have an informational icon. NOTE: there is no Requester or DMR field on this build.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s7",
     "order": 7,
     "action": "Note the Location, Asset, Project ID, MOC Type, Classification, Class Description, and Priority fields.",
     "expected": "These fields are present under Change Details / Change Impact(s). All are editable. Asset and Location have hover-over info boxes showing Asset and Location details. NOTE: there is no Operating Procedure field on the MOC tab.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s8",
     "order": 8,
     "action": "Note the Reason for Change, Scope, and Impact fields.",
     "expected": "All fields are required to save. All allow for 4000 characters of text entry. All have editable Long Descriptions.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s9",
     "order": 9,
     "action": "Update the Location.",
     "expected": "Update the Location. Expected: AAO is updated according to the new location's Accountable Asset Owner (shown in the Location Select Value list). NOTE: there is no DMR field on this build.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s10",
     "order": 10,
     "action": "Open MOC Type dropdown.",
     "expected": "Emergency (Temporary), Permanent, and Temporary can be selected. If either Temporary option is selected, Temporary flag is checked and Temporary Until Date becomes required.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s11",
     "order": 11,
     "action": "Classify the Classification field.",
     "expected": "Organizational, Physical, Procedural, Technology are selectable options.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s12",
     "order": 12,
     "action": "Add a new row to the Multiple Locations/Assets table. Select a different Location than on the MOC Record header.",
     "expected": "User can add a location. Table columns show Asset, Location, Target Description, Sequence, Mark Progress?, and Site. NOTE: a Configuration Item field exists on the row detail panel (not as a table column).",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s13",
     "order": 13,
     "action": "Note the date fields in Change Details and the Execution Summary section.",
     "expected": "Change Details shows Scheduled Start, Scheduled In-Service, Scheduled Finish, and Temporary Until (Temporary Until is required/editable when the MOC is a Temporary type). Execution Summary shows Actual Start, Actual Finish, Changed Date, and Changed By. NOTE: there is no separate Target Start, Target Finish, Requested Date, or In Service Date field on this build.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s14",
     "order": 14,
     "action": "Note required fields.",
     "expected": "Description, Scope, Reason for Change, Impact and MOC Coordinator are required to save and have an asterisk *. The wider list (Initiator, AAO, Description, MOC Type, Classification, Scheduled Start / In-Service / Finish, Scope, Reason for Change, Impact, Location) is enforced at Route Workflow. NOTE: there is no DMR field on this build.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s15",
     "order": 15,
     "action": "Navigate to all tabs.",
     "expected": "Each tab should contain the following fields: - MOC # (read-only on all tabs)- MOC Description (read-only on all tabs but MOC)- MOC Type (read-only on all tabs but MOC)- Status (read-only)- Attachments",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc006s16",
     "order": 16,
     "action": "Save the record.",
     "expected": "MOC can be saved.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc007",
   "name": "MOC: Coordinator Plans the MOC - Related Records",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc007s1",
     "order": 1,
     "action": "Continuing with the MOC created previously, click on the Related Records tab",
     "expected": "The Related Records screen opens",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc007s2",
     "order": 2,
     "action": "In the Related Work Orders section, you can click on any related record types",
     "expected": "The system will redirect the user to the related record chosen",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc007s3",
     "order": 3,
     "action": "End of test",
     "expected": "",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc008",
   "name": "MOC: Risk Determination Tier 1",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc008s1",
     "order": 1,
     "action": "Open a new MOC record or continue with a record with only the initial required fields filled",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc008s2",
     "order": 2,
     "action": "Input \"Yes\" for at least one of the Risk Determination questions",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc008s3",
     "order": 3,
     "action": "Review the Risk Tier Level section",
     "expected": "If at least one question is answered as \"Yes\" then the Risk Tier Level should display as \"TIER1\"",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc009",
   "name": "MOC: Risk Determination Tier 1 Technical Approvers",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc009s1",
     "order": 1,
     "action": "Open a new MOC record or continue with a record with only the Risk Determination questions answered and the Risk Tier Level set as 1",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc009s2",
     "order": 2,
     "action": "Navigate to the Review and Approve tab",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc009s3",
     "order": 3,
     "action": "Review the Technical Approvers section",
     "expected": "The section should contain 16 Technical Approvers with the Technical Authority Type fields pre-selected",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc009s4",
     "order": 4,
     "action": "Input all required Technical Approvers then save the MOC record & click route forward",
     "expected": "Workflow routing prompt appears with the option to \"Route to possible statuses\"",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc009s5",
     "order": 5,
     "action": "With all of the Technical Approvers having the Hazard assessment questions completed and the \"Completed?\" & \"Approved?\" toggles enabled route the workflow forward",
     "expected": "Workflow routing prompt appears with the option to either \"submit for approval\" or \"Return for Revision\"",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc009s6",
     "order": 6,
     "action": "Choose either workflow option",
     "expected": "If the option \"submit for approval\" has been selected the status of the MOC record should now be \"POSTSTART\" if the option of \"Return for Revision\" was selected the record should be in a \"REVISE\" Status",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc010",
   "name": "MOC: Risk Determination Tier 2",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc010s1",
     "order": 1,
     "action": "Open a new MOC record or continue with a record with only the initial required fields filled",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc010s2",
     "order": 2,
     "action": "Input \"No\" for atllof the Risk Determination questions",
     "expected": "Input \"No\" for all of the Risk Determination questions.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc010s3",
     "order": 3,
     "action": "Review the Risk Tier Level section",
     "expected": "If all questions are answered as \"No\" then the Risk Tier Level displays as \"TIER2\" after the record is saved (the tier is recalculated on Save, not on answer entry).",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc011",
   "name": "MOC: Risk Determination Tier 2 Technical Approvers",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc011s1",
     "order": 1,
     "action": "Open a new MOC record or continue with a record with only the Risk Determination questions answered and the Risk Tier Level set as 2",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc011s2",
     "order": 2,
     "action": "Navigate to the Review and Approve tab",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc011s3",
     "order": 3,
     "action": "Review the Technical Approvers section",
     "expected": "The section should contain 1 Technical Approver row with no fields pre-selected",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc011s4",
     "order": 4,
     "action": "Input all required Technical Approvers then save the MOC record & click route forward",
     "expected": "Workflow routing prompt appears with the option to \"Route to possible statuses\"",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc011s5",
     "order": 5,
     "action": "With all of the Technical Approvers having the Hazard assessment questions completed and the \"Completed?\" & \"Approved?\" toggles enabled route the workflow forward",
     "expected": "Workflow routing prompt appears with the option to either \"submit for approval\" or \"Return for Revision\"",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc011s6",
     "order": 6,
     "action": "Choose either workflow option",
     "expected": "If Route to Approved is selected the status advances to APPR (then Execute Post-Start Actions → POSTSTART). Return for Revision was not exercised this run.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc012",
   "name": "MOC: AFE Project Toggle Behavior",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc012s1",
     "order": 1,
     "action": "Role: MOC Coordinator / Initiator - On a new MOC in the Change Details section, enable the AFE Project? toggle.",
     "expected": "The AFE Project? toggle is enabled; the AFE Project Type and Project ID fields become required and editable.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc012s2",
     "order": 2,
     "action": "Attempt to save the record without populating the AFE Project Type and Project ID fields.",
     "expected": "Save is blocked; AFE Project Type and Project ID are required when AFE Project? is true.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc012s3",
     "order": 3,
     "action": "Populate AFE Project Type and Project ID, then review the Risk Determination section.",
     "expected": "With AFE Project fields populated, the Risk Tier Level is read-only (derived from the AFE Project) and the Risk Determination questionnaire is not required.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc012s4",
     "order": 4,
     "action": "Disable the AFE Project? toggle and review the Risk Determination section again.",
     "expected": "With AFE Project? disabled, the Risk Determination questionnaire must be completed to calculate the Risk Tier Level.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc013",
   "name": "MOC: Coordinator Plans the MOC - Review and Approve",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc013s1",
     "order": 1,
     "action": "Role: MOC Coordinator, log into Maximo",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc013s2",
     "order": 2,
     "action": "At the Start Center, confirm you are at the Start Center labeled MOC Coordinator",
     "expected": "Depending on your set up there may be additional Start Center Tab options",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc013s3",
     "order": 3,
     "action": "On the MOC Coordinator Start Center, go to the query 'All Open MOCs'",
     "expected": "All Open MOCs is visible and shows MOCs assigned to the logged in MOC Coordinator",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc013s4",
     "order": 4,
     "action": "Click on the MOC created previously",
     "expected": "The MOC is opened",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc013s5",
     "order": 5,
     "action": "On the MOC tab, update the Scheduled Start and Scheduled Finish Dates",
     "expected": "Dates are displayed in the fields",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc013s6",
     "order": 6,
     "action": "Add any additional information on the MOC tab",
     "expected": "Fields can be updated.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc013s7",
     "order": 7,
     "action": "Go to the Review and Approve Tab",
     "expected": "The Review and Approve tab opens showing the Technical Approvers, Additional Approvers, Impacted, and Notified sections.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc013s8",
     "order": 8,
     "action": "In the Impacted section click on the + button to add a reviewer. Click Select Value next to Reviewer and select a person.",
     "expected": "The Select Value list will open showing the Person ID, Name, Title, Department and Organization . The User chosen will display in the Reviewer field.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc013s9",
     "order": 9,
     "action": "In the Impacted section, click on Actions | Select Reviewer Group. Select a group from the list and click OK.",
     "expected": "The reviewers in the group will be added to the Reviewers table.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc013s10",
     "order": 10,
     "action": "Scroll to the Additional Approvers section. Click on the blue 'Actions' button and Click on Select People. Choose a User listed on this screen.",
     "expected": "Select Approvers screen opens showing the Person ID, Name, Title, Department and Organization. The Person chosen will display in the Approvers field.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc013s11",
     "order": 11,
     "action": "In the Additional Approvers section, click on Actions | Select Approver Group. Select a group from the list and click OK.",
     "expected": "The approvers in the group will be added to the Approvers table.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc013s12",
     "order": 12,
     "action": "Scroll to the Notified Section and click on the + button to add a User to be notified on this MOC. Click Select Value next to Notified and select a person.",
     "expected": "The Select Value list will open and the User chosen will display in the Notified list.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc013s13",
     "order": 13,
     "action": "Click on the SAVE button",
     "expected": "The MOC is saved.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc014",
   "name": "MOC: Impacted vs Notified Assignment",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc014s1",
     "order": 1,
     "action": "Role: MOC Coordinator / Initiator - On the Review and Approve tab, in the Impacted section click the + (or Actions > Select People / Select Approver Group) and add an Impacted user.",
     "expected": "The Impacted user is added. An Impacted user is required before the MOC can be routed for approval.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc014s2",
     "order": 2,
     "action": "In the Notified section, click the + (or Actions) and add a user to be Notified.",
     "expected": "The Notified user is added. Notified is optional and is for informational purposes only - no acknowledgement is required.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc014s3",
     "order": 3,
     "action": "Remove all Impacted users, then attempt to Route the MOC for approval.",
     "expected": "Routing is blocked; at least one Impacted user is required before routing the MOC for approval.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc014s4",
     "order": 4,
     "action": "Re-add at least one Impacted user, then Route the MOC for approval and progress the workflow to COMP.",
     "expected": "With an Impacted user present, the MOC routes and advances through the workflow to COMP.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc014s5",
     "order": 5,
     "action": "At COMP, review the acknowledgement requirements for Impacted vs Notified users.",
     "expected": "Impacted users must provide acknowledgement (Reviewed? toggle) prior to MOC closure; Notified users require no acknowledgement.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc015",
   "name": "MOC: Coordinator Plans the MOC - Pre-Start",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc015s1",
     "order": 1,
     "action": "Continuing with the MOC created previously, click on the Implementation tab and go to the Pre-Start Actions section",
     "expected": "The Pre-Start screen opens",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc015s2",
     "order": 2,
     "action": "Click on the blue Actions button",
     "expected": "Options are Select MOC Actions or Selection MOC Actions Group",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc015s3",
     "order": 3,
     "action": "Click on Select MOC Actions and select a Standard Action",
     "expected": "Select Pre-Start Actions appear and will display in the field once selected",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc015s4",
     "order": 4,
     "action": "Use the down arrow on the MOC action to open the details of the MOC Action",
     "expected": "Additional fields are available",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc015s5",
     "order": 5,
     "action": "Select an Action by from the Select Value list",
     "expected": "The selected value will display in the field",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc015s6",
     "order": 6,
     "action": "Save the record",
     "expected": "Due Date defaults to MOC Scheduled Start date.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc016",
   "name": "MOC: Coordinator Plans the MOC - Post-Start",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc016s1",
     "order": 1,
     "action": "Continuing with the MOC created, click on the Implementation tab and go to the Post-Start Actions section.",
     "expected": "The Post-Start screen opens",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc016s2",
     "order": 2,
     "action": "Add a Post-Start Action using either the + or the blue Actions button.",
     "expected": "Selected Post-Start Action displays in the table.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc016s3",
     "order": 3,
     "action": "Open the additional details button next to the MOC Action and add additional details.",
     "expected": "Additional details can be viewed.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc016s4",
     "order": 4,
     "action": "In the Action By field, select a value from the Select Value list",
     "expected": "The selected value displays in the field",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc016s5",
     "order": 5,
     "action": "Save the record",
     "expected": "Record is saved. NOTE on this build: Due Date is required on Post-Start Actions and does NOT default from the MOC dates - saving without it fails with BMXAA4195E (PLUSGMOCPOSTLIST).",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc017",
   "name": "MOC: Coordinator Submits for Approval",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc017s1",
     "order": 1,
     "action": "Continuing with the MOC from previously created, click on the MOC tab.",
     "expected": "MOC tab is opened.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc017s2",
     "order": 2,
     "action": "With the MOC fully filled out, submit it through Workflow. Click on the Route Workflow button. Options are Submit for Approval and Cancel MOC.",
     "expected": "The Route Workflow dialog displays with the Submit for Approval and Cancel MOC options. MOC Status remains NEW until submitted.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc017s3",
     "order": 3,
     "action": "Choose Submit for Approval and click OK to route the MOC for approval.",
     "expected": "If any of the following fields are not populated, the dialog 'Required Fields are Not Populated' displays: Initiator, Accountable Asset Owner (AAO), Description, MOC Type, Classification, Scheduled Start Date, Scheduled In-Service Date, Scheduled Finish Date, Scope, Reason for Change, Impact, and Location.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc017s4",
     "order": 4,
     "action": "End of Test",
     "expected": "",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc018",
   "name": "MOC: Coordinator Cancels MOC",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc018s1",
     "order": 1,
     "action": "Role: MOC Coordinator - log into Maximo.",
     "expected": "MOC Coordinator Start Center is shown.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc018s2",
     "order": 2,
     "action": "Go to the MOC Coordinator Start Center and note the portlet 'All Open MOCs'",
     "expected": "List of MOC assigned to coordinator are shown.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc018s3",
     "order": 3,
     "action": "Click on a MOC that has not yet completed its Pre-Start Actions (Status = NEW or WAPPR), other than the Full Test MOC. Note: a MOC can only be cancelled or revised up to the Pre-Start phase.",
     "expected": "MOC opens in the MOC (HSE) application and is still eligible for cancellation (Pre-Start Actions not yet complete).",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc018s4",
     "order": 4,
     "action": "Go to the Work Log. Using the + add a new note with a Type = CANCELCOMMENT",
     "expected": "Type is updated and new note added",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc018s5",
     "order": 5,
     "action": "Click on the Route Workflow icon. Options are Submit for Review and Cancel MOC. Choose Cancel MOC and click OK.",
     "expected": "MOC changes to status CAN and becomes read only. Notification email is sent to MOC Requester, Accountable Asset Owner, Reviewers, Approvers, Notified, and any Open Action Assignees.If a cancellation comment wasn't added, an error is displayed.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc018s6",
     "order": 6,
     "action": "End of Test",
     "expected": "",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc019",
   "name": "MOC: Add Additional Reviewers and Additional Approvers (WAPPR)",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc019s1",
     "order": 1,
     "action": "Role: Technical Approver - With the MOC in WAPPR, open the record and go to the Review and Approve tab.",
     "expected": "The Review and Approve tab opens showing the Technical Approvers, Additional Approvers, Impacted, and Notified sections.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc019s2",
     "order": 2,
     "action": "In the Additional Approvers section, click the + to add a new row (or use Actions > Select People / Select Approver Group), then select a person from the lookup.",
     "expected": "The Additional Approver row is added and the selected person populates. Additional Approvers are optional.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc019s3",
     "order": 3,
     "action": "Attempt to Route the workflow forward before the Additional Approver has signed off.",
     "expected": "Routing is blocked; all Additional Approvers must sign off (Approved? toggle enabled) before the MOC can be routed.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc019s4",
     "order": 4,
     "action": "As the Additional Approver, complete the review and enable the Approved? toggle, then Save.",
     "expected": "The Sign Off Date populates with the current date and the Additional Approver sign-off is recorded.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc019s5",
     "order": 5,
     "action": "Route the workflow forward.",
     "expected": "With all required approvers signed off, the MOC routes forward (toward APPR / PRESTART).",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc020",
   "name": "MOC: Coordinator Executes MOC",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc020s1",
     "order": 1,
     "action": "Role: MOC Coordinator - As the MOC Coordinator, log into Maximo",
     "expected": "MOC Coordinator Start Centre is visible.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc020s2",
     "order": 2,
     "action": "Click on the MOC Coordinator Start Center and go to the Query 'MOCs Ready to Move to Execution Phase'.",
     "expected": "Can view MOCs with Pre-Start Actions completed, in PRESTART status.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc020s3",
     "order": 3,
     "action": "Click on the MOC.",
     "expected": "MOC opens in MOC (HSE) application.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc020s4",
     "order": 4,
     "action": "Populate In Service Date.",
     "expected": "Populate In Service Date if present. NOTE: this build exposes Scheduled In-Service / Actual Start / Actual Finish; a separate editable 'In Service Date' field was not found.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc020s5",
     "order": 5,
     "action": "Review the Implementation tab and update the MOC. Click the Route Workflow icon. The option is Execute Post-Start Actions (Cancel MOC also available). Choose Execute Post-Start Actions and click OK.",
     "expected": "The MOC Status changes to POSTSTART and the Pre-Start Actions are locked down. If not all Pre-Start Actions are completed, an error is displayed. If there is not at least one Post-Start action, or any Post-Start actions lack assignees, an error is displayed. If Reviewed By or Comments on the Implementation tab are not filled out, an error is displayed. If In Service Date is not filled out, an error is displayed.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc021",
   "name": "MOC: Coordinator Returns MOC for Revision",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc021s1",
     "order": 1,
     "action": "Role: MOC Coordinator - log into Maximo.",
     "expected": "MOC Coordinator Start Center is shown.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc021s2",
     "order": 2,
     "action": "Go to the MOC Coordinator Start Center and note the portlet 'All Open MOCs'",
     "expected": "List of MOCs assigned to coordinator are shown.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc021s3",
     "order": 3,
     "action": "Click on a MOC in Status = APPR. If continuing the test from the previous Test Case the MOC will have a status WAPPR.",
     "expected": "MOC opens in MOC (HSE) application.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc021s4",
     "order": 4,
     "action": "Click on the Route Workflow button without adding a Work Log entry. Route to possible statuses. Options are Submit for Approval and Return for Revision. Choose Return for Revision.",
     "expected": "An error is presented to the user indicating that a Work Log entry is required.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc021s5",
     "order": 5,
     "action": "Go to the Work Log. Using the + button, add a new note with Type set to RETURNCOMMENT and enter a reason for return in the Summary field.",
     "expected": "Type is updated and the new note is added.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc021s6",
     "order": 6,
     "action": "Click on the Route Workflow button. Route to possible statuses. Choose Return for Revision and click OK.",
     "expected": "The MOC status is set to REVISE.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc021s7",
     "order": 7,
     "action": "Confirm the effects of returning the MOC for revision.",
     "expected": "Any Approvals or Reviews that were completed are reverted to an incomplete state. AAO, Approvers, Reviewers, Notified, and open Action assignees receive an email notification.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc021s8",
     "order": 8,
     "action": "End of Test",
     "expected": "",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc022",
   "name": "MOC: Assignees Complete Pre-Start Actions",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc022s1",
     "order": 1,
     "action": "Role: User - As a User assigned to complete Pre-Start Actions, log into Maximo",
     "expected": "Start Centers are available depending on your User security",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc022s2",
     "order": 2,
     "action": "Click on the MOC Unified Start Center and go to the Query 'MOCs Requiring My Completion of Pre-Start Actions'.",
     "expected": "Can view actions assigned to you.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc022s3",
     "order": 3,
     "action": "Click on the MOC",
     "expected": "MOC opens in MOC (HSE) application.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc022s4",
     "order": 4,
     "action": "Go to the Implementation tab",
     "expected": "implementation Tab opens with MOC Actions already assigned",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc022s5",
     "order": 5,
     "action": "Check Completed next to the Action assigned to you. Fill in Comments.",
     "expected": "Comments field becomes required to save. Can update both Completed checkbox and Comments. Completed By and Sign Off Date populate with the logged in user's name and today's date and time.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc022s6",
     "order": 6,
     "action": "Check Completed next to an action not assigned to you.",
     "expected": "If you are not an MOC Coordinator, field is read only. If you are an MOC Coordinator, your name fills out under Completed By.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc022s7",
     "order": 7,
     "action": "Save the record",
     "expected": "The MOC is saved. If all Pre-Start actions are completed, an email notification is sent to the MOC Coordinator.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc023",
   "name": "MOC: Post-Start Assignees Complete Post-Start Actions",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc023s1",
     "order": 1,
     "action": "Role: User - As a User assigned to complete Post-Start Actions, log into Maximo",
     "expected": "Start Centers are available depending on your User security",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc023s2",
     "order": 2,
     "action": "Click on the MOC Unified Start Center and go to the Query 'MOCs Requiring My Completion of Post-Start Actions'.",
     "expected": "Can view actions assigned to you.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc023s3",
     "order": 3,
     "action": "Click on the MOC",
     "expected": "MOC opens in MOC (HSE) application.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc023s4",
     "order": 4,
     "action": "Go to the Post-Start Actions section on the Implementation tab",
     "expected": "Post-Start Actions section opens with MOC Actions already assigned",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc023s5",
     "order": 5,
     "action": "Check Completed next to the Action assigned to you. Fill in Comments.",
     "expected": "Comments field becomes required to save. Can update both Completed checkbox and Comments. Completed By and Sign Off Date populate with the logged in user's name and today's date and time.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc023s6",
     "order": 6,
     "action": "Check Completed next to an action not assigned to you.",
     "expected": "If you are not an MOC Coordinator, field is read only. If you are an MOC Coordinator, your name fills out under Completed By.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc023s7",
     "order": 7,
     "action": "Save the record",
     "expected": "The MOC is saved. If all Post-Start actions are completed, an email notification is sent to the MOC Coordinator.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc024",
   "name": "MOC: Coordinator Plans the MOC - Closure",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc024s1",
     "order": 1,
     "action": "Continuing with the MOC created previously, go to the Closure Actions section on the Implementation tab.",
     "expected": "The Closure Actions section on the Implementation tab opens.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc024s2",
     "order": 2,
     "action": "The Reviewed By Comments and Closure Reviewed by will be updated by the Accountable Asset Owner and Closure Comments will be updated by the MOC Coordinator once the MOC Closure Actions are completed. These will be left blank at this time.",
     "expected": "Fields are visible and editable to the Accountable Asset Owner and MOC Coordinator but left blank. Fields are visible but not editable to everyone else.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc024s3",
     "order": 3,
     "action": "In the Closure Actions section add a Standard Action either from the + or blue Actions button.",
     "expected": "Selected Closure Action displays in the table.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc024s4",
     "order": 4,
     "action": "In the Action By field, select a value from the Select Value list and assign the Action By appropriately.",
     "expected": "The selected value displays in the field",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc024s5",
     "order": 5,
     "action": "Save the record",
     "expected": "Record is saved. DEFECT on this build: Due Date on Closure Actions does not default to 180 days after the Actual Finish / In Service date - it is blank and required, and saving without it fails with BMXAA4195E (PLUSGMOCCLOSURELIST).",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc025",
   "name": "MOC: Coordinator Completes MOC",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc025s1",
     "order": 1,
     "action": "Role: MOC Coordinator - As the MOC Coordinator, log into Maximo",
     "expected": "MOC Coordinator Start Centre is visible.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc025s2",
     "order": 2,
     "action": "Click on the MOC Coordinator Start Center and go to the Query 'MOCs Ready to Move to Completion Phase'.",
     "expected": "Can view MOCs with Post-Start Actions completed, in POSTSTART status.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc025s3",
     "order": 3,
     "action": "Go to the MOC and the Closure Actions section on the Implementation tab and make updates to the Closure Actions table.",
     "expected": "Closure actions can be created and assigned. Due Date defaults to 180 days after the In Service Date.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc025s4",
     "order": 4,
     "action": "Click Route Workflow and select Complete MOC.",
     "expected": "The MOC Status is changed to COMP.If not all Post-Start actions are completed, an error is displayed.If there isn't at least one Closure action, or any Closure action lacks an assignee, an error is displayed.Closure action assignees and AAO are notified.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc026",
   "name": "MOC: POSTCOMP 90-Day Edit Window and Auto-Close",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc026s1",
     "order": 1,
     "action": "Role: MOC Coordinator - Complete the Impacted Assignee Reviews from COMP so the MOC routes to POSTCOMP.",
     "expected": "The MOC transitions to POSTCOMP and the 90-day edit window begins.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc026s2",
     "order": 2,
     "action": "With the MOC in POSTCOMP, make a minor edit / add additional information to the MOC and Save.",
     "expected": "During the 90-day window the MOC Coordinator can make minor changes / add additional information; edits save successfully.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc026s3",
     "order": 3,
     "action": "Confirm the 90-day window is tracked from entry into POSTCOMP.",
     "expected": "The 90-day period is measured from the date the MOC entered POSTCOMP.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc026s4",
     "order": 4,
     "action": "Simulate/verify the state after the 90-day window elapses (or use the Close MOC action once closure requirements are met).",
     "expected": "At the end of the 90 days the MOC is automatically changed to CLOSE and all fields become read-only (no further edits allowed).",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc027",
   "name": "MOC: Coordinator Closes MOC",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc027s1",
     "order": 1,
     "action": "Role: MOC Coordinator - log in to MAximo.",
     "expected": "MOC Coordinator Start Center is visible.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc027s2",
     "order": 2,
     "action": "Go to the MOC Coordinator Start Center and note the portlet 'MOCs Ready to be Closed'",
     "expected": "MOCs in status POSTCOMP where all Closure Actions and Closure Review is complete will be shown.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc027s3",
     "order": 3,
     "action": "Click on the MOC",
     "expected": "MOC opens in MOC (HSE) application.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc027s4",
     "order": 4,
     "action": "Go to the Closure Actions section on the Implementation tab",
     "expected": "The Closure Actions section on the Implementation tab is displayed.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc027s5",
     "order": 5,
     "action": "Populate the Closure Comments field.",
     "expected": "Closure Comments can be populated with up to 4000 characters of text. Unlimited length long description can be added via the Long Description button.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc027s6",
     "order": 6,
     "action": "Route the Workflow and select Close MOC.",
     "expected": "MOC Status is changed to CLOSE. The entire MOC is locked down. AAO, MOC Requester, Approvers, Reviewers, Requester, and Notified will be notified that the MOC is closed. The closure notification email will mention that 'the AFE cannot be closed until all items have been loaded'.If any Closure actions are incomplete, an error will display.If Reviewed By or Reviewed By Comments are not filled out, an error will display.If Closure Comments are not filled out, an error will display.If any Reviews are incomplete, an error will display.If any Training is incomplete, an error will display.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc027s7",
     "order": 7,
     "action": "End of full process test for a MOC",
     "expected": "",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc028",
   "name": "MOC: Reporting - MOC Report (Detail) and Outstanding MOC Actions Report",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc028s1",
     "order": 1,
     "action": "Go to the MOC (HSE) module. On the MOC List screen, find and select a specific MOC to run the detailed report.",
     "expected": "The MOC (HSE) module opens and the selected MOC record is available for reporting.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc028s2",
     "order": 2,
     "action": "From the left side of the screen, scroll down to More Actions and click Run Reports.",
     "expected": "The Run Reports dialog lists MOC Report (Detail) and Outstanding MOC Actions Report.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc028s3",
     "order": 3,
     "action": "Select MOC Report (Detail), enter the MOC # when prompted, and click Submit.",
     "expected": "The MOC Report (Detail) generates for the entered MOC #, showing MOC Details and Additional Details; tabs with no data are hidden.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc028s4",
     "order": 4,
     "action": "Review the generated report output and export options.",
     "expected": "The BIRT report can be printed as PDF, exported to CSV, and exported to Excel.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc028s5",
     "order": 5,
     "action": "Return to More Actions > Run Reports and select Outstanding MOC Actions Report, then click Submit.",
     "expected": "The Outstanding MOC Actions Report generates, listing all Reviews and Approvals not yet completed.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc028s6",
     "order": 6,
     "action": "Review the Outstanding MOC Actions Report output, grouping, and sorting.",
     "expected": "Default grouping is by Facility; sorting is by MOC#, Due Date (nulls at the bottom), and Task Description. Output supports PDF, CSV, and Excel.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc029",
   "name": "MOC: Query and Ad Hoc Report Creation",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc029s1",
     "order": 1,
     "action": "From the Go To menu, select the Change (HSE) module and open the MOC (HSE) application.",
     "expected": "The MOC (HSE) application opens in List view.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc029s2",
     "order": 2,
     "action": "In the List view, populate one or more filter fields (e.g., Description, Location Description, MOC Type, Classification, Status, Asset, MOC Coordinator, or Accountable Asset Owner) and press Enter.",
     "expected": "The list filters to records matching the entered criteria.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc029s3",
     "order": 3,
     "action": "Optionally, from the Quick Search menu icon select More Search Fields, populate additional filters, and click Find.",
     "expected": "Additional search fields are exposed and the query returns matching records.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc029s4",
     "order": 4,
     "action": "Go to Common Actions > Create Report and update the Ad Hoc Report options.",
     "expected": "The Create Report / Ad Hoc Report options are available for the filtered result set.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc029s5",
     "order": 5,
     "action": "Enter a unique Title for the report (one that does not already exist) and click Run and Save Report.",
     "expected": "The report runs and is saved under the unique Title; a duplicate Title is rejected.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc029s6",
     "order": 6,
     "action": "Return to More Actions > Run Reports, find the Title entered, and Submit.",
     "expected": "The saved report appears in the Run Reports list and can be re-run on demand.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc030",
   "name": "MOC: MOC Coordinator can only make updates to their assigned MOC's",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc030s1",
     "order": 1,
     "action": "Role: MOC Coordinator",
     "expected": "MOC Coordinator Start Center Opens",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc030s2",
     "order": 2,
     "action": "Go to the MOC (HSE) Module",
     "expected": "The MOC List Screen displays",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc030s3",
     "order": 3,
     "action": "On the MOC (HSE) List Tab pull up the list of MOC's",
     "expected": "The MOC List Screen opens showing all MOC's",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc030s4",
     "order": 4,
     "action": "Choose a MOC where you are not listed as the MOC Coordinator",
     "expected": "The MOC will display",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc030s5",
     "order": 5,
     "action": "Open the MOC and go to the Review/Approve Tab",
     "expected": "The MOC Review/Approve Tab displays",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc030s6",
     "order": 6,
     "action": "Attempt to update the 'Review by' Actions and click on Save",
     "expected": "A message appears you cannot update a MOC where you are not the MOC Coordinator",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc031",
   "name": "MOC: Duplicate the MOC record",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc031s1",
     "order": 1,
     "action": "Open a new or existing MOC record",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc031s2",
     "order": 2,
     "action": "Click on duplicate MOC in the more actions sub menu",
     "expected": "Confirm a new record is created with a new MOC record number with the same configuration as the original record",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc032",
   "name": "MOC: Required Field & Data Validation (Role 1 / Create)",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc032s1",
     "order": 1,
     "action": "On a new MOC, click Save MOC without entering Description, Scope, Impact, or Reason for Change.",
     "expected": "Save is blocked with BMXAA7998E listing the missing required fields; the record is not saved.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc032s2",
     "order": 2,
     "action": "Set MOC Type = Temporary (or Emergency) but leave Temporary Until blank, then Save.",
     "expected": "Save is blocked; Temporary Until is required when the type is Temporary/Emergency.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc032s3",
     "order": 3,
     "action": "In Change Details enter an invalid / non-existent Classification value.",
     "expected": "The value is rejected; Class Description does not populate and a validation error is shown.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc032s4",
     "order": 4,
     "action": "In the Technical Approver lookup, type a free-text name instead of selecting from the list, then Save.",
     "expected": "Entry fails with BMXAA8123E; only valid looked-up persons are accepted.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc033",
   "name": "MOC: Workflow Sequencing & Gate Enforcement",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc033s1",
     "order": 1,
     "action": "Attempt to add a Technical Approver before setting the Risk Tier / answering the Risk Determination questions.",
     "expected": "The approver lookup is empty / selection is not allowed until the risk tier is set (risk questions answered).",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc033s2",
     "order": 2,
     "action": "Use the 'Initiate MOC' action to start the workflow instead of Route Workflow.",
     "expected": "The action fails with BMXAA4042E; the workflow must be started via Route Workflow.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc033s3",
     "order": 3,
     "action": "As Technical Approver, route to APPR while one or more of the Hazard Assessment Questions are unanswered (Completed? toggle off).",
     "expected": "Routing to APPR is blocked with the message that the Hazard Assessment(s) must be completed first.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc033s4",
     "order": 4,
     "action": "Route the AAO approval to Approved while the Accountable Asset Owner field is blank.",
     "expected": "Approval fails with BMXAA4473E - the AAO_REVIEW task has no owner; the record does not advance.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc033s5",
     "order": 5,
     "action": "From COMP, route the record forward (Complete Impacted Assignee Reviews) while the impacted reviewer's 'Reviewed?' toggle is still off.",
     "expected": "Routing is held with the dialog 'Impacted Reviewers Need to Review - Please make sure all impacted reviewers have reviewed the record.' Enabling the Reviewed? toggle (stamps Reviewed By + Sign Off Date) and saving lets the route proceed COMP -> POSTCOMP.",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc034",
   "name": "MOC: MOC tab required fields error validation",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc034s1",
     "order": 1,
     "action": "Create new MOC",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc034s2",
     "order": 2,
     "action": "attempt to save MOC without all or some required fields addressed or filled",
     "expected": "Error prompt should pop up with the missing required fields",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc035",
   "name": "MOC: MOC tab Risk Tier assessment error validation",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc035s1",
     "order": 1,
     "action": "Continuing on an MOC record in a WAPPR status with the required fields addressed and filled",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc035s2",
     "order": 2,
     "action": "Ensure the Initiator, Accountable Asset Owner (AAO), Description, MOC Type, Classification, Scheduled Start Date, Scheduled In-Service Date, Scheduled Finish Date, Scope, Reason for Change, Impact, or Location have not been addressed or filled",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc035s3",
     "order": 3,
     "action": "attempt to route the MOC record forward to APPR status",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc035s4",
     "order": 4,
     "action": "After filling out those specific fields, ensure the Risk tier assessment has not yet been addressed or filled then attempt to route the workflow forward",
     "expected": "Error message prompt should appear stating \"Initiator, Accountable Asset Owner (AAO), Description, MOC Type, Classification, Scheduled Start Date, Scheduled In-Service Date, Scheduled Finish Date, Scope, Reason for Change, Impact, and Location must be populated to submit an MOC.\"",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc036",
   "name": "MOC: Risk Determination Tier 1 Technical Approvers",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc036s1",
     "order": 1,
     "action": "Open a new MOC record or continue with a record with only the Risk Determination questions answered and the Risk Tier Level set as 1",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc036s2",
     "order": 2,
     "action": "Navigate to the Review and Approve tab",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc036s3",
     "order": 3,
     "action": "Review the Technical Approvers section",
     "expected": "The section should contain 16 Technical Approvers with the Technical Authority Type fields pre-selected",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc036s4",
     "order": 4,
     "action": "Attempt to route the workflow forward without selecting Technical Approvers",
     "expected": "Error message prompt should appear stating \"Please fill out the Technical Authority Approvers based on the Risk Tier Level before routing forward.\"",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc037",
   "name": "MOC: Risk Determination Tier 2 Technical Approvers",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc037s1",
     "order": 1,
     "action": "Open a new MOC record or continue with a record with only the Risk Determination questions answered and the Risk Tier Level set as 2",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc037s2",
     "order": 2,
     "action": "Navigate to the Review and Approve tab",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc037s3",
     "order": 3,
     "action": "Review the Technical Approvers section",
     "expected": "The section should contain 1 Technical Approver row with no fields filled",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc037s4",
     "order": 4,
     "action": "Attempt to route the workflow forward without selecting Technical Approvers",
     "expected": "Error message prompt should appear stating \"Please fill out the Technical Authority Approvers based on the Risk Tier Level before routing forward.\"",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc038",
   "name": "MOC: Impacted user error validation",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc038s1",
     "order": 1,
     "action": "Open a new MOC record or continue with a record with the MOC tab completed and the Technical Approvers selected",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc038s2",
     "order": 2,
     "action": "Attempt to route the workflow forward without selecting an Impacted user",
     "expected": "Error message prompt should appear stating \"The MOC requires at least one (1) Impacted representative to be identified on the record.\"",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc039",
   "name": "MOC: Workflow route to APPR status error validation",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc039s1",
     "order": 1,
     "action": "Open a new MOC record or continue with a record with the MOC tab completed, the Technical Approvers selected, and an Impacted user selected",
     "expected": "",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc039s2",
     "order": 2,
     "action": "Attempt to route the workflow forward without all Technical Authority Approvers having the Hazard assessment questions completed and the \"Completed?\" & \"Approved?\" toggles enabled",
     "expected": "",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  },
  {
   "id": "tc040",
   "name": "MOC: Cancel or Return validation",
   "objective": "",
   "preconditions": "",
   "steps": [
    {
     "id": "tc040s1",
     "order": 1,
     "action": "With a MOC in NEW or WAPPR (before Pre-Start Actions are complete), add the required Work Log entry and route to Cancel MOC or Return for Revision.",
     "expected": "Cancellation / revision is allowed; the MOC routes to CAN or REVISE as selected.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc040s2",
     "order": 2,
     "action": "Advance the MOC until all Pre-Start Actions are completed (PRESTART complete / POSTSTART or later).",
     "expected": "The MOC progresses past the Pre-Start phase.",
     "requirements": [],
     "attachments": []
    },
    {
     "id": "tc040s3",
     "order": 3,
     "action": "Attempt to Cancel or Return the MOC for Revision after the Pre-Start Actions are complete.",
     "expected": "Cancel and Return for Revision are no longer available; once the Pre-Start Actions are complete, the MOC can no longer be cancelled or revised (per the MOC Process Overview note).",
     "requirements": [],
     "attachments": []
    }
   ],
   "links": [],
   "executions": [],
   "attachments": [],
   "hyperlinks": [],
   "assignedTo": null,
   "assignedAt": null,
   "dueDate": null
  }
 ],
 "plans": [
  {
   "id": "tp1",
   "name": "MOC 2 end-to-end (Roles 1–5)",
   "description": "Planned route through the full MOC lifecycle across all five roles",
   "caseIds": [
    "tc001",
    "tc002",
    "tc003",
    "tc004",
    "tc005"
   ],
   "history": []
  }
 ]
}

// Workflow nodes seeded from "WF_NODES.xlsx" — positions scaled from source X/Y grid; connections left to the user
export const WF_NODES = [
 {
  "id": "wf1",
  "type": "flow",
  "position": {
   "x": 60,
   "y": 510
  },
  "data": {
   "nodeType": "start",
   "label": "START 1",
   "sequence": "1",
   "description": "",
   "config": "",
   "color": "#22c55e",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf2",
  "type": "flow",
  "position": {
   "x": 7060,
   "y": 210
  },
  "data": {
   "nodeType": "end",
   "label": "STOP 2",
   "sequence": "2",
   "description": "",
   "config": "",
   "color": "#ef4444",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf3",
  "type": "flow",
  "position": {
   "x": 310,
   "y": 510
  },
  "data": {
   "nodeType": "decision",
   "label": "WOCLASS_CHECK",
   "sequence": "3",
   "description": "",
   "config": "Expression: :woclass = 'MOC'\nExpression: :plusgworktype in ('CM', 'PRC', 'PRO')",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf5",
  "type": "flow",
  "position": {
   "x": 810,
   "y": 660
  },
  "data": {
   "nodeType": "decision",
   "label": "WAPPRORREVISE?",
   "sequence": "5",
   "description": "WAPPR or REVISE Status?",
   "config": "Expression: :status in ('WAPPR','REVISE','PRESTART')",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf6",
  "type": "flow",
  "position": {
   "x": 3060,
   "y": 510
  },
  "data": {
   "nodeType": "input",
   "label": "STATUS_SWITCH",
   "sequence": "6",
   "description": "",
   "config": "",
   "color": "#f1f5f9",
   "attrs": [],
   "attachments": [],
   "shape": "parallelogram"
  }
 },
 {
  "id": "wf8",
  "type": "flow",
  "position": {
   "x": 3310,
   "y": 660
  },
  "data": {
   "nodeType": "decision",
   "label": "IS_WAPPR?",
   "sequence": "8",
   "description": "Route to WAPPR Status",
   "config": "Expression: :status = 'WAPPR'",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf10",
  "type": "flow",
  "position": {
   "x": 4810,
   "y": 960
  },
  "data": {
   "nodeType": "decision",
   "label": "IS_APPR?",
   "sequence": "10",
   "description": "Route to APPR",
   "config": "Expression: :status = 'APPR'\nExpression: isnull(:plusgcfwnum,'NOCONDITION') != 'NOCONDITION'",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf12",
  "type": "flow",
  "position": {
   "x": 6560,
   "y": 1260
  },
  "data": {
   "nodeType": "decision",
   "label": "IS_POSTSTART",
   "sequence": "12",
   "description": "Post-Start Status?",
   "config": "Expression: :status = 'POSTSTART'",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf13",
  "type": "flow",
  "position": {
   "x": 3560,
   "y": 1560
  },
  "data": {
   "nodeType": "decision",
   "label": "IS_COMP?",
   "sequence": "13",
   "description": "Route to COMP",
   "config": "Expression: :status = 'COMP'",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf15",
  "type": "flow",
  "position": {
   "x": 3810,
   "y": 660
  },
  "data": {
   "nodeType": "task",
   "label": "WAPPR_APPROVERS",
   "sequence": "15",
   "description": "",
   "config": "Expression: :status = 'REVISED'\nExpression: :status = 'WAPPR'",
   "color": "#3b82f6",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf16",
  "type": "flow",
  "position": {
   "x": 3310,
   "y": 510
  },
  "data": {
   "nodeType": "decision",
   "label": "IS_REVISE?",
   "sequence": "16",
   "description": "Check for Revise Status",
   "config": "Expression: :status='REVISE'\nExpression: :status = 'RETURNED'\nExpression: :status = 'REJ'",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf17",
  "type": "flow",
  "position": {
   "x": 3810,
   "y": 510
  },
  "data": {
   "nodeType": "task",
   "label": "MOC_REVISE",
   "sequence": "17",
   "description": "Return Revision to Requestor",
   "config": "Expression: :status = 'QUE'",
   "color": "#3b82f6",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf18",
  "type": "flow",
  "position": {
   "x": 4060,
   "y": 1260
  },
  "data": {
   "nodeType": "task",
   "label": "PRE-START",
   "sequence": "18",
   "description": "Pre-Start Status",
   "config": "Expression: :status = 'MOBCOMP'\nExpression: :status = 'INPRG'",
   "color": "#3b82f6",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf20",
  "type": "flow",
  "position": {
   "x": 2560,
   "y": 1560
  },
  "data": {
   "nodeType": "task",
   "label": "POSTSTART_NOTIF",
   "sequence": "20",
   "description": "Post-Start Notification",
   "config": "Expression: :status = 'WHOLD'\nExpression: :status = 'CAN'",
   "color": "#3b82f6",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf21",
  "type": "flow",
  "position": {
   "x": 4060,
   "y": 1560
  },
  "data": {
   "nodeType": "task",
   "label": "COMP_ACTIONS",
   "sequence": "21",
   "description": "AAO Signoff in COMP",
   "config": "Expression: wonum = :wonum and siteid = :siteid and exists(select 1 from plusgworeg where workorder.wonum = plusgworeg.referencenum and workorder.siteid = plusgworeg.siteid and plusgworeg.regappliestowo = 1)\nExpression: :plusgworktype in ('RW', 'EMER')",
   "color": "#3b82f6",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf24",
  "type": "flow",
  "position": {
   "x": 4560,
   "y": 810
  },
  "data": {
   "nodeType": "decision",
   "label": "REVISECOMMENT?",
   "sequence": "24",
   "description": "Revision Comment?",
   "config": "Expression: exists (select 1 from worklog where class = :woclass and recordkey = :wonum and siteid = :siteid and createby = :&PERSONID& and logtype = 'REVCOMMENT'  and createdate >= dateadd(hour, -1, getdate()))",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf25",
  "type": "flow",
  "position": {
   "x": 4810,
   "y": 810
  },
  "data": {
   "nodeType": "interaction",
   "label": "REVISION COMMENT REQ",
   "sequence": "25",
   "description": "Revision Comment Required",
   "config": "",
   "color": "#7fffd4",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf26",
  "type": "flow",
  "position": {
   "x": 4310,
   "y": 660
  },
  "data": {
   "nodeType": "input",
   "label": "APPRDECISIONNODE",
   "sequence": "26",
   "description": "APPR Decision Node",
   "config": "",
   "color": "#f1f5f9",
   "attrs": [],
   "attachments": [],
   "shape": "parallelogram"
  }
 },
 {
  "id": "wf27",
  "type": "flow",
  "position": {
   "x": 1310,
   "y": 1860
  },
  "data": {
   "nodeType": "decision",
   "label": "CANCELCOMMENT?",
   "sequence": "27",
   "description": "Cancel MOC and Require Cancel Comment",
   "config": "Expression: exists (select 1 from worklog where class = :woclass and recordkey = :wonum and siteid = :siteid and createby = :&PERSONID& and logtype = 'CANCELCOMMENT'  and createdate >= dateadd(hour, -1, getdate()))",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf28",
  "type": "flow",
  "position": {
   "x": 1810,
   "y": 1860
  },
  "data": {
   "nodeType": "interaction",
   "label": "CANCELCOMMREQ",
   "sequence": "28",
   "description": "CANCEL COMMENT REQUIRED",
   "config": "",
   "color": "#7fffd4",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf29",
  "type": "flow",
  "position": {
   "x": 5310,
   "y": 1260
  },
  "data": {
   "nodeType": "decision",
   "label": "PSSR_ACTION?",
   "sequence": "29",
   "description": "Go through PSSR Actions (if any)",
   "config": "Expression: (SELECT COUNT(*) FROM PLUSGMOCPRELIST WHERE workorderid = :workorderid and STDACTNUM = '10152') > 0",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf30",
  "type": "flow",
  "position": {
   "x": 5560,
   "y": 1260
  },
  "data": {
   "nodeType": "task",
   "label": "PSSR_REVIEW",
   "sequence": "30",
   "description": "PSSR Review",
   "config": "Expression: :status = 'IPLN'",
   "color": "#3b82f6",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf31",
  "type": "flow",
  "position": {
   "x": 6060,
   "y": 1260
  },
  "data": {
   "nodeType": "decision",
   "label": "PSSR_COMPLETE?",
   "sequence": "31",
   "description": "PSSR Review Complete?",
   "config": "Expression: (SELECT COUNT(*) FROM PLUSGMOCPRELIST WHERE workorderid = :workorderid AND completed = 1 and STDACTNUM = '10152') > 0\nExpression: :status = 'NEW'",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf32",
  "type": "flow",
  "position": {
   "x": 2810,
   "y": 1560
  },
  "data": {
   "nodeType": "decision",
   "label": "ALL_POSTSTART_COMP?",
   "sequence": "32",
   "description": "All Post-Start Complete?",
   "config": "Expression: (SELECT COUNT(*) FROM PLUSGMOCPOSTLIST WHERE wonum= :wonum) > 0 AND (SELECT COUNT(*) FROM PLUSGMOCPOSTLIST WHERE wonum = :wonum AND completed = 1) = (SELECT COUNT(*) FROM PLUSGMOCPOSTLIST WHERE wonum = :wonum)\nExpression: :woclass = 'WORKORDER'",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf33",
  "type": "flow",
  "position": {
   "x": 3310,
   "y": 1560
  },
  "data": {
   "nodeType": "task",
   "label": "AAO_REVIEW",
   "sequence": "33",
   "description": "AAO Review",
   "config": "Expression: exists (select 1 from worklog where class = :woclass and recordkey = :wonum and siteid = :siteid and createby = :&PERSONID& and logtype = 'RETURNCOMMENT'  and createdate >= dateadd(hour, -1, getdate()))",
   "color": "#3b82f6",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf34",
  "type": "flow",
  "position": {
   "x": 4810,
   "y": 1560
  },
  "data": {
   "nodeType": "decision",
   "label": "ALL_CLOSURE_COMP?",
   "sequence": "34",
   "description": "All Closure Complete?",
   "config": "Expression: (SELECT COUNT(*) FROM PLUSGMOCCLOSURELIST WHERE workorderid = :workorderid) > 0 AND (SELECT COUNT(*) FROM PLUSGMOCCLOSURELIST WHERE workorderid = :workorderid AND completed = 1) = (SELECT COUNT(*) FROM PLUSGMOCCLOSURELIST WHERE workorderid = :workorderid)",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf36",
  "type": "flow",
  "position": {
   "x": 4560,
   "y": 1560
  },
  "data": {
   "nodeType": "task",
   "label": "COORD_REVIEW",
   "sequence": "36",
   "description": "Coordinator Review",
   "config": "",
   "color": "#3b82f6",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf37",
  "type": "flow",
  "position": {
   "x": 560,
   "y": 510
  },
  "data": {
   "nodeType": "decision",
   "label": "NEW?",
   "sequence": "37",
   "description": "New Status",
   "config": "Expression: :status = 'NEW'",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf38",
  "type": "flow",
  "position": {
   "x": 810,
   "y": 510
  },
  "data": {
   "nodeType": "task",
   "label": "INITIATOR",
   "sequence": "38",
   "description": "Set the Initiator",
   "config": "",
   "color": "#3b82f6",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf41",
  "type": "flow",
  "position": {
   "x": 4810,
   "y": 1260
  },
  "data": {
   "nodeType": "decision",
   "label": "ALL_PRESTART_COMP?",
   "sequence": "41",
   "description": "Check if all Pre-Start is Comp",
   "config": "Expression: (SELECT COUNT(*) FROM PLUSGMOCPRELIST WHERE wonum= :wonum) > 0 AND (SELECT COUNT(*) FROM PLUSGMOCPRELIST WHERE wonum = :wonum AND completed = 1) = (SELECT COUNT(*) FROM PLUSGMOCPRELIST WHERE wonum = :wonum)",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf42",
  "type": "flow",
  "position": {
   "x": 4560,
   "y": 1410
  },
  "data": {
   "nodeType": "interaction",
   "label": "PRE START ACTION COMPLETE",
   "sequence": "42",
   "description": "INTERACTION 42",
   "config": "",
   "color": "#7fffd4",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf43",
  "type": "flow",
  "position": {
   "x": 4310,
   "y": 1260
  },
  "data": {
   "nodeType": "decision",
   "label": "ACTION COMPLETED BY ASSIGNMENT?",
   "sequence": "43",
   "description": "Action Completed by Assignment?",
   "config": "Expression: NOT EXISTS (   SELECT 1 FROM PLUSGMOCPRELIST    WHERE WONUM = :WONUM    AND SITEID = :SITEID    AND COMPLETED = 0   AND (tg_compby = :&PERSONID& OR TG_COMPBY IS NULL) )",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf44",
  "type": "flow",
  "position": {
   "x": 6060,
   "y": 1410
  },
  "data": {
   "nodeType": "interaction",
   "label": "PSSR REQ",
   "sequence": "44",
   "description": "",
   "config": "",
   "color": "#7fffd4",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf45",
  "type": "flow",
  "position": {
   "x": 3310,
   "y": 1710
  },
  "data": {
   "nodeType": "interaction",
   "label": "POSTSTART REQ",
   "sequence": "45",
   "description": "",
   "config": "",
   "color": "#7fffd4",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf46",
  "type": "flow",
  "position": {
   "x": 1310,
   "y": 510
  },
  "data": {
   "nodeType": "decision",
   "label": "RISKASSESSMENT?",
   "sequence": "46",
   "description": "Is the Risk Assessment Tier Populated?",
   "config": "Expression: :RISK is not null or :RISK != ''",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf47",
  "type": "flow",
  "position": {
   "x": 1810,
   "y": 60
  },
  "data": {
   "nodeType": "interaction",
   "label": "NORISKTIER",
   "sequence": "47",
   "description": "Risk Tier is NOT filled out",
   "config": "",
   "color": "#7fffd4",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf48",
  "type": "flow",
  "position": {
   "x": 2060,
   "y": 510
  },
  "data": {
   "nodeType": "decision",
   "label": "TECHAUTH?",
   "sequence": "48",
   "description": "Are the Technical Authorities Filled Out?",
   "config": "Expression: :TECHAUTH.TECHNICALAUTHORITYAPPROVER is not null or :TECHAUTH.TECHNICALAUTHORITYAPPROVER != ''",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf49",
  "type": "flow",
  "position": {
   "x": 2310,
   "y": 360
  },
  "data": {
   "nodeType": "interaction",
   "label": "NOTECHAUTH",
   "sequence": "49",
   "description": "Technical Authority is NOT filled out",
   "config": "",
   "color": "#7fffd4",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf50",
  "type": "flow",
  "position": {
   "x": 1560,
   "y": 510
  },
  "data": {
   "nodeType": "decision",
   "label": "RISKDETERMINATIONREQ?",
   "sequence": "50",
   "description": "Risk Determination Required?",
   "config": "Expression: tg_mocprj = 1 or exists (     select 1 from classstructure cs     where cs.classstructureid = :classstructureid     and (cs.tg_hierarchypath like 'ORGANIZATIONAL%'          or cs.tg_hierarchypath like 'PROCEDURAL%') ) or not exists (     select 1 from riskdetermination     where wonum = :wonum     and siteid = :siteid     and riskanswer is null )",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf51",
  "type": "flow",
  "position": {
   "x": 2060,
   "y": 210
  },
  "data": {
   "nodeType": "interaction",
   "label": "NORISKDETERMINATION",
   "sequence": "51",
   "description": "Risk Determination Questions Not Filled Out",
   "config": "",
   "color": "#7fffd4",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf52",
  "type": "flow",
  "position": {
   "x": 3310,
   "y": 960
  },
  "data": {
   "nodeType": "decision",
   "label": "ADDITIONALAPPR?",
   "sequence": "52",
   "description": "Route to APPR",
   "config": "Expression: exists (     select 1     from plusgmocapprlist     where wonum = :wonum       and siteid = :siteid       and approved = 0 )",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf53",
  "type": "flow",
  "position": {
   "x": 4560,
   "y": 1110
  },
  "data": {
   "nodeType": "interaction",
   "label": "ADDITIONALAPPRNEED",
   "sequence": "53",
   "description": "Additional Approvers Waiting for Approval",
   "config": "",
   "color": "#7fffd4",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf54",
  "type": "flow",
  "position": {
   "x": 3310,
   "y": 1260
  },
  "data": {
   "nodeType": "decision",
   "label": "IS_PRESTART?",
   "sequence": "54",
   "description": "Is Status Prestart?",
   "config": "Expression: :status = 'PRESTART'",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf55",
  "type": "flow",
  "position": {
   "x": 4560,
   "y": 660
  },
  "data": {
   "nodeType": "decision",
   "label": "HAZARDASSESSMENT?",
   "sequence": "55",
   "description": "Are the Hazard Assessments Complete?",
   "config": "Expression: exists (     select 1     from classancestor ca     join classstructure cs on cs.classstructureid = ca.ancestor     where ca.classstructureid = :classstructureid       and ( upper(cs.classificationid) like 'ORGANIZATIONAL%'          or upper(cs.classificationid) like 'PROCEDURAL%' ) ) or not exists (     select 1     from technicalauthority     where wonum = :wonum       and approved = 0 )",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf56",
  "type": "flow",
  "position": {
   "x": 5310,
   "y": 660
  },
  "data": {
   "nodeType": "interaction",
   "label": "HAZARDASSESSMENT",
   "sequence": "56",
   "description": "Hazard Assessment Not Yet Complete",
   "config": "",
   "color": "#7fffd4",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf57",
  "type": "flow",
  "position": {
   "x": 3560,
   "y": 960
  },
  "data": {
   "nodeType": "task",
   "label": "APPR_ADDITIONALAPPROVERS",
   "sequence": "57",
   "description": "Additional Approver Assignments before APPR",
   "config": "",
   "color": "#3b82f6",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf58",
  "type": "flow",
  "position": {
   "x": 4310,
   "y": 960
  },
  "data": {
   "nodeType": "decision",
   "label": "ADDITIONALAPPR_COMP",
   "sequence": "58",
   "description": "Additional Approvers Complete Assignment",
   "config": "Expression: not exists (     select 1     from plusgmocapprlist     where wonum = :wonum       and siteid = :siteid       and approved = 0 )",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf59",
  "type": "flow",
  "position": {
   "x": 5310,
   "y": 960
  },
  "data": {
   "nodeType": "input",
   "label": "PRESTART",
   "sequence": "59",
   "description": "Route to PRESTART",
   "config": "",
   "color": "#f1f5f9",
   "attrs": [],
   "attachments": [],
   "shape": "parallelogram"
  }
 },
 {
  "id": "wf60",
  "type": "flow",
  "position": {
   "x": 3560,
   "y": 1260
  },
  "data": {
   "nodeType": "decision",
   "label": "PRESTARTACTION?",
   "sequence": "60",
   "description": "Do PRESTART Actions exist?",
   "config": "Expression: exists( select 1 from PLUSGMOCPRELIST  where wonum = :wonum )",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf61",
  "type": "flow",
  "position": {
   "x": 2310,
   "y": 1560
  },
  "data": {
   "nodeType": "decision",
   "label": "NOPOSTSTART",
   "sequence": "61",
   "description": "No Post Start Actions?",
   "config": "Expression: exists( select 1 from PLUSGMOCPOSTLIST  where wonum = :wonum )",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf62",
  "type": "flow",
  "position": {
   "x": 5060,
   "y": 1560
  },
  "data": {
   "nodeType": "decision",
   "label": "IMPACTEDACK?",
   "sequence": "62",
   "description": "Impacted Users Acknowledge?",
   "config": "Expression: (SELECT COUNT(*) FROM PLUSGMOCRVLST WHERE wonum = :wonum) > 0 AND (SELECT COUNT(*) FROM PLUSGMOCRVLST WHERE wonum = :wonum AND REVIEWED= 1) = (SELECT COUNT(*) FROM PLUSGMOCRVLST WHERE wonum = :wonum)",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf63",
  "type": "flow",
  "position": {
   "x": 5560,
   "y": 1560
  },
  "data": {
   "nodeType": "task",
   "label": "IMPACTEDASSIGN",
   "sequence": "63",
   "description": "Impacted Reviewer Assignment before POSTCOMP",
   "config": "",
   "color": "#3b82f6",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf64",
  "type": "flow",
  "position": {
   "x": 5060,
   "y": 1710
  },
  "data": {
   "nodeType": "interaction",
   "label": "COMP_REQUIRED",
   "sequence": "64",
   "description": "COMP Actions Required",
   "config": "",
   "color": "#7fffd4",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf66",
  "type": "flow",
  "position": {
   "x": 2310,
   "y": 510
  },
  "data": {
   "nodeType": "decision",
   "label": "REQIMPACTED?",
   "sequence": "66",
   "description": "",
   "config": "Expression: (select count(*) from plusgmocrvlst where wonum = :wonum and siteid = :siteid) >= 0",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf67",
  "type": "flow",
  "position": {
   "x": 2560,
   "y": 510
  },
  "data": {
   "nodeType": "interaction",
   "label": "IMPACTEDNEEDED",
   "sequence": "67",
   "description": "",
   "config": "",
   "color": "#7fffd4",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf68",
  "type": "flow",
  "position": {
   "x": 1060,
   "y": 510
  },
  "data": {
   "nodeType": "decision",
   "label": "REQFIELDS?",
   "sequence": "68",
   "description": "Required Fields Not Null",
   "config": "Expression: :OWNER is not null and :TG_AAO is not null and :DESCRIPTION is not null and :PLUSGMOCTYPE is not null and :CLASSSTRUCTURE.HIERARCHYPATH is not null and :SCHEDSTART is not null and :TG_INSERVICEDATE is not null and :SCHEDFINISH is not null and :PLUSGSCOPE is not null and :REASONFORCHANGE is not null and :PLUSGJUSTIFICATION is not null and :LOCATION is not null",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf69",
  "type": "flow",
  "position": {
   "x": 1060,
   "y": 360
  },
  "data": {
   "nodeType": "interaction",
   "label": "REQFIELDS",
   "sequence": "69",
   "description": "",
   "config": "",
   "color": "#7fffd4",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf70",
  "type": "flow",
  "position": {
   "x": 3810,
   "y": 1560
  },
  "data": {
   "nodeType": "decision",
   "label": "CLOSUREACTIONS?",
   "sequence": "70",
   "description": "Are there closure actions on the record?",
   "config": "Expression: exists( select 1 from PLUSGMOCCLOSURELIST  where workorderid = :workorderid )",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 },
 {
  "id": "wf71",
  "type": "flow",
  "position": {
   "x": 3560,
   "y": 660
  },
  "data": {
   "nodeType": "decision",
   "label": "ASSIGNTECHAUTH?",
   "sequence": "71",
   "description": "Assign the Tech Auth Approvers",
   "config": "Expression: (:&PERSONID& in (select assigncode from wfassignment as wfa where wfa.ownerid = PLUSGMOC.workorderid and wfa.assignstatus = 'ACTIVE'))",
   "color": "#f59e0b",
   "attrs": [],
   "attachments": []
  }
 }
]

// Connection paths traced from the MOC 2 workflow screenshot (determinable paths only)
export const WF_EDGES = [
 {
  "id": "wfe1",
  "source": "wf1",
  "target": "wf3",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe2",
  "source": "wf3",
  "target": "wf37",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe3",
  "source": "wf37",
  "target": "wf38",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe4",
  "source": "wf37",
  "target": "wf5",
  "sourceHandle": "sb",
  "targetHandle": "tt",
  "label": "",
  "data": {
   "condition": "",
   "classification": "negative"
  }
 },
 {
  "id": "wfe5",
  "source": "wf38",
  "target": "wf68",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe6",
  "source": "wf68",
  "target": "wf46",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe7",
  "source": "wf68",
  "target": "wf69",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "negative"
  }
 },
 {
  "id": "wfe8",
  "source": "wf46",
  "target": "wf50",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe9",
  "source": "wf46",
  "target": "wf47",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "negative"
  }
 },
 {
  "id": "wfe10",
  "source": "wf50",
  "target": "wf48",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe11",
  "source": "wf50",
  "target": "wf51",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "negative"
  }
 },
 {
  "id": "wfe12",
  "source": "wf48",
  "target": "wf66",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe13",
  "source": "wf48",
  "target": "wf49",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "negative"
  }
 },
 {
  "id": "wfe14",
  "source": "wf66",
  "target": "wf67",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe15",
  "source": "wf67",
  "target": "wf6",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe16",
  "source": "wf5",
  "target": "wf6",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe17",
  "source": "wf6",
  "target": "wf16",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe18",
  "source": "wf6",
  "target": "wf27",
  "sourceHandle": "sb",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe19",
  "source": "wf16",
  "target": "wf17",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe20",
  "source": "wf16",
  "target": "wf8",
  "sourceHandle": "sb",
  "targetHandle": "tt",
  "label": "",
  "data": {
   "condition": "",
   "classification": "negative"
  }
 },
 {
  "id": "wfe21",
  "source": "wf8",
  "target": "wf71",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe22",
  "source": "wf8",
  "target": "wf52",
  "sourceHandle": "sb",
  "targetHandle": "tt",
  "label": "",
  "data": {
   "condition": "",
   "classification": "negative"
  }
 },
 {
  "id": "wfe23",
  "source": "wf71",
  "target": "wf15",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe24",
  "source": "wf15",
  "target": "wf26",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe25",
  "source": "wf26",
  "target": "wf55",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe26",
  "source": "wf26",
  "target": "wf24",
  "sourceHandle": "sb",
  "targetHandle": "tt",
  "label": "",
  "data": {
   "condition": "",
   "classification": "negative"
  }
 },
 {
  "id": "wfe27",
  "source": "wf55",
  "target": "wf56",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe28",
  "source": "wf24",
  "target": "wf25",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe29",
  "source": "wf52",
  "target": "wf57",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe30",
  "source": "wf52",
  "target": "wf54",
  "sourceHandle": "sb",
  "targetHandle": "tt",
  "label": "",
  "data": {
   "condition": "",
   "classification": "negative"
  }
 },
 {
  "id": "wfe31",
  "source": "wf57",
  "target": "wf58",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe32",
  "source": "wf58",
  "target": "wf10",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe33",
  "source": "wf10",
  "target": "wf59",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe34",
  "source": "wf10",
  "target": "wf53",
  "sourceHandle": "sb",
  "targetHandle": "tt",
  "label": "",
  "data": {
   "condition": "",
   "classification": "negative"
  }
 },
 {
  "id": "wfe35",
  "source": "wf54",
  "target": "wf60",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe36",
  "source": "wf60",
  "target": "wf18",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe37",
  "source": "wf18",
  "target": "wf43",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe38",
  "source": "wf43",
  "target": "wf41",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe39",
  "source": "wf43",
  "target": "wf42",
  "sourceHandle": "sb",
  "targetHandle": "tt",
  "label": "",
  "data": {
   "condition": "",
   "classification": "negative"
  }
 },
 {
  "id": "wfe40",
  "source": "wf41",
  "target": "wf29",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe41",
  "source": "wf29",
  "target": "wf30",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe42",
  "source": "wf30",
  "target": "wf31",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe43",
  "source": "wf31",
  "target": "wf12",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe44",
  "source": "wf31",
  "target": "wf44",
  "sourceHandle": "sb",
  "targetHandle": "tt",
  "label": "",
  "data": {
   "condition": "",
   "classification": "negative"
  }
 },
 {
  "id": "wfe45",
  "source": "wf12",
  "target": "wf61",
  "sourceHandle": "sb",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe46",
  "source": "wf61",
  "target": "wf20",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe47",
  "source": "wf20",
  "target": "wf32",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe48",
  "source": "wf32",
  "target": "wf33",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe49",
  "source": "wf32",
  "target": "wf45",
  "sourceHandle": "sb",
  "targetHandle": "tt",
  "label": "",
  "data": {
   "condition": "",
   "classification": "negative"
  }
 },
 {
  "id": "wfe50",
  "source": "wf33",
  "target": "wf13",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe51",
  "source": "wf13",
  "target": "wf70",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe52",
  "source": "wf70",
  "target": "wf21",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe53",
  "source": "wf21",
  "target": "wf36",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe54",
  "source": "wf36",
  "target": "wf34",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe55",
  "source": "wf34",
  "target": "wf62",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe56",
  "source": "wf34",
  "target": "wf64",
  "sourceHandle": "sb",
  "targetHandle": "tt",
  "label": "",
  "data": {
   "condition": "",
   "classification": "negative"
  }
 },
 {
  "id": "wfe57",
  "source": "wf62",
  "target": "wf63",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe58",
  "source": "wf27",
  "target": "wf28",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": "",
   "classification": "positive"
  }
 },
 {
  "id": "wfe59",
  "source": "wf69",
  "target": "wf2",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe60",
  "source": "wf47",
  "target": "wf2",
  "sourceHandle": "sb",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe61",
  "source": "wf51",
  "target": "wf2",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe62",
  "source": "wf49",
  "target": "wf2",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe63",
  "source": "wf17",
  "target": "wf2",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe64",
  "source": "wf56",
  "target": "wf2",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe65",
  "source": "wf25",
  "target": "wf2",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe66",
  "source": "wf53",
  "target": "wf2",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe67",
  "source": "wf59",
  "target": "wf2",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe68",
  "source": "wf42",
  "target": "wf2",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe69",
  "source": "wf44",
  "target": "wf2",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe70",
  "source": "wf45",
  "target": "wf2",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe71",
  "source": "wf64",
  "target": "wf2",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe72",
  "source": "wf63",
  "target": "wf2",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 },
 {
  "id": "wfe73",
  "source": "wf28",
  "target": "wf2",
  "sourceHandle": "sr",
  "targetHandle": "tl",
  "label": "",
  "data": {
   "condition": ""
  }
 }
]
