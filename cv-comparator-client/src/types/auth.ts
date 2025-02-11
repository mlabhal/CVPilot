// types/auth.ts
import { Dispatch, SetStateAction } from 'react';

export interface AuthComponentProps {
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>;
}