import * as yup from 'yup';

export interface ClientOnboardingFormValues {
  fullName: string;
  email: string;
  phone: string;
  riskProfile: string;
  assetClasses: string[];
  notes: string;
}

export const clientOnboardingValidationSchema = yup.object({
  fullName: yup.string().required('Full name is required'),
  email: yup.string().email('Must be a valid email').required('Email is required'),
  phone: yup.string().required('Phone number is required'),
  riskProfile: yup.string().required('Risk profile is required'),
  assetClasses: yup
    .array()
    .of(yup.string().required())
    .min(1, 'Select at least one asset class')
    .required('Asset classes are required'),
  notes: yup.string().required('Notes are required'),
});

export const initialClientFormValues: ClientOnboardingFormValues = {
  fullName: '',
  email: '',
  phone: '',
  riskProfile: '',
  assetClasses: [],
  notes: '',
};
