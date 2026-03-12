import OpenAI from "openai";

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

interface CleanedRow {
  firstName: string;
  lastName: string;
  relationship: "EE" | "SP" | "CH";
  dob: string;
  gender: "Male" | "Female";
  zip: string;
  originalRow: Record<string, any>;
  issues?: string[];
}

interface CSVCleaningResult {
  cleanedData: CleanedRow[];
  confidence: "high" | "medium" | "low";
  summary: string;
  warnings: string[];
}

/**
 * Standardize relationship value using simple rules
 */
function standardizeRelationship(value: string): "EE" | "SP" | "CH" {
  const normalized = value.trim().toUpperCase();

  // Employee patterns
  if (["EE", "E", "EMP", "EMPLOYEE", "STAFF", "WORKER", "MEMBER"].includes(normalized)) {
    return "EE";
  }

  // Spouse patterns
  if (["SP", "S", "SPOUSE", "PARTNER", "WIFE", "HUSBAND"].includes(normalized)) {
    return "SP";
  }

  // Child patterns
  if (["CH", "C", "CHILD", "CHILDREN", "DEP", "DEPENDENT", "KID", "SON", "DAUGHTER"].includes(normalized)) {
    return "CH";
  }

  // Default to Employee if unrecognized
  return "EE";
}

/**
 * Standardize gender value using simple rules
 */
function standardizeGender(value: string): "Male" | "Female" {
  const normalized = value.trim().toUpperCase();

  // Female patterns
  if (["F", "FEMALE", "WOMAN", "W", "GIRL"].includes(normalized)) {
    return "Female";
  }

  // Male patterns
  if (["M", "MALE", "MAN", "BOY"].includes(normalized)) {
    return "Male";
  }

  // Default to Male if unrecognized
  return "Male";
}

/**
 * Intelligently maps CSV columns using AI
 * Detects column purposes even if names don't match exactly
 */
async function mapColumnsWithAI(headers: string[]): Promise<Record<string, string>> {
  const prompt = `You are a data mapping expert. Analyze these CSV column headers and map them to our required fields.

CSV Headers: ${headers.join(", ")}

Required Fields:
- First Name (person's first/given name)
- Last Name (person's last/family/surname)
- Type (relationship: Employee/EE/Spouse/SP/Child/CH/Dependent)
- Date of Birth (DOB, birthday, birth date)
- Gender (sex, M/F/Male/Female)
- Zip Code (postal code, zip)

Return ONLY a JSON object mapping each header to ONE of these fields. If a header doesn't match any field, map it to "ignore".
Format: {"Header Name": "First Name", "Another Header": "Last Name", ...}

Be flexible - match variations like "FirstName", "first_name", "fname", "DOB", "BirthDate", etc.`;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a data mapping expert. Return ONLY valid JSON, no explanations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const mapping = JSON.parse(completion.choices[0].message.content || "{}");
    return mapping;
  } catch (error) {
    // Fallback: try simple fuzzy matching
    const mapping: Record<string, string> = {};
    for (const header of headers) {
      const lower = header.toLowerCase().replace(/[_\s-]/g, "");
      if (lower.includes("first") || lower.includes("fname")) mapping[header] = "First Name";
      else if (lower.includes("last") || lower.includes("lname") || lower.includes("surname")) mapping[header] = "Last Name";
      else if (lower.includes("type") || lower.includes("relation")) mapping[header] = "Type";
      else if (lower.includes("dob") || lower.includes("birth") || lower.includes("bday")) mapping[header] = "Date of Birth";
      else if (lower.includes("gender") || lower.includes("sex")) mapping[header] = "Gender";
      else if (lower.includes("zip") || lower.includes("postal")) mapping[header] = "Zip Code";
      else mapping[header] = "ignore";
    }
    return mapping;
  }
}

/**
 * Clean CSV data using intelligent AI-powered column mapping
 * Automatically detects columns and standardizes values
 */
export async function cleanCSVWithAI(
  headers: string[],
  rows: Record<string, any>[]
): Promise<CSVCleaningResult> {
  const cleanedData: CleanedRow[] = [];
  const warnings: string[] = [];

  // Use AI to intelligently map columns
  const columnMapping = await mapColumnsWithAI(headers);

  // Reverse mapping: Required Field -> CSV Header
  const fieldToHeader: Record<string, string | null> = {
    "First Name": null,
    "Last Name": null,
    "Type": null,
    "Date of Birth": null,
    "Gender": null,
    "Zip Code": null
  };

  for (const [header, field] of Object.entries(columnMapping)) {
    if (field !== "ignore") {
      fieldToHeader[field] = header;
    }
  }

  // Check for missing required fields
  const missingFields = Object.entries(fieldToHeader)
    .filter(([_, header]) => !header)
    .map(([field, _]) => field);

  if (missingFields.length > 0) {
    throw new Error(`Could not detect required columns: ${missingFields.join(", ")}. Please ensure your CSV contains columns for first name, last name, relationship type, date of birth, gender, and zip code.`);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      // Extract values using mapped column names
      const firstName = row[fieldToHeader["First Name"]!]?.toString().trim() || "";
      const lastName = row[fieldToHeader["Last Name"]!]?.toString().trim() || "";
      const rawType = row[fieldToHeader["Type"]!]?.toString().trim() || "";
      const dob = row[fieldToHeader["Date of Birth"]!]?.toString().trim() || "";
      const rawGender = row[fieldToHeader["Gender"]!]?.toString().trim() || "";
      const zip = row[fieldToHeader["Zip Code"]!]?.toString().trim() || "";

      // Standardize using simple rules
      const relationship = standardizeRelationship(rawType);
      const gender = standardizeGender(rawGender);

      const issues: string[] = [];
      if (!firstName) issues.push("Missing first name");
      if (!lastName) issues.push("Missing last name");
      if (!dob) issues.push("Missing date of birth");
      if (!zip) issues.push("Missing zip code");

      if (issues.length > 0) {
        warnings.push(`Row ${i + 1}: ${issues.join(", ")}`);
      }

      cleanedData.push({
        firstName,
        lastName,
        relationship,
        dob,
        gender,
        zip,
        originalRow: row,
        issues: issues.length > 0 ? issues : undefined
      });
    } catch (err) {
      warnings.push(`Row ${i + 1}: Failed to process - ${err}`);
    }
  }

  return {
    cleanedData,
    confidence: "high",
    summary: `AI detected and mapped ${headers.length} columns. Processed ${cleanedData.length} rows with auto-standardized values.`,
    warnings
  };
}

/**
 * Generate AI-powered validation error messages
 * Helps users understand what's wrong and how to fix it
 */
export async function generateValidationGuidance(
  errors: string[],
  matchRate: number
): Promise<string> {
  const prompt = `You are a helpful data quality assistant. A user uploaded employee census data that failed validation with a ${matchRate}% match rate.

Validation errors:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Generate a clear, helpful message that:
1. Explains what went wrong in simple terms
2. Provides specific steps to fix the issues
3. Is encouraging and supportive (not technical/scary)
4. Mentions they can download the template or use AI cleaning to help

Keep it under 150 words. Be friendly and solution-focused.`;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful data quality assistant. Be clear, friendly, and solution-focused."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    return completion.choices[0].message.content || "Please review and correct the data validation errors before uploading.";
  } catch (error) {
    // Fallback if AI fails
    return "Your census data has validation errors. Please ensure all records have valid dates of birth and gender values (Male/Female). Download our template for the correct format.";
  }
}
