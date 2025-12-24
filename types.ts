
export interface MastodonAccount {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  header: string;
  note: string;
  url: string;
  statuses_count: number;
  followers_count: number;
  following_count: number;
}

export interface MastodonStatus {
  id: string;
  created_at: string;
  content: string;
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  url: string;
  account: MastodonAccount;
  media_attachments: Array<{
    id: string;
    type: string;
    url: string;
    preview_url: string;
  }>;
}

export interface ActivityData {
  date: string;
  count: number;
}

export interface AuthState {
  instance: string;
  token?: string;
  username: string;
}

export interface AIAnalysisResult {
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  keyTopics: string[];
}
