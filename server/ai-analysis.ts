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

// Deterministic 2-3 sentence summary for the score-audit dialog. The
// table above this prose already shows every per-band number, so the
// prose only needs to state tier+threshold, demographic mix, and the
// directional rule (lower score = better). Was previously an LLM call;
// gpt-4o-mini produced direction-reversed text ("higher older-band
// scores contribute positively to the overall score") because the
// prompt did not state the directionality. Plain template avoids that
// class of bug entirely and is free + instant.
export async function generateScoreReview(input: {
  companyName: string;
  riskScore: number;
  riskTier: string;
  totalLives: number;
  averageAge: number;
  femalePct: number;
  bands: { band: string; total: number; avgRiskScore: number }[];
}): Promise<string> {
  const score = input.riskScore.toFixed(2);
  let tierSentence: string;
  if (input.riskScore < 1.0) {
    tierSentence = `Score ${score} sits below the 1.0 preferred threshold.`;
  } else if (input.riskScore < 1.5) {
    tierSentence = `Score ${score} sits in the standard band (1.0 to 1.5).`;
  } else {
    tierSentence = `Score ${score} sits at or above the 1.5 high-risk threshold.`;
  }
  const lifeWord = input.totalLives === 1 ? "covered life" : "covered lives";
  const demoSentence =
    `Group of ${input.totalLives} ${lifeWord}, average age ${input.averageAge.toFixed(1)}, ` +
    `${input.femalePct.toFixed(0)}% female.`;
  const directionSentence =
    "Per the age/gender risk table, older bands carry higher per-member scores " +
    "that raise the group average; younger bands pull it down.";
  return `${tierSentence} ${demoSentence} ${directionSentence}`;
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
