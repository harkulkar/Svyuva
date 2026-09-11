export type SchemeRecord = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  studentId?: string | null;
  instituteId?: string | null;
  instituteName?: string | null;
  updatedAt?: string | null;
};

export type SchemeRecordList = {
  kind: string;
  httpApi: boolean;
  items: SchemeRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
