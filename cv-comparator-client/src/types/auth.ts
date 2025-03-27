import { Dispatch, SetStateAction } from 'react';

export interface AuthComponentProps {
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>;
  setUserName?: Dispatch<SetStateAction<string>>;
  setUserType?: Dispatch<SetStateAction<'recruteur' | 'candidat' | ''>>;
}