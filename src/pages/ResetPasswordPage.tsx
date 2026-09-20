import React from 'react';
import { AuthPage } from '../components/AuthPage';

export const ResetPasswordPage: React.FC = () => {
  return <AuthPage initialMode="reset-password" />;
};

export default ResetPasswordPage;
