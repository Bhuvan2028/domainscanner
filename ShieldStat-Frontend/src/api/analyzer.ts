import { apiFetch } from './config';

export interface VulnerabilityEntry {
  subdomain: string;
  ip: string | null;
  severity: string;
  port: number | null;
}

export interface GeneratedScoreResponse {
  scan_id: string;
  domain_score: number;
  categorized_vulnerabilities: Record<string, Record<string, VulnerabilityEntry[]>>;
  category_scores?: Record<string, number>;
}

/**
 * Submits the scan ID to the analyzer to calculate the final score.
 * If the score is already generated, it might return immediately.
 */
export async function submitForAnalyzer(scanId: string): Promise<GeneratedScoreResponse> {
  return apiFetch<GeneratedScoreResponse>(`/score/${scanId}`, {
    method: 'POST',
    timeout: 300000,
  });
}

/**
 * Retrieves the generated score without triggering a rescore.
 */
export async function getAnalyzerScore(scanId: string): Promise<GeneratedScoreResponse> {
    return apiFetch<GeneratedScoreResponse>(`/score/get_score/${scanId}`, {
        method: 'GET',
        timeout: 300000,
    });
}
