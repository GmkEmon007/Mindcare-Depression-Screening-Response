/**
 * ============================================================================
 * GOOGLE APPS SCRIPT FOR VARENDRA UNIVERSITY (VU) RESEARCH QUESTIONNAIRE
 * CIR Protocol #VU/ERC/2026/042
 * "An Explainable Machine Learning Framework for Context-Aware Depression Screening"
 * ============================================================================
 *
 * HOW TO CONNECT TO GOOGLE SHEETS (STEP-BY-STEP):
 * ----------------------------------------------------------------------------
 * 1. Open Google Sheets (https://sheets.new) and name it (e.g. "VU Research Responses").
 * 2. In the top menu, go to: Extensions > Apps Script.
 * 3. Delete any code in Code.gs and paste this ENTIRE file into the editor.
 * 4. Click the Save icon (💾) or press Ctrl+S.
 * 5. Click the blue "Deploy" button (top right) > "New deployment".
 *    - Click the gear icon (⚙️) next to "Select type" and choose "Web app".
 *    - Description: "VU Survey Webhook"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone"  <-- IMPORTANT: Must be "Anyone" so submissions can post!
 * 6. Click "Deploy".
 *    - If asked, click "Authorize access", choose your Google account, 
 *      click "Advanced", then "Go to ... (unsafe)", and click "Allow".
 * 7. Copy the generated "Web app URL" (it looks like: https://script.google.com/macros/s/AKfycb.../exec).
 * 8. In your questionnaire, paste that Web App URL when submitting, or paste it in script.js as GOOGLE_SHEET_URL!
 * ============================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 15 seconds for concurrent submissions to prevent collisions
  lock.tryLock(15000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Responses") || ss.getActiveSheet() || ss.getSheets()[0];

    // Parse incoming POST body (supports JSON payload, URL-encoded form data, or hidden form postData)
    var rawData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        rawData = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        rawData = e.parameter || {};
      }
    } else if (e && e.parameter) {
      if (e.parameter.postData) {
        try {
          rawData = JSON.parse(e.parameter.postData);
        } catch (pErr) {
          rawData = e.parameter;
        }
      } else {
        rawData = e.parameter;
      }
    }

    // Standard column ordering for academic and ML research analysis
    var standardColumns = [
      "Timestamp",
      "Anonymous_Token",
      "Consent_Given",
      "Total_Answered",

      // Module A: Demographics
      "A1_Age",
      "A2_Height_Ft",
      "A2_Height_In",
      "A3_Gender",
      "A4_Weight_Kg",
      "A5_Relationship_Status",
      "A6_Living_Arrangement",
      "A7_Semester",
      "A7_Study_Year",
      "A8_Family_Monthly_Income",

      // Module B: PHQ-9 Depression Index (0-3 each)
      "B1_Anhedonia",
      "B2_Depressed_Mood",
      "B3_Sleep_Issues",
      "B4_Fatigue",
      "B5_Appetite_Changes",
      "B6_Guilt_Failure",
      "B7_Concentration",
      "B8_Motor_Changes",
      "B9_Suicidal_Ideation",
      "PHQ9_Total_Score",
      "PHQ9_Severity",

      // Module C: Academic Stress (C1 - C8)
      "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8",

      // Module D: Future Anxiety & AI Outlook (D1 - D4)
      "D1", "D2", "D3", "D4",

      // Module E: Rest, Sleep & Vitality (E1 - E8)
      "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8",

      // Module F: MSPSS Social Support (F1 - F12)
      "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
      "MSPSS_Significant_Other_Mean",
      "MSPSS_Family_Mean",
      "MSPSS_Friends_Mean",
      "MSPSS_Total_Mean",

      // Module G: Hearth & Earth
      "G1", "G3", "G4", "G5", "G6"
    ];

    // If the sheet is empty or has no columns, automatically create and format the header row
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow === 0 || lastCol === 0) {
      sheet.clear();
      sheet.appendRow(standardColumns);

      var headerRange = sheet.getRange(1, 1, 1, standardColumns.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#EAF2EC");
      headerRange.setFontColor("#152418");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
      lastCol = standardColumns.length;
    }

    // Read current headers from row 1
    var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];

    // Build the row data aligned to existing headers
    var row = headers.map(function (colName) {
      var val = rawData[colName];
      if (val === undefined || val === null) {
        return "";
      }
      return val;
    });

    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      row: sheet.getLastRow(),
      token: rawData.Anonymous_Token || rawData["Submission ID"] || ""
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Responses") || ss.getActiveSheet() || ss.getSheets()[0];
    var totalRows = sheet.getLastRow();
    var totalCols = sheet.getLastColumn();
    var sheetName = sheet.getName();
    
    if (e && e.parameter && (e.parameter.status || e.parameter.check)) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "active",
        sheetName: sheetName,
        totalRows: totalRows,
        totalCols: totalCols,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {}

  return ContentService.createTextOutput(
    "VU Research Webhook is active! Send a POST request to submit questionnaire responses."
  ).setMimeType(ContentService.MimeType.TEXT);
}
