import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { ConfirmDialog } from '../../components/common/AdminUi';
import { ActivityTimeline } from '../../components/common/ActivityTimeline';
import { fetchAdminStudent, getApiErrorMessage, updateAdminStudentStatus } from '../../services/api';
import { StudentRecord } from '../college/StudentDetail';
import type { StudentDetail } from '../../types/student';

export function AdminStudentDetailPage() {
  const { id } = useParams();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    void fetchAdminStudent(id)
      .then(setStudent)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [id]);

  return (
    <>
      <Seo title={student ? student.name : 'Student'} />
      <p className="text-sm"><Link to="/admin/students" className="text-navy underline">All students</Link></p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-navy">{student?.name ?? 'Student'}</h1>
        {student ? (
          <button type="button" className="border border-navy px-3 py-2 text-sm font-semibold text-navy" onClick={() => setConfirm(true)}>
            {student.status === 'ACTIVE' ? 'Mark inactive' : 'Mark active'}
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-slate-600">Institute ownership cannot be changed from the admin portal.</p>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      {!student && !error ? <div className="mt-4"><Loading /></div> : null}
      {student ? <StudentRecord student={student} showInstitute /> : null}
      {id ? <ActivityTimeline role="ADMIN" kind="students" id={id} /> : null}
      <ConfirmDialog
        open={confirm}
        title="Change student status"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          if (!id || !student) return;
          void updateAdminStudentStatus(id, student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
            .then((next) => { setStudent(next); setConfirm(false); })
            .catch((err) => setError(getApiErrorMessage(err)));
        }}
      >
        Set this student to {student?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}?
      </ConfirmDialog>
    </>
  );
}
