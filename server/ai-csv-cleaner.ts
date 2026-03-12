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
  relationship: "Employee" | "Spouse" | "Child";
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
function standardizeRelationship(value: string): "Employee" | "Spouse" | "Child" {
  const normalized = value.trim().toUpperCase();

  // Employee patterns
  if (["EE", "E", "EMP", "EMPLOYEE"].includes(normalized)) {
    return "Employee";
  }

  // Spouse patterns
  if (["SP", "S", "SPOUSE"].includes(normalized)) {
    return "Spouse";
  }

  // Child patterns
  if (["CH", "C", "CHILD", "CHILDREN", "DEP", "DEPENDENT"].includes(normalized)) {
    return "Child";
  }

  // Default to Employee if unrecognized
  return "Employee";
}

/**
 * Standardize gender value using simple rules
 */
function standardizeGender(value: string): "Male" | "Female" {
  const normalized = value.trim().toUpperCase();

  if (["F", "FEMALE"].includes(normalized)) {
    return "Female";
  }

  if (["M", "MALE"].includes(normalized)) {
    return "Male";
  }

  // Default to Male if unrecognized
  return "Male";
}

/**
 * Clean CSV data using exact column names (no AI mapping needed)
 * Columns are pre-validated, so we just standardize values
 */
export async function cleanCSVWithAI(
  headers: string[],
  rows: Record<string, any>[]
): Promise<CSVCleaningResult> {
  const cleanedData: CleanedRow[] = [];
  const warnings: string[] = [];

  // Known column names (already validated)
  const COLUMNS = {
    firstName: "First Name",
    lastName: "Last Name",
    type: "Type",
    dob: "Date of Birth",
    gender: "Gender",
    zip: "Zip Code"
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      // Extract values using exact column names
      const firstName = row[COLUMNS.firstName]?.toString().trim() || "";
      const lastName = row[COLUMNS.lastName]?.toString().trim() || "";
      const rawType = row[COLUMNS.type]?.toString().trim() || "";
      const dob = row[COLUMNS.dob]?.toString().trim() || "";
      const rawGender = row[COLUMNS.gender]?.toString().trim() || "";
      const zip = row[COLUMNS.zip]?.toString().trim() || "";

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
    confidence: "high", // Always high since we're using exact columns
    summary: `Processed ${cleanedData.length} rows. Standardized relationship and gender values.`,
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
