import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { fetchAdminStudents, fetchAdminUniversities, getApiErrorMessage, downloadAdminExport } from '../../services/api';
import { Pagination } from '../college/Students';
import { FilterPanel } from '../../components/common/FilterPanel';
import { DebouncedSearchField } from '../../components/common/SearchField';
import type { StudentList } from '../../types/student';
import type { UniversityOption } from '../../types/auth';

export function AdminStudentsPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<StudentList | null>(null);
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterFormRef = useRef<HTMLFormElement>(null);
  const page = Number(params.get('page') || 1);
  const q = params.get('q') || '';
  const academicYear = params.get('academicYear') || '';
  const course = params.get('course') || '';
  const status = params.get('status') || '';
  const universityId = params.get('universityId') || '';
  const instituteId = params.get('instituteId') || '';
  const submissionId = params.get('submissionId') || '';

  useEffect(() => {
    void fetchAdminUniversities().then(setUniversities);
  }, []);

  useEffect(() => {
    setError(null);
    void fetchAdminStudents({
      page,
      limit: 20,
      q: q || undefined,
      academicYear: academicYear || undefined,
      course: course || undefined,
      status: status || undefined,
      universityId: universityId || undefined,
      instituteId: instituteId || undefined,
      submissionId: submissionId || undefined
    })
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [page, q, academicYear, course, status, universityId, instituteId, submissionId]);

  function update(next: Record<string, string>) {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => {
      if (value) merged.set(key, value);
      else merged.delete(key);
    });
    if (!next.page) merged.set('page', '1');
    setParams(merged);
  }

  return (
    <>
      <Seo title="Students" path="/admin/students" />
      <h1 className="text-2xl font-semibold text-navy">Students</h1>
      <p className="mt-2 text-sm text-slate-700">Admin can view all students. Ownership cannot be changed here.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="border border-navy px-3 py-1 text-sm text-navy" onClick={() => void downloadAdminExport('students', { q, academicYear, course, status, universityId, instituteId }, 'csv')}>Export CSV</button>
        <button type="button" className="border border-navy px-3 py-1 text-sm text-navy" onClick={() => void downloadAdminExport('students', { q, academicYear, course, status, universityId, instituteId }, 'xlsx')}>Export Excel</button>
      </div>
      <div className="mt-4">
        <DebouncedSearchField value={q} onDebouncedChange={(next) => update({ q: next })} label="Search students" placeholder="Search ID, enrollment, name, mobile, email" />
      </div>
      <FilterPanel open={filtersOpen} onOpen={() => setFiltersOpen(true)} onClose={() => setFiltersOpen(false)} onSubmit={() => filterFormRef.current?.requestSubmit()}>
      <form
        ref={filterFormRef}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          update({
            academicYear: String(form.get('academicYear') || ''),
            course: String(form.get('course') || ''),
            status: String(form.get('status') || ''),
            universityId: String(form.get('universityId') || ''),
            instituteId: String(form.get('instituteId') || '')
          });
        }}
      >
        <input name="academicYear" defaultValue={academicYear} placeholder="Academic year" className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="Academic year" />
        <input name="course" defaultValue={course} placeholder="Course" className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="Course" />
        <select name="status" defaultValue={status} className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="Status">
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
        <select name="universityId" defaultValue={universityId} className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="University">
          <option value="">All universities</option>
          {universities.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <input name="instituteId" defaultValue={instituteId} placeholder="Institute ID" className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="Institute ID" />
        <button type="submit" className="hidden min-h-11 bg-navy px-4 py-2 text-sm font-semibold text-white md:inline-flex md:items-center">Apply</button>
      </form>
      </FilterPanel>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      {!data && !error ? <div className="mt-4"><Loading /></div> : null}
      {data && data.items.length === 0 ? <p className="mt-6 border border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">No students found.</p> : null}
      {data ? (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            {data.items.map((item) => (
              <article key={item.id} className="border border-slate-300 bg-white p-4 text-sm">
                <p className="font-semibold text-navy">{item.name}</p>
                <p className="mt-1">{item.institute?.name} · {item.university?.name}</p>
                <p className="mt-1">{item.enrollmentNumber} · {item.status}</p>
                <Link className="mt-3 inline-block font-semibold text-navy underline" to={`/admin/students/${item.id}`}>View</Link>
              </article>
            ))}
          </div>
          <div className="mt-6 hidden overflow-x-auto border border-slate-300 bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-3 py-2">Student</th>
                  <th scope="col" className="px-3 py-2">Enrollment</th>
                  <th scope="col" className="px-3 py-2">Institute</th>
                  <th scope="col" className="px-3 py-2">University</th>
                  <th scope="col" className="px-3 py-2">Academic year</th>
                  <th scope="col" className="px-3 py-2">Status</th>
                  <th scope="col" className="px-3 py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{item.name}<div className="text-xs text-slate-500">{item.studentId}</div></td>
                    <td className="px-3 py-2">{item.enrollmentNumber}</td>
                    <td className="px-3 py-2">{item.institute?.name}</td>
                    <td className="px-3 py-2">{item.university?.name}</td>
                    <td className="px-3 py-2">{item.academicYear}</td>
                    <td className="px-3 py-2">{item.status}</td>
                    <td className="px-3 py-2">
                      <Link className="font-semibold text-navy underline" to={`/admin/students/${item.id}`}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} onPage={(next) => update({ page: String(next) })} />
        </>
      ) : null}
    </>
  );
}
