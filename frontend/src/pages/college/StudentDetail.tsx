import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading, ButtonSpinner } from '../../components/common/Loading';
import { fetchCollegeStudent, getApiErrorMessage, updateCollegeStudentStatus } from '../../services/api';
import { ActivityTimeline } from '../../components/common/ActivityTimeline';
import type { StudentDetail } from '../../types/student';

export function CollegeStudentDetailPage() {
  const { id } = useParams();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    void fetchCollegeStudent(id)
      .then(setStudent)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [id]);

  async function toggleStatus() {
    if (!id || !student) return;
    setBusy(true);
    setError(null);
    try {
      setStudent(await updateCollegeStudentStatus(id, student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title={student ? student.name : 'Student'} />
      <p className="text-sm"><Link to="/college/students" className="text-navy underline">All students</Link></p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-navy">{student?.name ?? 'Student'}</h1>
        {student ? (
          <div className="flex gap-2">
            <Link to={`/college/students/${student.id}/edit`} className="border border-navy px-3 py-2 text-sm font-semibold text-navy">
              Edit
            </Link>
            <button type="button" className="inline-flex items-center gap-2 bg-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={() => void toggleStatus()} disabled={busy}>
              {busy ? <ButtonSpinner /> : null}
              {student.status === 'ACTIVE' ? 'Mark inactive' : 'Mark active'}
            </button>
          </div>
        ) : null}
      </div>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      {!student && !error ? <div className="mt-4"><Loading /></div> : null}
      {student ? <StudentRecord student={student} /> : null}
      {id ? <ActivityTimeline role="COLLEGE" kind="students" id={id} /> : null}
    </>
  );
}

export function StudentRecord({ student, showInstitute = false }: { student: StudentDetail; showInstitute?: boolean }) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {showInstitute ? (
        <Card title="Institute">
          <Item label="Institute" value={student.institute?.name || '—'} />
          <Item label="University" value={student.university?.name || '—'} />
        </Card>
      ) : null}
      <Card title="Personal information">
        <Item label="First name" value={student.firstName} />
        <Item label="Middle name" value={student.middleName || '—'} />
        <Item label="Last name" value={student.lastName} />
        <Item label="Gender" value={student.gender} />
        <Item label="Date of birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—'} />
      </Card>
      <Card title="Academic information">
        <Item label="Student ID" value={student.studentId} />
        <Item label="Enrollment number" value={student.enrollmentNumber} />
        <Item label="Roll number" value={student.rollNumber} />
        <Item label="Course" value={student.course} />
        <Item label="Stream" value={student.stream || '—'} />
        <Item label="Year" value={student.year} />
        <Item label="Semester" value={student.semester || '—'} />
        <Item label="Academic year" value={student.academicYear} />
      </Card>
      <Card title="Contact information">
        <Item label="Mobile" value={student.mobile} />
        <Item label="Email" value={student.email || '—'} />
        <Item label="Address" value={student.address || '—'} />
      </Card>
      <Card title="Parent/guardian">
        <Item label="Parent name" value={student.parentName || '—'} />
        <Item label="Parent mobile" value={student.parentMobile || '—'} />
      </Card>
      <Card title="Status">
        <Item label="Category" value={student.category || '—'} />
        <Item label="Status" value={student.status} />
        <Item label="Created" value={student.createdAt ? new Date(student.createdAt).toLocaleString() : '—'} />
        <Item label="Updated" value={student.updatedAt ? new Date(student.updatedAt).toLocaleString() : '—'} />
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-slate-300 bg-white p-5">
      <h2 className="text-sm font-semibold text-navy">{title}</h2>
      <dl className="mt-3 space-y-2 text-sm">{children}</dl>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-navy">{value}</dd>
    </div>
  );
}
