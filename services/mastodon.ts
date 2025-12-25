import { MastodonAccount, MastodonStatus } from "../types";

export class MastodonService {
  private instance: string;
  private token?: string;

  constructor(instance: string, token?: string) {
    this.instance = instance.replace(/\/$/, "").replace(/^https?:\/\//, "");
    this.token = token;
  }

  private async fetchApi<T>(
    endpoint: string,
    params: Record<string, string> = {},
    useAuth: boolean = true
  ): Promise<T> {
    const url = new URL(`https://${this.instance}/api/v1/${endpoint}`);
    Object.keys(params).forEach((key) =>
      url.searchParams.append(key, params[key])
    );

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token && useAuth) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      const errorMessage =
        errorData.error || `HTTP error! status: ${response.status}`;
      const error: any = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  async verifyCredentials(): Promise<MastodonAccount> {
    if (!this.token) throw new Error("Token required for verifyCredentials");
    return this.fetchApi<MastodonAccount>("accounts/verify_credentials");
  }

  async lookupAccount(username: string): Promise<MastodonAccount> {
    return this.fetchApi<MastodonAccount>("accounts/lookup", {
      acct: username,
    });
  }

  /**
   * Returns statuses and whether it fell back to public access.
   */
  async getStatusesPage(
    accountId: string,
    maxId?: string,
    limit: number = 40
  ): Promise<{ statuses: MastodonStatus[]; fellBack: boolean }> {
    const params: Record<string, string> = {
      limit: limit.toString(),
    };
    if (maxId) params.max_id = maxId;

    try {
      const statuses = await this.fetchApi<MastodonStatus[]>(
        `accounts/${accountId}/statuses`,
        params
      );
      return { statuses, fellBack: false };
    } catch (error: any) {
      if (error.status === 403 || error.status === 401) {
        console.warn("权限不足以访问 read:statuses，正在降级抓取公开动态...");
        const statuses = await this.fetchApi<MastodonStatus[]>(
          `accounts/${accountId}/statuses`,
          params,
          false
        );
        return { statuses, fellBack: true };
      }
      throw error;
    }
  }

  /**
   * Fetches statuses until the threshold date and reports permission fallback.
   */
  async getStatusesUntil(
    accountId: string,
    untilDate: Date,
    startId?: string,
    onProgress?: (count: number) => void
  ): Promise<{
    statuses: MastodonStatus[];
    lastId?: string;
    reachedThreshold: boolean;
    fellBack: boolean;
  }> {
    let allFilteredStatuses: MastodonStatus[] = [];
    let maxId: string | undefined = startId;
    let reachedThreshold = false;
    let hasMore = true;
    let totalFetched = 0;
    let wasFellBack = false;

    while (hasMore && !reachedThreshold) {
      const { statuses: batch, fellBack } = await this.getStatusesPage(
        accountId,
        maxId
      );
      if (fellBack) wasFellBack = true;

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      maxId = batch[batch.length - 1].id;
      totalFetched += batch.length;

      const originalPosts = batch.filter((s: any) => !s.reblog);
      allFilteredStatuses = [...allFilteredStatuses, ...originalPosts];

      const oldestInBatch = new Date(batch[batch.length - 1].created_at);
      if (oldestInBatch < untilDate) {
        reachedThreshold = true;
      }

      if (onProgress) onProgress(allFilteredStatuses.length);

      if (batch.length < 40) hasMore = false;

      if (totalFetched > 10000) break;
    }

    return {
      statuses: allFilteredStatuses,
      lastId: maxId,
      reachedThreshold,
      fellBack: wasFellBack,
    };
  }

  async searchStatuses(
    query: string,
    username: string,
    limit: number = 20
  ): Promise<MastodonStatus[]> {
    const scopedQuery = `from:${username} ${query}`;
    const url = new URL(`https://${this.instance}/api/v2/search`);
    url.searchParams.append("q", scopedQuery);
    url.searchParams.append("type", "statuses");
    url.searchParams.append("resolve", "true");
    url.searchParams.append("limit", limit.toString());

    const headers: Record<string, string> = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) throw new Error("Search failed");
    const data = await response.json();
    return data.statuses;
  }
}
