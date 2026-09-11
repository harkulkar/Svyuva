import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { fetchCollegeStudents, fetchStudentMeta, getApiErrorMessage } from '../../services/api';
import { Pagination } from '../../components/common/Pagination';
import { FilterPanel } from '../../components/common/FilterPanel';
import { DebouncedSearchField } from '../../components/common/SearchField';
import type { StudentList, StudentMeta } from '../../types/student';

export function CollegeStudentsPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<StudentList | null>(null);
  const [meta, setMeta] = useState<StudentMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterFormRef = useRef<HTMLFormElement>(null);
  const page = Number(params.get('page') || 1);
  const q = params.get('q') || '';
  const academicYear = params.get('academicYear') || '';
  const course = params.get('course') || '';
  const stream = params.get('stream') || '';
  const year = params.get('year') || '';
  const semester = params.get('semester') || '';
  const gender = params.get('gender') || '';
  const status = params.get('status') || '';

  useEffect(() => {
    void fetchStudentMeta().then(setMeta).catch(() => undefined);
  }, []);

  useEffect(() => {
    setError(null);
    void fetchCollegeStudents({
      page,
      limit: 20,
      q: q || undefined,
      academicYear: academicYear || undefined,
      course: course || undefined,
      stream: stream || undefined,
      year: year || undefined,
      semester: semester || undefined,
      gender: gender || undefined,
      status: status || undefined
    })
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [page, q, academicYear, course, stream, year, semester, gender, status]);

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
      <Seo title="Students" path="/college/students" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-navy">Students</h1>
        <div className="flex gap-2">
          <Link to="/college/students/add" className="bg-navy px-3 py-2 text-sm font-semibold text-white">Add student</Link>
          <Link to="/college/students/upload" className="border border-navy px-3 py-2 text-sm font-semibold text-navy">Upload Excel</Link>
        </div>
      </div>
      <div className="mt-4">
        <DebouncedSearchField
          value={q}
          onDebouncedChange={(next) => update({ q: next })}
          label="Search students"
          placeholder="Search ID, enrollment, name, mobile, email"
        />
      </div>
      <FilterPanel open={filtersOpen} onOpen={() => setFiltersOpen(true)} onClose={() => setFiltersOpen(false)} onSubmit={() => filterFormRef.current?.requestSubmit()}>
      <form
        ref={filterFormRef}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          update({
            academicYear: String(form.get('academicYear') || ''),
            course: String(form.get('course') || ''),
            stream: String(form.get('stream') || ''),
            year: String(form.get('year') || ''),
            semester: String(form.get('semester') || ''),
            gender: String(form.get('gender') || ''),
            status: String(form.get('status') || '')
          });
        }}
      >
        <input name="academicYear" defaultValue={academicYear} placeholder="Academic year" className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="Academic year" />
        <input name="course" defaultValue={course} placeholder="Course" className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="Course" />
        <input name="stream" defaultValue={stream} placeholder="Stream" className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="Stream" />
        <select name="year" defaultValue={year} className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="Year">
          <option value="">All years</option>
          {meta?.years.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select name="semester" defaultValue={semester} className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="Semester">
          <option value="">All semesters</option>
          {meta?.semesters.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select name="gender" defaultValue={gender} className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="Gender">
          <option value="">All genders</option>
          {meta?.genders.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select name="status" defaultValue={status} className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="Status">
          <option value="">All statuses</option>
          {meta?.statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button type="submit" className="hidden min-h-11 bg-navy px-4 py-2 text-sm font-semibold text-white md:inline-flex md:items-center">Apply</button>
      </form>
      </FilterPanel>
      {error ? <div className="mt-4"><ErrorMessage message={error} /><button type="button" className="mt-2 text-sm font-semibold text-navy underline" onClick={() => window.location.reload()}>Retry</button></div> : null}
      {!data && !error ? <div className="mt-4"><Loading /></div> : null}
      {data ? (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            {data.items.map((item) => (
              <article key={item.id} className="border border-slate-300 bg-white p-4 text-sm">
                <p className="font-semibold text-navy">{item.name}</p>
                <p className="mt-1 text-slate-600">{item.studentId} · {item.enrollmentNumber} · {item.rollNumber}</p>
                <p className="mt-1">{item.course} · {item.year} · {item.academicYear}</p>
                <p className="mt-1">{item.mobile} · {item.status}</p>
                <div className="mt-3 flex gap-3">
                  <Link className="font-semibold text-navy underline" to={`/college/students/${item.id}`}>View</Link>
                  <Link className="font-semibold text-navy underline" to={`/college/students/${item.id}/edit`}>Edit</Link>
                </div>
              </article>
            ))}
            {data.items.length === 0 ? <p className="text-sm text-slate-600">No students found.</p> : null}
          </div>
          <div className="mt-6 hidden overflow-x-auto border border-slate-300 bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-3 py-2">Student ID</th>
                  <th scope="col" className="px-3 py-2">Enrollment</th>
                  <th scope="col" className="px-3 py-2">Roll</th>
                  <th scope="col" className="px-3 py-2">Name</th>
                  <th scope="col" className="px-3 py-2">Gender</th>
                  <th scope="col" className="px-3 py-2">Course</th>
                  <th scope="col" className="px-3 py-2">Year</th>
                  <th scope="col" className="px-3 py-2">Academic year</th>
                  <th scope="col" className="px-3 py-2">Mobile</th>
                  <th scope="col" className="px-3 py-2">Status</th>
                  <th scope="col" className="px-3 py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{item.studentId}</td>
                    <td className="px-3 py-2">{item.enrollmentNumber}</td>
                    <td className="px-3 py-2">{item.rollNumber}</td>
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2">{item.gender}</td>
                    <td className="px-3 py-2">{item.course}</td>
                    <td className="px-3 py-2">{item.year}</td>
                    <td className="px-3 py-2">{item.academicYear}</td>
                    <td className="px-3 py-2">{item.mobile}</td>
                    <td className="px-3 py-2">{item.status}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Link className="font-semibold text-navy underline" to={`/college/students/${item.id}`}>View</Link>
                      {' · '}
                      <Link className="font-semibold text-navy underline" to={`/college/students/${item.id}/edit`}>Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.items.length === 0 ? <p className="px-3 py-4 text-sm text-slate-600">No students found.</p> : null}
          </div>
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} onPage={(next) => update({ page: String(next) })} />
        </>
      ) : null}
    </>
  );
}

export { Pagination };
