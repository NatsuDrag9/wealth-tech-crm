import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as yup from 'yup';
import { Layers } from 'lucide-react';
import { FormBuilder, FormFieldConfig } from '@/components/forms';
import { useLoginMutation } from '@/services/api/authApi';
import { showSuccessToast, showErrorToast } from '@/utils/toastUtils';
import type { LoginPayload } from '@/definitions/authTypes';
import './Login.scss';

const loginSchema = yup.object({
  email: yup
    .string()
    .trim()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .required('Password is required'),
});

const LOGIN_FIELDS: FormFieldConfig[] = [
  {
    name: 'email',
    label: 'Work Email',
    fieldType: 'input',
    inputType: 'email',
    placeholder: 'e.g. admin@wealthtech.com',
    colSpan: 2,
  },
  {
    name: 'password',
    label: 'Password',
    fieldType: 'input',
    inputType: 'password',
    placeholder: 'Enter your password',
    colSpan: 2,
  },
];

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export function Login(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async (data: LoginPayload): Promise<void> => {
    try {
      await login(data).unwrap();
      showSuccessToast('Logged in successfully');

      const locState = location.state as LocationState | null;
      const destination = locState?.from?.pathname || '/clients';
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string } };
      const msg = errorObj?.data?.message || 'Authentication failed. Please check credentials.';
      showErrorToast(msg);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__card">
        <div className="login-page__header">
          <div className="login-page__brand-icon">
            <Layers size={28} />
          </div>
          <h1 className="login-page__title">WealthTech CRM</h1>
          <p className="login-page__subtitle">
            Enterprise Client Relationship &amp; Portfolio Management
          </p>
        </div>

        <FormBuilder<LoginPayload>
          fields={LOGIN_FIELDS}
          validationSchema={loginSchema}
          defaultValues={{ email: '', password: '' }}
          onSubmit={handleLogin}
          submitText="Sign In"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export default Login;
