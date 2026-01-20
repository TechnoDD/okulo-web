import { account } from "@/utils/appwrite";

export const useAuth = () => {
  const signIn = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password);
  };

  const signOut = () => {};

  const isLogged = async () => {
    if (await account.get()) return true;
  };

  return { signIn, signOut, isLogged };
};

export type AuthContext = ReturnType<typeof useAuth>;
