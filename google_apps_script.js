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
      "A5_University_Type",
      "A6_Living_Arrangement",
      "A7_Academic_Year",
      "A7_Semester",

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

      // Module E: Rest, Sleep & Vitality (E1 - E8 + duration & condition)
      "E1", "E2", "E3", "E3_Duration_Min", "E4", "E5", "E6", "E7", "E8", "E8_Condition_Details",

      // Module F: MSPSS Social Support (F1 - F12)
      "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
      "MSPSS_Significant_Other_Mean",
      "MSPSS_Family_Mean",
      "MSPSS_Friends_Mean",
      "MSPSS_Total_Mean",

      // Module G: Hearth & Earth
      "G1", "G2_Family_Monthly_Income", "G3", "G4", "G5", "G6"
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

    // Build the row data aligned to existing headers with smart alias resolution
    var row = headers.map(function (colName) {
      if (!colName) return "";
      var trimmed = String(colName).trim();

      // Direct exact match (both raw and trimmed)
      if (rawData[colName] !== undefined && rawData[colName] !== null && rawData[colName] !== "") {
        return rawData[colName];
      }
      if (rawData[trimmed] !== undefined && rawData[trimmed] !== null && rawData[trimmed] !== "") {
        return rawData[trimmed];
      }

      // Smart normalized match (case-insensitive, ignoring underscores, spaces, hyphens)
      var normCol = trimmed.toLowerCase().replace(/[\s_-]+/g, "");
      for (var key in rawData) {
        var normKey = key.toLowerCase().replace(/[\s_-]+/g, "");
        if (normCol === normKey && rawData[key] !== undefined && rawData[key] !== null && rawData[key] !== "") {
          return rawData[key];
        }
      }

      // Specialized cross-aliases for historical/varied survey headers
      if (normCol === "a7semester" || normCol === "a7shemester" || normCol === "semester" || normCol === "shemester") {
        return rawData.A7_shemester || rawData.A7_Semester || rawData.A7_Shemester || rawData.Semester || "";
      }
      if (normCol === "a7academicyear" || normCol === "a7acdemicyear" || normCol === "a7studyyear" || normCol === "academicyear" || normCol === "studyyear" || normCol === "a7year" || normCol === "acdemic" || normCol === "year") {
        return rawData["A7_Acdemic year"] || rawData["A7_Acdemic Year"] || rawData["a7_acdemic year"] || rawData.A7_Academic_Year || rawData.A7_Study_Year || rawData.Academic_Year || "";
      }
      if (normCol === "g2familymonthlyincome" || normCol === "a8familymonthlyincome" || normCol === "familymonthlyincome" || normCol === "monthlyincome" || normCol === "g2") {
        return rawData.G2_Family_Monthly_Income || rawData.A8_Family_Monthly_Income || rawData.Monthly_Income || "";
      }
      if (normCol === "e3durationmin" || normCol === "e3minutes" || normCol === "e3duration" || normCol === "exerciseduration") {
        return rawData.E3_Duration_Min || rawData.E3_Minutes || "";
      }
      if (normCol === "e8conditiondetails" || normCol === "e8condition" || normCol === "diagnosedcondition") {
        return rawData.E8_Condition_Details || rawData.E8_Condition || "";
      }
      if (normCol === "a5relationshipstatus" || normCol === "a5universitytype" || normCol === "universitytype") {
        return rawData.A5_University_Type || rawData.A5_Relationship_Status || "";
      }

      return rawData[trimmed] !== undefined && rawData[trimmed] !== null ? rawData[trimmed] : "";
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

/**
 * ============================================================================
 * CLINICAL RESEARCH ANALYTICS DASHBOARD ENGINE
 * Automatically generates a publication-ready analytics dashboard inside
 * Google Sheets for Protocol VU/ERC/2026/042
 * ============================================================================
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("📊 MindCare Research")
    .addItem("🚀 Generate / Refresh Dashboard", "createMindCareDashboard")
    .addItem("⚠️ Check High-Risk B9 Cases", "checkHighRiskCases")
    .addSeparator()
    .addItem("ℹ️ Dashboard Documentation", "showDashboardHelp")
    .addToUi();
}

function colToLetter(colIndex) {
  var temp, letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = Math.floor((colIndex - temp - 1) / 26);
  }
  return letter;
}

function findColLetter(headers, possibleNames, defaultCol) {
  var normPossible = possibleNames.map(function(n) {
    return n.toLowerCase().replace(/[\s_-]+/g, "");
  });
  
  // Pass 1: exact normalized match
  for (var i = 0; i < headers.length; i++) {
    if (!headers[i]) continue;
    var normHeader = String(headers[i]).toLowerCase().replace(/[\s_-]+/g, "");
    for (var j = 0; j < normPossible.length; j++) {
      if (normHeader === normPossible[j]) {
        return colToLetter(i + 1);
      }
    }
  }
  // Pass 2: substring match
  for (var i = 0; i < headers.length; i++) {
    if (!headers[i]) continue;
    var normHeader = String(headers[i]).toLowerCase().replace(/[\s_-]+/g, "");
    for (var j = 0; j < normPossible.length; j++) {
      if (normHeader.indexOf(normPossible[j]) !== -1) {
        return colToLetter(i + 1);
      }
    }
  }
  return defaultCol || "A";
}

function createMindCareDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Locate Response Sheet
  var respSheet = ss.getSheetByName("Responses") || 
                  ss.getSheetByName("Form Responses 1") || 
                  ss.getSheetByName("Sheet1") || 
                  ss.getSheets()[0];
                  
  if (!respSheet) {
    SpreadsheetApp.getUi().alert("Error: Could not locate responses sheet!");
    return;
  }
  
  var respName = respSheet.getName();
  if (respName.indexOf(" ") !== -1 && respName.indexOf("'") === -1) {
    respName = "'" + respName + "'";
  }
  
  // 2. Read headers & resolve column letters dynamically
  var lastCol = Math.max(1, respSheet.getLastColumn());
  var headers = respSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  var tokenCol = findColLetter(headers, ["Anonymous_Token", "Submission ID", "Token"], "B");
  var timeCol = findColLetter(headers, ["Timestamp", "Time", "Date"], "A");
  var phqCol = findColLetter(headers, ["PHQ9_Total_Score", "PHQ-9 Score", "PHQ9 Score", "phq9total"], "W");
  var b9Col = findColLetter(headers, ["B9_Suicidal_Ideation", "Safety Flag (A9)", "B9", "Safety Flag"], "V");
  var sevCol = findColLetter(headers, ["PHQ9_Severity", "Severity"], "X");
  var mspssTotalCol = findColLetter(headers, ["MSPSS_Total_Mean", "MSPSS_Total", "mspsstotal"], "BJ");
  var mspssSOCol = findColLetter(headers, ["MSPSS_Significant_Other_Mean", "Significant Other"], "BG");
  var mspssFamCol = findColLetter(headers, ["MSPSS_Family_Mean", "Family Mean"], "BH");
  var mspssFriCol = findColLetter(headers, ["MSPSS_Friends_Mean", "Friends Mean"], "BI");
  var yearCol = findColLetter(headers, ["A7_Academic_Year", "A7_Acdemic year", "Academic Year", "B6_Year"], "L");
  var genderCol = findColLetter(headers, ["A3_Gender", "B4_Gender", "Gender"], "H");
  var livingCol = findColLetter(headers, ["A6_Living_Arrangement", "B8_Living", "Living"], "K");
  var g1Col = findColLetter(headers, ["G1", "G1_Stressful_Events", "G6_Event"], "BK");

  // 3. Create or reset Dashboard tab
  var dashName = "📊 Analytics Dashboard";
  var dash = ss.getSheetByName(dashName);
  if (!dash) {
    dash = ss.insertSheet(dashName, 0);
  } else {
    dash.clear();
    var oldCharts = dash.getCharts();
    for (var c = 0; c < oldCharts.length; c++) {
      dash.removeChart(oldCharts[c]);
    }
  }
  dash.setTabColor("#2D6A4F");
  dash.showGridlines(true);

  // Column Widths
  dash.setColumnWidth(1, 24);  // A spacer
  dash.setColumnWidth(2, 160); // B
  dash.setColumnWidth(3, 110); // C
  dash.setColumnWidth(4, 110); // D
  dash.setColumnWidth(5, 110); // E
  dash.setColumnWidth(6, 120); // F
  dash.setColumnWidth(7, 30);  // G spacer
  dash.setColumnWidth(8, 170); // H
  dash.setColumnWidth(9, 130); // I
  dash.setColumnWidth(10, 130);// J
  dash.setColumnWidth(11, 140);// K

  // Header Banner
  dash.getRange("B2:K2").merge()
    .setValue("MindCare — Clinical Research & Feature Analytics Dashboard")
    .setFontSize(15).setFontWeight("bold").setFontColor("#FFFFFF")
    .setBackground("#152418").setHorizontalAlignment("center").setVerticalAlignment("middle");
  dash.setRowHeight(2, 42);

  dash.getRange("B3:K3").merge()
    .setValue("Varendra University Research Protocol VU/ERC/2026/042 | Live Data Stream & Statistical Analytics")
    .setFontSize(9).setFontColor("#DCE8D5").setBackground("#2D6A4F")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  dash.setRowHeight(3, 24);

  // Row 5 & 6: 5 KPI Cards
  var kpis = [
    { range: "B5:C6", title: "TOTAL SCREENED (N)", formula: "=COUNTA(" + respName + "!" + tokenCol + "2:" + tokenCol + ")", bg: "#F0F6F2", fg: "#152418", border: "#C8DCCF" },
    { range: "D5:E6", title: "MEAN PHQ-9 SCORE", formula: "=IFERROR(ROUND(AVERAGE(" + respName + "!" + phqCol + "2:" + phqCol + "), 1), 0)", bg: "#F0F6F2", fg: "#152418", border: "#C8DCCF" },
    { range: "F5:G6", title: "DEPRESSION RATE (≥10)", formula: "=IFERROR(COUNTIF(" + respName + "!" + phqCol + "2:" + phqCol + ", '>=10')/MAX(1, COUNTA(" + respName + "!" + tokenCol + "2:" + tokenCol + ")), 0)", bg: "#FFF9E6", fg: "#925700", border: "#FFE58F", isPercent: true },
    { range: "H5:I6", title: "🚨 CRITICAL RISK (B9 > 0)", formula: "=IFERROR(COUNTIF(" + respName + "!" + b9Col + "2:" + b9Col + ", '>0') + COUNTIF(" + respName + "!" + b9Col + "2:" + b9Col + ", 'CRITICAL*'), 0)", bg: "#FFF1F0", fg: "#CF1322", border: "#FFA39E" },
    { range: "J5:K6", title: "MEAN MSPSS SUPPORT", formula: "=IFERROR(ROUND(AVERAGE(" + respName + "!" + mspssTotalCol + "2:" + mspssTotalCol + "), 2), 0)", bg: "#F0F6F2", fg: "#152418", border: "#C8DCCF" }
  ];

  kpis.forEach(function(k) {
    var r = dash.getRange(k.range);
    r.merge().setValue(k.formula)
      .setFontSize(20).setFontWeight("bold").setFontColor(k.fg).setBackground(k.bg)
      .setHorizontalAlignment("center").setVerticalAlignment("middle")
      .setBorder(true, true, true, true, false, false, k.border, SpreadsheetApp.BorderStyle.SOLID);
    if (k.isPercent) {
      r.setNumberFormat("0.0%");
    }
  });

  // Table 1: PHQ-9 Clinical Depression Severity Distribution
  dash.getRange("B8:F8").merge().setValue("1. PHQ-9 Clinical Depression Severity Distribution")
    .setFontWeight("bold").setFontColor("#152418").setBackground("#DCE8D5").setFontSize(11);
  dash.getRange("B9:F9").setValues([["Severity Category", "Score Cutoff", "Sample (N)", "Share (%)", "Mean Social Support"]])
    .setFontWeight("bold").setFontColor("#152418").setBackground("#F4F8F3").setFontSize(10);

  var sevRows = [
    ["Minimal", "0 – 4", "=COUNTIFS(" + respName + "!" + phqCol + "2:" + phqCol + ", '>=0', " + respName + "!" + phqCol + "2:" + phqCol + ", '<=4')", "=D10/$B$5", "=IFERROR(ROUND(AVERAGEIFS(" + respName + "!" + mspssTotalCol + "2:" + mspssTotalCol + ", " + respName + "!" + phqCol + "2:" + phqCol + ", '>=0', " + respName + "!" + phqCol + "2:" + phqCol + ", '<=4'), 2), 0)"],
    ["Mild", "5 – 9", "=COUNTIFS(" + respName + "!" + phqCol + "2:" + phqCol + ", '>=5', " + respName + "!" + phqCol + "2:" + phqCol + ", '<=9')", "=D11/$B$5", "=IFERROR(ROUND(AVERAGEIFS(" + respName + "!" + mspssTotalCol + "2:" + mspssTotalCol + ", " + respName + "!" + phqCol + "2:" + phqCol + ", '>=5', " + respName + "!" + phqCol + "2:" + phqCol + ", '<=9'), 2), 0)"],
    ["Moderate", "10 – 14", "=COUNTIFS(" + respName + "!" + phqCol + "2:" + phqCol + ", '>=10', " + respName + "!" + phqCol + "2:" + phqCol + ", '<=14')", "=D12/$B$5", "=IFERROR(ROUND(AVERAGEIFS(" + respName + "!" + mspssTotalCol + "2:" + mspssTotalCol + ", " + respName + "!" + phqCol + "2:" + phqCol + ", '>=10', " + respName + "!" + phqCol + "2:" + phqCol + ", '<=14'), 2), 0)"],
    ["Moderately Severe", "15 – 19", "=COUNTIFS(" + respName + "!" + phqCol + "2:" + phqCol + ", '>=15', " + respName + "!" + phqCol + "2:" + phqCol + ", '<=19')", "=D13/$B$5", "=IFERROR(ROUND(AVERAGEIFS(" + respName + "!" + mspssTotalCol + "2:" + mspssTotalCol + ", " + respName + "!" + phqCol + "2:" + phqCol + ", '>=15', " + respName + "!" + phqCol + "2:" + phqCol + ", '<=19'), 2), 0)"],
    ["Severe", "20 – 27", "=COUNTIFS(" + respName + "!" + phqCol + "2:" + phqCol + ", '>=20', " + respName + "!" + phqCol + "2:" + phqCol + ", '<=27')", "=D14/$B$5", "=IFERROR(ROUND(AVERAGEIFS(" + respName + "!" + mspssTotalCol + "2:" + mspssTotalCol + ", " + respName + "!" + phqCol + "2:" + phqCol + ", '>=20', " + respName + "!" + phqCol + "2:" + phqCol + ", '<=27'), 2), 0)"]
  ];
  dash.getRange("B10:F14").setValues(sevRows).setFontSize(10);
  dash.getRange("E10:E14").setNumberFormat("0.0%");
  dash.getRange("F10:F14").setNumberFormat("0.00");
  dash.getRange("B8:F14").setBorder(true, true, true, true, true, true, "#E2E8DF", SpreadsheetApp.BorderStyle.SOLID);

  // Table 2: MSPSS Tripartite Dimensions
  dash.getRange("H8:K8").merge().setValue("2. MSPSS Tripartite Social Support Profile")
    .setFontWeight("bold").setFontColor("#152418").setBackground("#DCE8D5").setFontSize(11);
  dash.getRange("H9:K9").setValues([["Dimension", "Items Included", "Mean Score (1-7)", "Clinical Support Tier"]])
    .setFontWeight("bold").setFontColor("#152418").setBackground("#F4F8F3").setFontSize(10);

  var mspssRows = [
    ["Significant Other", "F1, F2, F5, F10", "=IFERROR(ROUND(AVERAGE(" + respName + "!" + mspssSOCol + "2:" + mspssSOCol + "), 2), 0)", '=IF(J10>=5.1, "High Support", IF(J10>=3.0, "Moderate Support", "Low Support"))'],
    ["Family", "F3, F4, F8, F11", "=IFERROR(ROUND(AVERAGE(" + respName + "!" + mspssFamCol + "2:" + mspssFamCol + "), 2), 0)", '=IF(J11>=5.1, "High Support", IF(J11>=3.0, "Moderate Support", "Low Support"))'],
    ["Friends", "F6, F7, F9, F12", "=IFERROR(ROUND(AVERAGE(" + respName + "!" + mspssFriCol + "2:" + mspssFriCol + "), 2), 0)", '=IF(J12>=5.1, "High Support", IF(J12>=3.0, "Moderate Support", "Low Support"))'],
    ["Overall Social Support", "All 12 Items", "=IFERROR(ROUND(AVERAGE(" + respName + "!" + mspssTotalCol + "2:" + mspssTotalCol + "), 2), 0)", '=IF(J13>=5.1, "High Support", IF(J13>=3.0, "Moderate Support", "Low Support"))']
  ];
  dash.getRange("H10:K13").setValues(mspssRows).setFontSize(10);
  dash.getRange("J10:J13").setNumberFormat("0.00");
  dash.getRange("H8:K13").setBorder(true, true, true, true, true, true, "#E2E8DF", SpreadsheetApp.BorderStyle.SOLID);

  // Table 3: Academic Year Cross-Tabulation
  dash.getRange("B16:F16").merge().setValue("3. Academic Standing & Depression Breakdown")
    .setFontWeight("bold").setFontColor("#152418").setBackground("#DCE8D5").setFontSize(11);
  dash.getRange("B17:F17").setValues([["Academic Year", "Sample (N)", "Share (%)", "Mean PHQ-9", "Clinical Dep. (≥10)"]])
    .setFontWeight("bold").setFontColor("#152418").setBackground("#F4F8F3").setFontSize(10);

  var yearRows = [
    ["1st Year", "=COUNTIF(" + respName + "!" + yearCol + "2:" + yearCol + ", \"*1st*\")", "=C18/$B$5", "=IFERROR(ROUND(AVERAGEIF(" + respName + "!" + yearCol + "2:" + yearCol + ", \"*1st*\", " + respName + "!" + phqCol + "2:" + phqCol + "), 1), 0)", "=IFERROR(COUNTIFS(" + respName + "!" + yearCol + "2:" + yearCol + ", \"*1st*\", " + respName + "!" + phqCol + "2:" + phqCol + ", \">=10\")/MAX(1, C18), 0)"],
    ["2nd Year", "=COUNTIF(" + respName + "!" + yearCol + "2:" + yearCol + ", \"*2nd*\")", "=C19/$B$5", "=IFERROR(ROUND(AVERAGEIF(" + respName + "!" + yearCol + "2:" + yearCol + ", \"*2nd*\", " + respName + "!" + phqCol + "2:" + phqCol + "), 1), 0)", "=IFERROR(COUNTIFS(" + respName + "!" + yearCol + "2:" + yearCol + ", \"*2nd*\", " + respName + "!" + phqCol + "2:" + phqCol + ", \">=10\")/MAX(1, C19), 0)"],
    ["3rd Year", "=COUNTIF(" + respName + "!" + yearCol + "2:" + yearCol + ", \"*3rd*\")", "=C20/$B$5", "=IFERROR(ROUND(AVERAGEIF(" + respName + "!" + yearCol + "2:" + yearCol + ", \"*3rd*\", " + respName + "!" + phqCol + "2:" + phqCol + "), 1), 0)", "=IFERROR(COUNTIFS(" + respName + "!" + yearCol + "2:" + yearCol + ", \"*3rd*\", " + respName + "!" + phqCol + "2:" + phqCol + ", \">=10\")/MAX(1, C20), 0)"],
    ["4th Year", "=COUNTIF(" + respName + "!" + yearCol + "2:" + yearCol + ", \"*4th*\")", "=C21/$B$5", "=IFERROR(ROUND(AVERAGEIF(" + respName + "!" + yearCol + "2:" + yearCol + ", \"*4th*\", " + respName + "!" + phqCol + "2:" + phqCol + "), 1), 0)", "=IFERROR(COUNTIFS(" + respName + "!" + yearCol + "2:" + yearCol + ", \"*4th*\", " + respName + "!" + phqCol + "2:" + phqCol + ", \">=10\")/MAX(1, C21), 0)"]
  ];
  dash.getRange("B18:F21").setValues(yearRows).setFontSize(10);
  dash.getRange("D18:D21").setNumberFormat("0.0%");
  dash.getRange("F18:F21").setNumberFormat("0.0%");
  dash.getRange("B16:F21").setBorder(true, true, true, true, true, true, "#E2E8DF", SpreadsheetApp.BorderStyle.SOLID);

  // Table 4: Major Stressful Life Events Impact
  dash.getRange("H15:K15").merge().setValue("4. Stressful Life Events Impact (Module G)")
    .setFontWeight("bold").setFontColor("#152418").setBackground("#DCE8D5").setFontSize(11);
  dash.getRange("H16:K16").setValues([["Stressful Events (Last 6 Mo)", "Sample (N)", "Mean PHQ-9", "Clinical Dep. (≥10)"]])
    .setFontWeight("bold").setFontColor("#152418").setBackground("#F4F8F3").setFontSize(10);

  var stressRows = [
    ["Yes (Experienced Events)", "=COUNTIF(" + respName + "!" + g1Col + "2:" + g1Col + ", \"*Yes*\")", "=IFERROR(ROUND(AVERAGEIF(" + respName + "!" + g1Col + "2:" + g1Col + ", \"*Yes*\", " + respName + "!" + phqCol + "2:" + phqCol + "), 1), 0)", "=IFERROR(COUNTIFS(" + respName + "!" + g1Col + "2:" + g1Col + ", \"*Yes*\", " + respName + "!" + phqCol + "2:" + phqCol + ", \">=10\")/MAX(1, I17), 0)"],
    ["No (No Major Events)", "=COUNTIF(" + respName + "!" + g1Col + "2:" + g1Col + ", \"*No*\")", "=IFERROR(ROUND(AVERAGEIF(" + respName + "!" + g1Col + "2:" + g1Col + ", \"*No*\", " + respName + "!" + phqCol + "2:" + phqCol + "), 1), 0)", "=IFERROR(COUNTIFS(" + respName + "!" + g1Col + "2:" + g1Col + ", \"*No*\", " + respName + "!" + phqCol + "2:" + phqCol + ", \">=10\")/MAX(1, I18), 0)"]
  ];
  dash.getRange("H17:K18").setValues(stressRows).setFontSize(10);
  dash.getRange("K17:K18").setNumberFormat("0.0%");
  dash.getRange("H15:K18").setBorder(true, true, true, true, true, true, "#E2E8DF", SpreadsheetApp.BorderStyle.SOLID);

  // Table 5: Emergency Critical Risk Audit Table (Item B9 > 0)
  dash.getRange("B23:K23").merge().setValue("🚨 Emergency Safety Audit: High-Risk Self-Harm / Suicide Cases (Item B9 > 0)")
    .setFontWeight("bold").setFontColor("#FFFFFF").setBackground("#C0392B").setFontSize(11);
  
  var queryFormula = '=IFERROR(QUERY(' + respName + '!A1:ZZ, "SELECT ' + tokenCol + ', ' + timeCol + ', ' + b9Col + ', ' + phqCol + ', ' + genderCol + ', ' + yearCol + ' WHERE ' + b9Col + ' > 0 ORDER BY ' + b9Col + ' DESC", 1), "✓ No Critical Suicide/Self-Harm Risk Flags Recorded to Date")';
  dash.getRange("B24").setValue(queryFormula).setFontSize(10).setFontWeight("bold");

  // Charts
  try {
    // 1. Donut Chart for PHQ-9 Severity
    var pieChart = dash.newChart()
      .setChartType(Charts.ChartType.PIE)
      .addRange(dash.getRange("B9:B14"))
      .addRange(dash.getRange("D9:D14"))
      .setPosition(27, 2, 0, 0)
      .setOption("title", "PHQ-9 Depression Severity Breakdown")
      .setOption("pieHole", 0.45)
      .setOption("colors", ["#52B788", "#74C69D", "#F4A261", "#E76F51", "#D62828"])
      .setOption("width", 420)
      .setOption("height", 280)
      .build();
    dash.insertChart(pieChart);

    // 2. Column Chart for Academic Year vs PHQ-9
    var colChart = dash.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(dash.getRange("B17:B21"))
      .addRange(dash.getRange("E17:E21"))
      .setPosition(27, 7, 0, 0)
      .setOption("title", "Mean PHQ-9 Score by Academic Year")
      .setOption("colors", ["#2D6A4F"])
      .setOption("legend", { position: "none" })
      .setOption("width", 440)
      .setOption("height", 280)
      .build();
    dash.insertChart(colChart);
  } catch (chartErr) {
    Logger.log("Chart creation note: " + chartErr.toString());
  }

  SpreadsheetApp.flush();
  try {
    SpreadsheetApp.getUi().alert("🎉 MindCare Research Dashboard successfully generated & updated!");
  } catch(e) {}
}

function checkHighRiskCases() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dash = ss.getSheetByName("📊 Analytics Dashboard");
  if (dash) {
    ss.setActiveSheet(dash);
    var riskCount = dash.getRange("H5").getValue();
    SpreadsheetApp.getUi().alert("⚠️ High Risk Audit", "Current Critical Risk Cases (Item B9 > 0): " + riskCount + "\n\nPlease review row 24 on the Analytics Dashboard for immediate follow-up.", SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    createMindCareDashboard();
  }
}

function showDashboardHelp() {
  SpreadsheetApp.getUi().alert(
    "MindCare Clinical Research Dashboard Engine",
    "This dashboard is automatically linked to your survey responses.\n\n" +
    "• Protocol: CIR VU/ERC/2026/042\n" +
    "• To update metrics with new responses: Click 'MindCare Research' > 'Generate / Refresh Dashboard'.\n" +
    "• All formulas dynamically detect your column headers and recalculate instantly.\n\n" +
    "Contact: Department of Clinical Psychology, Varendra University",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
