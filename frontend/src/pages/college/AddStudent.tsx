import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { createCollegeStudent, fetchStudentMeta, getApiErrorMessage } from '../../services/api';
import { StudentForm, type StudentFormValues } from './StudentForm';
import type { StudentMeta } from '../../types/student';

export function CollegeAddStudentPage() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState<StudentMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchStudentMeta()
      .then(setMeta)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  async function onSubmit(values: StudentFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const student = await createCollegeStudent(values);
      navigate(`/college/students/${student.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo title="Add student" path="/college/students/add" />
      <p className="text-sm"><Link to="/college/students" className="text-navy underline">All students</Link></p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Add student</h1>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      {!meta && !error ? <div className="mt-4"><Loading /></div> : null}
      {meta ? <StudentForm meta={meta} submitting={submitting} submitLabel="Save student" onSubmit={onSubmit} /> : null}
    </>
  );
}
