import * as yup from 'yup';

export interface FormValues {
  email: string;
  phone: string;
  fullName: string;
  aum: string;
}

export const validationSchema = yup.object({
  email: yup.string().email('Must be a valid email').required('Email is required'),
  phone: yup.string().required('Phone is required'),
  fullName: yup.string().required('Full name is required'),
  aum: yup.string().required('AUM is required'),
});
