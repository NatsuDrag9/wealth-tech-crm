import {
  useEffect,
  useMemo,
  type ReactElement,
} from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Drawer } from '../Drawer/Drawer';
import { FormInput, SingleSelectDropdown } from '@/components/form-inputs';
import { MainButton } from '@/components/buttons';
import type { DropdownType } from '@/types/genericTypes';
import {
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetGroupsDropdownQuery,
  useGetRolesDropdownQuery,
  useGetUsersDropdownQuery,
} from '@/services/api/userManagerApi';
import type { UserRecord } from '@/definitions/userManagerTypes';
import { showSuccessToast, showErrorToast } from '@/utils/toastUtils';
import './UserDrawer.scss';

interface UserFormData {
  fullName: string;
  email: string;
  groupId: string | number;
  roleId: string | number;
  reportsToId?: string | number | null;
}

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: UserRecord | null;
}

const userValidationSchema = yup.object({
  fullName: yup
    .string()
    .trim()
    .required('Full name is required'),
  email: yup
    .string()
    .trim()
    .email('Please enter a valid email address')
    .required('Email is required'),
  groupId: yup
    .mixed<string | number>()
    .required('Department is required'),
  roleId: yup
    .mixed<string | number>()
    .required('Role is required'),
  reportsToId: yup
    .mixed<string | number>()
    .nullable()
    .optional(),
});

function extractOptionValue(opt: unknown): string | number | undefined {
  if (!opt || typeof opt !== 'object') {
    return undefined;
  }
  if ('value' in opt && (typeof opt.value === 'string' || typeof opt.value === 'number')) {
    return opt.value;
  }
  if ('id' in opt && (typeof opt.id === 'string' || typeof opt.id === 'number')) {
    return opt.id;
  }
  return undefined;
}

export function UserDrawer({
  isOpen,
  onClose,
  userToEdit = null,
}: UserDrawerProps): ReactElement | null {
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  const methods = useForm<UserFormData>({
    resolver: yupResolver(userValidationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      groupId: '',
      roleId: '',
      reportsToId: null,
    },
    mode: 'onBlur',
  });

  const selectedGroupId = methods.watch('groupId');

  const {
    data: groupOptions = [],
    isLoading: isGroupsLoading,
  } = useGetGroupsDropdownQuery();

  const {
    data: roleOptions = [],
    isLoading: isRolesLoading,
  } = useGetRolesDropdownQuery(
    selectedGroupId ? { groupId: selectedGroupId } : undefined,
    { skip: !selectedGroupId },
  );

  const {
    data: managerOptions = [],
    isLoading: isManagersLoading,
  } = useGetUsersDropdownQuery(
    selectedGroupId
      ? {
        groupId: selectedGroupId,
        excludeUserId: userToEdit ? userToEdit.id : undefined,
      }
      : undefined,
    { skip: !selectedGroupId },
  );

  const groupDropdownOptions = useMemo<DropdownType[]>(
    () => groupOptions.map((opt) => ({
      displayName: opt.display_name,
      value: String(opt.value),
    })),
    [groupOptions],
  );

  const roleDropdownOptions = useMemo<DropdownType[]>(
    () => roleOptions.map((opt) => ({
      displayName: opt.display_name,
      value: String(opt.value),
    })),
    [roleOptions],
  );

  const managerDropdownOptions = useMemo<DropdownType[]>(
    () => managerOptions.map((opt) => ({
      displayName: opt.display_name,
      value: String(opt.value),
    })),
    [managerOptions],
  );

  useEffect(() => {
    if (!isOpen) return;

    if (userToEdit) {
      const gId = extractOptionValue(userToEdit.group) ?? '';
      const rId = extractOptionValue(userToEdit.role) ?? '';
      const mgrId = extractOptionValue(userToEdit.reportsTo) ?? null;

      methods.reset({
        fullName: userToEdit.fullName || userToEdit.full_name || '',
        email: userToEdit.email || '',
        groupId: gId,
        roleId: rId,
        reportsToId: mgrId,
      });
    } else {
      methods.reset({
        fullName: '',
        email: '',
        groupId: '',
        roleId: '',
        reportsToId: null,
      });
    }
  }, [isOpen, userToEdit, methods]);

  async function onSubmit(data: UserFormData) {
    try {
      if (userToEdit) {
        await updateUser({
          id: userToEdit.id,
          fullName: data.fullName,
          email: data.email,
          groupId: data.groupId,
          roleId: data.roleId,
          reportsToId: data.reportsToId || null,
        }).unwrap();
        showSuccessToast('User updated successfully');
      } else {
        await createUser({
          fullName: data.fullName,
          email: data.email,
          groupId: data.groupId,
          roleId: data.roleId,
          reportsToId: data.reportsToId || null,
        }).unwrap();
        showSuccessToast('User created successfully');
      }
      onClose();
    } catch {
      showErrorToast('Failed to save user. Please try again.');
    }
  }

  const isSubmitting = isCreating || isUpdating;
  const drawerTitle = userToEdit ? 'Edit User' : 'Add New User';
  const drawerSubtitle = userToEdit
    ? 'Update user role, department, and manager assignment'
    : 'Create employee account and configure access credentials';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={drawerTitle}
      subtitle={drawerSubtitle}
      id="user-drawer"
      footer={(
        <div className="user-drawer-form__footer-actions">
          <MainButton
            label="Cancel"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          />
          <MainButton
            label={userToEdit ? 'Save Changes' : 'Create User'}
            variant="primary"
            size="md"
            type="submit"
            formId="user-form"
            isLoading={isSubmitting}
          />
        </div>
      )}
    >
      <FormProvider {...methods}>
        <form
          id="user-form"
          onSubmit={methods.handleSubmit(onSubmit)}
          className="user-drawer-form"
          noValidate
        >
          <FormInput
            name="fullName"
            label="Full Name"
            placeholder="e.g. Eleanor Vance"
            id="user-drawer-fullName"
          />

          <FormInput
            name="email"
            label="Email Address"
            type="email"
            placeholder="e.g. eleanor@wealthtech.com"
            id="user-drawer-email"
          />

          <SingleSelectDropdown
            name="groupId"
            label="Department"
            options={groupDropdownOptions}
            placeholder={isGroupsLoading ? 'Loading departments...' : 'Select Department'}
            id="user-drawer-groupId"
            disabled={isGroupsLoading}
          />

          <SingleSelectDropdown
            name="roleId"
            label="Role"
            options={roleDropdownOptions}
            placeholder={isRolesLoading ? 'Loading roles...' : 'Select Role'}
            id="user-drawer-roleId"
            disabled={!selectedGroupId || isRolesLoading}
            noDataMessage={selectedGroupId ? 'No roles in this department' : 'Select department first'}
          />

          <SingleSelectDropdown
            name="reportsToId"
            label="Reporting Manager (Optional)"
            options={managerDropdownOptions}
            placeholder={isManagersLoading ? 'Loading managers...' : 'Select Reporting Manager'}
            id="user-drawer-reportsToId"
            disabled={!selectedGroupId || isManagersLoading}
            noDataMessage={selectedGroupId ? 'No managers available' : 'Select department first'}
          />
        </form>
      </FormProvider>
    </Drawer>
  );
}
