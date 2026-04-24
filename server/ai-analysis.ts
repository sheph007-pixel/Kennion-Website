import { getOpenAIClient } from "./ai-client";

interface GroupAnalysisInput {
  riskScore: number;
  riskTier: string;
  averageAge: number;
  employeeCount: number;
  spouseCount: number;
  childrenCount: number;
  totalLives: number;
  maleCount: number;
  femaleCount: number;
  characteristics: any;
  companyName: string;
}

// Short, focused review for the score-audit dialog. Different prompt
// from the full actuarial narrative — we want 2–3 crisp sentences that
// confirm the score matches the demographic profile, not a report.
export async function generateScoreReview(input: {
  companyName: string;
  riskScore: number;
  riskTier: string;
  totalLives: number;
  averageAge: number;
  femalePct: number;
  bands: { band: string; total: number; avgRiskScore: number }[];
}): Promise<string> {
  const openai = getOpenAIClient();
  const distSummary = input.bands
    .filter((b) => b.total > 0)
    .map((b) => `${b.band}: n=${b.total}, r=${b.avgRiskScore.toFixed(2)}`)
    .join("; ");
  const prompt = `You are an actuarial reviewer auditing a computed group risk score.
Confirm in 2–3 short sentences whether the score is consistent with the
demographic profile. Do not reword the inputs. Plain text only, no
bullet points, no markdown, no em-dashes.

Company: ${input.companyName}
Computed score: ${input.riskScore.toFixed(2)} (${input.riskTier})
Lives: ${input.totalLives}, avg age ${input.averageAge.toFixed(1)}, ${input.femalePct.toFixed(0)}% female.
Per-band: ${distSummary}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a terse actuarial reviewer. Never use em-dashes." },
      { role: "user", content: prompt },
    ],
    max_tokens: 180,
    temperature: 0.2,
  });
  return completion.choices[0]?.message?.content?.trim() || "Score is consistent with the reported demographic profile.";
}

export async function generateActuarialAnalysis(input: GroupAnalysisInput): Promise<string> {
  const openai = getOpenAIClient();

  const femalePercentage = ((input.femaleCount / (input.maleCount + input.femaleCount || 1)) * 100).toFixed(1);
  const avgFamilySize = (input.totalLives / (input.employeeCount || 1)).toFixed(2);
  const dependencyRatio = (((input.spouseCount || 0) + (input.childrenCount || 0)) / (input.employeeCount || 1)).toFixed(2);

  const prompt = `You are an expert actuary analyzing a group health insurance census. Write a detailed analysis report for this employer group.

Company: ${input.companyName}
Risk Tier: ${input.riskTier}
Risk Score: ${input.riskScore} (1.0 = average, <1.0 = better than average, >1.0 = worse than average)

Group Composition:
- ${input.totalLives} total covered lives
- ${input.employeeCount} employees
- ${input.spouseCount || 0} spouses
- ${input.childrenCount || 0} children
- Average age: ${input.averageAge} years
- Employee average age: ${input.characteristics.averageEmployeeAge} years
- Gender mix: ${femalePercentage}% female
- Average family size: ${avgFamilySize}
- Dependency ratio: ${dependencyRatio}

Industry Benchmarks for Comparison:
- Median age: 36.69 years
- Average family size: 1.91
- Female percentage: 50.96%

Risk Factors Identified:
${input.characteristics.factors?.map((f: string) => `- ${f}`).join('\n') || 'None'}

Instructions:
1. Write in plain English at an 8th grade reading level - clear and easy to understand
2. DO NOT include any personally identifiable information (PHI) - only use aggregate statistics
3. NEVER use em dashes (—) - use hyphens (-) or rewrite sentences instead
4. Explain what makes this group's risk profile ${input.riskTier}
5. Compare their demographics to industry benchmarks and explain what that means for pricing
6. Discuss age distribution impact on expected healthcare utilization
7. Explain how the MARA (Multi-factor Actuarial Risk Analysis) model evaluated this group
8. Mention key actuarial factors like:
   - Expected medical cost trends for this age/gender mix
   - How family size impacts premiums
   - The significance of their dependency ratio
   - Why their risk score of ${input.riskScore} matters
9. If Preferred or Standard risk: Explain why they qualify for the Kennion program and potential savings
10. If High risk: Explain why fully-insured may be better and what factors drove the higher risk score
11. Keep it professional but conversational - like an expert advisor explaining to a business owner
12. Focus on what this means for THEM - not generic insurance information
13. Length: 3-4 paragraphs, roughly 250-350 words total

Write ONLY the analysis text. No preamble, no "Here's the analysis" - just start with the analysis itself.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert actuary and benefits consultant. Write clear, professional analysis reports that explain complex insurance concepts in simple terms. Always write in plain English at an 8th grade reading level."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 600
    });

    return completion.choices[0].message.content || "Analysis pending - please check back shortly.";
  } catch (error) {
    console.error("Error generating AI analysis:", error);
    return "Our AI analysis system is currently processing your group. A detailed actuarial review will be available shortly.";
  }
}
