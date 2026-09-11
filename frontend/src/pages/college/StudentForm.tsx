import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { SelectField, TextAreaField, TextField } from '../../components/auth/FormField';
import { ButtonSpinner } from '../../components/common/Loading';
import { Stepper } from '../../components/common/Stepper';
import type { StudentDetail, StudentMeta } from '../../types/student';

const schema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.'),
  middleName: z.string().optional(),
  lastName: z.string().trim().min(1, 'Last name is required.'),
  gender: z.string().min(1, 'Gender is required.'),
  dateOfBirth: z.string().min(1, 'Date of birth is required.'),
  studentId: z.string().trim().min(1, 'Student ID is required.'),
  enrollmentNumber: z.string().trim().min(1, 'Enrollment number is required.'),
  rollNumber: z.string().trim().min(1, 'Roll number is required.'),
  course: z.string().trim().min(1, 'Course is required.'),
  stream: z.string().optional(),
  year: z.string().min(1, 'Year is required.'),
  semester: z.string().optional(),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/, 'Academic year must look like 2025-26.'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.'),
  email: z.string().optional(),
  address: z.string().optional(),
  parentName: z.string().optional(),
  parentMobile: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE'])
}).superRefine((value, ctx) => {
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
    ctx.addIssue({ code: 'custom', path: ['email'], message: 'Enter a valid email address.' });
  }
  if (value.parentMobile && !/^[6-9]\d{9}$/.test(value.parentMobile)) {
    ctx.addIssue({ code: 'custom', path: ['parentMobile'], message: 'Enter a valid 10-digit mobile number.' });
  }
});

export type StudentFormValues = z.infer<typeof schema>;

