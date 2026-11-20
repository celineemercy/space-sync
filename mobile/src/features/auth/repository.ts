import { apiRequest } from "@/lib/api";
import type { LoginResponse } from "@/types/domain";
import type { LoginInput } from "./validation";

export const authRepository = {
  signIn(credentials: LoginInput): Promise<LoginResponse> {
    return apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },
};
