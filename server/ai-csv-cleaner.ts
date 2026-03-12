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

export async function cleanCSVWithAI(
  headers: string[],
  rows: Record<string, any>[]
): Promise<CSVCleaningResult> {
  // Filter out blank columns
  const nonBlankHeaders = headers.filter(h =>
    rows.some(r => r[h] && String(r[h]).trim())
  );

  const sampleRows = rows.slice(0, 10);

  const prompt = `You are a data cleaning assistant. Analyze this employee census CSV and map/standardize the data.

Headers: ${JSON.stringify(nonBlankHeaders)}
Sample rows (first 10): ${JSON.stringify(sampleRows, null, 2)}

Your task:
1. Identify which columns map to: firstName, lastName, relationship, dob (date of birth), gender, zip
2. Standardize relationship values to EXACTLY one of: "Employee", "Spouse", "Child"
   - Common abbreviations: EE/E/Emp → Employee, SP/S/Spouse → Spouse, CH/Child/Children/DEP/Dependent → Child
3. Standardize gender to EXACTLY: "Male" or "Female"
   - M/Male/male → Male, F/Female/female → Female
4. Keep dates in original format
5. Flag any rows with missing required data or unclear values

Return a JSON object with this structure:
{
  "columnMappings": {
    "firstName": "actual_column_name",
    "lastName": "actual_column_name",
    "relationship": "actual_column_name",
    "dob": "actual_column_name",
    "gender": "actual_column_name",
    "zip": "actual_column_name"
  },
  "standardizationRules": {
    "relationship": { "original_value": "standardized_value" },
    "gender": { "original_value": "standardized_value" }
  },
  "warnings": ["list any data quality issues"],
  "confidence": "high" | "medium" | "low"
}

Only return valid JSON, no explanation.`;

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a data cleaning assistant. Always return valid JSON only, no explanations."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1
  });

  const responseText = completion.choices[0].message.content || "{}";
  const aiResult = JSON.parse(responseText);

  // Apply AI mappings and standardization to all rows
  const cleanedData: CleanedRow[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const mappings = aiResult.columnMappings;
    const rules = aiResult.standardizationRules;

    try {
      // Extract values using AI mappings
      const firstName = row[mappings.firstName]?.toString().trim() || "";
      const lastName = row[mappings.lastName]?.toString().trim() || "";
      const rawRelationship = row[mappings.relationship]?.toString().trim() || "";
      const dob = row[mappings.dob]?.toString().trim() || "";
      const rawGender = row[mappings.gender]?.toString().trim() || "";
      const zip = row[mappings.zip]?.toString().trim() || "";

      // Standardize relationship
      let relationship: "Employee" | "Spouse" | "Child" = "Employee";
      if (rules.relationship[rawRelationship]) {
        relationship = rules.relationship[rawRelationship];
      } else {
        // Fallback logic
        const rel = rawRelationship.toLowerCase();
        if (rel.includes('sp') || rel.includes('spouse')) relationship = "Spouse";
        else if (rel.includes('dep') || rel.includes('child') || rel.includes('ch')) relationship = "Child";
      }

      // Standardize gender
      let gender: "Male" | "Female" = "Male";
      if (rules.gender[rawGender]) {
        gender = rules.gender[rawGender];
      } else {
        // Fallback logic
        const g = rawGender.toLowerCase();
        if (g.startsWith('f')) gender = "Female";
      }

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
    confidence: aiResult.confidence,
    summary: `Processed ${cleanedData.length} rows. Mapped columns automatically and standardized ${Object.keys(aiResult.standardizationRules.relationship || {}).length} relationship values and ${Object.keys(aiResult.standardizationRules.gender || {}).length} gender values.`,
    warnings: [...aiResult.warnings, ...warnings]
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
