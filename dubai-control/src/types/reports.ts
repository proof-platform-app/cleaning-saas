export type OwnerOverview = {
  period: {
    from: string;
    to: string;
  };
  summary: {
    jobs_count: number;
    violations_count: number;
    issue_rate: number;
  };
  top_locations: {
    id: number;
    name: string;
    jobs_count: number;
    violations_count: number;
  }[];
  top_cleaners: {
    id: number;
    name: string;
    jobs_count: number;
    violations_count: number;
  }[];
  top_reasons: {
    code: string;
    count: number;
  }[];
};
