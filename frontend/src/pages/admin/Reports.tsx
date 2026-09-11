import { useEffect, useState } from 'react';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { SimpleBars } from '../../components/common/AdminUi';
import { DateRangeFilters } from '../../components/common/DateRangeFilters';
import { downloadReport, fetchAdminReports, fetchReportPreview, getApiErrorMessage } from '../../services/api';
import type { AdminReports } from '../../types/auth';

const ADMIN_CATEGORIES = ['institutes', 'students', 'insurance', 'payments', 'documents', 'ecards', 'registrations', 'activity'];
const COLLEGE_CATEGORIES = ['students', 'insurance', 'payments', 'documents', 'ecards', 'activity'];

export function ReportsWorkspace({ role }: { role: 'ADMIN' | 'COLLEGE' }) {
  const categories = role === 'ADMIN' ? ADMIN_CATEGORIES : COLLEGE_CATEGORIES;
  const [category, setCategory] = useState(categories[0] || 'students');
  const [range, setRange] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; preview: unknown[][]; rowCount: number; truncated: boolean; pdfSupported: boolean } | null>(null);

  const params = {
    category,
    range: range || undefined,
    from: range === 'custom' && from ? new Date(from).toISOString() : undefined,
    to: range === 'custom' && to ? new Date(`${to}T23:59:59.000Z`).toISOString() : undefined
  };

  useEffect(() => {
    setError(null);
    void fetchReportPreview(role, params).then(setPreview).catch((err) => setError(getApiErrorMessage(err)));
    // params is rebuilt from category/range/from/to/role
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, range, from, to, role]);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-navy">Filtered export</h2>
      <p className="mt-1 text-sm text-slate-700">Exports are capped, audited, and scoped by role. PDF is not supported.</p>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="text-sm">
          Category
          <select className="ml-2 border px-2 py-1" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <DateRangeFilters range={range} from={from} to={to} onChange={(next) => { setRange(next.range); setFrom(next.from); setTo(next.to); }} />
        <button type="button" className="border border-navy px-3 py-1 text-sm text-navy" onClick={() => void downloadReport(role, params, 'csv')}>CSV</button>
        <button type="button" className="border border-navy px-3 py-1 text-sm text-navy" onClick={() => void downloadReport(role, params, 'xlsx')}>Excel</button>
      </div>
      {preview ? (
        <div className="mt-6 overflow-x-auto border border-slate-300 bg-white">
          <p className="px-3 py-2 text-xs text-slate-500">{preview.rowCount} rows{preview.truncated ? ' (truncated at export limit)' : ''}</p>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>{preview.headers.map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr>
            </thead>
            <tbody>
              {preview.preview.map((row, index) => (
                <tr key={index} className="border-t">
                  {row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2">{String(cell ?? '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export function AdminReportsPage() {
  const [data, setData] = useState<AdminReports | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    void fetchAdminReports().then(setData).catch((err) => setError(getApiErrorMessage(err)));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Seo title="Reports" path="/admin/reports" />
      <h1 className="text-2xl font-semibold text-navy">Reports</h1>
      <p className="mt-2 text-sm text-slate-700">Aggregations from MongoDB. Exports below respect RBAC and row limits.</p>
      {error ? <div className="mt-4"><ErrorMessage message={error} /><button type="button" className="mt-2 text-sm font-semibold text-navy underline" onClick={load}>Retry</button></div> : null}
      {!data && !error ? <div className="mt-4"><Loading /></div> : null}
      {data ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <SimpleBars title="Institutes by university" items={data.institutesByUniversity.map((row) => ({ label: row.name, count: row.count }))} />
          <SimpleBars title="Institutes by district" items={data.institutesByDistrict.map((row) => ({ label: row.name, count: row.count }))} />
          <SimpleBars title="Students by university" items={data.studentsByUniversity.map((row) => ({ label: row.name, count: row.count }))} />
          <SimpleBars title="Students by institute" items={data.studentsByInstitute.map((row) => ({ label: row.name, count: row.count }))} />
          <SimpleBars title="Students by academic year" items={data.studentsByAcademicYear.map((row) => ({ label: row.name, count: row.count }))} />
        </div>
      ) : null}
      {data?.schemeModules ? (
        <section className="mt-6 border border-slate-300 bg-white p-5 text-sm">
          <h2 className="font-semibold text-navy">Scheme module records</h2>
          <p className="mt-2 text-slate-600">HTTP APIs for insurance, documents, payments, review, and e-cards are not live. Counts are MongoDB metadata only.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            <li>Insurance records: {data.schemeModules.insurance.records} (API {data.schemeModules.insurance.httpApi ? 'enabled' : 'not implemented'})</li>
            <li>Document records: {data.schemeModules.documents.records} (API {data.schemeModules.documents.httpApi ? 'enabled' : 'not implemented'})</li>
            <li>Payment records: {data.schemeModules.payments.records} (API {data.schemeModules.payments.httpApi ? 'enabled' : 'not implemented'})</li>
            <li>Review records: {data.schemeModules.reviews.records} (API {data.schemeModules.reviews.httpApi ? 'enabled' : 'not implemented'})</li>
            <li>E-card records: {data.schemeModules.ecards.records} (API {data.schemeModules.ecards.httpApi ? 'enabled' : 'not implemented'})</li>
          </ul>
        </section>
      ) : null}
      <ReportsWorkspace role="ADMIN" />
    </>
  );
}

export function CollegeReportsPage() {
  return (
    <>
      <Seo title="My reports" path="/college/reports" />
      <h1 className="text-2xl font-semibold text-navy">Reports</h1>
      <p className="mt-2 text-sm text-slate-700">Only records for your institute are included. Institute ID is taken from your session.</p>
      <ReportsWorkspace role="COLLEGE" />
    </>
  );
}
