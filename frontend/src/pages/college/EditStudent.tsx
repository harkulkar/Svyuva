import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { fetchCollegeStudent, fetchStudentMeta, getApiErrorMessage, updateCollegeStudent } from '../../services/api';
import { StudentForm, type StudentFormValues } from './StudentForm';
import type { StudentDetail, StudentMeta } from '../../types/student';

export function CollegeEditStudentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState<StudentMeta | null>(null);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    void Promise.all([fetchStudentMeta(), fetchCollegeStudent(id)])
      .then(([nextMeta, nextStudent]) => {
        setMeta(nextMeta);
        setStudent(nextStudent);
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [id]);

  async function onSubmit(values: StudentFormValues) {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateCollegeStudent(id, values);
      navigate(`/college/students/${updated.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo title="Edit student" />
      <p className="text-sm"><Link to="/college/students" className="text-navy underline">All students</Link></p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Edit student</h1>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      {(!meta || !student) && !error ? <div className="mt-4"><Loading /></div> : null}
      {meta && student ? (
        <StudentForm meta={meta} student={student} submitting={submitting} submitLabel="Save changes" onSubmit={onSubmit} />
      ) : null}
    </>
  );
}
