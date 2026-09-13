import * as yup from 'yup';

export interface DateFormValues {
  birthDate: string;
  onboardingDate: string;
}

export const dateValidationSchema = yup.object({
  birthDate: yup.string().required('Date of birth is required'),
  onboardingDate: yup.string().required('Onboarding date is required'),
});
