import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { ButtonSpinner } from '../../components/common/Loading';
import { SelectField, TextAreaField, TextField } from '../../components/auth/FormField';
import { Stepper } from '../../components/common/Stepper';
import { fetchMasterData, fetchUniversities, getApiErrorMessage, signupRequest } from '../../services/api';
import { SITE } from '../../data/site';
import type { MasterData, UniversityOption } from '../../types/auth';

const schema = z
  .object({
    universityId: z.string().min(1, 'University is required.'),
    instituteName: z.string().min(2, 'Institute name is required.'),
    exclusiveType: z.string().min(1, 'Exclusive type is required.'),
    locationType: z.string().min(1, 'Location type is required.'),
    minorityType: z.string().min(1, 'Minority type is required.'),
    linguisticType: z.string().min(1, 'Linguistic type is required.'),
    address: z.string().min(5, 'Address is required.'),
    district: z.string().min(1, 'District is required.'),
    taluka: z.string().min(2, 'Taluka is required.'),
    jdRegion: z.string().min(1, 'JD Region is required.'),
    email: z.string().email('Enter a valid email address.'),
    mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.'),
    contactNumber1: z.string().optional(),
    contactNumber2: z.string().optional(),
    principalName: z.string().min(2, 'Principal name is required.'),
    collegeType: z.string().min(1, 'College type is required.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Include an uppercase letter.')
      .regex(/[a-z]/, 'Include a lowercase letter.')
      .regex(/\d/, 'Include a number.'),
    confirmPassword: z.string().min(1, 'Confirm password is required.')
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword']
  });

type FormValues = z.infer<typeof schema>;

export function SignupPage() {
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [master, setMaster] = useState<MasterData | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const district = watch('district');
  const [step, setStep] = useState(0);
  const [errorStep, setErrorStep] = useState<number | null>(null);
  const values = watch();
  const steps = [
    { id: 'basic', title: 'Basic information' },
    { id: 'institution', title: 'Institution details' },
    { id: 'contact', title: 'Contact' },
    { id: 'review', title: 'Review' }
  ];
  const fieldsByStep: string[][] = [
    ['universityId', 'instituteName', 'exclusiveType', 'locationType', 'minorityType', 'linguisticType', 'collegeType'],
    ['address', 'district', 'taluka', 'jdRegion'],
    ['principalName', 'email', 'mobile', 'password', 'confirmPassword']
  ];

  async function next() {
    const ok = await trigger(fieldsByStep[step] as never);
    if (!ok) {
      setErrorStep(step);
      return;
    }
    setErrorStep(null);
    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

  useEffect(() => {
    void fetchUniversities().then(setUniversities);
    void fetchMasterData().then(setMaster);
  }, []);

  const talukas = (district && master?.talukasByDistrict[district]) || [];

  async function onSubmit(values: FormValues) {
    setFormError(null);
    setSuccess(null);
    try {
      const message = await signupRequest(values);
      setSuccess(message);
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Registration could not be completed.'));
    }
  }

  return (
    <>
      <Seo title="College Sign Up" path="/signup" description="Register a college or institute for SV Yuva Suraksha Yojana." />
      <main id="main-content" className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="border border-slate-300 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <img src={SITE.logoSrc} alt="" className="h-12 w-12" />
            <div>
              <h1 className="text-xl font-semibold text-navy">College / Institute registration</h1>
              <p className="text-sm text-slate-600">Accounts are created as College users and remain pending until approval.</p>
            </div>
          </div>
          {formError ? <ErrorMessage message={formError} /> : null}
          {success ? (
            <p className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status">
              {success}
            </p>
          ) : (
            <form className="space-y-8" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stepper steps={steps} current={step} errorStep={errorStep} />
              {step === 0 ? (
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy">Institution information</legend>
                <SelectField label="Select University" required error={errors.universityId?.message} {...register('universityId')}>
                  <option value="">Select university</option>
                  {universities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </SelectField>
                {universities.length === 0 ? (
                  <p className="sm:col-span-2 text-sm text-slate-600">University list is managed by the administrator. If this list is empty, contact the portal administrator.</p>
                ) : null}
                <TextField label="Institute name" required error={errors.instituteName?.message} {...register('instituteName')} />
                <SelectField label="Exclusive Type" required error={errors.exclusiveType?.message} {...register('exclusiveType')}>
                  <option value="">Select</option>
                  {master?.exclusiveTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="Location Type" required error={errors.locationType?.message} {...register('locationType')}>
                  <option value="">Select</option>
                  {master?.locationTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="Minority Type" required error={errors.minorityType?.message} {...register('minorityType')}>
                  <option value="">Select</option>
                  {master?.minorityTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="Linguistic Type" required error={errors.linguisticType?.message} {...register('linguisticType')}>
                  <option value="">Select</option>
                  {master?.linguisticTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="College Type" required error={errors.collegeType?.message} {...register('collegeType')}>
                  <option value="">Select</option>
                  {master?.collegeTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectField>
              </fieldset>
              ) : null}

              {step === 1 ? (
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy">Location information</legend>
                <div className="sm:col-span-2">
                  <TextAreaField label="Address" required rows={3} error={errors.address?.message} {...register('address')} />
                </div>
                <SelectField label="District" required error={errors.district?.message} {...register('district')}>
                  <option value="">Select district</option>
                  {master?.districts.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectField>
                {talukas.length > 0 ? (
                  <SelectField label="Taluka" required error={errors.taluka?.message} {...register('taluka')}>
                    <option value="">Select taluka</option>
                    {talukas.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </SelectField>
                ) : (
                  <TextField label="Taluka" required error={errors.taluka?.message} {...register('taluka')} />
                )}
                <SelectField label="JD Region" required error={errors.jdRegion?.message} {...register('jdRegion')}>
                  <option value="">Select JD region</option>
                  {master?.jdRegions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectField>
              </fieldset>
              ) : null}

              {step === 2 ? (
              <>
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy">Principal and contact information</legend>
                <TextField label="Principal name" required error={errors.principalName?.message} {...register('principalName')} />
                <TextField label="Email" required type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
                <TextField label="Mobile" required type="tel" inputMode="numeric" autoComplete="tel" error={errors.mobile?.message} {...register('mobile')} />
                <TextField label="Contact number 1" type="tel" error={errors.contactNumber1?.message} {...register('contactNumber1')} />
                <TextField label="Contact number 2" type="tel" error={errors.contactNumber2?.message} {...register('contactNumber2')} />
              </fieldset>

              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy">Account information</legend>
                <TextField label="Password" required type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
                <TextField
                  label="Confirm password"
                  required
                  type="password"
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
              </fieldset>
              </>
              ) : null}

              {step === 3 ? (
                <section className="border border-slate-200 bg-slate-50 p-4 text-sm">
                  <h2 className="font-semibold text-navy">Review</h2>
                  <p className="mt-2">{values.instituteName}</p>
                  <p className="mt-1">{values.email} · {values.mobile}</p>
                  <p className="mt-1">{values.district}, {values.taluka}</p>
                  <p className="mt-1">Principal: {values.principalName}</p>
                </section>
              ) : null}

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
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="inline-flex min-h-11 items-center gap-2 bg-saffron px-6 py-2.5 text-sm font-semibold text-navy-dark disabled:opacity-60"
              >
                {isSubmitting ? <ButtonSpinner /> : null}
                {isSubmitting ? 'Submitting…' : 'Submit registration'}
              </button>
                )}
              </div>
            </form>
          )}
          <p className="mt-4 text-sm">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-navy underline">
              Login
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
