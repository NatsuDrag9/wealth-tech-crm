import {
  useEffect,
  useMemo,
  type ReactElement,
} from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Drawer } from '@/modules/user-manager/Drawer/Drawer';
import { FormInput, SingleSelectDropdown, FormDateInput } from '@/components/form-inputs';
import { MainButton } from '@/components/buttons';
import { useGetUsersDropdownQuery } from '@/services/api/userManagerApi';
import { useCreateClientMutation } from '@/services/api/clientApi';
import type { DropdownType } from '@/types/genericTypes';
import { showSuccessToast, showErrorToast } from '@/utils/toastUtils';
import './ClientDrawer.scss';

interface ClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  pan?: string;
  dateOfBirth?: string;
  gender?: string;
  relationshipManagerId?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

interface ClientDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const clientValidationSchema = yup.object({
  firstName: yup.string().trim().required('First name is required'),
  lastName: yup.string().trim().required('Last name is required'),
  email: yup
    .string()
    .trim()
    .email('Please enter a valid email address')
    .required('Email is required'),
  phone: yup.string().trim().required('Phone number is required'),
  pan: yup.string().trim().optional(),
  dateOfBirth: yup.string().optional(),
  gender: yup.string().optional(),
  relationshipManagerId: yup.string().optional(),
  addressLine: yup.string().optional(),
  city: yup.string().optional(),
  state: yup.string().optional(),
  pincode: yup.string().optional(),
  country: yup.string().optional(),
});

const GENDER_OPTIONS: DropdownType[] = [
  { displayName: 'Male', value: 'MALE' },
  { displayName: 'Female', value: 'FEMALE' },
  { displayName: 'Other', value: 'OTHER' },
];

export function ClientDrawer({
  isOpen,
  onClose,
}: ClientDrawerProps): ReactElement | null {
  const [createClient, { isLoading: isCreating }] = useCreateClientMutation();
  const { data: userOptions = [], isLoading: isUsersLoading } = useGetUsersDropdownQuery();

  const methods = useForm<ClientFormData>({
    resolver: yupResolver(clientValidationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      pan: '',
      dateOfBirth: '',
      gender: '',
      relationshipManagerId: '',
      addressLine: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    mode: 'onBlur',
  });

  const rmDropdownOptions = useMemo<DropdownType[]>(
    () => userOptions.map((opt) => ({
      displayName: opt.display_name,
      value: String(opt.value),
    })),
    [userOptions],
  );

  useEffect(() => {
    if (!isOpen) return;
    methods.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      pan: '',
      dateOfBirth: '',
      gender: '',
      relationshipManagerId: '',
      addressLine: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    });
  }, [isOpen, methods]);

  async function onSubmit(data: ClientFormData) {
    try {
      await createClient({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        pan: data.pan || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        gender: data.gender || undefined,
        relationshipManagerId: data.relationshipManagerId || undefined,
        addressLine: data.addressLine || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        pincode: data.pincode || undefined,
        country: data.country || undefined,
      }).unwrap();

      showSuccessToast('Client onboarded successfully');
      onClose();
    } catch {
      showErrorToast('Failed to create client. Please check details.');
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Onboard New Client"
      subtitle="Register client profile, compliance identifiers, and initial RM"
      id="client-drawer"
      footer={(
        <div className="client-drawer-form__footer-actions">
          <MainButton
            label="Cancel"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isCreating}
          />
          <MainButton
            label="Onboard Client"
            variant="primary"
            size="md"
            type="submit"
            formId="client-form"
            isLoading={isCreating}
          />
        </div>
      )}
    >
      <FormProvider {...methods}>
        <form
          id="client-form"
          onSubmit={methods.handleSubmit(onSubmit)}
          className="client-drawer-form"
          noValidate
        >
          <h3 className="client-drawer-form__section-title">Personal Details</h3>

          <div className="client-drawer-form__grid-2">
            <FormInput
              name="firstName"
              label="First Name *"
              placeholder="e.g. Ramesh"
              id="client-drawer-firstName"
            />
            <FormInput
              name="lastName"
              label="Last Name *"
              placeholder="e.g. Verma"
              id="client-drawer-lastName"
            />
          </div>

          <div className="client-drawer-form__grid-2">
            <FormInput
              name="email"
              label="Email Address *"
              type="email"
              placeholder="e.g. ramesh@gmail.com"
              id="client-drawer-email"
            />
            <FormInput
              name="phone"
              label="Phone Number *"
              placeholder="e.g. +91 9876543210"
              id="client-drawer-phone"
            />
          </div>

          <div className="client-drawer-form__grid-2">
            <FormInput
              name="pan"
              label="PAN Card Number"
              placeholder="e.g. ABCDE1234F"
              id="client-drawer-pan"
            />
            <SingleSelectDropdown
              name="gender"
              label="Gender"
              options={GENDER_OPTIONS}
              placeholder="Select Gender"
              id="client-drawer-gender"
            />
          </div>

          <div className="client-drawer-form__grid-2">
            <FormDateInput
              name="dateOfBirth"
              label="Date of Birth"
              id="client-drawer-dob"
            />
            <SingleSelectDropdown
              name="relationshipManagerId"
              label="Relationship Manager"
              options={rmDropdownOptions}
              placeholder={isUsersLoading ? 'Loading managers...' : 'Assign RM (Optional)'}
              id="client-drawer-rm"
              disabled={isUsersLoading}
            />
          </div>

          <h3 className="client-drawer-form__section-title">Residential Address</h3>

          <FormInput
            name="addressLine"
            label="Address Line"
            placeholder="e.g. Flat 402, Lotus Heights"
            id="client-drawer-address"
          />

          <div className="client-drawer-form__grid-2">
            <FormInput
              name="city"
              label="City"
              placeholder="e.g. Mumbai"
              id="client-drawer-city"
            />
            <FormInput
              name="state"
              label="State"
              placeholder="e.g. Maharashtra"
              id="client-drawer-state"
            />
          </div>

          <div className="client-drawer-form__grid-2">
            <FormInput
              name="pincode"
              label="PIN Code"
              placeholder="e.g. 400001"
              id="client-drawer-pincode"
            />
            <FormInput
              name="country"
              label="Country"
              placeholder="e.g. India"
              id="client-drawer-country"
            />
          </div>
        </form>
      </FormProvider>
    </Drawer>
  );
}