function toDateInput(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function StudentForm({
  meta,
  student,
  submitting,
  submitLabel,
  onSubmit
}: {
  meta: StudentMeta;
  student?: StudentDetail | null;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (values: StudentFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    trigger,
    watch,
    formState: { errors }
  } = useForm<StudentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      gender: '',
      dateOfBirth: '',
      studentId: '',
      enrollmentNumber: '',
      rollNumber: '',
      course: '',
      stream: '',
      year: '',
      semester: '',
      academicYear: '2025-26',
      mobile: '',
      email: '',
      address: '',
      parentName: '',
      parentMobile: '',
      category: '',
      status: 'ACTIVE'
    }
  });

  useEffect(() => {
    if (!student) return;
    reset({
      firstName: student.firstName,
      middleName: student.middleName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: toDateInput(student.dateOfBirth),
      studentId: student.studentId,
      enrollmentNumber: student.enrollmentNumber,
      rollNumber: student.rollNumber,
      course: student.course,
      stream: student.stream,
      year: student.year,
      semester: student.semester,
      academicYear: student.academicYear,
      mobile: student.mobile,
      email: student.email,
      address: student.address,
      parentName: student.parentName,
      parentMobile: student.parentMobile,
      category: student.category,
      status: student.status
    });
  }, [student, reset]);

  const [step, setStep] = useState(0);
  const [errorStep, setErrorStep] = useState<number | null>(null);
  const values = watch();
  const steps = [
    { id: 'personal', title: 'Basic information' },
    { id: 'academic', title: 'Academic details' },
    { id: 'contact', title: 'Contact' },
    { id: 'review', title: 'Review' }
  ];
  const fieldsByStep: Array<Array<keyof StudentFormValues>> = [
    ['firstName', 'lastName', 'gender', 'dateOfBirth'],
    ['studentId', 'enrollmentNumber', 'rollNumber', 'course', 'year', 'academicYear'],
    ['mobile', 'email', 'parentMobile']
  ];

  async function next() {
    const ok = await trigger(fieldsByStep[step] || []);
    if (!ok) {
      setErrorStep(step);
      return;
    }
    setErrorStep(null);
    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

  return (
    <form className="mt-6 space-y-8" onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
      <Stepper steps={steps} current={step} errorStep={errorStep} />
      {step === 0 ? (
      <Section title="Personal information">
        <TextField label="First name" required autoComplete="given-name" error={errors.firstName?.message} {...register('firstName')} />
        <TextField label="Middle name" autoComplete="additional-name" error={errors.middleName?.message} {...register('middleName')} />
        <TextField label="Last name" required autoComplete="family-name" error={errors.lastName?.message} {...register('lastName')} />
        <SelectField label="Gender" required error={errors.gender?.message} {...register('gender')}>
          <option value="">Select</option>
          {meta.genders.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </SelectField>
        <TextField type="date" label="Date of birth" required error={errors.dateOfBirth?.message} {...register('dateOfBirth')} />
      </Section>
      ) : null}
      {step === 1 ? (
      <Section title="Academic information">
        <TextField label="Student ID" required error={errors.studentId?.message} {...register('studentId')} />
        <TextField label="Enrollment number" required error={errors.enrollmentNumber?.message} {...register('enrollmentNumber')} />
        <TextField label="Roll number" required error={errors.rollNumber?.message} {...register('rollNumber')} />
        <TextField label="Course" required error={errors.course?.message} {...register('course')} />
        <TextField label="Stream" error={errors.stream?.message} {...register('stream')} />
        <SelectField label="Year" required error={errors.year?.message} {...register('year')}>
          <option value="">Select</option>
          {meta.years.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </SelectField>
        <SelectField label="Semester" error={errors.semester?.message} {...register('semester')}>
          <option value="">Select</option>
          {meta.semesters.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </SelectField>
        <TextField label="Academic year" required placeholder="2025-26" error={errors.academicYear?.message} {...register('academicYear')} />
      </Section>
      ) : null}
      {step === 2 ? (
      <>
      <Section title="Contact information">
        <TextField label="Mobile" required type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} error={errors.mobile?.message} {...register('mobile')} />
        <TextField type="email" label="Email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <div className="sm:col-span-2">
          <TextAreaField label="Address" rows={3} error={errors.address?.message} {...register('address')} />
        </div>
      </Section>
      <Section title="Parent/guardian information">
        <TextField label="Parent name" error={errors.parentName?.message} {...register('parentName')} />
        <TextField label="Parent mobile" type="tel" inputMode="numeric" maxLength={10} error={errors.parentMobile?.message} {...register('parentMobile')} />
      </Section>
      <Section title="Additional information">
        <SelectField label="Category" error={errors.category?.message} {...register('category')}>
          <option value="">Select</option>
          {meta.categories.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </SelectField>
        <SelectField label="Status" required error={errors.status?.message} {...register('status')}>
          {meta.statuses.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </SelectField>
      </Section>
      </>
      ) : null}
      {step === 3 ? (
        <section className="border border-slate-300 bg-white p-5 text-sm">
          <h2 className="font-semibold text-navy">Review</h2>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            <div><dt className="text-slate-500">Name</dt><dd>{values.firstName} {values.middleName} {values.lastName}</dd></div>
            <div><dt className="text-slate-500">Student ID</dt><dd>{values.studentId}</dd></div>
            <div><dt className="text-slate-500">Enrollment</dt><dd>{values.enrollmentNumber}</dd></div>
            <div><dt className="text-slate-500">Course</dt><dd>{values.course}</dd></div>
            <div><dt className="text-slate-500">Mobile</dt><dd>{values.mobile}</dd></div>
            <div><dt className="text-slate-500">Status</dt><dd>{values.status}</dd></div>
          </dl>
        </section>
      ) : null}
      <p className="text-xs text-slate-600">{meta.verification}</p>
      <div className="flex flex-wrap gap-2">
        {step > 0 ? (
          <button type="button" className="min-h-11 border border-navy px-4 py-2 text-sm font-semibold text-navy" onClick={() => setStep((value) => value - 1)}>
            Back
          </button>
        ) : null}
        {step < steps.length - 1 ? (
          <button type="button" className="min-h-11 bg-navy px-4 py-2 text-sm font-semibold text-white" onClick={() => void next()}>
            Save and continue
          </button>
        ) : (
          <button type="submit" className="inline-flex min-h-11 items-center gap-2 bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={submitting}>
            {submitting ? <ButtonSpinner /> : null}
            {submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border border-slate-300 bg-white p-5">
      <legend className="px-1 text-sm font-semibold text-navy">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
